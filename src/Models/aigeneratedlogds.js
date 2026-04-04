const mongoose = require('mongoose');

// AI generation log schema
const aigenerationlogschema = new mongoose.Schema({
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
    prompt: {
        type: String,
        required: [true, 'Please enter generation prompt']
    },
    topic: {
        type: String,
        required: [true, 'Please enter topic']
    },
    difficulty: {
        type: String,
        required: [true, 'Please enter difficulty level']
    },
    questioncount: {
        type: Number,
        required: [true, 'Please enter question count']
    },
    apiresponse: {
        type: String
    },
    tokensused: {
        type: Number,
        default: 0
    },
    cost: {
        type: Number,
        default: 0
    },
    success: {
        type: Boolean,
        default: true
    },
    error: {
        type: String
    },
    generatedat: {
        type: Date,
        default: Date.now
    },
    createdat: {
        type: Date,
        default: Date.now
    }
});

const aigeneratedlogds = mongoose.model('aigeneratedlogds', aigenerationlogschema);
module.exports = aigeneratedlogds;
