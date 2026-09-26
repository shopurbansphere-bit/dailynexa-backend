const express = require('express');
const rateLimit = require('express-rate-limit');
const Key = require('../models/Key');
const Session = require('../models/Session');
const AdminLog = require('../models/AdminLog');
const { getKolkataDate, getExpiresAt, getServerTimeISO } = require('../utils/time');
const { generateSessionToken } = require('../utils/keygen');

const router = express.Router();

// Strict rate limit for key verification
const verifyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // 15 attempts per IP per hour
  message: { success: false, error: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * POST /api/auth/verify-key
 */
router.post('/verify-key', verifyLimiter, async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  try {
    const { key, appId, installationId } = req.body;

    if (!key || !installationId) {
      await AdminLog.create({
        action: 'verify_fail',
        ip,
        details: { reason: 'MISSING_FIELDS' }
      });
      return res.status(400).json({ success: false, error: 'INVALID_KEY', message: 'Key and installationId required' });
    }

    const cleanKey = String(key).trim().toUpperCase();
    const today = getKolkataDate();

    // Find active key for today
    const keyDoc = await Key.findOne({
      key: cleanKey,
      date: today,
      status: 'active'
    });

    if (!keyDoc) {
      // Check if it exists but expired/revoked
      const anyKey = await Key.findOne({ key: cleanKey });
      let error = 'INVALID_KEY';
      if (anyKey) {
        if (anyKey.status === 'revoked') error = 'REVOKED_KEY';
        else if (anyKey.date !== today) error = 'EXPIRED_KEY';
      }

      await AdminLog.create({
        action: 'verify_fail',
        ip,
        details: { key: cleanKey, error, installationId }
      });

      return res.status(401).json({ success: false, error });
    }

    // Device binding check
    if (keyDoc.usedDevices.length >= keyDoc.maxDevices) {
      if (!keyDoc.usedDevices.includes(installationId)) {
        await AdminLog.create({
          action: 'verify_fail',
          ip,
          details: { key: cleanKey, error: 'DEVICE_LIMIT', installationId }
        });
        return res.status(403).json({ success: false, error: 'DEVICE_LIMIT' });
      }
    } else {
      // Register this device if new
      if (!keyDoc.usedDevices.includes(installationId)) {
        keyDoc.usedDevices.push(installationId);
        await keyDoc.save();
      }
    }

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = keyDoc.expiresAt;

    await Session.create({
      installationId,
      sessionToken,
      key: cleanKey,
      expiresAt
    });

    await AdminLog.create({
      action: 'verify_success',
      ip,
      details: { key: cleanKey, installationId }
    });

    return res.json({
      success: true,
      expiresAt: expiresAt.toISOString(),
      serverTime: getServerTimeISO(),
      sessionToken
    });
  } catch (err) {
    console.error('verify-key error:', err);
    return res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

/**
 * GET /api/server-time
 */
router.get('/server-time', (req, res) => {
  res.json({
    serverTime: getServerTimeISO(),
    date: getKolkataDate(),
    timezone: 'Asia/Kolkata'
  });
});

/**
 * GET /api/key/status  (optional helper)
 */
router.get('/key/status', async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ success: false, error: 'MISSING_KEY' });

    const cleanKey = String(key).trim().toUpperCase();
    const today = getKolkataDate();
    const keyDoc = await Key.findOne({ key: cleanKey });

    if (!keyDoc) {
      return res.json({ success: false, status: 'INVALID' });
    }

    let status = keyDoc.status;
    if (keyDoc.date !== today && status === 'active') status = 'expired';

    res.json({
      success: true,
      status,
      date: keyDoc.date,
      expiresAt: keyDoc.expiresAt
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

/**
 * GET /api/today-key
 * Public endpoint for the website to show today's active key.
 * Rate-limited lightly.
 */
const todayKeyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, error: 'RATE_LIMITED' }
});

router.get('/today-key', todayKeyLimiter, async (req, res) => {
  try {
    const today = getKolkataDate();
    const keyDoc = await Key.findOne({ date: today, status: 'active' });

    if (!keyDoc) {
      return res.json({
        success: false,
        error: 'NO_KEY',
        message: 'No active key for today yet.'
      });
    }

    res.json({
      success: true,
      key: keyDoc.key,
      date: keyDoc.date,
      expiresAt: keyDoc.expiresAt.toISOString(),
      serverTime: getServerTimeISO()
    });
  } catch (err) {
    console.error('today-key error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

module.exports = router;
