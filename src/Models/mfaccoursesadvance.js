const mongoose=require('mongoose');

const mfaccoursesadvanceschema = new mongoose.Schema({
    name: {
        type: String,
        required: [true,'Please enter name']
    },
    user: {
        type: String,
        required: [true,'Please enter user'],
        unique: false
    },
    colid: {
        type: Number,
        required: [true,'Please enter colid']
    },
    year: {
type: String
},
coursename: {
type: String
},
coursecode: {
type: String
},
type: {
type: String
},
status1: {
        type: String
    },
    comments: {
        type: String
    }
})
//
const mfaccoursesadvance=mongoose.model('mfaccoursesadvance',mfaccoursesadvanceschema);

module.exports=mfaccoursesadvance;