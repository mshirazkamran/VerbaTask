import Workflow from '../models/Workflow.js';
import Merchant from '../models/Merchant.js';
import InventoryItem from '../models/InventoryItem.js';
import { sendTextMessage } from '../services/whatsapp.service.js';
import { deliverReport } from '../services/reportDelivery.service.js';
import { findSimilarInventoryItems } from '../crm/item-matching.js';
import {
  normalizeWorkflow,
  matchesMessageTrigger,
  isBelowThreshold,
  computeNextRunAt,
  describeTrigger,
  describeWorkflow,
} from './workflow.rules.js';

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Error carrying a workflow.rules error object, so callers can explain it to the merchant. */
export class WorkflowValidationError extends Error {
  constructor(error) {
    super(error.code);
    this.code = error.code;
    this.details = error;
  }
}

// ---------------------------------------------------------------------------
// Validation + item resolution
// ---------------------------------------------------------------------------

/**
 * Validates a workflow and pins an item-specific threshold to a real inventory
 * item (so "chini" alerts on the merchant's "Sugar"). Does not save anything.
 * @returns {Promise<{ok: true, value: Object} | {ok: false, error: Object}>}
 */
export const prepareWorkflow = async (merchantId, input) => {
  const result = normalizeWorkflow(input);
  if (!result.ok) return result;

  const wf = result.value;
  if (wf.trigger === 'threshold' && wf.condition.item) {
    const exact = await InventoryItem.findOne({
      merchantId,
      $or: [
        ...(wf.condition.itemId ? [{ _id: wf.condition.itemId }] : []),
        { name: new RegExp(`^${escapeRegex(wf.condition.item)}$`, 'i') },
      ],
    });
    const item = exact || (await findSimilarInventoryItems(merchantId, wf.condition.item, { limit: 1, minScore: 0.75 }))[0]?.item;
    if (!item) return { ok: false, error: { code: 'ITEM_NOT_FOUND', item: wf.condition.item } };
    wf.condition = { ...wf.condition, item: item.name, itemId: item._id };
  }

  return { ok: true, value: wf };
};

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new automation workflow. Throws WorkflowValidationError when the
 * input isn't a supported automation — nothing unsupported is ever stored.
 * @param {Object} command - { merchantId, trigger, condition, action, rawInstruction }
 */
export const createWorkflow = async (command) => {
  const { merchantId } = command;
  const prepared = await prepareWorkflow(merchantId, command);
  if (!prepared.ok) throw new WorkflowValidationError(prepared.error);

  const wf = prepared.value;
  const workflow = await Workflow.create({
    merchantId,
    ...wf,
    ...(wf.trigger === 'schedule' && { nextRunAt: computeNextRunAt(wf.condition) }),
  });

  // An item that's already low should alert now, not after the next sale.
  if (workflow.trigger === 'threshold') {
    await checkThresholdWorkflowNow(workflow).catch((err) =>
      console.error(`[Workflow ${workflow._id}] initial threshold check failed:`, err.message)
    );
  }

  return workflow;
};

/**
 * List all workflows for a merchant. Each row carries a readable `description`
 * and `valid: false` when it predates the current rules (e.g. an invented
 * action) so the UI can flag it.
 */
export const listWorkflows = async (merchantId) => {
  const workflows = await Workflow.find({ merchantId }).sort({ createdAt: -1 });
  return workflows.map((wf) => {
    const obj = wf.toObject();
    return { ...obj, valid: normalizeWorkflow(obj).ok, description: describeWorkflow(obj, 'en') };
  });
};

/**
 * Update an existing workflow. A pause/resume toggle is applied as-is; any
 * change to trigger, condition or action is re-validated like a new workflow.
 */
