const mongoose = require('mongoose');

// Test settings schema
const testsettingsschema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter faculty name']
    },
    user: {
        type: String,
        required: [true, 'Please enter faculty user'],
        unique: false
    },
    testid: {
        type: String,
        required: [true, 'Please enter test id']
    },
    facultyid: {
        type: String,
        required: [true, 'Please enter faculty id']
    },
    colid: {
        type: Number,
        required: [true, 'Please enter colid']
    },
    chatgptapikey: {
        type: String,
        required: [true, 'Please enter ChatGPT API key']
    },
    defaultdifficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    defaultquestiontype: {
        type: String,
        enum: ['multiple-choice', 'short-answer', 'essay', 'true-false', 'math'],
        default: 'multiple-choice'
    },
    defaultduration: {
        type: Number,
        default: 60
    },
    defaultpassingscore: {
        type: Number,
        default: 50
    },
    alloweddomains: [String],
    ipwhitelist: [String],
    emailnotifications: {
        type: Boolean,
        default: true
    },
    smsnotifications: {
        type: Boolean,
        default: false
    },
    autogeneration: {
        type: Boolean,
        default: true
    },
    mathrendering: {
        type: Boolean,
        default: true
    },
    createdat: {
        type: Date,
        default: Date.now
    },
    updatedat: {
        type: Date,
        default: Date.now
    }
});

const testsettingds = mongoose.model('testsettingds', testsettingsschema);
module.exports = testsettingds;
