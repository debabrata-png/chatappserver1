const User = require('../Models/user');
const crypto = require('crypto');

// Encryption configuration
const ENCRYPTION_KEY = 'wdnewohwekcndkjncdkjncdjkncjk123';
const ALGORITHM = 'aes-256-cbc';

// Helper: Get valid till date (+90 days)
function getValidTill() {
  const now = new Date();
  now.setDate(now.getDate() + 90);
  return now;
}

// Derive a 32-byte key once (same as in encryptColid)
const KEY_BUF = crypto.createHash('sha256').update(ENCRYPTION_KEY, 'utf8').digest(); // 32 bytes

// Helper: Decrypt institute code to get colid (returns number or null)
function decryptInstituteCode(instituteCode) {
  try {
    if (!instituteCode || typeof instituteCode !== 'string') return null;
    const parts = instituteCode.split(':');
    if (parts.length !== 2) return null;

    const iv = Buffer.from(parts[0], 'hex');
    const ciphertext = Buffer.from(parts[1], 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY_BUF, iv);
    const d1 = decipher.update(ciphertext);
    const d2 = decipher.final();
    const plain = Buffer.concat([d1, d2]).toString('utf8');

    const n = Number(plain);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

exports.registeruser = async (req, res) => {
  try {
    const {
      joinType,
      instituteCode,
      role,                 // "Faculty" | "Student"
      name, email, phone, password,
      department, admissionyear,
      regno, programcode, semester, section, gender,
      photo, expotoken, category, address, quota, user: usertype,
      addedby, status1, comments, status, enrollcolid
    } = req.body;

    // Basic validations
    if (!joinType) return res.status(400).json({ success: false, message: 'joinType is required' });
    if (role !== 'Faculty' && role !== 'Student') {
      return res.status(400).json({ success: false, message: 'role must be "Faculty" or "Student"' });
    }
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'name, email, password, phone are mandatory' });
    }

    // Unique email
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ success: false, message: 'User already exists' });

    // Resolve colid
    let colid;
    if(enrollcolid){
      colid = parseInt(enrollcolid, 10);
    } else if (joinType === 'individual') {
      colid = 111362;
    } else if (joinType === 'withInstitute') {
      if (!instituteCode) return res.status(400).json({ success: false, message: 'instituteCode is required' });
      colid = decryptInstituteCode(instituteCode);
      if (!colid) return res.status(400).json({ success: false, message: 'Invalid institute code' });
    } else {
      return res.status(400).json({ success: false, message: 'joinType must be individual or withInstitute' });
    }

    // Build document per role (KISS)
    const doc = {
      email,
      name,
      phone,
      password,            // plain as requested
      role,                // exact case
      gender: gender ?? '',
      photo: photo ?? '',
      expotoken: expotoken ?? '',
      category: category ?? '',
      address: address ?? '',
      quota: quota ?? '',
      user: email ?? '',
      addedby: addedby ?? '',
      status1: status1 ?? '',
      comments: comments ?? '',
      lastlogin: getValidTill(),
      colid: parseInt(colid, 10),
      status: status ?? 1,
    };

    if (role === 'Student') {
      // All required fields must be present
      if (!regno || !programcode || !admissionyear || !semester || !section || !department) {
        return res.status(400).json({
          success: false,
          message: 'Student requires regno, programcode, admissionyear, semester, section, department'
        });
      }
      doc.regno = regno;
      doc.programcode = programcode;
      doc.admissionyear = admissionyear;
      doc.semester = semester;
      doc.section = section;
      doc.department = department;
    } else {
      // Faculty: require department + admissionyear, others "NA"
      if (!department || !admissionyear) {
        return res.status(400).json({
          success: false,
          message: 'Faculty requires department and admissionyear'
        });
      }
      doc.department = department;
      doc.admissionyear = admissionyear;
      doc.regno = 'NA';
      doc.programcode = 'NA';
      doc.semester = 'NA';
      doc.section = 'NA';
    }

    const created = await User.create(doc);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: created._id,
          email: created.email,
          name: created.name,
          role: created.role,
          colid: created.colid,
          validTill: created.lastlogin
        }
      }
    });
  } catch (e) {
    // console.log('registeruser error:', e);
    // return res.status(500).json({ success: false, message: 'Registration failed', error: e.message });
  }
};


exports.loginuser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const u = await User.findOne({ email });
    if (!u || u.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!u.lastlogin || u.lastlogin < new Date()) {
      return res.status(403).json({ success: false, message: 'Account validity expired', accountExpired: true });
    }
    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: u._id, email: u.email, name: u.name, role: u.role, regno: u.regno, department: u.department,
          colid: u.colid, photo: u.photo, programcode: u.programcode, semester: u.semester, section: u.section, validTill: u.lastlogin
        }
      }
    });
  } catch (e) {
    // return res.status(500).json({ success: false, message: 'Login failed', error: e.message });
  }
};