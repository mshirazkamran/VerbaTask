import Merchant from "../models/Merchant.js";
import LinkCode from "../models/LinkCode.js";
import InventoryItem from "../models/InventoryItem.js";
import Order from "../models/Order.js";
import Approval from "../models/Approval.js";
import Workflow from "../models/Workflow.js";
import PasswordResetCode from "../models/PasswordResetCode.js";
import { sendTextMessage } from "../services/whatsapp.service.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// POST /api/auth/signup
export const signup = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: { message: "Email and password are required" } 
            });
        }

        const existingMerchant = await Merchant.findOne({ email });
        if (existingMerchant) {
            return res.status(400).json({ 
                success: false, 
                error: { message: "Merchant already exists with this email" } 
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        // NOTE: The Schema requires whatsappNumber, but the API contract for signup doesn't include it. 
        // We set a temporary one here. It gets overwritten when they confirm the link code.
        const tempWhatsappNumber = `unlinked_${Date.now()}`;

        const merchant = await Merchant.create({
            email,
            passwordHash,
            whatsappNumber: tempWhatsappNumber
        });

        // Sign JWT for 7 days (as per design guide)
        const token = jwt.sign({ merchantId: merchant._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        return res.status(201).json({
            success: true,
            data: { token, merchantId: merchant._id }
        });

    } catch (error) {
        console.error("Signup error:", error);
        return res.status(500).json({ success: false, error: { message: "Server error during signup" } });
    }
};

// POST /api/auth/login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: { message: "Email and password are required" } 
            });
        }

        const merchant = await Merchant.findOne({ email });
        if (!merchant) {
            return res.status(401).json({ 
                success: false, 
                error: { message: "Incorrect email or password" } 
            });
        }

        const isPasswordMatch = await bcrypt.compare(password, merchant.passwordHash);
        if (!isPasswordMatch) {
            return res.status(401).json({ 
                success: false, 
                error: { message: "Incorrect email or password" } 
            });
        }

        const token = jwt.sign({ merchantId: merchant._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        return res.status(200).json({
            success: true,
            data: { token, merchantId: merchant._id }
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ success: false, error: { message: "Server error during login" } });
    }
};

// POST /api/auth/link-code/confirm
export const confirmLinkCode = async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ success: false, error: { message: "Email and code are required" } });
        }

        const linkCode = await LinkCode.findOne({ code, usedAt: null });
        if (!linkCode || linkCode.expiresAt < new Date()) {
            return res.status(400).json({ success: false, error: { message: "Invalid or expired code" } });
        }

        const emailMerchant = await Merchant.findOne({ email });
        if (!emailMerchant) {
            return res.status(404).json({ success: false, error: { message: "Merchant not found" } });
        }

        // If this WhatsApp number already belongs to another merchant (e.g. an
        // earlier WhatsApp-only onboarding record), merge the email account's
        // credentials and data into that existing merchant record so the
        // WhatsApp identity stays canonical.
        const existingWhatsAppMerchant = await Merchant.findOne({
            whatsappNumber: linkCode.whatsappNumber,
            _id: { $ne: emailMerchant._id },
        });

        if (existingWhatsAppMerchant) {
            const oldId = emailMerchant._id;
            const newId = existingWhatsAppMerchant._id;

            existingWhatsAppMerchant.email = emailMerchant.email;
            existingWhatsAppMerchant.passwordHash = emailMerchant.passwordHash;
            await existingWhatsAppMerchant.save();

            // Reassign any data the user created with the temp email merchant
            await Promise.all([
                InventoryItem.updateMany({ merchantId: oldId }, { merchantId: newId }),
                Order.updateMany({ merchantId: oldId }, { merchantId: newId }),
                Approval.updateMany({ merchantId: oldId }, { merchantId: newId }),
                Workflow.updateMany({ merchantId: oldId }, { merchantId: newId }),
            ]);

            await Merchant.deleteOne({ _id: oldId });
        } else {
            // Link the actual WhatsApp number to the email merchant account
            emailMerchant.whatsappNumber = linkCode.whatsappNumber;
            await emailMerchant.save();
        }

        // Mark code as used
        linkCode.usedAt = new Date();
        await linkCode.save();

        return res.status(200).json({
            success: true,
            data: { linked: true }
        });
    } catch (error) {
        console.error("Link code error:", error);
        return res.status(500).json({ success: false, error: { message: "Server error during linking" } });
    }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
    try {
        // req.merchantId is populated by the requireAuth middleware
        const merchant = await Merchant.findById(req.merchantId).select('-passwordHash');
        
        if (!merchant) {
            return res.status(404).json({ success: false, error: { message: "Merchant not found" } });
        }

        return res.status(200).json({
            success: true,
            data: merchant
        });
    } catch (error) {
        console.error("GetMe error:", error);
        return res.status(500).json({ success: false, error: { message: "Server error fetching profile" } });
    }
};

