const testsubmissionds1 = require('../Models/testsubmissionds1');
const testds1 = require('../Models/testds1');
const mongoose = require('mongoose');

// Create or Update Test Submission
exports.createtestsubmissionds1 = async (req, res) => {
  try {
    const {
      name, user, testid, studentid, classid, colid, testtitle,
      starttime, endtime, timeremaining, answers, totalscore,
      percentage, grade, passed, status, tabswitches, warnings,
      suspiciousactivity, submissiondate, sectionBased, sectionScores
    } = req.body;

    const filter = { testid, studentid, colid };
    const update = {
      name, user, testid, studentid, classid, colid, testtitle,
      starttime, endtime, timeremaining, answers, totalscore,
      percentage, grade, passed, status, tabswitches, warnings,
      suspiciousactivity, submissiondate, sectionBased: sectionBased || false,
      sectionScores: sectionScores || [], updatedat: new Date()
    };

    const submission = await testsubmissionds1.findOneAndUpdate(filter, update, {
      new: true, upsert: true, setDefaultsOnInsert: true
    });

    res.status(200).json({
      success: true,
      data: submission,
      message: "Test submission created/updated successfully"
    });
  } catch (error) {
    // res.status(400).json({ success: false, message: error.message });
  }
};

// Get Test Submissions by user (Using aggregation)
exports.gettestsubmissionsbyuser1 = async (req, res) => {
  try {
    const { colid, user } = req.query;
    
    const pipeline = [
      { $match: { colid: parseInt(colid), user: user } },
      { $sort: { createdat: -1 } },
      {
        $addFields: {
          answeredCount: { $size: "$answers" },
          totalTimeSpent: { $sum: "$answers.timespent" }
        }
      }
    ];

    const submissions = await testsubmissionds1.aggregate(pipeline);

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (error) {
    // res.status(400).json({ success: false, message: error.message });
  }
};

// Get Test Submissions by testid (Using aggregation)
exports.gettestsubmissionsbytest1 = async (req, res) => {
  try {
    const { testid, colid } = req.query;
    
    const pipeline = [
      { $match: { testid: testid, colid: parseInt(colid) } },
      { $sort: { createdat: -1 } },
      {
        $addFields: {
          answeredCount: { $size: "$answers" },
          totalTimeSpent: { $sum: "$answers.timespent" }
        }
      },
      {
        $lookup: {
          from: 'testds1',
          let: { testId: { $toObjectId: '$testid' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$testId'] } } },
            { $project: { totalnoofquestion: 1, passingscore: 1 } }
          ],
          as: 'testInfo'
        }
      },
      {
        $addFields: {
          testInfo: { $arrayElemAt: ['$testInfo', 0] }
        }
      }
    ];

    const submissions = await testsubmissionds1.aggregate(pipeline);

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (error) {
    // res.status(400).json({ success: false, message: error.message });
  }
};

// Start Test Session (Optimized)
exports.starttestds1 = async (req, res) => {
  try {
    const { testid, studentid, colid, name, user, classid } = req.body;

    // Get test info using aggregation
    const testPipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(testid),
          colid: parseInt(colid),
          ispublished: true
        }
      },
      {
        $addFields: {
          isTimeValid: {
            $and: [
              { $lte: ['$starttime', new Date()] },
              { $gte: ['$endtime', new Date()] }
            ]
          }
        }
      }
    ];

    const testResult = await testds1.aggregate(testPipeline);
    
    if (!testResult.length) {
      return res.status(404).json({
        success: false,
        message: "Test not found or not published"
      });
    }

    const test = testResult[0];
    
    if (!test.isTimeValid) {
      return res.status(400).json({
        success: false,
        message: "Test is not available at this time"
      });
    }

    // Check existing submission
    const existingSubmission = await testsubmissionds1.findOne({
      testid, studentid, colid: parseInt(colid)
    });

    if (existingSubmission && !test.allowretake && existingSubmission.status !== 'started') {
      return res.status(400).json({
        success: false,
        message: "Test already attempted and retake not allowed"
      });
    }

    // Create/update submission
    const filter = { testid, studentid, colid: parseInt(colid) };
    const update = {
      name, user, testid, studentid, classid, colid: parseInt(colid),
      testtitle: test.testtitle, starttime: new Date(), status: 'started',
      timeremaining: test.duration * 60, answers: [], totalscore: 0,
      percentage: 0, sectionBased: test.sectionBased || false,
      sectionScores: test.sectionBased ? 
        test.sections.map(section => ({
          sectionName: section.name,
          totalQuestions: section.questionCount,
          answeredQuestions: 0,
          correctAnswers: 0,
          sectionScore: 0,
          sectionPercentage: 0
        })) : [],
      createdat: existingSubmission ? existingSubmission.createdat : new Date(),
      updatedat: new Date()
    };

    const submission = await testsubmissionds1.findOneAndUpdate(filter, update, {
      new: true, upsert: true, setDefaultsOnInsert: true
    });

    res.status(200).json({
      success: true,
      data: submission,
      test: test,
      message: `Test session started successfully ${existingSubmission ? '(Retake)' : '(First Attempt)'}`
    });
  } catch (error) {
    // res.status(400).json({ success: false, message: error.message });
  }
};

