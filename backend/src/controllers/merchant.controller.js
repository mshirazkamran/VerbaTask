/**
 * Merchant Settings & Profiling Controller
 *
 * Provides APIs for merchants to view and customize their store identity
 * (rename store, change business type/location), configure voice and language
 * preferences, and manage accepted Pakistani payment methods (banks, wallets, EMIs).
 */

import Merchant from '../models/Merchant.js';
import PhoneChangeVerification from '../models/PhoneChangeVerification.js';
import ConversationState from '../models/ConversationState.js';
import { sendTextMessage } from '../services/whatsapp.service.js';
import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  getAllPaymentMethods,
  isValidPaymentMethod,
  normalizePaymentMethod,
  DEFAULT_ACCEPTED_PAYMENT_METHODS,
} from '../constants/paymentMethods.js';
import { emitDashboardUpdate } from '../socket.js';

/**
 * GET /api/merchant/profile
 * Retrieves the full store profile and settings for the authenticated merchant.
 */
export async function getProfile(req, res) {
  try {
    const merchant = await Merchant.findById(req.merchantId).select('-passwordHash');
    if (!merchant) {
      return res.status(404).json({ success: false, error: { message: 'Merchant not found' } });
    }

    if (!merchant.shopCode) {
      merchant.shopCode = `VT-${Math.floor(1000 + Math.random() * 9000)}`;
      await merchant.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        id: merchant._id,
        businessName: merchant.businessName || '',
        businessType: merchant.businessType || 'general',
        location: merchant.location || '',
        sells: merchant.sells || '',
        whatsappNumber: merchant.whatsappNumber,
        email: merchant.email,
        shopCode: merchant.shopCode,
        subscriptionTier: merchant.subscriptionTier || 'pro',
        staffMembers: merchant.staffMembers || [],
        language: merchant.language || 'ur',
        voiceReplies: merchant.voiceReplies ?? true,
        voiceGender: merchant.voiceGender || 'female',
        replyPreference: merchant.replyPreference || 'voice_on_voice',
        confirmAutomations: merchant.confirmAutomations ?? false,
        requireApprovalForHighValue: merchant.requireApprovalForHighValue ?? false,
        highValueThreshold: merchant.highValueThreshold ?? 10000,
        acceptedPaymentMethods: merchant.acceptedPaymentMethods?.length
          ? merchant.acceptedPaymentMethods
          : DEFAULT_ACCEPTED_PAYMENT_METHODS,
        paymentDetails: merchant.paymentDetails || {},
        onboardingComplete: merchant.onboardingComplete,
        createdAt: merchant.createdAt,
        updatedAt: merchant.updatedAt,
      },
    });
  } catch (error) {
    console.error('getProfile error:', error);
    return res.status(500).json({ success: false, error: { message: 'Server error fetching store profile' } });
  }
}

/**
 * PATCH /api/merchant/profile
 * Updates store settings (rename store, change location/category, language, voice, or payment methods).
 */
