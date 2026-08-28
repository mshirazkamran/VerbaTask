import Merchant from "../models/Merchant.js";
import LinkCode from "../models/LinkCode.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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

        const merchant = await Merchant.findOne({ email });
        if (!merchant) {
            return res.status(404).json({ success: false, error: { message: "Merchant not found" } });
        }

        // Link the actual WhatsApp number to the merchant account
        merchant.whatsappNumber = linkCode.whatsappNumber;
        await merchant.save();

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

// INTERNAL FUNCTION: Not an Express route. Called internally by the whatsapp module.
export const generateLinkCode = async (whatsappNumber) => {
    // TODO: Generate a 6-digit code, save it to the LinkCode collection, and return it.
    // Expires in 15 minutes.
};