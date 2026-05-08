const mongoose = require('mongoose');

const contactschema = new mongoose.Schema({
    name: {
        type: String,
    },
    email: {
        type: String,
    },
    phone:{
        type: String,
    },
    message:{
        type: String,
    }
}, { timestamps: true });

const contactds = mongoose.model('contactds', contactschema);

module.exports = contactds;