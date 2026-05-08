// Reports Controller implementing aggregations for regular, advance, and remedial

// Models (regular)
const Attendance = require('../Models/attendancenew');
const Enrollment = require('../Models/classenr1');
const Assignments = require('../Models/massignments');
const AssignmentSubmissions = require('../Models/massignsubmit');
// Models (advance)
const AttendanceAdvance = require('../Models/attendancenewadvance');
const EnrollmentAdvance = require('../Models/classenr1advance');
const AssignmentsAdvance = require('../Models/massignmentsadvance');
const AssignmentSubmissionsAdvance = require('../Models/massignsubmitadvance');
// Models (remedial)
const AttendanceRemedial = require('../Models/attendancenewremedial');
const EnrollmentRemedial = require('../Models/classenr1remedial');
const AssignmentsRemedial = require('../Models/massignmentsremedial');
const AssignmentSubmissionsRemedial = require('../Models/massignsubmitremedial');

// Tests (shared)
const Tests = require('../Models/testds1');
const TestSubmissions = require('../Models/testsubmissionds1');
// Syllabus
const Syllabus = require('../Models/msyllabus');
const SyllabusAdvance = require('../Models/msyllabusadvance');
const SyllabusRemedial = require('../Models/msyllabusremedial');
// Materials
const Materials = require('../Models/mcoursematerial');
const MaterialsAdvance = require('../Models/mcoursematerialadvance');
const MaterialsRemedial = require('../Models/mcoursematerialremedial');
// AI analysis
const AIVideo = require('../Models/aivideoanalysisds');
const AIVideoAdvance = require('../Models/aivideoanalysisdsadvance');
const AIVideoRemedial = require('../Models/aivideoanalysisdsremedial');
// Collaboration
const Collaboration = require('../Models/collaborationds');
const CollaborationPost = require('../Models/collaborationpostds');
const CollaborationRequest = require('../Models/collaborationrequestds');
// Library
const Book = require('../Models/book');
const Project = require('../Models/projects');
const Publication = require('../Models/publications');
const Seminar = require('../Models/seminar');
const Patent = require('../Models/patents');
// Notifications
const Notification = require('../Models/notificationds');

function pickModels(type) {
  switch ((type || 'regular').toLowerCase()) {
    case 'advance':
      return {
        Attendance: AttendanceAdvance,
        Enrollment: EnrollmentAdvance,
        Assignments: AssignmentsAdvance,
        AssignmentSubmissions: AssignmentSubmissionsAdvance,
        Syllabus: SyllabusAdvance,
        Materials: MaterialsAdvance,
        AIVideo: AIVideoAdvance,
      };
    case 'remedial':
      return {
        Attendance: AttendanceRemedial,
        Enrollment: EnrollmentRemedial,
        Assignments: AssignmentsRemedial,
        AssignmentSubmissions: AssignmentSubmissionsRemedial,
        Syllabus: SyllabusRemedial,
        Materials: MaterialsRemedial,
        AIVideo: AIVideoRemedial,
      };
    default:
      return {
        Attendance,
        Enrollment,
        Assignments,
        AssignmentSubmissions,
        Syllabus,
        Materials,
        AIVideo,
      };
  }
}

function buildDateMatch(from, to, field) {
  const match = {};
  if (from) match.$gte = new Date(from);
  if (to) match.$lte = new Date(to);
  return Object.keys(match).length ? { [field]: match } : {};
}

