const mongoose = require('mongoose');
const testsubmissionds1 = require('../Models/testsubmissionds1'); // adjust path if needed
const testds1 = require('../Models/testds1'); // adjust path if needed

const mongoURI = 'mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

function normalizeAnswer(answer) {
  if (!answer) return '';
  return answer.toString().trim().toLowerCase().replace(/\s+/g, '');
}

async function regradeSubmissionsInDateRange(colid, startDate, endDate) {
  try {
    console.log('Fetching tests...');
    // Use createdat to filter tests
    const tests = await testds1.find({
      colid,
      createdat: { $gte: startDate, $lte: endDate }
    });

    const testIds = tests.map(test => test._id.toString());
    console.log(`Found ${tests.length} tests.`);

    if (testIds.length === 0) {
      console.log('No tests found for that criteria.');
      return;
    }

    console.log('Fetching submissions...');
    // Use createdat to filter submissions
    const submissions = await testsubmissionds1.find({
      testid: { $in: testIds },
      colid,
      createdat: { $gte: startDate, $lte: endDate }
    });
    console.log(`Found ${submissions.length} submissions.`);

    for (const submission of submissions) {
      const test = tests.find(t => t._id.toString() === submission.testid.toString());
      if (!test) {
        console.warn(`Test not found for submission ${submission._id}`);
        continue;
      }

      const regradedAnswers = submission.answers.map(answer => {
        const question = test.questions.find(q => q.questionnumber === answer.questionnumber);
        if (!question) {
          return { ...answer, iscorrect: false, points: 0 };
        }

        // Use lowercase for option key
        const correctOptionKey = question.correctanswer ? question.correctanswer.toLowerCase() : '';
        const correctOptionText = question['option' + correctOptionKey];

        if (typeof correctOptionText === 'undefined') {
          console.warn(`questionnumber ${answer.questionnumber} - correct option key [${correctOptionKey}] missing!`);
        }

        const isCorrect =
          normalizeAnswer(answer.selectedanswer) === normalizeAnswer(correctOptionText);

        return {
          ...answer,
          iscorrect: isCorrect,
          points: isCorrect ? question.points : 0,
        };
      });

      const totalScore = regradedAnswers.reduce((sum, a) => sum + (a.points || 0), 0);
      const totalPossibleScore = test.questions.reduce((sum, q) => sum + (q.points || 0), 0);
      const percentage = totalPossibleScore > 0 ? (totalScore / totalPossibleScore) * 100 : 0;
      const passed = percentage >= (test.passingscore || 50);

      // Recalculate sectionScores dynamically (if used)
      let sectionScores = [];
      if (test.sectionBased && test.sections && test.sections.length > 0) {
        sectionScores = test.sections.map(section => {
          const answersInSection = regradedAnswers.filter(ans => ans.section === section.name);
          const answeredQuestions = answersInSection.length;
          const correctAnswers = answersInSection.filter(ans => ans.iscorrect).length;
          const sectionScore = answersInSection.reduce((sum, ans) => sum + (ans.points || 0), 0);
          const totalQuestions = section.questionCount || 0;
          const sectionPercentage = totalQuestions > 0 ? (sectionScore / totalQuestions) * 100 : 0;

          return {
            sectionName: section.name,
            totalQuestions,
            answeredQuestions,
            correctAnswers,
            sectionScore,
            sectionPercentage,
          };
        });
      } else {
        sectionScores = [];
      }

      // Update submission
      submission.answers = regradedAnswers;
      submission.totalscore = totalScore;
      submission.percentage = percentage;
      submission.passed = passed;
      submission.grade = passed ? 'P' : 'F';
      submission.sectionScores = sectionScores;
      submission.updatedat = new Date();

      await submission.save();
      const checkSub = await testsubmissionds1.findById(submission._id);
      console.log('Verified submission:', checkSub);

      console.log(`Regraded submission ${submission._id} for student ${submission.studentid}`);
    }

    console.log('All matching submissions regraded successfully.');
  } catch (err) {
    console.error('Error during regrading:', err);
  } finally {
    mongoose.disconnect();
  }
}

// Your input parameters:
const colidToFix = 202356;
const startDate = new Date('2025-11-16T00:00:00.000Z');
const endDate = new Date('2025-11-23T23:59:59.999Z');

regradeSubmissionsInDateRange(colidToFix, startDate, endDate);

