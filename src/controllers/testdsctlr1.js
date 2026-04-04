const testsubmissionds1 = require('../Models/testsubmissionds1');
const aigenerationlogds = require('../Models/aigeneratedlogds');
const gptapikeyds = require('../Models/gptapikeyds');
const testds1 = require('../Models/testds1');
const classenr1 = require('../Models/classenr1');
const User = require("../Models/user");
const mongoose = require('mongoose');

// Create or Update Test (Updated for sections)
exports.createtestds1 = async (req, res) => {
  try {
    const {
      name, user, colid, classid, course, coursecode, testtitle, description,
      topic, scheduleddate, starttime, endtime, duration, totalnoofquestion,
      questions, sections, sectionBased, shufflequestions, showresultsimmediately,
      allowretake, passingscore, timelimit, proctoringmode, calculatorallowed,
      formulasheetallowed, instructions, rules, status, ispublished, year
    } = req.body;

    const filter = { testtitle, colid, user };
    const update = {
      name, user, colid, classid, course, coursecode, testtitle, description,
      topic, scheduleddate, starttime, endtime, duration, totalnoofquestion,
      questions, sections: sections || [], sectionBased: sectionBased || false,
      shufflequestions, showresultsimmediately, allowretake, passingscore,
      timelimit, proctoringmode, calculatorallowed, formulasheetallowed,
      instructions, rules, status, ispublished, updatedat: new Date(), year
    };

    const testdsnew = await testds1.findOneAndUpdate(filter, update, {
      new: true, upsert: true, setDefaultsOnInsert: true
    });

    res.status(200).json({
      success: true,
      data: testdsnew,
      message: "Test created/updated successfully"
    });
  } catch (error) {
    // res.status(400).json({ success: false, message: error.message });
  }
};

// Get Tests by user and colid (Using aggregation)
exports.gettestsbyuser1 = async (req, res) => {
  try {
    const { colid, user } = req.query;

    const pipeline = [
      { $match: { colid: parseInt(colid), user: user } },
      { $sort: { createdat: -1 } },
      {
        $addFields: {
          totalQuestionsCalculated: { $size: "$questions" },
          sectionsCount: { $size: { $ifNull: ["$sections", []] } }
        }
      }
    ];

    const testdsget = await testds1.aggregate(pipeline);

    res.status(200).json({
      success: true,
      count: testdsget.length,
      data: testdsget
    });
  } catch (error) {
    // res.status(400).json({ success: false, message: error.message });
  }
};