export async function updateProfile(req, res) {
  try {
    const allowedFields = [
      'businessName',
      'businessType',
      'location',
      'sells',
      'language',
      'voiceReplies',
      'voiceGender',
      'replyPreference',
      'confirmAutomations',
      'requireApprovalForHighValue',
      'highValueThreshold',
      'acceptedPaymentMethods',
      'paymentDetails',
      'defaultPaymentMethod',
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Validate acceptedPaymentMethods if provided
    if (updates.acceptedPaymentMethods) {
      if (!Array.isArray(updates.acceptedPaymentMethods) || !updates.acceptedPaymentMethods.length) {
        return res.status(400).json({
          success: false,
          error: { message: 'acceptedPaymentMethods must be a non-empty array of payment method IDs' },
        });
      }

      const normalized = [];
      for (const m of updates.acceptedPaymentMethods) {
        const canonical = normalizePaymentMethod(m) || m.toLowerCase().trim();
        if (!isValidPaymentMethod(canonical)) {
          return res.status(400).json({
            success: false,
            error: { message: `Invalid payment method: '${m}' is not recognized in Pakistan catalog` },
          });
        }
        if (!normalized.includes(canonical)) {
          normalized.push(canonical);
        }
      }
      updates.acceptedPaymentMethods = normalized;
    }

    // Validate language if provided
    if (updates.language && !['ur', 'en'].includes(updates.language)) {
      return res.status(400).json({
        success: false,
        error: { message: "language must be 'ur' or 'en'" },
      });
    }

    // Validate voiceGender if provided
    if (updates.voiceGender && !['male', 'female'].includes(updates.voiceGender)) {
      return res.status(400).json({
        success: false,
        error: { message: "voiceGender must be 'male' or 'female'" },
      });
    }

    // Validate replyPreference if provided
    if (updates.replyPreference && !['voice_on_voice', 'always_voice', 'text_only'].includes(updates.replyPreference)) {
      return res.status(400).json({
        success: false,
        error: { message: "replyPreference must be 'voice_on_voice', 'always_voice', or 'text_only'" },
      });
    }

    const merchant = await Merchant.findByIdAndUpdate(
      req.merchantId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!merchant) {
      return res.status(404).json({ success: false, error: { message: 'Merchant not found' } });
    }

    emitDashboardUpdate(req.merchantId, { type: 'profile' });

    return res.status(200).json({
      success: true,
      data: merchant,
      message: 'Store settings updated successfully',
    });
  } catch (error) {
    console.error('updateProfile error:', error);
    return res.status(500).json({ success: false, error: { message: 'Server error updating store profile' } });
  }
}

/**
 * GET /api/merchant/payment-methods
 * Returns the full catalog of Pakistani banks, wallets, and EMIs,
 * tagged with an 'active' flag indicating if the merchant accepts it.
 */
export async function getPaymentMethods(req, res) {
  try {
    const merchant = await Merchant.findById(req.merchantId).select('acceptedPaymentMethods paymentDetails defaultPaymentMethod');
    if (!merchant) {
      return res.status(404).json({ success: false, error: { message: 'Merchant not found' } });
    }

    const activeList = merchant.acceptedPaymentMethods?.length
      ? merchant.acceptedPaymentMethods
      : DEFAULT_ACCEPTED_PAYMENT_METHODS;

    const allMethods = getAllPaymentMethods().map((method) => ({
      ...method,
      active: activeList.includes(method.id),
      details: merchant.paymentDetails?.get?.(method.id) || merchant.paymentDetails?.[method.id] || null,
    }));

    return res.status(200).json({
      success: true,
      data: {
        totalSupported: allMethods.length,
        totalActive: activeList.length,
        activeMethods: activeList,
        defaultPaymentMethod: merchant.defaultPaymentMethod,
        methods: allMethods,
      },
    });
  } catch (error) {
    console.error('getPaymentMethods error:', error);
    return res.status(500).json({ success: false, error: { message: 'Server error fetching payment methods' } });
  }
}

/**
 * PUT /api/merchant/payment-methods
 * Sets the active accepted payment methods for the merchant.
 * Body: { acceptedPaymentMethods: string[], paymentDetails?: object }
 */
export async function updatePaymentMethods(req, res) {
  try {
    const { acceptedPaymentMethods, paymentDetails, defaultPaymentMethod } = req.body;

    if (!Array.isArray(acceptedPaymentMethods) || !acceptedPaymentMethods.length) {
      return res.status(400).json({
        success: false,
        error: { message: 'acceptedPaymentMethods must be a non-empty array of payment IDs' },
      });
    }

    const validList = [];
    for (const item of acceptedPaymentMethods) {
      const canonical = normalizePaymentMethod(item) || String(item).toLowerCase().trim();
      if (!isValidPaymentMethod(canonical)) {
        return res.status(400).json({
          success: false,
          error: { message: `Unknown payment method '${item}'. Please choose from supported Pakistani channels.` },
        });
      }
      if (!validList.includes(canonical)) {
        validList.push(canonical);
      }
    }

    const updates = { acceptedPaymentMethods: validList };
    if (paymentDetails && typeof paymentDetails === 'object') {
      updates.paymentDetails = paymentDetails;
    }
    if (defaultPaymentMethod !== undefined) {
      updates.defaultPaymentMethod = defaultPaymentMethod;
    }

    const merchant = await Merchant.findByIdAndUpdate(
      req.merchantId,
      { $set: updates },
      { new: true }
    ).select('acceptedPaymentMethods paymentDetails businessName');

    emitDashboardUpdate(req.merchantId, { type: 'payment_methods' });

    return res.status(200).json({
      success: true,
      data: {
        acceptedPaymentMethods: merchant.acceptedPaymentMethods,
        paymentDetails: merchant.paymentDetails,
      },
      message: 'Payment methods updated successfully',
    });
  } catch (error) {
    console.error('updatePaymentMethods error:', error);
    return res.status(500).json({ success: false, error: { message: 'Server error updating payment methods' } });
  }
}

const ONE_HOUR_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

export function normalizePhone(str) {
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

/**
 * POST /api/merchant/phone/request-change
 * Initiates phone number change by dispatching a 6-digit OTP to the NEW WhatsApp number.
 * The new number is NOT activated until OTP is verified.
 */
export async function requestPhoneChange(req, res) {
  try {
    const rawNumber = String(req.body.newPhoneNumber || '').trim();
    if (!rawNumber) {
      return res.status(400).json({
        success: false,
        error: { message: 'New WhatsApp phone number is required.' },
      });
    }

    const normalized = normalizePhone(rawNumber);
    if (!normalized || normalized.length < 10) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide a valid Pakistani phone number (e.g. 03001234567 or +923001234567).' },
      });
    }

    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) {
      return res.status(404).json({ success: false, error: { message: 'Merchant not found.' } });
    }

    // Must not be the same as the current number
    if (merchant.whatsappNumber === normalized) {
      return res.status(400).json({
        success: false,
        error: { message: 'This is already your current active WhatsApp number.' },
      });
    }

    // Must not conflict with another existing merchant account
    const existing = await Merchant.findOne({
      whatsappNumber: normalized,
      _id: { $ne: merchant._id },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: { message: 'This WhatsApp number is already registered to another merchant account.' },
      });
    }

    // Rate limiting: Max 3 OTP requests per hour
    let verification = await PhoneChangeVerification.findOne({
      merchantId: merchant._id,
      newWhatsappNumber: normalized,
    });

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - ONE_HOUR_MS);

    const recentRequests = verification?.requestHistory
      ? verification.requestHistory.filter((t) => new Date(t) > oneHourAgo)
      : [];

    if (recentRequests.length >= RATE_LIMIT_MAX) {
      const oldestRecent = Math.min(...recentRequests.map((t) => new Date(t).getTime()));
      const waitMinutes = Math.ceil((oldestRecent + ONE_HOUR_MS - now.getTime()) / (60 * 1000));
      return res.status(429).json({
        success: false,
        error: {
          message: `Rate limit exceeded. You can request up to ${RATE_LIMIT_MAX} verification codes per hour. Please try again in ${waitMinutes} minute(s).`,
          retryAfterMinutes: waitMinutes,
        },
      });
    }

    // Generate 6-digit OTP code with 10-minute expiry
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    const updatedHistory = [...recentRequests, now];

    if (!verification) {
      verification = await PhoneChangeVerification.create({
        merchantId: merchant._id,
        newWhatsappNumber: normalized,
        code,
        expiresAt,
        usedAt: null,
        requestHistory: updatedHistory,
      });
    } else {
      verification.code = code;
      verification.expiresAt = expiresAt;
      verification.usedAt = null;
      verification.requestHistory = updatedHistory;
      await verification.save();
    }

    // Send OTP to the NEW WhatsApp number
    try {
      const msg = `🔐 *VerbaTask Phone Verification*\n\nYour OTP to update and activate your store WhatsApp number is: *${code}*\n\nThis code will expire in 10 minutes.\nDo not share this code with anyone.`;
      await sendTextMessage(normalized, msg);
    } catch (err) {
      console.warn('Failed to send WhatsApp phone verification message:', err.message);
    }

    const remainingAttempts = RATE_LIMIT_MAX - updatedHistory.length;

    return res.status(200).json({
      success: true,
      data: {
        message: `Verification code sent to ${maskPhone(normalized)}`,
        newWhatsappNumber: normalized,
        maskedNumber: maskPhone(normalized),
        remainingAttempts,
        expiresInMinutes: 10,
      },
    });
  } catch (error) {
    console.error('requestPhoneChange error:', error);
    return res.status(500).json({ success: false, error: { message: 'Server error requesting phone change.' } });
  }
}

