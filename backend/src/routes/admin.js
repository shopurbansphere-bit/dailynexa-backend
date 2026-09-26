const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Key = require('../models/Key');
const Session = require('../models/Session');
const AdminLog = require('../models/AdminLog');
const { getKolkataDate, getExpiresAt, getServerTimeISO } = require('../utils/time');
const { generateDailyKey } = require('../utils/keygen');

const router = express.Router();

// Simple admin auth middleware
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
  }
}

/**
 * POST /api/admin/login
 */
router.post('/login', async (req, res) => {
  const ip = req.ip || 'unknown';
  try {
    const { password } = req.body;
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      await AdminLog.create({ action: 'admin_login_fail', ip });
      return res.status(401).json({ success: false, error: 'INVALID_PASSWORD' });
    }

    const token = jwt.sign(
      { role: 'admin', ts: Date.now() },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    await AdminLog.create({ action: 'admin_login', ip });
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

/**
 * POST /api/admin/generate-key
 * Generates (or regenerates) today's key
 */
router.post('/generate-key', adminAuth, async (req, res) => {
  const ip = req.ip || 'unknown';
  try {
    const today = getKolkataDate();
    const expiresAt = getExpiresAt(today);

    // Revoke any existing active key for today
    await Key.updateMany(
      { date: today, status: 'active' },
      { status: 'revoked', revokedAt: new Date() }
    );

    let newKey;
    let attempts = 0;
    do {
      newKey = generateDailyKey();
      attempts++;
      if (attempts > 20) throw new Error('Could not generate unique key');
    } while (await Key.findOne({ key: newKey }));

    const keyDoc = await Key.create({
      key: newKey,
      date: today,
      expiresAt,
      status: 'active',
      maxDevices: 1,
      usedDevices: []
    });

    await AdminLog.create({
      action: 'generate_key',
      ip,
      details: { key: newKey, date: today }
    });

    res.json({
      success: true,
      key: keyDoc.key,
      date: keyDoc.date,
      expiresAt: keyDoc.expiresAt.toISOString(),
      serverTime: getServerTimeISO()
    });
  } catch (err) {
    console.error('generate-key error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

/**
 * POST /api/admin/revoke-key
 */
router.post('/revoke-key', adminAuth, async (req, res) => {
  const ip = req.ip || 'unknown';
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ success: false, error: 'MISSING_KEY' });

    const cleanKey = String(key).trim().toUpperCase();
    const keyDoc = await Key.findOne({ key: cleanKey });
    if (!keyDoc) return res.status(404).json({ success: false, error: 'NOT_FOUND' });

    keyDoc.status = 'revoked';
    keyDoc.revokedAt = new Date();
    await keyDoc.save();

    // Invalidate sessions for this key
    await Session.deleteMany({ key: cleanKey });

    await AdminLog.create({
      action: 'revoke_key',
      ip,
      details: { key: cleanKey }
    });

    res.json({ success: true, message: 'Key revoked' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

/**
 * GET /api/admin/keys
 */
router.get('/keys', adminAuth, async (req, res) => {
  try {
    const keys = await Key.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select('-__v');
    res.json({ success: true, keys });
  } catch (err) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

/**
 * GET /api/admin/stats
 */
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const today = getKolkataDate();
    const todayKey = await Key.findOne({ date: today, status: 'active' });

    const [successCount, failCount, activeSessions] = await Promise.all([
      AdminLog.countDocuments({ action: 'verify_success' }),
      AdminLog.countDocuments({ action: 'verify_fail' }),
      Session.countDocuments({ expiresAt: { $gt: new Date() } })
    ]);

    res.json({
      success: true,
      today: {
        date: today,
        key: todayKey ? todayKey.key : null,
        expiresAt: todayKey ? todayKey.expiresAt : null,
        devicesUsed: todayKey ? todayKey.usedDevices.length : 0
      },
      totals: {
        successfulVerifications: successCount,
        failedVerifications: failCount,
        activeSessions
      },
      serverTime: getServerTimeISO()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

/**
 * GET /api/admin/logs
 */
router.get('/logs', adminAuth, async (req, res) => {
  try {
    const logs = await AdminLog.find()
      .sort({ timestamp: -1 })
      .limit(100);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

module.exports = router;
