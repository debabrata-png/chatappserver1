const testds1 = require('../Models/testds1');
const mongoose = require('mongoose');

// Bulk Upload Questions
exports.bulkUploadQuestions = async (req, res) => {
    try {
        const { testid, questions, colid, user } = req.body;

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ success: false, message: "No questions provided" });
        }

        // Validate format of each question
        const validatedQuestions = [];
        const errors = [];

        questions.forEach((q, index) => {
            // Basic validation
            if (!q.question || !q.correctanswer || !q.questiontype) {
                errors.push(`Row ${index + 1}: Missing required fields (Question, Correct Answer, Type)`);
                return;
            }

            // Map to schema
            validatedQuestions.push({
                questionnumber: q.questionnumber || (index + 1), // Will be re-indexed anyway
                question: q.question,
                questiontype: q.questiontype.toLowerCase().replace(/\s+/g, '-'), // Normalize type
                optiona: q.optiona || '',
                optionb: q.optionb || '',
                optionc: q.optionc || '',
                optiond: q.optiond || '',
                correctanswer: q.correctanswer, // Ensure this matches one of the options for MCQ is validated on frontend usually
                explanation: q.explanation || '',
                points: parseFloat(q.points) || 1,
                difficulty: q.difficulty ? q.difficulty.toLowerCase() : 'medium',
                section: q.section || '',
                questionimage: q.questionimage || '', // S3 URL if provided
                negativemarking: q.negativemarking === true || q.negativemarking === 'true',
                negativemarks: parseFloat(q.negativemarks) || 0,
                hasmathcontent: q.hasmathcontent === true || q.hasmathcontent === 'true'
            });
        });

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Validation failed for some questions",
                errors
            });
        }

        // Find Test
        const test = await testds1.findOne({
            _id: testid,
            colid: parseInt(colid),
            user: user
        });

        if (!test) {
            return res.status(404).json({ success: false, message: "Test not found" });
        }

        // Find max question number to append correctly
        let currentMax = 0;
        if (test.questions && test.questions.length > 0) {
            currentMax = Math.max(...test.questions.map(q => q.questionnumber || 0));
        }

        // Re-index new questions
        const finalQuestions = validatedQuestions.map((q, i) => ({
            ...q,
            questionnumber: currentMax + 1 + i
        }));

        // Append to test
        test.questions.push(...finalQuestions);
        test.totalnoofquestion = test.questions.length;
        test.updatedat = new Date();

        await test.save();

        res.status(200).json({
            success: true,
            message: `Successfully added ${finalQuestions.length} questions`,
            data: test.questions
        });

    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
