const mongoose = require('mongoose');

const aivideoanalysisadvanceschema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter name']
  },
  user: {
    type: String,
    required: [true, 'Please enter user'],
    unique: false
  },
  colid: {
    type: Number,
    required: [true, 'Please enter colid']
  },
  classid: {
    type: String,
    required: [true, 'Please enter class id']
  },
  coursecode: {
    type: String,
    required: [true, 'Please enter course code']
  },
  coursename: {
    type: String
  },
  topic: {
    type: String,
    required: [true, 'Please enter topic']
  },
  
  // YouTube Search Results
  youtubeVideos: [{
    videoId: String,
    title: String,
    url: String,
    thumbnail: String,
    duration: String,
    channelName: String,
    publishedAt: Date
  }],
  
  // Selected Video for Analysis
  selectedVideoUrl: {
    type: String
  },
  selectedVideoTitle: {
    type: String
  },
  
  // AI Analysis Results
  aiSummary: {
    type: String
  },
  learningObjectives: [String],
  difficultyLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced']
  },
  keyTimestamps: [{
    time: String,
    concept: String
  }],
  relevanceScore: {
    type: Number,
    min: 0,
    max: 1
  },
  
  // Generated Assignment
  generatedAssignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'massignmentsadvance'
  },
  assignmentData: {
    assignmentTitle: String,
    description: String,
    questions: [String],
    practicalExercises: [String],
    deliverables: [String],
    gradingRubric: String,
    estimatedTime: String,
    dueDate: String
  },
  
  // Processing Status
  status: {
    type: String,
    enum: ['pending', 'searching', 'analyzing', 'generating', 'completed', 'failed'],
    default: 'pending'
  },
  
  // Chat Integration
  chatRoomId: {
    type: String
  },
  
  // Processing Log
  processingLog: [String],
  
  // API Usage Tracking
  youtubeQuotaUsed: {
    type: Number,
    default: 0
  },
  geminiTokensUsed: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  
  status1: {
    type: String
  },
  comments: {
    type: String
  }
});

// Index for better query performance
aivideoanalysisadvanceschema.index({ colid: 1, user: 1, status: 1 });
aivideoanalysisadvanceschema.index({ classid: 1 });
aivideoanalysisadvanceschema.index({ chatRoomId: 1 });

const aivideoanalysisdsadvance = mongoose.model('aivideoanalysisdsadvance', aivideoanalysisadvanceschema);
module.exports = aivideoanalysisdsadvance;