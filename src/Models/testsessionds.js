const mongoose = require('mongoose');

// Test session schema
const testsessionschema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter student name']
    },
    user: {
        type: String,
        required: [true, 'Please enter student user'],
        unique: false
    },
    testid: {
        type: String,
        required: [true, 'Please enter test id']
    },
    studentid: {
        type: String,
        required: [true, 'Please enter student id']
    },
    sessionid: {
        type: String,
        required: [true, 'Please enter session id'],
        unique: true
    },
    colid: {
        type: Number,
        required: [true, 'Please enter colid']
    },
    sessionstarttime: {
        type: Date,
        required: [true, 'Please enter session start time']
    },
    sessionendtime: {
        type: Date
    },
    ipaddress: {
        type: String
    },
    useragent: {
        type: String
    },
    browserinfo: {
        type: String
    },
    screenresolution: {
        type: String
    },
    tabswitchcount: {
        type: Number,
        default: 0
    },
    tabswitchtimes: [Date],
    keypresses: {
        type: Number,
        default: 0
    },
    mouseclicks: {
        type: Number,
        default: 0
    },
    activitylog: [String],
    status: {
        type: String,
        enum: ['active', 'paused', 'completed', 'terminated'],
        default: 'active'
    },
    warnings: [String],
    violationscount: {
        type: Number,
        default: 0
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

const testsessionds = mongoose.model('testsessionds', testsessionschema);
module.exports = testsessionds;
