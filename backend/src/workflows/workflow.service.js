import Workflow from '../models/Workflow.js';
import Merchant from '../models/Merchant.js';
import { sendTextMessage } from '../services/whatsapp.service.js';

/**
 * Create a new automation workflow.
 * @param {Object} command - { merchantId, trigger, condition, action, rawInstruction }
 */
export const createWorkflow = async (command) => {
    const { merchantId, trigger, condition, action, rawInstruction } = command;
    const workflow = await Workflow.create({
        merchantId,
        trigger,
        condition,
        action,
        rawInstruction,
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

/**
 * Evaluate threshold workflows after stock deduction.
 * Called from order.service.js right after inventory is saved.
 *
 * Signature: takes the full updated InventoryItem document so workflows
 * can inspect name, quantity, price — anything on the item.
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

    // Resolve WhatsApp number once for all notifications in this batch
    const merchant = await Merchant.findById(merchantId);
    if (!merchant?.whatsappNumber || merchant.whatsappNumber.startsWith('unlinked_')) return [];

    const triggered = [];

    for (const wf of workflows) {
        const thresholdQty = wf.condition?.quantityThreshold;
        if (thresholdQty == null) continue;

        // Fire when remaining stock drops below the configured threshold
        if (item.quantity < thresholdQty) {
            triggered.push(wf);

            const actionType = wf.action?.type;

            if (actionType === 'notify') {
                const msg = `⚠️ Low stock alert: "${item.name}" has ${item.quantity} ${item.unit || 'units'} left (threshold: ${thresholdQty}).`;
                try {
                    await sendTextMessage(merchant.whatsappNumber, msg);
                } catch (err) {
                    console.error('Threshold workflow notification failed:', err.message);
                }
            } else if (actionType === 'auto_reorder') {
                // Auto-reorder is complex (needs supplier integration, payment, etc.).
                // Log for now — full implementation in a later iteration.
                console.log(
                    `[Workflow ${wf._id}] auto_reorder triggered for "${item.name}" (qty: ${item.quantity})`
                );
            }
        }
    }

    return triggered;
};
