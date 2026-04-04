const mongoose = require('mongoose');

const AIJobSchema = new mongoose.Schema({
    // WHO: Ownership
    user: { type: String, required: true },       // e.g. "prof@college.edu"
    colid: { type: Number, required: true },      // Institution ID

    // WHAT: The Job Details
    type: {
        type: String,
        required: true
        // No enum, allows for any job type key (e.g., 'generate_test_questions', 'generate_class_topics')
    },

    // DATA: All input needed for the AI (flexible object)
    payload: {
        // For Tests: { topic: "Math", count: 20, difficulty: "hard"... }
        // For Classes: { course: "CS101", hours: 40... }
        type: Object,
        required: true
    },

    // STATUS: The Lifecycle
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
        index: true // Important for the worker to find jobs fast
    },

    // RESULT: What the AI produced
    result: { type: Object }, // The generated questions/topics

    // ROBUSTNESS FIELDS
    attempts: { type: Number, default: 0 },       // How many times we tried
    lastError: { type: String },                  // Message from the last crash
    nextRunAt: { type: Date, default: Date.now }, // For Backoff (don't retry immediately)

    // TIMESTAMPS
    createdat: { type: Date, default: Date.now },
    updatedat: { type: Date, default: Date.now },
    completedat: { type: Date }
});

module.exports = mongoose.model('aijobds', AIJobSchema);