exports.attendanceSummary = async (req, res) => {
  try {
    const { type } = req.params;
    const { coursecode, colid, from, to } = req.query;
    const { Attendance } = pickModels(type);

    const match = {
      ...(coursecode ? { coursecode } : {}),
      ...(colid ? { colid: parseInt(colid, 10) } : {}),
      ...buildDateMatch(from, to, 'classdate'),
    };

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$regno',
          name: { $last: '$name' },
          presents: { $sum: { $cond: [{ $eq: ['$att', 1] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
      {
        $project: {
          regno: '$_id',
          name: 1,
          percent: { $cond: [{ $eq: ['$total', 0] }, 0, { $multiply: [{ $divide: ['$presents', '$total'] }, 100] }] },
          _id: 0,
        },
      },
    ];

    const students = await Attendance.aggregate(pipeline);
    const bands = {
      lt50: students.filter(s => s.percent < 50).length,
      b50_74: students.filter(s => s.percent >= 50 && s.percent < 75).length,
      b75_89: students.filter(s => s.percent >= 75 && s.percent < 90).length,
      gte90: students.filter(s => s.percent >= 90).length,
    };
    const avg = students.length ? students.reduce((a, b) => a + b.percent, 0) / students.length : 0;
    res.json({ success: true, data: { bands, averagePercent: avg, totalStudents: students.length } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'attendance summary failed' });
  }
};

exports.attendanceBelowThreshold = async (req, res) => {
  try {
    const { type } = req.params;
    const { coursecode, colid, from, to, threshold = 75 } = req.query;
    const { Attendance } = pickModels(type);
    const match = {
      ...(coursecode ? { coursecode } : {}),
      ...(colid ? { colid: parseInt(colid, 10) } : {}),
      ...buildDateMatch(from, to, 'classdate'),
    };

    const rows = await Attendance.aggregate([
      { $match: match },
      { $group: { _id: '$regno', name: { $last: '$name' }, presents: { $sum: { $cond: [{ $eq: ['$att', 1] }, 1, 0] } }, total: { $sum: 1 } } },
      { $project: { regno: '$_id', name: 1, percent: { $cond: [{ $eq: ['$total', 0] }, 0, { $multiply: [{ $divide: ['$presents', '$total'] }, 100] }] }, _id: 0 } },
      { $match: { percent: { $lt: parseFloat(threshold) } } },
      { $sort: { percent: 1 } },
    ]);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'below threshold failed' });
  }
};

exports.courseSummary = async (req, res) => {
  try {
    const { type } = req.params;
    const { coursecode, colid } = req.query;
    const { Enrollment } = pickModels(type);
    const match = {
      ...(coursecode ? { coursecode } : {}),
      ...(colid ? { colid: parseInt(colid, 10) } : {}),
    };
    const total = await Enrollment.countDocuments(match);
    const active = await Enrollment.countDocuments({ ...match, active: 'Yes' });
    const inactive = total - active;
    res.json({ success: true, data: { total, active, inactive } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'course summary failed' });
  }
};

exports.assignmentsSummary = async (req, res) => {
  try {
    const { type } = req.params;
    const { coursecode, colid, from, to } = req.query;
    const { Assignments, AssignmentSubmissions } = pickModels(type);
    const base = {
      ...(coursecode ? { coursecode } : {}),
      ...(colid ? { colid: parseInt(colid, 10) } : {}),
    };

    const assnMatch = { ...base, ...buildDateMatch(from, to, 'duedate') };
    const subMatch = { ...base, ...buildDateMatch(from, to, 'submitdate') };

    const [assignmentsCount, submissionsCount] = await Promise.all([
      Assignments.countDocuments(assnMatch),
      AssignmentSubmissions.countDocuments(subMatch),
    ]);

    const submissionRate = assignmentsCount ? (submissionsCount / assignmentsCount) * 100 : 0;
    res.json({ success: true, data: { assignmentsCount, submissionsCount, submissionRate } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'assignments summary failed' });
  }
};

// NEW: Assignments by-assignment drilldown
exports.assignmentsByAssignment = async (req, res) => {
  try {
    const { type } = req.params;
    const { coursecode, colid, from, to } = req.query;
    const { Assignments, AssignmentSubmissions } = pickModels(type);

    const assnMatch = {
      ...(coursecode ? { coursecode } : {}),
      ...(colid ? { colid: parseInt(colid, 10) } : {}),
      ...buildDateMatch(from, to, 'duedate'),
    };
    const subMatch = {
      ...(coursecode ? { coursecode } : {}),
      ...(colid ? { colid: parseInt(colid, 10) } : {}),
      ...buildDateMatch(from, to, 'submitdate'),
    };

    const assignments = await Assignments.aggregate([
      { $match: assnMatch },
      { $project: { _id: 1, assignment: 1, duedate: 1 } },
    ]);

    const submissions = await AssignmentSubmissions.aggregate([
      { $match: subMatch },
      { $group: { _id: '$assignmentid', submissions: { $sum: 1 } } },
    ]);

    const subMap = new Map(submissions.map(s => [s._id, s.submissions]));
    const rows = assignments.map(a => ({
      assignmentid: String(a._id),
      assignment: a.assignment,
      duedate: a.duedate,
      submissions: subMap.get(String(a._id)) || 0,
    }));

    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'assignments by-assignment failed' });
  }
};

