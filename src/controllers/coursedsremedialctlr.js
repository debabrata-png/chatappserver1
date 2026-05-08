const mfaccourses = require('../Models/mfaccoursesremedial');
const classenr1 = require('../Models/classenr1remedial');
const massignments = require('../Models/massignmentsremedial');
const massignsubmit = require('../Models/massignsubmitremedial');
const msyllabus = require('../Models/msyllabusremedial');
const mcoursematerial = require('../Models/mcoursematerialremedial');
const messageds = require('../Models/messageds');
const Awsconfig = require('../Models/awsconfig');

// ======================
// COURSE MANAGEMENT CONTROLLERS
// ======================

exports.createcourseremedial = async (req, res) => {
    try {
        const { name, user, colid, year, coursename, coursecode, type } = req.body;

        const newCourse = await mfaccourses.create({
            name,
            user,
            colid,
            year,
            coursename,
            coursecode,
            type
        });

        res.status(201).json({
            success: true,
            message: 'Course created successfully',
            data: newCourse
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to create course',
        //     error: error.message
        // });
    }
};

exports.getcoursebyfacultyremedial = async (req, res) => {
    try {
        const { user, colid } = req.query;

        const courses = await mfaccourses.find({ user, colid: parseInt(colid) });

        res.json({
            success: true,
            message: 'Faculty courses retrieved successfully',
            data: courses
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve faculty courses',
        //     error: error.message
        // });
    }
};

exports.getcoursesbystudentremedial = async (req, res) => {
    try {
        const { regno, colid } = req.query;

        const enrollments = await classenr1.find({regno, colid: parseInt(colid), active: 'Yes' });
        
        res.json({
            success: true,
            message: 'Student courses retrieved successfully',
            data: enrollments
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve student courses',
        //     error: error.message
        // });
    }
};

// Update remedial course
exports.updatecourseremedial = async (req, res) => {
  try {
    const { id } = req.params;
    const { coursename, coursecode, year, type, status1, comments } = req.body;

    const updatedCourse = await mfaccourses.findByIdAndUpdate(
      id,
      { coursename, coursecode, year, type, status1, comments },
      { new: true, runValidators: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({
        success: false,
        message: 'Remedial course not found'
      });
    }

    res.json({
      success: true,
      message: 'Remedial course updated successfully',
      data: updatedCourse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update remedial course',
      error: error.message
    });
  }
};

// Delete remedial course
exports.deletecourseremedial = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCourse = await mfaccourses.findByIdAndDelete(id);

    if (!deletedCourse) {
      return res.status(404).json({
        success: false,
        message: 'Remedial course not found'
      });
    }

    res.json({
      success: true,
      message: 'Remedial course deleted successfully',
      data: deletedCourse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete remedial course',
      error: error.message
    });
  }
};


// ======================
// ASSIGNMENT CONTROLLERS
// ======================

exports.createassignmentremedial = async (req, res) => {
    try {
        const { name, user, colid, year, course, coursecode, assignment, description, duedate, type, methodology, learning, doclink } = req.body;

        const newAssignment = await massignments.create({
            name,
            user,
            colid,
            year,
            course,
            coursecode,
            assignment,
            description,
            duedate,
            type,
            methodology,
            learning,
            doclink
        });

        res.status(201).json({
            success: true,
            message: 'Assignment created successfully',
            data: newAssignment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create assignment',
            error: error.message
        });
    }
};

exports.getassignmentsbycourseremedial = async (req, res) => {
    try {
        const { coursecode, colid } = req.query;

        const assignments = await massignments.find({ 
            coursecode, 
            colid: parseInt(colid) 
        }).sort({ duedate: 1 });

        res.json({
            success: true,
            message: 'Assignments retrieved successfully',
            data: assignments
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve assignments',
        //     error: error.message
        // });
    }
};

exports.getassignmentsfirstudentremedial = async (req, res) => {
    try {
        const { coursecode, colid, regno } = req.query;

        const assignments = await massignments.find({
            coursecode,
            colid: parseInt(colid)
        }).sort({ duedate: 1 });

        const assignmentsWithSubmissions = await Promise.all(
            assignments.map(async (assignment) => {
                const submission = await massignsubmit.findOne({
                    assignmentid: assignment._id,
                    regno: regno
                });
                
                return {
                    ...assignment._doc,
                    hasSubmitted: !!submission,
                    submission: submission
                };
            })
        );

        res.json({
            success: true,
            message: 'Student assignments retrieved successfully',
            data: assignmentsWithSubmissions
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve student assignments',
        //     error: error.message
        // });
    }
};

exports.submitassignmentremedial = async (req, res) => {
    try {
        const { name, user, colid, year, course, coursecode, assignment, assignmentid, student, regno, description, doclink } = req.body;

        const newSubmission = await massignsubmit.create({
            name,
            user,
            colid,
            year,
            course,
            coursecode,
            assignment,
            assignmentid,
            student,
            regno,
            description,
            submitdate: new Date(),
            doclink
        });

        res.status(201).json({
            success: true,
            message: 'Assignment submitted successfully',
            data: newSubmission
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to submit assignment',
        //     error: error.message
        // });
    }
};

exports.getassignmentsubmissionsremedial = async (req, res) => {
    try {
        const { assignmentid } = req.params;

        const submissions = await massignsubmit.find({ assignmentid }).sort({ submitdate: -1 });

        res.json({
            success: true,
            message: 'Assignment submissions retrieved successfully',
            data: submissions
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve submissions',
        //     error: error.message
        // });
    }
};

// ======================
// SYLLABUS CONTROLLERS
// ======================

exports.createsyllabusremedial = async (req, res) => {
    try {
        const { name, user, colid, year, course, coursecode, module, description, credits, courselink, type } = req.body;

        const newSyllabus = await msyllabus.create({
            name,
            user,
            colid,
            year,
            course,
            coursecode,
            module,
            description,
            credits,
            courselink,
            type,
            completed: 'no'
        });

        res.status(201).json({
            success: true,
            message: 'Syllabus created successfully',
            data: newSyllabus
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to create syllabus',
        //     error: error.message
        // });
    }
};

exports.getsyllabusbycourseremedial = async (req, res) => {
    try {
        const { coursecode, colid } = req.query;

        const syllabus = await msyllabus.find({ 
            coursecode, 
            colid: parseInt(colid) 
        }).sort({ createdAt: 1 });

        res.json({
            success: true,
            message: 'Syllabus retrieved successfully',
            data: syllabus
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve syllabus',
        //     error: error.message
        // });
    }
};

exports.marksyllabuscompleteremedial = async (req, res) => {
    try {
        const { id } = req.params;
        const { completed } = req.body;

        const updatedSyllabus = await msyllabus.findByIdAndUpdate(
            id, 
            { completed }, 
            { new: true }
        );

        if (!updatedSyllabus) {
            return res.status(404).json({
                success: false,
                message: 'Syllabus not found'
            });
        }

        res.json({
            success: true,
            message: 'Syllabus completion status updated',
            data: updatedSyllabus
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to update syllabus',
        //     error: error.message
        // });
    }
};

// ======================
// COURSE MATERIAL CONTROLLERS
// ======================

exports.createcoursematerialremedial = async (req, res) => {
    try {
        const { name, user, colid, year, course, coursecode, slideno, title, description, imagelink, voicetext, doclink, type, mode } = req.body;

        const newMaterial = await mcoursematerial.create({
            name,
            user,
            colid,
            year,
            course,
            coursecode,
            slideno,
            title,
            description,
            imagelink,
            voicetext,
            doclink,
            type,
            mode
        });

        res.status(201).json({
            success: true,
            message: 'Course material created successfully',
            data: newMaterial
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to create course material',
        //     error: error.message
        // });
    }
};

exports.getcoursematerialsbycourseremedial = async (req, res) => {
    try {
        const { coursecode, colid } = req.query;

        const materials = await mcoursematerial.find({ 
            coursecode, 
            colid: parseInt(colid) 
        }).sort({ slideno: 1 });

        res.json({
            success: true,
            message: 'Course materials retrieved successfully',
            data: materials
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve course materials',
        //     error: error.message
        // });
    }
};

// ======================
// MESSAGE CONTROLLERS
// ======================

exports.savemessageremedial = async (req, res) => {
    try {
        const { room, sender, sendername, role, message, msgtype, fileurl, colid, course, coursecode, timestamp } = req.body;

        const newMessage = await messageds.create({
            room,
            sender,
            sendername,
            role,
            message,
            msgtype: msgtype || 'text',
            fileurl,
            colid,
            course,
            coursecode,
            timestamp: timestamp || new Date()
        });

        res.status(201).json({
            success: true,
            message: 'Message saved successfully',
            data: {
                _id: newMessage._id,
                messageId: newMessage._id
            }
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to save message',
        //     error: error.message
        // });
    }
};

exports.getmessagesbyroomremedial = async (req, res) => {
    try {
        const { room } = req.params;
        const { colid, coursecode } = req.query;

        let query = { room };
        
        if (colid) {
            query.colid = parseInt(colid);
        }
        
        if (coursecode) {
            query.coursecode = coursecode;
        }

        const messages = await messageds.find(query)
            .sort({ timestamp: 1 })
            .limit(100);

        res.json({
            success: true,
            message: 'Messages retrieved successfully',
            data: messages
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve messages',
        //     error: error.message
        // });
    }
};

// Add this new controller function
exports.getawsconfigbycolidremedial = async (req, res) => {
    try {
        const { colid } = req.query;

        const awsConfig = await Awsconfig.find({ colid: parseInt(colid) });

        res.json({
            success: true,
            message: 'AWS config retrieved successfully',
            data: awsConfig
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve AWS config',
        //     error: error.message
        // });
    }
};


// checking the student is allready enrolled or not 
exports.checkexistingenrollmentremedial = async (req, res) => {
  try {
    const { colid, regno, student, coursecode, course, user } = req.query;
    
    const existingEnrollment = await classenr1.findOne({
      colid: parseInt(colid),
      regno,
      student,
      coursecode,
      course,
      user
    });

    res.json({
      success: true,
      exists: !!existingEnrollment,
      enrollment: existingEnrollment || null
    });
  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to check enrollment',
    //   error: error.message
    // });
  }
};