// Get Available Tests for Students (Using aggregation)
exports.getavailabletestsds1 = async (req, res) => {
  try {
    const { colid, classid, year, user } = req.query;
    const currentTime = new Date();

    const pipeline = [
      {
        $match: {
          colid: parseInt(colid),
          classid: classid,
          ispublished: true,
          starttime: { $lte: currentTime },
          endtime: { $gte: currentTime },
          status: { $in: ['scheduled', 'active'] },
          user,
          year
        }
      },
      { $sort: { starttime: 1 } },
      {
        $addFields: {
          totalQuestionsCalculated: { $size: "$questions" },
          sectionsCount: { $size: { $ifNull: ["$sections", []] } },
          isActive: {
            $and: [
              { $lte: ["$starttime", currentTime] },
              { $gte: ["$endtime", currentTime] }
            ]
          }
        }
      }
    ];

    const testdsavai = await testds1.aggregate(pipeline);

    res.status(200).json({
      success: true,
      count: testdsavai.length,
      data: testdsavai
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get eligible students with submission counts (Using aggregation)
exports.gettesteliiblestudents1 = async (req, res) => {
  try {
    const { testid } = req.params;

    // Use aggregation to get test info and enrolled students
    const testPipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(testid) } },
      {
        $lookup: {
          from: 'classenr1',
          let: { coursecode: '$coursecode', colid: '$colid' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$coursecode', '$$coursecode'] },
                    { $eq: ['$colid', '$$colid'] }
                  ]
                }
              }
            }
          ],
          as: 'enrolledStudents'
        }
      },
      {
        $lookup: {
          from: 'testsubmissionds1',
          let: { testid: { $toString: '$_id' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$testid', '$$testid'] } } }
          ],
          as: 'allSubmissions'
        }
      }
    ];

    const result = await testds1.aggregate(testPipeline);

    if (!result.length) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const testData = result[0];

    // Process submissions to create submission counts manually
    const submissionCounts = {};
    const submissionData = {};

    testData.allSubmissions.forEach(submission => {
      // Check all possible identifier fields
      const identifiers = [
        submission.studentid,
        submission.regno,
        submission.user,
        submission.name,
        submission.email
      ].filter(id => id && id.toString().trim() !== '');

      // Increment count for all valid identifiers
      identifiers.forEach(id => {
        const key = id.toString();
        submissionCounts[key] = (submissionCounts[key] || 0) + 1;

        // Store latest submission data
        if (!submissionData[key] ||
          new Date(submission.createdat) > new Date(submissionData[key].createdat)) {
          submissionData[key] = submission;
        }
      });
    });

    // Helper function to get submission count for a student using multiple possible identifiers
    const getSubmissionCount = (student) => {
      const possibleIds = [
        student.regno,
        student.email,
        student.student,
        student.user,
        student.name
      ].filter(id => id && id.toString().trim() !== '');

      let maxCount = 0;
      for (const id of possibleIds) {
        const count = submissionCounts[id.toString()] || 0;
        if (count > maxCount) {
          maxCount = count;
        }
      }
      return maxCount;
    };

    // Helper function to get latest submission data for a student
    const getLatestSubmission = (student) => {
      const possibleIds = [
        student.regno,
        student.email,
        student.student,
        student.user,
        student.name
      ].filter(id => id && id.toString().trim() !== '');

      let latestSubmission = null;
      let latestDate = null;

      for (const id of possibleIds) {
        const submission = submissionData[id.toString()];
        if (submission) {
          const submissionDate = new Date(submission.createdat);
          if (!latestDate || submissionDate > latestDate) {
            latestDate = submissionDate;
            latestSubmission = submission;
          }
        }
      }

      return latestSubmission;
    };

    const eligibleStudents = testData.enrolledStudents.map(student => {
      const submissionCount = getSubmissionCount(student);
      const latestSubmission = getLatestSubmission(student);

      return {
        studentId: student.regno || student.email || student.student,
        studentName: student.student,
        regno: student.regno,
        name: student.student,
        email: student.email,
        user: student.user,
        year: student.year,
        program: student.program,
        semester: student.semester,
        classgroup: student.classgroup,
        submissionCount: submissionCount,
        hasSubmitted: submissionCount > 0,
        hasSubmission: submissionCount > 0, // Alias for compatibility
        latestSubmission: latestSubmission,
        status: submissionCount > 0 ? 'Has Submitted' : 'Not Attempted',
        lastSubmissionDate: latestSubmission ? latestSubmission.createdat : null,
        enrollmentData: {
          year: student.year,
          program: student.program,
          semester: student.semester,
          classgroup: student.classgroup,
          gender: student.gender
        }
      };
    });

    return res.json({
      success: true,
      message: 'Eligible students retrieved successfully',
      data: eligibleStudents,
      total: eligibleStudents.length,
      testInfo: {
        title: testData.testtitle,
        coursecode: testData.coursecode
      },
      debug: {
        totalSubmissions: testData.allSubmissions.length,
        submissionCountsCreated: Object.keys(submissionCounts).length
      }
    });

  } catch (error) {
    // console.error('Error in gettesteliiblestudents1:', error);
    // res.status(400).json({ 
    //   success: false, 
    //   message: error.message,
    //   error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    // });
  }
};

// Allow student retake (Using aggregation for update)
exports.allowstudentretake1 = async (req, res) => {
  try {
    const { testid, studentid, user, colid } = req.body;

    // Verify test ownership using aggregation
    const testCheck = await testds1.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(testid),
          user: user,
          colid: parseInt(colid)
        }
      },
      { $project: { _id: 1, testtitle: 1 } }
    ]);

    if (!testCheck.length) {
      return res.status(404).json({
        success: false,
        message: 'Test not found or access denied'
      });
    }

    // Find student email by regno using aggregation
    const userPipeline = [
      { $match: { regno: studentid } },
      { $project: { email: 1 } }
    ];

    const userResult = await User.aggregate(userPipeline);

    if (!userResult.length) {
      return res.status(404).json({
        success: false,
        message: 'Student not found in user records'
      });
    }

    // Reset submission status using findOneAndUpdate
    const updatedSubmission = await testsubmissionds1.findOneAndUpdate(
      { testid: testid, studentid: userResult[0].email },
      { $set: { status: 'started', updatedat: new Date() } },
      { new: true, sort: { createdat: -1 } }
    );

    if (!updatedSubmission) {
      return res.status(404).json({
        success: false,
        message: 'No submission found for this student'
      });
    }

    return res.json({
      success: true,
      message: 'Student can now retake the test',
      data: {
        studentid: studentid,
        studentEmail: userResult[0].email,
        testid: testid,
        newStatus: updatedSubmission.status,
        submissionId: updatedSubmission._id
      }
    });
  } catch (error) {
    // res.status(400).json({ success: false, message: error.message });
  }
};