exports.testsSummary = async (req, res) => {
  try {
    const { coursecode, colid, from, to, passPercent = 40 } = req.query;
    const testMatch = {
      ...(coursecode ? { coursecode } : {}),
      ...(colid ? { colid: parseInt(colid, 10) } : {}),
      ...buildDateMatch(from, to, 'scheduleddate'),
    };
    const subMatch = {
      ...(coursecode ? { coursecode } : {}),
      ...(colid ? { colid: parseInt(colid, 10) } : {}),
      ...buildDateMatch(from, to, 'submissiondate'),
    };

    const testsCount = await Tests.countDocuments(testMatch);
    const attendees = await TestSubmissions.countDocuments(subMatch);

    const submissions = await TestSubmissions.find(subMatch, { percentage: 1, _id: 0 });
    const pass = submissions.filter(s => (s.percentage || 0) >= parseFloat(passPercent)).length;
    const fail = attendees - pass;
    const passRate = attendees ? (pass / attendees) * 100 : 0;

    res.json({ success: true, data: { testsCount, attendees, pass, fail, passRate } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'tests summary failed' });
  }
};

// NEW: Tests by-test drilldown
exports.testsByTest = async (req, res) => {
  try {
    const { coursecode, colid, from, to, passPercent = 40 } = req.query;
    const testMatch = {
      ...(coursecode ? { coursecode } : {}),
      ...(colid ? { colid: parseInt(colid, 10) } : {}),
      ...buildDateMatch(from, to, 'scheduleddate'),
    };

    const tests = await Tests.find(testMatch, { _id: 1, testtitle: 1, scheduleddate: 1 }).lean();
    if (!tests.length) return res.json({ success: true, data: [] });

    const testIds = tests.map(t => String(t._id));
    const submissions = await TestSubmissions.aggregate([
      { $match: { ...(coursecode ? { coursecode } : {}), ...(colid ? { colid: parseInt(colid, 10) } : {}), ...(from || to ? buildDateMatch(from, to, 'submissiondate') : {}) } },
      { $match: { testid: { $in: testIds } } },
      { $group: { _id: '$testid', attendees: { $sum: 1 }, pass: { $sum: { $cond: [{ $gte: ['$percentage', parseFloat(passPercent)] }, 1, 0] } } } },
      { $project: { testid: '$_id', attendees: 1, pass: 1, _id: 0 } },
    ]);
    const subMap = new Map(submissions.map(s => [s.testid, s]));
    const rows = tests.map(t => {
      const sd = subMap.get(String(t._id));
      const attendees = sd?.attendees || 0;
      const pass = sd?.pass || 0;
      const fail = attendees - pass;
      return { testid: String(t._id), title: t.testtitle, scheduleddate: t.scheduleddate, attendees, pass, fail };
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'tests by-test failed' });
  }
};

// NEW: Attendance by-session (date-wise summary)
exports.attendanceBySession = async (req, res) => {
  try {
    const { type } = req.params;
    const { coursecode, colid, from, to } = req.query;
    const { Attendance } = pickModels(type);
    const match = {
      ...(coursecode ? { coursecode } : {}),
      ...(colid ? { colid: parseInt(colid, 10) } : {}),
      ...buildDateMatch(from, to, 'classdate'),
    };
    const rows = await Attendance.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$classdate' } },
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$att', 1] }, 1, 0] } },
        },
      },
      { $project: { date: '$_id', total: 1, present: 1, absent: { $subtract: ['$total', '$present'] }, _id: 0 } },
      { $sort: { date: 1 } },
    ]);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'attendance by-session failed' });
  }
};

// NEW: Consolidated Attendance Report
exports.consolidatedAttendanceReport = async (req, res) => {
  try {
    const { type } = req.params;
    const { coursecode, colid, from, to, regno, semester, year } = req.query;
    const { Attendance } = pickModels(type);

    const match = {
      ...(coursecode ? { coursecode } : {}),
      ...(colid ? { colid: parseInt(colid, 10) } : {}),
      ...buildDateMatch(from, to, 'classdate'),
      ...(regno ? { regno } : {}),
    };

    // Additional filtering for semester and year if provided
    if (semester) {
      // Assuming semester is stored in the format 'S1', 'S2', etc.
      // This part might need adjustment based on actual data schema
    }
    if (year) {
      // Assuming year is part of the date
    }

    const rows = await Attendance.aggregate([
      { $match: match },
      { $group: { _id: { regno: '$regno', name: '$name' }, present: { $sum: { $cond: [{ $eq: ['$att', 1] }, 1, 0] } }, total: { $sum: 1 } } },
      { $project: { regno: '$_id.regno', name: '$_id.name', present: 1, total: 1, absent: { $subtract: ['$total', '$present'] }, percent: { $cond: [{ $eq: ['$total', 0] }, 0, { $multiply: [{ $divide: ['$present', '$total'] }, 100] }] }, _id: 0 } },
      { $sort: { percent: -1 } },
    ]);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'consolidated attendance report failed' });
  }
};