// Submit Answer (Optimized)
exports.submitanswerds1 = async (req, res) => {
  try {
    const { testid, studentid, colid, questionnumber,selectedanswerkey, selectedanswer, timespent, section } = req.body;

    // Use aggregation to update answer efficiently
    const updateResult = await testsubmissionds1.updateOne(
      {
        testid,
        studentid,
        colid: parseInt(colid),
        'answers.questionnumber': { $ne: questionnumber }
      },
      {
        $push: {
          answers: {
            questionnumber,
            selectedanswer: selectedanswerkey,
            timespent,
            section: section || null,
            iscorrect: false,
            points: 0
          }
        },
        $set: {
          status: 'in-progress',
          updatedat: new Date()
        }
      }
    );

    // If question already exists, update it
    if (updateResult.matchedCount === 0) {
      await testsubmissionds1.updateOne(
        {
          testid,
          studentid,
          colid: parseInt(colid),
          'answers.questionnumber': questionnumber
        },
        {
          $set: {
            'answers.$.selectedanswer': selectedanswerkey,
            'answers.$.timespent': timespent,
            'answers.$.section': section || null,
            status: 'in-progress',
            updatedat: new Date()
          }
        }
      );
    }

    const submission = await testsubmissionds1.findOne({
      testid, studentid, colid: parseInt(colid)
    });

    res.status(200).json({
      success: true,
      data: submission,
      message: "Answer submitted successfully"
    });
  } catch (error) {    
    // res.status(400).json({ success: false, message: error.message });
  }
};