// Other exports remain the same...
exports.updatetestds1 = async (req, res) => {
  try {
    const { id, name, user, colid, classid, course, coursecode, testtitle, description,
      topic, scheduleddate, starttime, endtime, duration, totalnoofquestion,
      questions, sections, sectionBased, shufflequestions, showresultsimmediately,
      allowretake, passingscore, timelimit, proctoringmode, calculatorallowed,
      formulasheetallowed, instructions, rules, status, ispublished } = req.body;

    const testdsupdated = await testds1.findOneAndUpdate(
      { _id: id, colid: parseInt(colid), user: user },
      {
        name, user, colid, classid, course, coursecode, testtitle, description,
        topic, scheduleddate, starttime, endtime, duration, totalnoofquestion,
        questions, sections: sections || [], sectionBased: sectionBased || false,
        shufflequestions, showresultsimmediately, allowretake, passingscore,
        timelimit, proctoringmode, calculatorallowed, formulasheetallowed,
        instructions, rules, status, ispublished, updatedat: new Date()
      },
      { new: true }
    );

    if (!testdsupdated) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    res.status(200).json({
      success: true,
      data: testdsupdated,
      message: "Test updated successfully"
    });
  } catch (error) {
    // res.status(400).json({ success: false, message: error.message });
  }
};

exports.deletetestds1 = async (req, res) => {
  try {
    const { id, colid, user } = req.query;
    await testds1.findOneAndDelete({
      _id: id,
      colid: parseInt(colid),
      user: user
    });
    res.status(200).json({
      success: true,
      message: "Test deleted successfully"
    });
  } catch (error) {
    // res.status(400).json({ success: false, message: error.message });
  }
};

exports.publishtestds1 = async (req, res) => {
  try {
    const { id, colid, user } = req.body;
    const testdspublish = await testds1.findOneAndUpdate(
      { _id: id, colid: parseInt(colid), user: user },
      {
        ispublished: true,
        status: 'scheduled',
        publishedat: new Date(),
        updatedat: new Date()
      },
      { new: true }
    );

    if (!testdspublish) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    res.status(200).json({
      success: true,
      data: testdspublish,
      message: "Test published successfully"
    });
  } catch (error) {
    // res.status(400).json({ success: false, message: error.message });
  }
};

// API Key management functions remain the same...
exports.createapikeyds1 = async (req, res) => {
  try {
    const { name, user, colid, facultyid, defaultapikey, personalapikey,
      usepersonalkey, apikeyname, personalapikeyname, monthlylimit,
      currentusage, isactive, youtubeapikey, youtubequotaused, youtubequotalimit } = req.body;

    const filter = { facultyid, colid, user };
    const update = {
      name, user, colid, facultyid, defaultapikey, personalapikey,
      usepersonalkey, apikeyname, personalapikeyname, monthlylimit,
      currentusage, isactive,
      youtubeapikey: youtubeapikey || '',
      youtubequotaused: youtubequotaused || 0,
      youtubequotalimit: youtubequotalimit || 10000, updatedat: new Date()
    };

    const apikey = await gptapikeyds.findOneAndUpdate(filter, update, {
      new: true, upsert: true, setDefaultsOnInsert: true
    });

    res.status(200).json({
      success: true,
      data: apikey,
      message: "API key settings saved successfully"
    });
  } catch (error) {
    // res.status(400).json({ success: false, message: error.message });
  }
};

exports.getapikeyds1 = async (req, res) => {
  try {
    const { colid, facultyid, includekeys } = req.query;
    const apikey = await gptapikeyds.findOne({
      colid: parseInt(colid),
      facultyid: facultyid
    });

    if (!apikey) {
      return res.status(404).json({
        success: false,
        message: "API key settings not found"
      });
    }

    let response;
    if (includekeys === 'true') {
      response = apikey.toObject();
    } else {
      response = {
        ...apikey.toObject(),
        defaultapikey: apikey.defaultapikey ? '***HIDDEN***' : '',
        personalapikey: apikey.personalapikey ? '***HIDDEN***' : ''
      };
    }

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    // res.status(400).json({ success: false, message: error.message });
  }
};

