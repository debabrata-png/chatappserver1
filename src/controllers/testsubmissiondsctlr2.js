const testsubmissionds1 = require('../Models/testsubmissionds1');
const testds1 = require('../Models/testds1');
const mongoose = require('mongoose');

// Start Test V2
exports.starttestds2 = async (req, res) => {
    try {
        const { testid, studentid, colid, name, user, classid } = req.body;

        // Get test info
        const test = await testds1.findOne({
            _id: testid,
            colid: parseInt(colid),
            ispublished: true
        });

        if (!test) {
            return res.status(404).json({ success: false, message: "Test not found or not published" });
        }

        const currentTime = new Date();
        // Validate time
        if (currentTime < test.starttime || currentTime > test.endtime) {
            return res.status(400).json({ success: false, message: "Test is not available at this time" });
        }

        // Check existing submission
        let submission = await testsubmissionds1.findOne({
            testid, studentid, colid: parseInt(colid)
        });

        // Resume Logic
        if (submission) {
            // Priority: Manual Resume Permission (Overrides status and global settings)
            if (submission.canResume) {
                return res.status(200).json({
                    success: true,
                    data: submission,
                    test: test,
                    message: "Resuming test session",
                    isResume: true
                });
            }

            if (submission.status === 'submitted') {
                if (!test.allowretake) {
                    return res.status(400).json({ success: false, message: "Test already submitted. Please request individual resume permission from faculty if needed." });
                }
                // If retake is allowed, continue to new submission logic below
            } else if (submission.status === 'started' || submission.status === 'in-progress') {
                // Return existing session
                return res.status(200).json({
                    success: true,
                    data: submission,
                    test: test,
                    message: "Continuing test session"
                });
            }
        }

        // New Submission (or Retake Reset)
        const filter = { testid, studentid, colid: parseInt(colid) };
        const sectionScores = test.sectionBased && test.sections ?
            test.sections.map(section => ({
                sectionName: section.name,
                totalQuestions: section.questionCount,
                answeredQuestions: 0,
                correctAnswers: 0,
                sectionScore: 0,
                sectionPercentage: 0
            })) : [];

        const update = {
            name, user, testid, studentid, classid, colid: parseInt(colid),
            testtitle: test.testtitle, starttime: new Date(), status: 'started',
            timeremaining: test.duration * 60,
            answers: [],
            totalscore: 0,
            percentage: 0,
            sectionBased: test.sectionBased || false,
            sectionScores: sectionScores,
            createdat: submission ? submission.createdat : new Date(), // Keep original created if retake? Or new?
            updatedat: new Date(),
            // Reset resume fields
            canResume: false,
            resumeAllowed: false
        };

        const newSubmission = await testsubmissionds1.findOneAndUpdate(filter, update, {
            new: true, upsert: true, setDefaultsOnInsert: true
        });

        res.status(200).json({
            success: true,
            data: newSubmission,
            test: test,
            message: "Test started successfully"
        });

    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Submit Answer V2
exports.submitanswerds2 = async (req, res) => {
    // Logic remains mostly similar to V1 but we might track lastQuestionAttempted
    try {
        const { testid, studentid, colid, questionnumber, selectedanswerkey, selectedanswer, timespent, section, timeremaining } = req.body;

        // Use selectedanswerkey if available (for MCQs), otherwise use selectedanswer (for input-based)
        const finalAnswerValue = selectedanswerkey || selectedanswer;

        const updateFields = {
            'answers.$.selectedanswer': finalAnswerValue,
            'answers.$.selectedanswerkey': selectedanswerkey, // We'll need to update schema too or just store as is
            'answers.$.timespent': timespent,
            'answers.$.section': section || null,
            status: 'in-progress',
            updatedat: new Date(),
            lastQuestionAttempted: questionnumber
        };

        if (timeremaining !== undefined) {
            updateFields.timeremaining = timeremaining;
        }

        // Attempt update if answer exists
        const updateResult = await testsubmissionds1.updateOne(
            {
                testid, studentid, colid: parseInt(colid),
                'answers.questionnumber': questionnumber
            },
            { $set: updateFields }
        );

        // If not exists, push new answer
        if (updateResult.matchedCount === 0) {
            await testsubmissionds1.updateOne(
                { testid, studentid, colid: parseInt(colid) },
                {
                    $push: {
                        answers: {
                            questionnumber,
                            selectedanswer: finalAnswerValue,
                            selectedanswerkey: selectedanswerkey,
                            timespent,
                            section: section || null,
                            iscorrect: false,
                            points: 0
                        }
                    },
                    $set: {
                        status: 'in-progress',
                        updatedat: new Date(),
                        lastQuestionAttempted: questionnumber,
                        timeremaining: timeremaining // update timer here too if provided
                    }
                }
            );
        }

        res.status(200).json({ success: true, message: "Answer saved" });

    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Submit Test V2 - Handles Negative Marking
exports.submittestds2 = async (req, res) => {
    try {
        const { testid, studentid, colid } = req.body;

        // 1. Fetch Test and Submission
        const test = await testds1.findOne({ _id: testid, colid: parseInt(colid) });
        const submission = await testsubmissionds1.findOne({ testid, studentid, colid: parseInt(colid) });

        if (!test || !submission) {
            return res.status(404).json({ success: false, message: "Test or submission not found" });
        }

        // 2. Grading Logic with Negative Marking
        let totalScore = 0;
        let maxPossibleScore = 0;
        const gradedAnswers = [];

        // Create maps for quick lookup
        const questionMap = new Map();
        test.questions.forEach(q => questionMap.set(q.questionnumber, q));

        const sectionMap = new Map();
        if (test.sections) {
            test.sections.forEach(s => sectionMap.set(s.name, s));
        }

        for (const answer of submission.answers) {
            const question = questionMap.get(answer.questionnumber);
            if (!question) continue; // Should not happen

            const isCorrect = answer.selectedanswer === question.correctanswer;
            let points = 0;
            let negativeMarksApplied = 0;

            if (isCorrect) {
                points = question.points || 1;
                // Override if section defines points per question? 
                // Requirement: "marksPerQuestion" in section.
                // Usually individual question points take precedence, but if "marks per section" implies uniform:
                // Let's assume question points > section default > global default (1).
                // But question.points default is 1.
                // If section has marksPerQuestion, should we use it?
                // Let's stick to question.points as primary source of truth.
            } else {
                // Incorrect Answer - Calculate Negative Marks
                if (answer.selectedanswer) { // Only deduct if answered
                    if (question.negativemarking) {
                        negativeMarksApplied = question.negativemarks;
                    } else if (sectionMap.has(question.section) && sectionMap.get(question.section).negativeMarkingEnabled) {
                        negativeMarksApplied = sectionMap.get(question.section).negativeMarks;
                    } else if (test.globalNegativeMarking) {
                        negativeMarksApplied = test.globalNegativeMarks;
                    }
                }
                points = -Math.abs(negativeMarksApplied); // Deduct points
            }

            totalScore += points;
            maxPossibleScore += (question.points || 1);

            gradedAnswers.push({
                ...answer.toObject(),
                iscorrect: isCorrect,
                points: points,
                negativeMarksApplied: negativeMarksApplied
            });
        }

        // Ensure total score doesn't go below 0? Usually exams allow negative total, but standard is floor 0?
        // Let's keep raw score for now as negative marking implies it can be negative.

        // Calculate Percentage
        const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

        // Grade and Pass/Fail
        const passed = percentage >= (test.passingscore || 50);
        let grade = 'F';
        if (percentage >= 90) grade = 'A';
        else if (percentage >= 80) grade = 'B';
        else if (percentage >= 70) grade = 'C';
        else if (percentage >= 60) grade = 'D';

        // 3. Section Scores
        let sectionScores = [];
        if (test.sectionBased && test.sections) {
            sectionScores = test.sections.map(section => {
                const sectionAnswers = gradedAnswers.filter(a => a.section === section.name);
                const correctCount = sectionAnswers.filter(a => a.iscorrect).length;
                const sectionTotalScore = sectionAnswers.reduce((sum, a) => sum + a.points, 0);

                // Max score for section
                const sectionQuestions = test.questions.filter(q => q.section === section.name);
                const sectionMaxScore = sectionQuestions.reduce((sum, q) => sum + (q.points || 1), 0);

                return {
                    sectionName: section.name,
                    totalQuestions: sectionQuestions.length,
                    answeredQuestions: sectionAnswers.length,
                    correctAnswers: correctCount,
                    sectionScore: sectionTotalScore,
                    sectionPercentage: sectionMaxScore > 0 ? (sectionTotalScore / sectionMaxScore) * 100 : 0
                };
            });
        }

        // 4. Update Submission
        submission.answers = gradedAnswers;
        submission.totalscore = totalScore;
        submission.percentage = percentage;
        submission.passed = passed;
        submission.grade = grade;
        submission.status = 'submitted';
        submission.endtime = new Date();
        submission.submissiondate = new Date();
        submission.sectionScores = sectionScores;

        await submission.save();

        res.status(200).json({
            success: true,
            data: submission,
            message: "Test submitted successfully"
        });

    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Allow Resume
exports.allowresume = async (req, res) => {
    try {
        const { testid, studentid, colid, facultyName } = req.body;

        // Find submission
        const submission = await testsubmissionds1.findOne({
            testid, studentid, colid: parseInt(colid)
        });

        if (!submission) {
            return res.status(404).json({ success: false, message: "Submission not found" });
        }

        submission.canResume = true;
        submission.resumeAllowed = true;
        submission.resumePermissionGrantedBy = facultyName;
        submission.resumePermissionGrantedAt = new Date();

        await submission.save();

        res.status(200).json({ success: true, message: "Student allowed to resume exam" });

    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get Disconnected Students
exports.getdisconnectedstudents = async (req, res) => {
    try {
        const { testid, colid } = req.query;

        // Find submissions that are 'started' or 'in-progress' but haven't updated recently?
        // Or just all non-submitted ones.
        const submissions = await testsubmissionds1.find({
            testid,
            colid: parseInt(colid),
            status: { $in: ['started', 'in-progress'] }
        }).sort({ updatedat: -1 });

        res.status(200).json({ success: true, data: submissions });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get Resume Eligibility
exports.getresumeeligibility = async (req, res) => {
    try {
        const { testid, studentid, colid } = req.query;
        const submission = await testsubmissionds1.findOne({
            testid, studentid, colid: parseInt(colid)
        });

        if (!submission) return res.json({ canResume: false });

        res.json({ canResume: submission.canResume });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