// PATCH /api/auth/me
export const updateMe = async (req, res) => {
    try {
        const allowedUpdates = ['language', 'voiceReplies', 'replyPreference', 'businessName', 'location', 'sells'];
        const updates = {};
        for (const key of allowedUpdates) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }

        const merchant = await Merchant.findByIdAndUpdate(
            req.merchantId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-passwordHash');

        if (!merchant) {
            return res.status(404).json({ success: false, error: { message: "Merchant not found" } });
        }

        return res.status(200).json({
            success: true,
            data: merchant
        });
    } catch (error) {
        console.error("UpdateMe error:", error);
        return res.status(500).json({ success: false, error: { message: "Server error updating profile" } });
    }
};

// INTERNAL FUNCTION: Not an Express route. Called in-process by the WhatsApp
// module (per the design guide) whenever a number needs a dashboard linking
// code. Reuses an unexpired, unused code if one exists rather than issuing
// a new one on every message; codes expire after 15 minutes.
export const generateLinkCode = async (whatsappNumber) => {
    let linkCode = await LinkCode.findOne({
        whatsappNumber,
        usedAt: null,
        expiresAt: { $gt: new Date() },
    });

    if (!linkCode) {
        const code = crypto.randomInt(100000, 999999).toString();
        linkCode = await LinkCode.create({
            whatsappNumber,
            code,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        });
    }

    return linkCode;
};

const ONE_HOUR_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

function normalizePhone(str) {
    if (!str) return '';
    const digits = String(str).replace(/\D/g, '');
    if (digits.startsWith('92') && digits.length === 12) return digits;
    if (digits.startsWith('0') && digits.length === 11) return '92' + digits.slice(1);
    if (digits.length === 10 && digits.startsWith('3')) return '92' + digits;
    return digits;
}

function maskPhone(phone) {
    if (!phone || phone.length < 7) return phone;
    return phone.slice(0, 5) + '****' + phone.slice(-3);
}