// NEW: Attendance student table (detailed per-student)
exports.attendanceStudentTable = async (req, res) => {
  try {
    const { type } = req.params;
    const { coursecode, colid, from, to } = req.query;
    const { Attendance } = pickModels(type);
    const match = {
      ...(coursecode ? { coursecode } : {}),
      ...(colid ? { colid: parseInt(colid, 10) } : {}),
      ...buildDateMatch(from, to, 'classdate'),
    };
    const rows = await Attendance.aggregate([
      { $match: match },
      { $group: { _id: { regno: '$regno', name: '$name' }, present: { $sum: { $cond: [{ $eq: ['$att', 1] }, 1, 0] } }, total: { $sum: 1 } } },
      { $project: { regno: '$_id.regno', name: '$_id.name', present: 1, total: 1, absent: { $subtract: ['$total', '$present'] }, percent: { $cond: [{ $eq: ['$total', 0] }, 0, { $multiply: [{ $divide: ['$present', '$total'] }, 100] }] }, _id: 0 } },
      { $sort: { percent: -1 } },
    ]);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'attendance student-table failed' });
  }
};

// NEW: Course enrollments over time
exports.courseOverTime = async (req, res) => {
  try {
    const { type } = req.params;
    const { coursecode, colid, from, to } = req.query;
    const { Enrollment } = pickModels(type);
    const match = {
      ...(coursecode ? { coursecode } : {}),
      ...(colid ? { colid: parseInt(colid, 10) } : {}),
      ...buildDateMatch(from, to, 'createdAt'),
    };
    // If Enrollment has no createdAt, fall back to grouping by _id timestamp
    const dateExpr = { $ifNull: ['$createdAt', { $toDate: '$_id' }] };
    const rows = await Enrollment.aggregate([
      { $match: match },
      { $addFields: { _created: dateExpr } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$_created' } }, count: { $sum: 1 } } },
      { $project: { date: '$_id', count: 1, _id: 0 } },
      { $sort: { date: 1 } },
    ]);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'course over-time failed' });
  }
};

// ====================
// Syllabus Reports
// ====================
exports.syllabusSummary = async (req, res) => {
  try {
    const { type } = req.params;
    const { coursecode, colid } = req.query;
    const { Syllabus } = pickModels(type);
    const match = { ...(coursecode ? { coursecode } : {}), ...(colid ? { colid: parseInt(colid, 10) } : {}) };
    const total = await Syllabus.countDocuments(match);
    const completed = await Syllabus.countDocuments({ ...match, status1: 'Completed' });
    const pending = total - completed;
    const percent = total ? (completed * 100) / total : 0;
    res.json({ success: true, data: { total, completed, pending, percent } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'syllabus summary failed' });
  }
};

exports.syllabusBySession = async (req, res) => {
  try {
    const { type } = req.params;
    const { coursecode, colid, from, to } = req.query;
    const { Syllabus } = pickModels(type);
    const match = { ...(coursecode ? { coursecode } : {}), ...(colid ? { colid: parseInt(colid, 10) } : {}), ...buildDateMatch(from, to, 'updatedAt') };
    const rows = await Syllabus.aggregate([
      { $match: match },
      { $addFields: { _updated: { $ifNull: ['$updatedAt', { $toDate: '$_id' }] } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$_updated' } }, completed: { $sum: { $cond: [{ $eq: ['$status1', 'Completed'] }, 1, 0] } }, total: { $sum: 1 } } },
      { $project: { date: '$_id', percent: { $cond: [{ $eq: ['$total', 0] }, 0, { $multiply: [{ $divide: ['$completed', '$total'] }, 100] }] }, _id: 0 } },
      { $sort: { date: 1 } },
    ]);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'syllabus by-session failed' });
  }
};

