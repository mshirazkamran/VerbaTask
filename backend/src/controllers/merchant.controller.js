/**
 * Merchant Settings & Profiling Controller
 *
 * Provides APIs for merchants to view and customize their store identity
 * (rename store, change business type/location), configure voice and language
 * preferences, and manage accepted Pakistani payment methods (banks, wallets, EMIs).
 */

import Merchant from '../models/Merchant.js';
import {
  getAllPaymentMethods,
  isValidPaymentMethod,
  normalizePaymentMethod,
  DEFAULT_ACCEPTED_PAYMENT_METHODS,
} from '../constants/paymentMethods.js';

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
        language: merchant.language || 'ur',
        voiceReplies: merchant.voiceReplies ?? true,
        replyPreference: merchant.replyPreference || 'voice_on_voice',
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
      'replyPreference',
      'acceptedPaymentMethods',
      'paymentDetails',
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
    const merchant = await Merchant.findById(req.merchantId).select('acceptedPaymentMethods paymentDetails');
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
    const { acceptedPaymentMethods, paymentDetails } = req.body;

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

    const merchant = await Merchant.findByIdAndUpdate(
      req.merchantId,
      { $set: updates },
      { new: true }
    ).select('acceptedPaymentMethods paymentDetails businessName');

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
