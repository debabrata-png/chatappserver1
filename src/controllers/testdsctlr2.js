const testds1 = require('../Models/testds1');
const testsubmissionds1 = require('../Models/testsubmissionds1');
const User = require("../Models/user");
const mongoose = require('mongoose');

// Create Test V2 - Supports negative marking, sections, and resume settings
exports.createtestds2 = async (req, res) => {
    try {
        const {
            name, user, colid, classid, course, coursecode, testtitle, description,
            topic, scheduleddate, starttime, endtime, duration, totalnoofquestion,
            questions, sections, sectionBased, shufflequestions, showresultsimmediately,
            allowretake, passingscore, timelimit, proctoringmode, calculatorallowed,
            formulasheetallowed, instructions, rules, status, ispublished, year,

            // NEW FIELDS
            globalNegativeMarking, globalNegativeMarks,
            allowResume, resumeTimeLimit
        } = req.body;

        const filter = { testtitle, colid, user };
        const update = {
            name, user, colid, classid, course, coursecode, testtitle, description,
            topic, scheduleddate, starttime, endtime, duration, totalnoofquestion,
            questions, sections: sections || [], sectionBased: sectionBased || false,
            shufflequestions, showresultsimmediately, allowretake, passingscore,
            timelimit, proctoringmode, calculatorallowed, formulasheetallowed,
            instructions, rules, status, ispublished, updatedat: new Date(), year,

            // New fields mapping
            globalNegativeMarking: globalNegativeMarking || false,
            globalNegativeMarks: globalNegativeMarks || 0,
            allowResume: allowResume || false,
            resumeTimeLimit: resumeTimeLimit || 24
        };

        const testdsnew = await testds1.findOneAndUpdate(filter, update, {
            new: true, upsert: true, setDefaultsOnInsert: true
        });

        res.status(200).json({
            success: true,
            data: testdsnew,
            message: "Test created/updated successfully with new features"
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Update Test V2
exports.updatetestds2 = async (req, res) => {
    try {
        const {
            id, name, user, colid, classid, course, coursecode, testtitle, description,
            topic, scheduleddate, starttime, endtime, duration, totalnoofquestion,
            questions, sections, sectionBased, shufflequestions, showresultsimmediately,
            allowretake, passingscore, timelimit, proctoringmode, calculatorallowed,
            formulasheetallowed, instructions, rules, status, ispublished,

            // NEW FIELDS
            globalNegativeMarking, globalNegativeMarks,
            allowResume, resumeTimeLimit
        } = req.body;

        const testdsupdated = await testds1.findOneAndUpdate(
            { _id: id, colid: parseInt(colid), user: user },
            {
                name, user, colid, classid, course, coursecode, testtitle, description,
                topic, scheduleddate, starttime, endtime, duration, totalnoofquestion,
                questions, sections: sections || [], sectionBased: sectionBased || false,
                shufflequestions, showresultsimmediately, allowretake, passingscore,
                timelimit, proctoringmode, calculatorallowed, formulasheetallowed,
                instructions, rules, status, ispublished, updatedat: new Date(),

                // New fields
                globalNegativeMarking: globalNegativeMarking || false,
                globalNegativeMarks: globalNegativeMarks || 0,
                allowResume: allowResume || false,
                resumeTimeLimit: resumeTimeLimit || 24
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
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get Single Test V2
exports.gettestds2 = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ success: false, message: "Test ID required" });

        const test = await testds1.findById(id);

        if (!test) {
            return res.status(404).json({ success: false, message: "Test not found" });
        }

        res.status(200).json({
            success: true,
            data: test
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Allow Student Retake V2 (Fixed version)
exports.allowstudentretake2 = async (req, res) => {
    try {
        const { testid, studentid, user, colid } = req.body;

        // Verify test ownership
        const testCheck = await testds1.findOne({
            _id: testid,
            user: user,
            colid: parseInt(colid)
        });

        if (!testCheck) {
            return res.status(404).json({
                success: false,
                message: 'Test not found or access denied'
            });
        }

        // Find student email by regno
        const userResult = await User.findOne({ regno: studentid });

        if (!userResult) {
            // Fallback: try to find by email directly in submission if studentid is email
            const directSubmission = await testsubmissionds1.findOne({ testid, studentid });
            if (directSubmission) {
                // Perform reset on directSubmission
                await testsubmissionds1.findByIdAndUpdate(directSubmission._id, {
                    $set: {
                        status: 'started',
                        updatedat: new Date(),
                        // Resetting scores and results for a clean retake
                        totalscore: 0,
                        percentage: 0,
                        passed: false,
                        answers: [], // Clear answers? Or keep them? Usually retake means fresh start.
                        // Existing implementation only reset status, but for proper retake we should probably clear answers or at least score.
                        // Let's reset key fields.
                        endtime: null,
                        submissiondate: null,
                        warnings: [],
                        suspiciousactivity: false
                    }
                });

                return res.json({
                    success: true,
                    message: 'Student can now retake the test (Found by ID)',
                    data: { studentid, testid }
                });
            }

            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        const studentEmail = userResult.email;

        // Reset submission status
        // Using findOneAndUpdate to find the submission and reset fields
        const updatedSubmission = await testsubmissionds1.findOneAndUpdate(
            { testid: testid, studentid: studentEmail },
            {
                $set: {
                    status: 'started',
                    updatedat: new Date(),
                    totalscore: 0,
                    percentage: 0,
                    passed: false,
                    answers: [],
                    endtime: null,
                    submissiondate: null,
                    sectionScores: [],
                    warnings: [],
                    suspiciousactivity: false,

                    // Reset resume fields too
                    resumeAllowed: false,
                    canResume: false
                }
            },
            { new: true }
        );

        if (!updatedSubmission) {
            return res.status(404).json({
                success: false,
                message: 'No submission found for this student to reset'
            });
        }

        return res.json({
            success: true,
            message: 'Student can now retake the test',
            data: {
                studentid: studentid,
                studentEmail: studentEmail,
                testid: testid,
                newStatus: updatedSubmission.status
            }
        });

    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
