const mongoose = require('mongoose');

const messagedsschema = new mongoose.Schema({
    room: {
        type: String,
        required: [true, 'Please enter room']
    },
    sender: {
        type: String,
        required: [true, 'Please enter sender email']
    },
    sendername: {
        type: String,
        required: [true, 'Please enter sender name']
    },
    role: {
        type: String,
        required: [true, 'Please enter sender role']
    },
    message: {
        type: String,
        required: [true, 'Please enter message']
    },
    msgtype: {
        type: String,
        default: 'text'
    },
    fileurl: {
        type: String
    },
    colid: {
        type: Number,
        required: [true, 'Please enter colid']
    },
    course: {
        type: String,
        required: [true, 'Please enter course']
    },
    coursecode: {
        type: String,
        required: [true, 'Please enter course code'] 
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    status1: {
        type: String
    },
    comments: {
        type: String
    }
});

// Add index for better query performance
messagedsschema.index({ room: 1, colid: 1, coursecode: 1, timestamp: 1 });

const messageds = mongoose.model('messageds', messagedsschema);

module.exports = messageds;