exports.getactiveapikeyds1 = async (req, res) => {
  try {
    const { colid, facultyid } = req.query;
    const apikey = await gptapikeyds.findOne({
      colid: parseInt(colid),
      facultyid: facultyid,
      isactive: true
    });

    if (!apikey) {
      return res.status(404).json({
        success: false,
        message: "No active API key found"
      });
    }

    const activeKey = apikey.usepersonalkey && apikey.personalapikey
      ? apikey.personalapikey
      : apikey.defaultapikey;
    const keyName = apikey.usepersonalkey && apikey.personalapikey
      ? apikey.personalapikeyname
      : apikey.apikeyname;

    res.status(200).json({
      success: true,
      data: {
        apikey: activeKey,
        keyname: keyName,
        usepersonalkey: apikey.usepersonalkey,
        monthlylimit: apikey.monthlylimit,
        currentusage: apikey.currentusage,
        youtubeapikey: apikey.youtubeapikey || '',
        youtubequotaused: apikey.youtubequotaused || 0,
        youtubequotalimit: apikey.youtubequotalimit || 10000
      }
    });
  } catch (error) {
    // res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateusageds1 = async (req, res) => {
  try {
    const { colid, facultyid, tokensused } = req.body;
    const apikey = await gptapikeyds.findOneAndUpdate(
      { colid: parseInt(colid), facultyid: facultyid },
      {
        $inc: { currentusage: tokensused },
        lastusagedate: new Date(),
        updatedat: new Date()
      },
      { new: true }
    );

    if (!apikey) {
      return res.status(404).json({
        success: false,
        message: "API key settings not found"
      });
    }

    res.status(200).json({
      success: true,
      data: {
        currentusage: apikey.currentusage,
        monthlylimit: apikey.monthlylimit,
        remaining: apikey.monthlylimit - apikey.currentusage
      },
      message: "Usage updated successfully"
    });
  } catch (error) {
    // res.status(400).json({ success: false, message: error.message });
  }
};

exports.generatequestionsds1 = async (req, res) => {
  try {
    const { name, user, colid, testid, generatedquestions,
      topic, difficulty, questioncount, prompt, tokensused, cost } = req.body;

    const logFilter = { testid, colid, user };
    const logUpdate = {
      name, user, testid, facultyid: user, colid,
      cost: cost || 0,
      success: true,
      generatedat: new Date(),
      createdat: new Date()
    };

    await aigenerationlogds.findOneAndUpdate(logFilter, logUpdate, {
      new: true, upsert: true, setDefaultsOnInsert: true
    });

    // Also push to test if testid is provided
    if (testid) {
      await testds1.findOneAndUpdate(
        { _id: testid, colid: parseInt(colid), user: user },
        {
          $push: { questions: { $each: generatedquestions } },
          $inc: { totalnoofquestion: questioncount },
          updatedat: new Date()
        }
      );
    }

    res.status(200).json({
      success: true,
      message: "Questions generated and saved successfully"
    });
  } catch (error) {
    // res.status(400).json({ success: false, message: error.message });
  }
};

// checkstudenteligibility1 remains here
exports.checkstudenteligibility1 = async (req, res) => {
  try {
    const { testid, studentid } = req.params;

    // Use aggregation to check eligibility
    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(testid) } },
      {
        $lookup: {
          from: 'classenr1s',
          let: { coursecode: '$coursecode', colid: '$colid' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$coursecode', '$$coursecode'] },
                    { $eq: ['$colid', '$$colid'] },
                    { $eq: ['$regno', studentid] },
                    { $eq: ['$active', '1'] },
                    { $eq: ['$status1', 'active'] }
                  ]
                }
              }
            }
          ],
          as: 'enrollment'
        }
      },
      {
        $lookup: {
          from: 'users',
          let: { regno: studentid },
          pipeline: [
            { $match: { $expr: { $eq: ['$regno', '$$regno'] } } },
            { $project: { email: 1 } }
          ],
          as: 'userInfo'
        }
      },
      {
        $lookup: {
          from: 'testsubmissionds1',
          let: { testid: { $toString: '$_id' }, studentemail: { $arrayElemAt: ['$userInfo.email', 0] } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$testid', '$$testid'] },
                    { $eq: ['$studentid', '$$studentemail'] }
                  ]
                }
              }
            },
            { $sort: { createdat: -1 } },
            { $limit: 1 }
          ],
          as: 'submissions'
        }
      }
    ];

    const result = await testds1.aggregate(pipeline);

    if (!result.length) {
      return res.status(404).json({
        success: false,
        message: 'Test not found',
        canTakeTest: false
      });
    }

    const testData = result[0];
    const enrollment = testData.enrollment[0];
    const latestSubmission = testData.submissions[0];

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'Student not enrolled in this course',
        canTakeTest: false
      });
    }

    const canTakeTest = !latestSubmission || latestSubmission.status === 'started';

    return res.json({
      success: true,
      canTakeTest,
      submissionCount: testData.submissions.length,
      latestStatus: latestSubmission?.status || 'never-attempted',
      studentInfo: {
        name: enrollment.student,
        regno: enrollment.regno,
        program: enrollment.program
      }
    });
  } catch (error) {
    // res.status(400).json({ success: false, message: error.message });
  }
};

// Update test questions only
exports.updatetestquestionsds1 = async (req, res) => {
  try {
    const { testid, questions, colid, user } = req.body;

    // Validate ownership
    const test = await testds1.findOne({
      _id: testid,
      colid: parseInt(colid),
      user: user
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found or access denied'
      });
    }

    // Update questions
    test.questions = questions;
    test.totalnoofquestion = questions.length;
    test.updatedat = new Date();

    await test.save();

    res.status(200).json({
      success: true,
      data: test,
      message: 'Questions updated successfully'
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