// Submit Complete Test (Using aggregation for grading)
exports.submittestds1 = async (req, res) => {
  try {
    const { testid, studentid, colid } = req.body;

    // Use aggregation to get submission and test data together
    const pipeline = [
      {
        $match: {
          testid: testid,
          studentid: studentid,
          colid: parseInt(colid)
        }
      },
      {
        $lookup: {
          from: 'testds1',
          let: { testId: { $toObjectId: '$testid' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$testId'] } } }
          ],
          as: 'testInfo'
        }
      },
      {
        $addFields: {
          testInfo: { $arrayElemAt: ['$testInfo', 0] }
        }
      }
    ];

    const result = await testsubmissionds1.aggregate(pipeline);
    
    if (!result.length) {
      return res.status(404).json({
        success: false,
        message: "Test session not found"
      });
    }

    const submissionData = result[0];
    const test = submissionData.testInfo;

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found"
      });
    }

    // Calculate scores using aggregation pipeline
    const gradingPipeline = [
      { $match: { _id: submissionData._id } },
      {
        $addFields: {
          gradedAnswers: {
            $map: {
              input: '$answers',
              as: 'answer',
              in: {
                $let: {
                  vars: {
                    question: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: test.questions,
                            cond: { $eq: ['$$this.questionnumber', '$$answer.questionnumber'] }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: {
                    questionnumber: '$$answer.questionnumber',
                    selectedanswer: '$$answer.selectedanswer',
                    timespent: '$$answer.timespent',
                    section: '$$answer.section',
                    iscorrect: { $eq: ['$$question.correctanswer', '$$answer.selectedanswer'] },
                    points: {
                      $cond: [
                        { $eq: ['$$question.correctanswer', '$$answer.selectedanswer'] },
                        { $ifNull: ['$$question.points', 1] },
                        0
                      ]
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $addFields: {
          totalscore: { $sum: '$gradedAnswers.points' },
          maxPossibleScore: { $sum: test.questions.map(q => q.points || 1) }
        }
      },
      {
        $addFields: {
          percentage: {
            $multiply: [
              { $divide: ['$totalscore', '$maxPossibleScore'] },
              100
            ]
          }
        }
      },
      {
        $addFields: {
          passed: { $gte: ['$percentage', test.passingscore || 50] },
          grade: {
            $switch: {
              branches: [
                { case: { $gte: ['$percentage', 90] }, then: 'A' },
                { case: { $gte: ['$percentage', 80] }, then: 'B' },
                { case: { $gte: ['$percentage', 70] }, then: 'C' },
                { case: { $gte: ['$percentage', 60] }, then: 'D' }
              ],
              default: 'F'
            }
          }
        }
      }
    ];

    const gradedResult = await testsubmissionds1.aggregate(gradingPipeline);
    const gradedSubmission = gradedResult[0];

    // Calculate section scores if test is section-based
    let sectionScores = [];
    if (test.sectionBased && test.sections) {
      sectionScores = test.sections.map(section => {
        const sectionAnswers = gradedSubmission.gradedAnswers.filter(ans => ans.section === section.name);
        const correctAnswers = sectionAnswers.filter(ans => ans.iscorrect).length;
        const sectionScore = sectionAnswers.reduce((sum, ans) => sum + ans.points, 0);
        const maxSectionScore = section.questionCount * 1; // Assuming 1 point per question
        const sectionPercentage = maxSectionScore > 0 ? (sectionScore / maxSectionScore) * 100 : 0;

        return {
          sectionName: section.name,
          totalQuestions: section.questionCount,
          answeredQuestions: sectionAnswers.length,
          correctAnswers,
          sectionScore,
          sectionPercentage
        };
      });
    }

    // Update submission with calculated scores
    const updatedSubmission = await testsubmissionds1.findOneAndUpdate(
      { _id: submissionData._id },
      {
        $set: {
          answers: gradedSubmission.gradedAnswers,
          totalscore: gradedSubmission.totalscore,
          percentage: gradedSubmission.percentage,
          passed: gradedSubmission.passed,
          grade: gradedSubmission.grade,
          sectionScores: sectionScores,
          status: 'submitted',
          endtime: new Date(),
          submissiondate: new Date(),
          updatedat: new Date()
        }
      },
      { new: true }
    );

    // Update test statistics using aggregation
    const statsUpdate = await testsubmissionds1.aggregate([
      { $match: { testid: testid } },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          averageScore: { $avg: '$totalscore' },
          maxScore: { $max: '$totalscore' },
          minScore: { $min: '$totalscore' }
        }
      }
    ]);

    if (statsUpdate.length > 0) {
      await testds1.findByIdAndUpdate(test._id, {
        $set: {
          totalattempts: statsUpdate[0].totalAttempts,
          averagescore: statsUpdate[0].averageScore,
          maxscore: statsUpdate[0].maxScore,
          minscore: statsUpdate[0].minScore,
          updatedat: new Date()
        }
      });
    }

    res.status(200).json({
      success: true,
      data: updatedSubmission,
      message: "Test submitted successfully"
    });
  } catch (error) {
    // console.log(error);
    
    // res.status(400).json({ success: false, message: error.message });
  }
};

// Add this endpoint to your backend
exports.getstudentattemptscount = async (req, res) => {
  try {
    const { testid, studentid, colid } = req.query;
    
    const attemptCount = await testsubmissionds1.countDocuments({
      testid: testid,
      $or: [
        { studentid: studentid },
        { user: studentid },
        { regno: studentid }
      ],
      colid: colid,
      status: 'submitted'
    });
    
    res.json({
      success: true,
      data: { attemptCount }
    });
    
  } catch (error) {
    // res.status(400).json({
    //   success: false,
    //   message: error.message
    // });
  }
};
