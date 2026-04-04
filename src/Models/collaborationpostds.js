// Models/collaborationPost.js - UPDATED VERSION
const mongoose = require('mongoose');

const collaborationPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please enter title']
  },
  description: {
    type: String,
    required: [true, 'Please enter description']
  },
  // ✅ UPDATED: Made projectId optional since now we support publications and others
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  user: {
    type: String,
    required: [true, 'Please enter user']
  },
  colid: {
    type: Number,
    required: [true, 'Please enter colid']
  },
  department: {
    type: String,
    required: [true, 'Please enter department']
  },
  requiredSkills: {
    type: [String],
    default: []
  },
  collaborationType: {
    type: String,
    enum: ['Technical', 'Research', 'Funding', 'Advisory', 'Implementation'],
    required: [true, 'Please select collaboration type']
  },
  maxCollaborators: {
    type: Number,
    default: 3
  },
  currentCollaborators: {
    type: Number,
    default: 0
  },
  visibility: {
    type: String,
    enum: ['same-college', 'cross-college', 'public'],
    default: 'cross-college'
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'in-progress'],
    default: 'open'
  },
  deadline: {
    type: Date
  },
  postedAt: {
    type: Date,
    default: Date.now
  },
  // ✅ NEW FIELDS FOR DIFFERENT POST TYPES
  postFor: {
    type: String,
    enum: ['project', 'publication', 'other'],
    required: [true, 'Please select post type']
  },
  otherType: {
    type: String,
    required: function() {
      return this.postFor === 'other';
    }
  },
  // ✅ NEW: Add reference fields for publications
  publicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Publication'
  }
});

const collaborationpostds = mongoose.model('collaborationpostds', collaborationPostSchema);

module.exports = collaborationpostds;