/**
 * POST /api/merchant/phone/verify-change
 * Verifies the OTP and activates the new WhatsApp phone number on the merchant account.
 */
export async function verifyPhoneChange(req, res) {
  try {
    const { newPhoneNumber, code } = req.body;

    if (!newPhoneNumber || !code) {
      return res.status(400).json({
        success: false,
        error: { message: 'New phone number and 6-digit verification code are required.' },
      });
    }

    const normalized = normalizePhone(newPhoneNumber);
    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) {
      return res.status(404).json({ success: false, error: { message: 'Merchant not found.' } });
    }

    const verification = await PhoneChangeVerification.findOne({
      merchantId: merchant._id,
      newWhatsappNumber: normalized,
    });

    if (!verification || verification.code !== String(code).trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid verification code. Please check and try again.' },
      });
    }

    if (verification.usedAt) {
      return res.status(400).json({
        success: false,
        error: { message: 'This verification code has already been used. Please request a new one.' },
      });
    }

    if (new Date() > verification.expiresAt) {
      return res.status(400).json({
        success: false,
        error: { message: 'Verification code has expired. Please request a new code.' },
      });
    }

    // Check collision again before activating
    const conflict = await Merchant.findOne({
      whatsappNumber: normalized,
      _id: { $ne: merchant._id },
    });
    if (conflict) {
      return res.status(400).json({
        success: false,
        error: { message: 'This phone number was recently registered by another account.' },
      });
    }

    // ACTIVATE NEW NUMBER
    const oldNumber = merchant.whatsappNumber;
    merchant.whatsappNumber = normalized;
    await merchant.save();

    verification.usedAt = new Date();
    await verification.save();

    return res.status(200).json({
      success: true,
      data: {
        message: 'WhatsApp phone number successfully updated and activated!',
        oldWhatsappNumber: oldNumber,
        whatsappNumber: normalized,
      },
    });
  } catch (error) {
    console.error('verifyPhoneChange error:', error);
    return res.status(500).json({ success: false, error: { message: 'Server error verifying phone change.' } });
  }
}

