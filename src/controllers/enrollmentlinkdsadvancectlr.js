// controllers/enrollmentlinkdsctlr.js
const crypto = require('crypto');
const enrollmentlinkds = require('../Models/enrollmentlinkdsadvance');

// url-safe short token
function gentoken() {
  return crypto.randomBytes(9).toString('base64url'); // ~12 chars
}

// POST /api/v2/create-enrollment-link
// body: { colid, user, name, course, coursecode, year, program?, programcode?, ttlMinutes? }
exports.createenrollmentlinkadvance = async (req, res) => {
  try {
    const { colid, user, name, course, coursecode, year, program, programcode, ttlMinutes, coursetype } = req.body;
    if (!colid || !user || !name || !course || !coursecode || !year) {
      return res.status(400).json({ success: false, message: 'colid, user, name, course, coursecode, year are required' });
    }
    const token = gentoken();
    const doc = {
      token,
      colid: parseInt(colid, 10),
      user,
      name,
      course,
      coursecode,
      year,
      program: program || '',
      programcode: programcode || '',
      coursetype
    };
    if (ttlMinutes && Number(ttlMinutes) > 0) {
      const d = new Date();
      d.setMinutes(d.getMinutes() + Number(ttlMinutes));
      doc.expiresat = d;
    }
    const created = await enrollmentlinkds.create(doc);
    return res.status(201).json({ success: true, message: 'link created', data: { token: created.token, expiresAt: created.expiresat || null } });
  } catch (e) {
    // return res.status(500).json({ success: false, message: 'failed to create link', error: e.message });
  }
};

// GET /api/v2/enrollment-links?colid=...&user=...&coursecode=...
exports.getenrollmentlinksbycreatoradvance = async (req, res) => {
  try {
    const { colid, user, coursecode } = req.query;
    if (!colid || !user || !coursecode) {
      return res.status(400).json({ success: false, message: 'colid, user, coursecode are required' });
    }
    const list = await enrollmentlinkds
      .find({ colid: parseInt(colid, 10), user, coursecode })
      .sort({ createdat: -1 })
      .lean();
    return res.json({ success: true, data: list });
  } catch (e) {
    // return res.status(500).json({ success: false, message: 'failed to fetch links', error: e.message });
  }
};

// GET /api/v2/enrollment-link/:token
exports.resolveenrollmenttokenadvance = async (req, res) => {
  try {
    const { token } = req.params;
    const link = await enrollmentlinkds.findOne({ token }).lean();
    if (!link) return res.status(404).json({ success: false, message: 'invalid or expired link' });
    if (link.status !== 'active') return res.status(410).json({ success: false, message: 'link not active' });
    const meta = {
      colid: link.colid,
      course: link.course,
      coursecode: link.coursecode,
      year: link.year,
      program: link.program || '',
      programcode: link.programcode || '',
      creatorUser: link.user,
      creatorName: link.name,
      coursetype: link.coursetype
    };
    return res.json({ success: true, data: meta });
  } catch (e) {
    // return res.status(500).json({ success: false, message: 'failed to resolve link', error: e.message });
  }
};

// PUT /api/v2/enrollment-link/:token/revoke
exports.revokeenrollmentlinkadvance = async (req, res) => {
  try {
    const { token } = req.params;
    await enrollmentlinkds.updateOne({ token }, { $set: { status: 'revoked' } });
    return res.json({ success: true, message: 'link revoked' });
  } catch (e) {
    // return res.status(500).json({ success: false, message: 'failed to revoke link', error: e.message });
  }
};