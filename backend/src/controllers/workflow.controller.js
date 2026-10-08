import * as workflowService from '../workflows/workflow.service.js';
import { emitDashboardUpdate } from '../socket.js';
import { explainWorkflowError } from '../workflows/workflow.rules.js';

// Only the rule fields are accepted from the client; merchantId/firedItems/
// nextRunAt are server-owned.
const pickRuleFields = ({ trigger, condition, action, rawInstruction, active }) => ({
  ...(trigger !== undefined && { trigger }),
  ...(condition !== undefined && { condition }),
  ...(action !== undefined && { action }),
  ...(rawInstruction !== undefined && { rawInstruction }),
  ...(typeof active === 'boolean' && { active }),
});

const validationFailure = (res, error) =>
  res.status(400).json({
    success: false,
    error: { code: error.code, message: explainWorkflowError(error.details, 'en') },
  });

export const listWorkflows = async (req, res) => {
  try {
    const workflows = await workflowService.listWorkflows(req.merchantId);
    res.status(200).json({ success: true, data: workflows });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const createWorkflow = async (req, res) => {
  try {
    const workflow = await workflowService.createWorkflow({
      ...pickRuleFields(req.body),
      merchantId: req.merchantId,
    });
    emitDashboardUpdate(req.merchantId, { type: 'workflow', action: 'create' });
    res.status(201).json({ success: true, data: workflow });
  } catch (error) {
    if (error instanceof workflowService.WorkflowValidationError) return validationFailure(res, error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const updateWorkflow = async (req, res) => {
  try {
    const workflow = await workflowService.updateWorkflow(
      req.params.id,
      req.merchantId,
      pickRuleFields(req.body)
    );
    emitDashboardUpdate(req.merchantId, { type: 'workflow', action: 'update' });
    res.status(200).json({ success: true, data: workflow });
  } catch (error) {
    if (error instanceof workflowService.WorkflowValidationError) return validationFailure(res, error);
    const status = error.message.includes('NOT_FOUND') ? 404 : 500;
    res.status(status).json({ success: false, error: { message: error.message } });
  }
};

export const deleteWorkflow = async (req, res) => {
  try {
    const workflow = await workflowService.deleteWorkflow(req.params.id, req.merchantId);
    emitDashboardUpdate(req.merchantId, { type: 'workflow', action: 'delete' });
    res.status(200).json({ success: true, data: workflow });
  } catch (error) {
    const status = error.message.includes('NOT_FOUND') ? 404 : 500;
    res.status(status).json({ success: false, error: { message: error.message } });
  }
};
