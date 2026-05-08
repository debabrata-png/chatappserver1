const mongoose = require('mongoose');

// Question schema
const questionschema = new mongoose.Schema({
  questionnumber: {
    type: Number,
    required: [true, 'Please enter question number']
  },
  question: {
    type: String,
    required: [true, 'Please enter question text']
  },
  questiontype: {
    type: String,
    required: [true, 'Please enter question type'],
    enum: ['multiple-choice', 'short-answer', 'essay', 'true-false', 'math'],
    default: 'multiple-choice'
  },
  optiona: { type: String },
  optionb: { type: String },
  optionc: { type: String },
  optiond: { type: String },
  correctanswer: {
    type: String,
    required: [true, 'Please enter correct answer']
  },
  explanation: { type: String },
  points: { type: Number, default: 1 },
  hasmathcontent: { type: Boolean, default: false },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  section: { type: String }, // NEW: Section name
  tags: [String],
  questionimage: { type: String }, // URL to uploaded image
  negativemarking: { type: Boolean, default: false },
  negativemarks: { type: Number, default: 0 },
  isgenerated: { type: Boolean, default: false }
});

// Section schema - NEW
const sectionschema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Section name is required']
  },
  questionCount: {
    type: Number,
    required: [true, 'Question count is required']
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  marksPerQuestion: { type: Number, default: 1 },
  negativeMarkingEnabled: { type: Boolean, default: false },
  negativeMarks: { type: Number, default: 0 }
});

// Test schema (Updated)
const testschema = new mongoose.Schema({
  name: { type: String, required: [true, 'Please enter name'] },
  user: { type: String, required: [true, 'Please enter user'], unique: false },
  colid: { type: Number, required: [true, 'Please enter colid'] },
  classid: { type: String, required: [true, 'Please enter class id'] },
  course: { type: String, required: [true, 'Please enter course'] },
  coursecode: { type: String, required: [true, 'Please enter course code'] },
  testtitle: { type: String, required: [true, 'Please enter test title'], unique: false },
  description: { type: String },
  topic: { type: String, required: [true, 'Please enter topic'] },
  scheduleddate: { type: Date, required: [true, 'Please enter scheduled date'] },
  starttime: { type: Date, required: [true, 'Please enter start time'] },
  endtime: { type: Date, required: [true, 'Please enter end time'] },
  duration: { type: Number, required: [true, 'Please enter duration in minutes'] },
  totalnoofquestion: { type: Number, required: [true, 'Please enter total number of questions'] },

  // NEW FIELDS
  sectionBased: { type: Boolean, default: false },
  sections: [sectionschema],

  questions: [questionschema],
  shufflequestions: { type: Boolean, default: false },
  showresultsimmediately: { type: Boolean, default: true },
  allowretake: { type: Boolean, default: false },
  passingscore: { type: Number, default: 50 },
  timelimit: { type: Boolean, default: true },
  proctoringmode: { type: Boolean, default: false },
  calculatorallowed: { type: Boolean, default: false },
  formulasheetallowed: { type: Boolean, default: false },
  globalNegativeMarking: { type: Boolean, default: false },
  globalNegativeMarks: { type: Number, default: 0 },
  allowResume: { type: Boolean, default: false }, // Allow students to resume
  resumeTimeLimit: { type: Number, default: 24 }, // Hours to allow resume
  aigenerationprompt: { type: String },
  chatgptapikey: { type: String },
  generationdate: { type: Date },
  instructions: {
    type: String,
    default: "Read all questions carefully and answer to the best of your ability."
  },
  rules: [String],
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },
  ispublished: { type: Boolean, default: false },
  publishedat: { type: Date },
  totalattempts: { type: Number, default: 0 },
  averagescore: { type: Number, default: 0 },
  maxscore: { type: Number, default: 0 },
  minscore: { type: Number, default: 0 },
  createdat: { type: Date, default: Date.now },
  updatedat: { type: Date, default: Date.now },
  year: { type: String }
});

const testds1 = mongoose.model('testds1', testschema);
module.exports = testds1;
