const mongoose = require('mongoose');

// Answer schema (Updated)
const answerschema = new mongoose.Schema({
  questionnumber: {
    type: Number,
    required: [true, 'Please enter question number']
  },
  selectedanswer: { type: String },
  selectedanswerkey: { type: String },
  iscorrect: { type: Boolean, default: false },
  points: { type: Number, default: 0 },
  timespent: { type: Number, default: 0 },
  section: { type: String }, // NEW: Section name
  negativeMarksApplied: { type: Number, default: 0 }
});

// Section score schema - NEW
const sectionscoreshema = new mongoose.Schema({
  sectionName: { type: String, required: true },
  totalQuestions: { type: Number, default: 0 },
  answeredQuestions: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  sectionScore: { type: Number, default: 0 },
  sectionPercentage: { type: Number, default: 0 }
});

// Test submission schema (Updated)
const testsubmissionschema = new mongoose.Schema({
  name: { type: String, required: [true, 'Please enter student name'] },
  user: { type: String, required: [true, 'Please enter student user'], unique: false },
  testid: { type: String, required: [true, 'Please enter test id'] },
  studentid: { type: String, required: [true, 'Please enter student id'] },
  classid: { type: String, required: [true, 'Please enter class id'] },
  colid: { type: Number, required: [true, 'Please enter colid'] },
  testtitle: { type: String, required: [true, 'Please enter test title'] },
  starttime: { type: Date, required: [true, 'Please enter start time'] },
  endtime: { type: Date },
  timeremaining: { type: Number, default: 0 },
  answers: [answerschema],
  totalscore: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  grade: { type: String },
  passed: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['started', 'in-progress', 'submitted', 'auto-submitted', 'graded'],
    default: 'started'
  },

  // NEW FIELDS for section-based tests
  sectionBased: { type: Boolean, default: false },
  sectionScores: [sectionscoreshema],

  tabswitches: { type: Number, default: 0 },
  warnings: [String],
  suspiciousactivity: { type: Boolean, default: false },
  submissiondate: { type: Date },
  lastQuestionAttempted: { type: Number, default: 0 },
  resumeAllowed: { type: Boolean, default: false },
  resumePermissionGrantedBy: { type: String },
  resumePermissionGrantedAt: { type: Date },
  sessionTerminatedAt: { type: Date },
  canResume: { type: Boolean, default: false },
  resumeCount: { type: Number, default: 0 },
  createdat: { type: Date, default: Date.now },
  updatedat: { type: Date, default: Date.now }
});

const testsubmissionds1 = mongoose.model('testsubmissionds1', testsubmissionschema);
module.exports = testsubmissionds1;