export const updateWorkflow = async (id, merchantId, patch = {}) => {
  const existing = await Workflow.findOne({ _id: id, merchantId });
  if (!existing) throw new Error('WORKFLOW_NOT_FOUND');

  const changesRule = ['trigger', 'condition', 'action'].some((k) => k in patch);
  if (changesRule) {
    const prepared = await prepareWorkflow(merchantId, {
      trigger: patch.trigger ?? existing.trigger,
      condition: patch.condition ?? existing.condition,
      action: patch.action ?? existing.action,
      rawInstruction: patch.rawInstruction ?? existing.rawInstruction,
    });
    if (!prepared.ok) throw new WorkflowValidationError(prepared.error);

    Object.assign(existing, prepared.value);
    existing.firedItems = [];
    existing.nextRunAt = existing.trigger === 'schedule' ? computeNextRunAt(existing.condition) : undefined;
  }

  if (typeof patch.active === 'boolean') {
    const resuming = patch.active && !existing.active;
    existing.active = patch.active;
    if (resuming) {
      existing.firedItems = [];
      // Don't burst-fire every run that was missed while paused.
      if (existing.trigger === 'schedule') existing.nextRunAt = computeNextRunAt(existing.condition);
    }
  }

  existing.markModified('condition');
  existing.markModified('action');
  await existing.save();

  if (existing.active && existing.trigger === 'threshold') {
    await checkThresholdWorkflowNow(existing).catch(() => {});
  }
  return existing;
};

/**
 * Delete a workflow by id and merchant.
 */
export const deleteWorkflow = async (id, merchantId) => {
  const workflow = await Workflow.findOneAndDelete({ _id: id, merchantId });
  if (!workflow) throw new Error('WORKFLOW_NOT_FOUND');
  return workflow;
};

// ---------------------------------------------------------------------------
// Shared action executor — every trigger type funnels through this so the
// WhatsApp send logic lives in one place.
// ---------------------------------------------------------------------------

const LEGACY_NOTIFY = ['notify_merchant', 'send_message'];

/**
 * Execute a workflow's action. Returns true if the action was handled.
 * @param {Object} wf        - The Workflow document
 * @param {Object} merchant  - The Merchant document
 * @param {Object} [context] - { message } default text when the workflow has none
 */
const executeAction = async (wf, merchant, context = {}) => {
  const language = merchant.language || 'ur';
  const type = LEGACY_NOTIFY.includes(wf.action?.type) ? 'notify' : wf.action?.type;

  if (type === 'notify') {
    const custom = wf.action?.message;
    const message = custom && context.message ? `${custom}\n\n${context.message}` : custom || context.message;
    if (!message) return false;
    try {
      await sendTextMessage(merchant.whatsappNumber, message);
      return true;
    } catch (err) {
      console.error(`[Workflow ${wf._id}] notification failed:`, err.message);
      return false;
    }
  }

  if (type === 'send_report') {
    const caption = `⚡ ${describeTrigger(wf, language)}${context.message ? `\n${context.message}` : ''}`;
    return deliverReport(merchant, wf.action.reportType, language, { announce: false, caption });
  }

  // Rows saved before validation existed may carry invented actions — never
  // pretend they ran.
  console.warn(`[Workflow ${wf._id}] skipped unsupported action type: ${wf.action?.type}`);
  return false;
};

const loadReachableMerchant = async (merchantId) => {
  const merchant = await Merchant.findById(merchantId);
  if (!merchant?.whatsappNumber || merchant.whatsappNumber.startsWith('unlinked_')) return null;
  return merchant;
};

// ---------------------------------------------------------------------------
// 1. THRESHOLD workflows — evaluated whenever an item's quantity changes
// ---------------------------------------------------------------------------

const appliesToItem = (cond, item) => {
  if (cond.itemId) return String(cond.itemId) === String(item._id);
  if (cond.item) return String(cond.item).toLowerCase() === String(item.name).toLowerCase();
  return true; // global "any item" alert
};

const lowStockMessage = (item, cond, language) => {
  const value = cond.value ?? cond.quantityThreshold;
  const unit = item.unit || (language === 'ur' ? 'عدد' : 'units');
  return language === 'ur'
    ? `⚠️ کم اسٹاک الرٹ: "${item.name}" صرف ${item.quantity} ${unit} باقی ہے (حد: ${value})۔`
    : `⚠️ Low stock alert: "${item.name}" has ${item.quantity} ${unit} left (limit: ${value}).`;
};

/**
 * Fire-once semantics: an item alerts when it first crosses below the limit,
 * then stays quiet (tracked in firedItems) until restocked above it again.
 */