// ====================
// Materials Reports
// ====================
exports.materialsSummary = async (req, res) => {
  try {
    const { type } = req.params;
    const { coursecode, colid } = req.query;
    const { Materials } = pickModels(type);
    const match = { ...(coursecode ? { coursecode } : {}), ...(colid ? { colid: parseInt(colid, 10) } : {}) };
    const total = await Materials.countDocuments(match);
    const pdf = await Materials.countDocuments({ ...match, filetype: 'pdf' });
    const video = await Materials.countDocuments({ ...match, filetype: 'video' });
    const doc = await Materials.countDocuments({ ...match, filetype: 'doc' });
    res.json({ success: true, data: { total, pdf, video, doc } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'materials summary failed' });
  }
};

exports.materialsOverTime = async (req, res) => {
  try {
    const { type } = req.params;
    const { coursecode, colid, from, to } = req.query;
    const { Materials } = pickModels(type);
    const match = { ...(coursecode ? { coursecode } : {}), ...(colid ? { colid: parseInt(colid, 10) } : {}), ...buildDateMatch(from, to, 'createdAt') };
    const rows = await Materials.aggregate([
      { $match: match },
      { $addFields: { _created: { $ifNull: ['$createdAt', { $toDate: '$_id' }] } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$_created' } }, count: { $sum: 1 } } },
      { $project: { date: '$_id', count: 1, _id: 0 } },
      { $sort: { date: 1 } },
    ]);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'materials over-time failed' });
  }
};

// ====================
// AI Analysis Reports
// ====================
exports.aiSummary = async (req, res) => {
  try {
    const { type } = req.params;
    const { coursecode, colid } = req.query;
    const { AIVideo } = pickModels(type);
    const match = { ...(coursecode ? { coursecode } : {}), ...(colid ? { colid: parseInt(colid, 10) } : {}) };
    const total = await AIVideo.countDocuments(match);
    const completed = await AIVideo.countDocuments({ ...match, status: 'completed' });
    const processing = await AIVideo.countDocuments({ ...match, status: { $in: ['searching', 'analyzing', 'generating'] } });
    const failed = await AIVideo.countDocuments({ ...match, status: 'failed' });
    res.json({ success: true, data: { total, completed, processing, failed } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'ai summary failed' });
  }
};

// ====================
// Collaboration Reports
// ====================
exports.collabSummary = async (req, res) => {
  try {
    const { colid } = req.query;
    const match = colid ? { colid: parseInt(colid, 10) } : {};
    const active = await Collaboration.countDocuments({ ...match, status1: 'active' });
    const posts = await CollaborationPost.countDocuments(match);
    const requests = await CollaborationRequest.countDocuments(match);
    res.json({ success: true, data: { active, posts, requests } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'collab summary failed' });
  }
};

exports.collabOverTime = async (req, res) => {
  try {
    const { colid, from, to } = req.query;
    const match = { ...(colid ? { colid: parseInt(colid, 10) } : {}), ...buildDateMatch(from, to, 'createdAt') };
    const rows = await CollaborationPost.aggregate([
      { $match: match },
      { $addFields: { _created: { $ifNull: ['$createdAt', { $toDate: '$_id' }] } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$_created' } }, count: { $sum: 1 } } },
      { $project: { date: '$_id', count: 1, _id: 0 } },
      { $sort: { date: 1 } },
    ]);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'collab over-time failed' });
  }
};

// ====================
// Library Reports
// ====================
exports.librarySummary = async (req, res) => {
  try {
    const { colid } = req.query;
    const match = colid ? { colid: parseInt(colid, 10) } : {};
    const books = await Book.countDocuments(match);
    const projects = await Project.countDocuments(match);
    const publications = await Publication.countDocuments(match);
    const seminars = await Seminar.countDocuments(match);
    const patents = await Patent.countDocuments(match);
    res.json({ success: true, data: { books, projects, publications, seminars, patents } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'library summary failed' });
  }
};

// ====================
// Notifications Reports
// ====================
exports.notificationsSummary = async (req, res) => {
  try {
    const { colid } = req.query;
    const match = colid ? { colid: parseInt(colid, 10) } : {};
    const total = await Notification.countDocuments(match);
    const unread = await Notification.countDocuments({ ...match, read: false });
    const read = total - unread;
    res.json({ success: true, data: { total, read, unread } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'notifications summary failed' });
  }
};

