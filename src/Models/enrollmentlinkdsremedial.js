// models/enrollmentlinkds.js
const mongoose = require('mongoose');

const enrollmentlinkdsSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, index: true },
    name: { type: String, required: true }, 
    colid: { type: Number, required: true, index: true }, 
    course: { type: String, required: true },                      // course title
    coursecode: { type: String, required: true, index: true },     // e.g., cs101
    year: { type: String, required: true },                        // academic session/year
    coursetype: {type: String},
    program: { type: String, default: '' },
    programcode: { type: String, default: '' },

    // link identity
    token: { type: String, required: true, unique: true, index: true },

    // lifecycle
    status: { type: String, default: 'active' },                   // active | revoked
    createdat: { type: Date, default: Date.now },
    // optional ttl; set on create if you want auto-expiry
    expiresat: { type: Date }
  },
);

// ttl index (auto-removes docs at expiresat). only effective if expiresat is set.
enrollmentlinkdsSchema.index({ expiresat: 1 }, { expireAfterSeconds: 0 });

// fast lookup by creator and course
enrollmentlinkdsSchema.index({ colid: 1, user: 1, coursecode: 1 });

const enrollmentlinkdsremedial = mongoose.model('enrollmentlinkdsremedial', enrollmentlinkdsSchema);
module.exports = enrollmentlinkdsremedial;