/**
 * POST /api/merchant/phone/resend-code
 * Resends a fresh OTP to the pending new WhatsApp number.
 */
export async function resendPhoneChangeCode(req, res) {
  return requestPhoneChange(req, res);
}

/**
 * Returns the maximum allowed staff numbers based on subscription tier.
 */
export function getStaffLimit(tier = 'pro') {
  switch (tier) {
    case 'free':
      return 1;
    case 'starter':
      return 2;
    case 'pro':
      return 5;
    case 'enterprise':
      return 50;
    default:
      return 5;
  }
}

/**
 * GET /api/merchant/staff
 * Returns the shop reference code, current subscription tier, max allowed staff, and current staff list.
 */
export async function getStaffMembers(req, res) {
  try {
    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) {
      return res.status(404).json({ success: false, error: { message: 'Merchant not found.' } });
    }

    if (!merchant.shopCode) {
      merchant.shopCode = `VT-${Math.floor(1000 + Math.random() * 9000)}`;
      await merchant.save();
    }

    const tier = merchant.subscriptionTier || 'pro';
    const limit = getStaffLimit(tier);
    const activeCount = (merchant.staffMembers || []).filter((s) => s.active).length;

    return res.status(200).json({
      success: true,
      data: {
        shopCode: merchant.shopCode,
        subscriptionTier: tier,
        staffLimit: limit,
        activeCount,
        staffMembers: merchant.staffMembers || [],
      },
    });
  } catch (error) {
    console.error('getStaffMembers error:', error);
    return res.status(500).json({ success: false, error: { message: 'Server error fetching staff members.' } });
  }
}