const evaluateThresholdForItem = async (wf, item, merchant) => {
  const cond = wf.condition || {};
  if (!appliesToItem(cond, item)) return false;

  if (!isBelowThreshold(cond, item.quantity)) {
    // Restocked — re-arm so the next drop alerts again.
    await Workflow.updateOne({ _id: wf._id }, { $pull: { firedItems: item._id } });
    return false;
  }

  // Atomic claim: only the update that actually adds the item fires, so two
  // simultaneous sales can't both send the alert.
  const claim = await Workflow.updateOne(
    { _id: wf._id, active: true, firedItems: { $ne: item._id } },
    { $addToSet: { firedItems: item._id } }
  );
  if (claim.modifiedCount !== 1) return false;

  await executeAction(wf, merchant, { message: lowStockMessage(item, cond, merchant.language || 'ur') });
  return true;
};

/**
 * Evaluate threshold workflows for one item after its quantity changed
 * (sale, restock, dashboard edit, rejected order).
 * @param {String|ObjectId} merchantId
 * @param {Object} item - The full updated InventoryItem document
 */
export const evaluateThresholdWorkflows = async (merchantId, item) => {
  const workflows = await Workflow.find({ merchantId, trigger: 'threshold', active: true });
  if (!workflows.length || !item) return [];

  const merchant = await loadReachableMerchant(merchantId);
  if (!merchant) return [];

  const triggered = [];
  for (const wf of workflows) {
    if (await evaluateThresholdForItem(wf, item, merchant)) triggered.push(wf);
  }
  return triggered;
};

/** Checks one threshold workflow against current stock (used on create / resume). */
const checkThresholdWorkflowNow = async (wf) => {
  const merchant = await loadReachableMerchant(wf.merchantId);
  if (!merchant) return;
  const cond = wf.condition || {};
  const filter = { merchantId: wf.merchantId };
  if (cond.itemId) filter._id = cond.itemId;
  const items = await InventoryItem.find(filter);
  for (const item of items) {
    await evaluateThresholdForItem(wf, item, merchant);
  }
};

// ---------------------------------------------------------------------------
// 2. MESSAGE workflows — merchant-defined shortcuts ("end" → sales report)
// ---------------------------------------------------------------------------

/**
 * Runs every active message workflow whose keyword is exactly the incoming
 * text. Exact match (not substring) so "end" never fires on "send 2 rice".
 * Returns the triggered workflows; the caller skips NLP when any fired.
 * @param {String|ObjectId} merchantId
 * @param {String} text - The raw incoming message text
 */
export const evaluateMessageWorkflows = async (merchantId, text) => {
  const workflows = await Workflow.find({ merchantId, trigger: 'message', active: true });
  const matching = workflows.filter((wf) => matchesMessageTrigger(wf.condition, text));
  if (!matching.length) return [];

  const merchant = await loadReachableMerchant(merchantId);
  if (!merchant) return [];

  for (const wf of matching) {
    await executeAction(wf, merchant);
  }
  return matching;
};

// ---------------------------------------------------------------------------
// 3. SCHEDULE workflows — evaluated by a background timer
// ---------------------------------------------------------------------------

/**
 * Find all active schedule workflows whose nextRunAt has passed, fire their
 * actions, then advance nextRunAt to the next daily/weekly slot (PKT).
 */
export const evaluateScheduleWorkflows = async () => {
  const now = new Date();
  const dueWorkflows = await Workflow.find({
    trigger: 'schedule',
    active: true,
    nextRunAt: { $lte: now },
  });

  for (const wf of dueWorkflows) {
    // Advance first so a slow report or a crash can never double-fire.
    wf.nextRunAt = computeNextRunAt(wf.condition, now);
    await wf.save();

    const merchant = await loadReachableMerchant(wf.merchantId);
    if (!merchant) continue;
    await executeAction(wf, merchant);
  }

  return dueWorkflows.length;
};

/**
 * Start the background schedule runner.
 * Runs shortly after startup, then every 60 seconds.
 * Call this once after MongoDB connects.
 */
export const startScheduleRunner = () => {
  const tick = async () => {
    try {
      const count = await evaluateScheduleWorkflows();
      if (count > 0) {
        console.log(`[ScheduleRunner] fired ${count} scheduled workflow(s)`);
      }
    } catch (err) {
      console.error('[ScheduleRunner] error:', err.message);
    }
  };

  // First run after 5 seconds (let the server finish starting up)
  setTimeout(tick, 5_000);

  // Then every 60 seconds
  setInterval(tick, 60_000);

  console.log('[ScheduleRunner] started — checks every 60s');
};
