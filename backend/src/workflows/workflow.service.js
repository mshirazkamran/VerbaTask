import Workflow from '../models/Workflow.js';
import Merchant from '../models/Merchant.js';
import { sendTextMessage } from '../services/whatsapp.service.js';

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new automation workflow.
 * @param {Object} command - { merchantId, trigger, condition, action, rawInstruction, nextRunAt }
 */
export const createWorkflow = async (command) => {
    const { merchantId, trigger, condition, action, rawInstruction, nextRunAt } = command;
    const workflow = await Workflow.create({
        merchantId,
        trigger,
        condition,
        action,
        rawInstruction,
        // Schedule workflows need a next fire time — default to "now" so a
        // newly created one fires on the runner's next tick rather than never
        // (a missing nextRunAt never matches the runner's $lte: now query).
        ...(trigger === 'schedule' && {
            nextRunAt: nextRunAt ? new Date(nextRunAt) : new Date(),
        }),
    });
    return workflow;
};

/**
 * List all workflows for a merchant.
 */
export const listWorkflows = async (merchantId) => {
    return Workflow.find({ merchantId }).sort({ createdAt: -1 });
};

/**
 * Update an existing workflow (partial patch).
 */
export const updateWorkflow = async (id, merchantId, patch) => {
    const workflow = await Workflow.findOneAndUpdate(
        { _id: id, merchantId },
        patch,
        { new: true }
    );
    if (!workflow) throw new Error('WORKFLOW_NOT_FOUND');
    return workflow;
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

const ACTION_ALIASES = {
    notify: 'notify',
    notify_merchant: 'notify',
    send_message: 'notify',
    auto_reorder: 'auto_reorder',
};

/**
 * Execute a workflow's action. Returns true if the action was handled.
 * @param {Object} wf          - The Workflow document
 * @param {String} whatsappTo  - Merchant's WhatsApp number
 * @param {Object} [context]   - Extra info to include in the message
 */
const executeAction = async (wf, whatsappTo, context = {}) => {
    const raw = wf.action?.type;
    const actionType = ACTION_ALIASES[raw] || raw;

    if (actionType === 'notify') {
        const message = wf.action?.message
            || context.message
            || `Automation triggered: ${wf.rawInstruction || wf._id}`;

        try {
            await sendTextMessage(whatsappTo, message);
            return true;
        } catch (err) {
            console.error(`[Workflow ${wf._id}] notification failed:`, err.message);
            return false;
        }
    }

    if (actionType === 'auto_reorder') {
        // Auto-reorder needs supplier integration — log for now.
        console.log(
            `[Workflow ${wf._id}] auto_reorder triggered${context.itemName ? ` for "${context.itemName}"` : ''}`
        );
        return true;
    }

    console.log(`[Workflow ${wf._id}] unknown action type: ${raw}`);
    return false;
};

// ---------------------------------------------------------------------------
// 1. THRESHOLD workflows — evaluated after every stock deduction
// ---------------------------------------------------------------------------

/**
 * Evaluate threshold workflows after stock deduction.
 * Called from order.service.js right after inventory is saved.
 *
 * Supports two condition shapes:
 *   { quantityThreshold: 5 }                          — global (any item)
 *   { item: "rice bag", quantityThreshold: 5 }        — item-specific
 *
 * Also supports the Qwen-produced shape:
 *   { item: "rice bag", operator: "<", value: 5 }
 *
 * @param {String|ObjectId} merchantId
 * @param {Object} item - The full updated InventoryItem document
 */
export const evaluateThresholdWorkflows = async (merchantId, item) => {
    const workflows = await Workflow.find({
        merchantId,
        trigger: 'threshold',
        active: true,
    });

    if (!workflows.length) return [];

    const merchant = await Merchant.findById(merchantId);
    if (!merchant?.whatsappNumber || merchant.whatsappNumber.startsWith('unlinked_')) return [];

    const triggered = [];

    for (const wf of workflows) {
        const cond = wf.condition || {};

        // If the workflow targets a specific item, skip non-matching items
        if (cond.item) {
            const match = new RegExp(`^${cond.item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
            if (!match.test(item.name)) continue;
        }

        // Determine the threshold value (supports both naming conventions)
        const thresholdQty = cond.quantityThreshold ?? cond.value;
        if (thresholdQty == null) continue;

        // Evaluate the condition
        const operator = cond.operator || '<';
        let conditionMet = false;
        switch (operator) {
            case '<':  conditionMet = item.quantity < thresholdQty; break;
            case '<=': conditionMet = item.quantity <= thresholdQty; break;
            case '>':  conditionMet = item.quantity > thresholdQty; break;
            case '>=': conditionMet = item.quantity >= thresholdQty; break;
            case '==': conditionMet = item.quantity === thresholdQty; break;
            default:   conditionMet = item.quantity < thresholdQty;
        }

        if (!conditionMet) continue;

        triggered.push(wf);

        const defaultMsg = `⚠️ Low stock alert: "${item.name}" has ${item.quantity} ${item.unit || 'units'} left (threshold: ${thresholdQty}).`;
        await executeAction(wf, merchant.whatsappNumber, {
            message: defaultMsg,
            itemName: item.name,
        });
    }

    return triggered;
};

// ---------------------------------------------------------------------------
// 2. MESSAGE workflows — evaluated on every incoming text message
// ---------------------------------------------------------------------------

/**
 * Check an incoming text against all active message workflows for this merchant.
 * Matching is done via case-insensitive substring search against:
 *   1. condition.keywords (array of strings — any keyword matches)
 *   2. condition.keyword  (single string)
 *   3. rawInstruction      (fallback — the original instruction text)
 *
 * Returns the list of triggered workflows. The caller (whatsapp.controller)
 * uses this to decide whether to skip the normal NLP path.
 *
 * @param {String|ObjectId} merchantId
 * @param {String} text - The raw incoming message text
 */
export const evaluateMessageWorkflows = async (merchantId, text) => {
    const workflows = await Workflow.find({
        merchantId,
        trigger: 'message',
        active: true,
    });

    if (!workflows.length) return [];

    const merchant = await Merchant.findById(merchantId);
    if (!merchant?.whatsappNumber || merchant.whatsappNumber.startsWith('unlinked_')) return [];

    const lowerText = text.toLowerCase();
    const triggered = [];

    for (const wf of workflows) {
        const cond = wf.condition || {};

        // Build the list of phrases to match against
        const keywords = [];
        if (Array.isArray(cond.keywords)) keywords.push(...cond.keywords);
        if (typeof cond.keyword === 'string') keywords.push(cond.keyword);
        if (!keywords.length && wf.rawInstruction) keywords.push(wf.rawInstruction);

        if (!keywords.length) continue;

        // Any keyword match triggers the workflow
        const matched = keywords.some((kw) =>
            lowerText.includes(String(kw).toLowerCase())
        );

        if (!matched) continue;

        triggered.push(wf);
        await executeAction(wf, merchant.whatsappNumber);
    }

    return triggered;
};

// ---------------------------------------------------------------------------
// 3. SCHEDULE workflows — evaluated by a background timer
// ---------------------------------------------------------------------------

/**
 * Find all active schedule workflows whose nextRunAt has passed,
 * fire their actions, then advance nextRunAt by the configured interval.
 */
export const evaluateScheduleWorkflows = async () => {
    const now = new Date();

    const dueWorkflows = await Workflow.find({
        trigger: 'schedule',
        active: true,
        nextRunAt: { $lte: now },
    });

    for (const wf of dueWorkflows) {
        const merchant = await Merchant.findById(wf.merchantId);
        if (!merchant?.whatsappNumber || merchant.whatsappNumber.startsWith('unlinked_')) continue;

        await executeAction(wf, merchant.whatsappNumber);

        // Advance nextRunAt by the configured interval (default: 24 hours)
        const intervalMs = (wf.condition?.intervalMinutes || 1440) * 60_000;
        wf.nextRunAt = new Date(Date.now() + intervalMs);
        await wf.save();
    }

    return dueWorkflows.length;
};

/**
 * Start the background schedule runner.
 * Runs immediately on startup, then every 60 seconds.
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