/**
 * POST /api/merchant/staff
 * Adds a new staff member to the merchant's store.
 */
export async function addStaffMember(req, res) {
  try {
    const { name, whatsappNumber } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Staff member name is required.' } });
    }
    if (!whatsappNumber || !whatsappNumber.trim()) {
      return res.status(400).json({ success: false, error: { message: 'WhatsApp phone number is required.' } });
    }

    const normalized = normalizePhone(whatsappNumber.trim());
    if (!normalized || normalized.length < 10) {
      return res.status(400).json({ success: false, error: { message: 'Please provide a valid Pakistani phone number.' } });
    }

    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) {
      return res.status(404).json({ success: false, error: { message: 'Merchant not found.' } });
    }

    // Owner cannot add their own primary WhatsApp number as staff
    if (merchant.whatsappNumber === normalized) {
      return res.status(400).json({ success: false, error: { message: 'This is the primary store owner phone number.' } });
    }

    // Check plan limits
    const tier = merchant.subscriptionTier || 'pro';
    const limit = getStaffLimit(tier);
    const activeStaff = (merchant.staffMembers || []).filter((s) => s.active);
    if (activeStaff.length >= limit) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Staff limit reached (${limit} members). Upgrade to the Pro plan to add more team members.`,
          code: 'UPGRADE_REQUIRED',
        },
      });
    }

    // Check if phone number is already linked to another active store (as owner or active assistant)
    let otherOwnerShop = null;
    let otherStaffShop = null;
    if (mongoose.connection?.readyState !== 0) {
      try {
        otherOwnerShop = await Merchant.findOne({
          whatsappNumber: normalized,
          status: { $ne: 'disabled' },
          _id: { $ne: merchant._id },
        });

        otherStaffShop = await Merchant.findOne({
          'staffMembers.whatsappNumber': normalized,
          'staffMembers.active': true,
          status: { $ne: 'disabled' },
          _id: { $ne: merchant._id },
        });
      } catch (err) {
        console.warn('Checking other shops for staff transfer skipped:', err.message);
      }
    }

    const existingOtherShop = otherOwnerShop || otherStaffShop;

    if (existingOtherShop) {
      // Staff member is currently associated with another shop.
      // They must approve leaving the previous shop and joining the new one.
      const cleanNewStoreName = (merchant.businessName || 'Dukaan').split(',')[0].trim();
      const cleanOldStoreName = (existingOtherShop.businessName || 'Dukaan').split(',')[0].trim();

      // Upsert pending staff record in the new store
      let staffEntry = (merchant.staffMembers || []).find(
        (s) => normalizePhone(s.whatsappNumber) === normalized
      );

      if (staffEntry) {
        staffEntry.name = name.trim();
        staffEntry.active = false;
        staffEntry.status = 'pending_switch';
        staffEntry.pendingFromShopId = existingOtherShop._id;
      } else {
        merchant.staffMembers.push({
          name: name.trim(),
          whatsappNumber: normalized,
          active: false,
          status: 'pending_switch',
          pendingFromShopId: existingOtherShop._id,
          addedAt: new Date(),
          addedBy: 'owner',
        });
      }

      await merchant.save();

      // Set conversation state for the assistant's phone to await transfer decision
      await ConversationState.findOneAndUpdate(
        { whatsappNumber: normalized },
        {
          whatsappNumber: normalized,
          merchantId: merchant._id,
          flow: 'pending_staff_transfer',
          step: 'awaiting_confirmation',
          data: {
            newShopId: String(merchant._id),
            oldShopId: String(existingOtherShop._id),
            oldRole: otherOwnerShop ? 'owner' : 'staff',
            staffName: name.trim(),
            newShopName: cleanNewStoreName,
            oldShopName: cleanOldStoreName,
          },
        },
        { upsert: true, new: true }
      );

      // Send WhatsApp prompt to assistant
      try {
        await sendTextMessage(
          normalized,
          `Assalam o Alikum *${name.trim()}*! 👋\n\n` +
          `Aap ko *${cleanNewStoreName}* mein bator store assistant shamil karne ki request mosool hui hai.\n` +
          `Aap pehle se *${cleanOldStoreName}* ke sath munsalik hain.\n\n` +
          `Kya aap *${cleanOldStoreName}* chhor kar *${cleanNewStoreName}* ko join karna chahte hain?\n\n` +
          `1️⃣ *Qubool karein* (Leave ${cleanOldStoreName} & Join ${cleanNewStoreName})\n` +
          `2️⃣ *Mustarad karein* (Stay at ${cleanOldStoreName})\n\n` +
          `_Jawab dene ke liye 1 ya 2 likh kar bhejein._`
        );
      } catch (e) {
        console.warn('Failed to send staff transfer prompt via WhatsApp:', e.message);
      }

      emitDashboardUpdate(merchant._id, { type: 'staff', action: 'pending_transfer', staff: merchant.staffMembers });

      return res.status(200).json({
        success: true,
        pendingApproval: true,
        message: `Transfer invitation sent to ${name.trim()} on WhatsApp. They must approve leaving ${cleanOldStoreName}.`,
        data: {
          staffMembers: merchant.staffMembers,
        },
      });
    }

    // Check if phone number is already registered in this store
    const existing = (merchant.staffMembers || []).find(
      (s) => normalizePhone(s.whatsappNumber) === normalized
    );
    if (existing) {
      if (existing.active) {
        return res.status(400).json({ success: false, error: { message: 'This phone number is already an active staff member.' } });
      } else {
        // Reactivate
        existing.active = true;
        existing.status = 'active';
        existing.name = name.trim();
        existing.whatsappNumber = normalized;
        await merchant.save();
        emitDashboardUpdate(merchant._id, { type: 'staff', action: 'updated', staff: merchant.staffMembers });
        return res.status(200).json({ success: true, data: { staffMembers: merchant.staffMembers } });
      }
    }

    merchant.staffMembers.push({
      name: name.trim(),
      whatsappNumber: normalized,
      active: true,
      status: 'active',
      addedAt: new Date(),
      addedBy: 'owner',
    });

    await merchant.save();

    // Send welcome message to new staff member via WhatsApp (safe try-catch)
    try {
      const cleanStoreName = (merchant.businessName || 'Dukaan').split(',')[0].trim();
      await sendTextMessage(
        normalized,
        `Assalam o Alikum *${name.trim()}*! 👋\n\nAap ko *${cleanStoreName}* ke VerbaTask hisab mein shamil kar liya gaya hai.\n\nAb aap direct is WhatsApp chat par bol kar (voice note) ya likh kar sales aur stock darj kar sakte hain:\n🎙️ *"2 doodh 400"*\n🎙️ *"Ali ko 500 udhaar"*\n\nShuru karne ke liye abhi koi bhi sale bhej kar check karein!`
      );
    } catch (e) {
      console.warn('Failed to send welcome SMS to staff member:', e.message);
    }

    emitDashboardUpdate(merchant._id, { type: 'staff', action: 'updated', staff: merchant.staffMembers });

    return res.status(201).json({
      success: true,
      data: {
        staffMembers: merchant.staffMembers,
      },
    });
  } catch (error) {
    console.error('addStaffMember error:', error);
    return res.status(500).json({ success: false, error: { message: 'Server error adding staff member.' } });
  }
}

/**
 * DELETE /api/merchant/staff/:staffId
 * Removes a staff member from the store.
 */
export async function removeStaffMember(req, res) {
  try {
    const { staffId } = req.params;
    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) {
      return res.status(404).json({ success: false, error: { message: 'Merchant not found.' } });
    }

    const normTarget = normalizePhone(staffId);
    const staff =
      merchant.staffMembers.id(staffId) ||
      merchant.staffMembers.find(
        (s) =>
          s._id.toString() === staffId ||
          s.whatsappNumber === staffId ||
          (normTarget && normalizePhone(s.whatsappNumber) === normTarget)
      );
    if (!staff) {
      return res.status(404).json({ success: false, error: { message: 'Staff member not found.' } });
    }

    merchant.staffMembers.pull(staff._id);
    await merchant.save();

    emitDashboardUpdate(merchant._id, { type: 'staff', action: 'removed', staffId });

    return res.status(200).json({
      success: true,
      data: {
        message: 'Staff member removed successfully.',
        staffMembers: merchant.staffMembers,
      },
    });
  } catch (error) {
    console.error('removeStaffMember error:', error);
    return res.status(500).json({ success: false, error: { message: 'Server error removing staff member.' } });
  }
}

/**
 * POST /api/merchant/shop-code/regenerate
 * Generates a new unique shop code.
 */
export async function regenerateShopCode(req, res) {
  try {
    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) {
      return res.status(404).json({ success: false, error: { message: 'Merchant not found.' } });
    }

    merchant.shopCode = `VT-${Math.floor(1000 + Math.random() * 9000)}`;
    await merchant.save();

    emitDashboardUpdate(merchant._id, { type: 'shop_code', action: 'regenerated', shopCode: merchant.shopCode });

    return res.status(200).json({
      success: true,
      data: {
        shopCode: merchant.shopCode,
      },
    });
  } catch (error) {
    console.error('regenerateShopCode error:', error);
    return res.status(500).json({ success: false, error: { message: 'Server error regenerating shop code.' } });
  }
}

/**
 * POST /api/merchant/disable-shop
 * Soft-disables a store without deleting database history/records,
 * unlinks WhatsApp number and email, deactivates staff, and clears session cookies.
 */
export async function disableShop(req, res) {
  try {
    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) {
      return res.status(404).json({ success: false, error: { message: 'Merchant not found.' } });
    }

    if (merchant.status === 'disabled') {
      return res.status(400).json({ success: false, error: { message: 'Store is already disabled.' } });
    }

    const originalPhone = merchant.whatsappNumber;
    const originalEmail = merchant.email;

    merchant.status = 'disabled';
    merchant.unlinkedAt = new Date();
    merchant.unlinkedWhatsappNumber = originalPhone;
    merchant.unlinkedEmail = originalEmail;

    const unlinkedSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    merchant.whatsappNumber = `unlinked_${unlinkedSuffix}`;
    merchant.email = `unlinked_${unlinkedSuffix}@archived.verbatask.internal`;

    if (Array.isArray(merchant.staffMembers)) {
      merchant.staffMembers.forEach((s) => {
        s.active = false;
      });
    }

    await merchant.save();

    // Clear auth session cookies
    const cookieOptions = { path: '/' };
    res.clearCookie('boldukan_session', cookieOptions);
    res.clearCookie('boldukan_merchant_id', cookieOptions);

    emitDashboardUpdate(merchant._id, { type: 'merchant', action: 'disabled' });

    return res.status(200).json({
      success: true,
      message: 'Shop disabled and credentials unlinked successfully.',
    });
  } catch (error) {
    console.error('disableShop error:', error);
    return res.status(500).json({ success: false, error: { message: 'Failed to disable shop.' } });
  }
}
