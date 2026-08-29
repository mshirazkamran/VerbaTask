import * as approvalService from '../approvals/approval.service.js';

// GET /api/approvals
export const listApprovals = async (req, res) => {
    try {
        const approvals = await approvalService.getPendingApprovals(req.merchantId);
        res.status(200).json({ success: true, data: approvals });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

// PATCH /api/approvals/:id/respond
export const respondToApproval = async (req, res) => {
    try {
        const { decision } = req.body;
        const approval = await approvalService.respond(req.params.id, decision, req.merchantId);
        res.status(200).json({ success: true, data: approval });
    } catch (error) {
        const status = error.message.includes('NOT_FOUND') ? 404 : 400;
        res.status(status).json({ success: false, error: { message: error.message } });
    }
};