// POST /api/auth/forgot-password/request
export const requestPasswordReset = async (req, res) => {
    try {
        const identifier = String(req.body.identifier || req.body.email || req.body.whatsappNumber || '').trim();
        if (!identifier) {
            return res.status(400).json({
                success: false,
                error: { message: "Email or WhatsApp number is required" },
            });
        }

        const normalizedPhone = normalizePhone(identifier);
        const merchant = await Merchant.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                ...(normalizedPhone ? [{ whatsappNumber: normalizedPhone }, { whatsappNumber: `+${normalizedPhone}` }] : []),
                { whatsappNumber: identifier },
            ],
        });

        if (!merchant) {
            return res.status(404).json({
                success: false,
                error: { message: "No account found with this email or WhatsApp number" },
            });
        }

        if (merchant.whatsappNumber?.startsWith('unlinked_')) {
            return res.status(400).json({
                success: false,
                error: { message: "No WhatsApp number is linked to this account yet. Please contact support or link your number." },
            });
        }

        // Rate limiting check (max 3 in 1 hour)
        let resetRecord = await PasswordResetCode.findOne({ merchantId: merchant._id });
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - ONE_HOUR_MS);

        const recentRequests = resetRecord?.requestHistory
            ? resetRecord.requestHistory.filter((t) => new Date(t) > oneHourAgo)
            : [];

        if (recentRequests.length >= RATE_LIMIT_MAX) {
            const oldestRecent = Math.min(...recentRequests.map((t) => new Date(t).getTime()));
            const waitMinutes = Math.ceil((oldestRecent + ONE_HOUR_MS - now.getTime()) / (60 * 1000));
            return res.status(429).json({
                success: false,
                error: {
                    message: `Rate limit exceeded. You can only request up to ${RATE_LIMIT_MAX} verification codes per hour. Please try again in ${waitMinutes} minute(s).`,
                    retryAfterMinutes: waitMinutes,
                },
            });
        }

        // Generate 6-digit verification code
        const code = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
        const updatedHistory = [...recentRequests, now];

        if (!resetRecord) {
            resetRecord = await PasswordResetCode.create({
                merchantId: merchant._id,
                whatsappNumber: merchant.whatsappNumber,
                code,
                expiresAt,
                usedAt: null,
                requestHistory: updatedHistory,
            });
        } else {
            resetRecord.code = code;
            resetRecord.expiresAt = expiresAt;
            resetRecord.usedAt = null;
            resetRecord.whatsappNumber = merchant.whatsappNumber;
            resetRecord.requestHistory = updatedHistory;
            await resetRecord.save();
        }

        // Send via WhatsApp
        try {
            const msg = `🔐 *VerbaTask Verification Code*\n\nYour password reset code is: *${code}*\n\nThis code will expire in 10 minutes.\nIf you did not request a password reset, please ignore this message.`;
            await sendTextMessage(merchant.whatsappNumber, msg);
        } catch (err) {
            console.warn('Failed to send WhatsApp reset message:', err.message);
        }

        const remainingAttempts = RATE_LIMIT_MAX - updatedHistory.length;

        return res.status(200).json({
            success: true,
            data: {
                message: 'Verification code sent to your WhatsApp',
                whatsappMasked: maskPhone(merchant.whatsappNumber),
                identifier: merchant.email || merchant.whatsappNumber,
                remainingAttempts,
                expiresInMinutes: 10,
            },
        });
    } catch (error) {
        console.error("RequestPasswordReset error:", error);
        return res.status(500).json({ success: false, error: { message: "Server error requesting password reset" } });
    }
};

// POST /api/auth/forgot-password/resend
export const resendPasswordResetCode = async (req, res) => {
    return requestPasswordReset(req, res);
};

// POST /api/auth/forgot-password/reset
export const resetPassword = async (req, res) => {
    try {
        const { identifier, code, newPassword } = req.body;

        if (!identifier || !code || !newPassword) {
            return res.status(400).json({
                success: false,
                error: { message: "Email/phone, code, and new password are required" },
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: { message: "New password must be at least 6 characters long" },
            });
        }

        const normalizedPhone = normalizePhone(identifier);
        const merchant = await Merchant.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                ...(normalizedPhone ? [{ whatsappNumber: normalizedPhone }, { whatsappNumber: `+${normalizedPhone}` }] : []),
                { whatsappNumber: identifier },
            ],
        });

        if (!merchant) {
            return res.status(404).json({
                success: false,
                error: { message: "No account found with this email or WhatsApp number" },
            });
        }

        const resetRecord = await PasswordResetCode.findOne({ merchantId: merchant._id });
        if (!resetRecord || resetRecord.code !== String(code).trim()) {
            return res.status(400).json({
                success: false,
                error: { message: "Invalid verification code. Please check and try again." },
            });
        }

        if (resetRecord.usedAt) {
            return res.status(400).json({
                success: false,
                error: { message: "This verification code has already been used. Please request a new one." },
            });
        }

        if (new Date() > resetRecord.expiresAt) {
            return res.status(400).json({
                success: false,
                error: { message: "Verification code has expired. Please request a new one." },
            });
        }

        // Update password
        const passwordHash = await bcrypt.hash(newPassword, 10);
        merchant.passwordHash = passwordHash;
        await merchant.save();

        // Mark code used
        resetRecord.usedAt = new Date();
        await resetRecord.save();

        return res.status(200).json({
            success: true,
            data: { message: "Password has been reset successfully. You can now log in with your new password." },
        });
    } catch (error) {
        console.error("ResetPassword error:", error);
        return res.status(500).json({ success: false, error: { message: "Server error resetting password" } });
    }
};