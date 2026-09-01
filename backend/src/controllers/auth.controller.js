import Merchant from "../models/Merchant.js";
import LinkCode from "../models/LinkCode.js";
import InventoryItem from "../models/InventoryItem.js";
import Order from "../models/Order.js";
import Approval from "../models/Approval.js";
import Workflow from "../models/Workflow.js";
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