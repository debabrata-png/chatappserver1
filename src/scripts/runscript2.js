const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const testsubmissionds1 = require('../Models/testsubmissionds1'); // adjust path if needed
const testds1 = require('../Models/testds1'); // adjust path if needed

const mongoURI = 'mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

const colid = 202356;
const startDate = new Date('2025-11-16T00:00:00.000Z');
const endDate = new Date('2025-11-23T23:59:59.999Z');

async function exportByCreatedAt() {
  try {
    const exportLines = [];

    // Fetch all tests created in the date range for the colid
    const tests = await testds1.find({
      colid,
      createdat: { $gte: startDate, $lte: endDate }
    });

    exportLines.push(`--- Found ${tests.length} Tests ---\n`);
    for (const test of tests) {
      exportLines.push('--- Test Data ---\n');
      exportLines.push(
        JSON.stringify(
          {
            testid: test._id,
            colid: test.colid,
            testtitle: test.testtitle,
            sectionBased: test.sectionBased,
            sections: test.sections,
            questions: test.questions,
            createdat: test.createdat
          }, null, 2
        ) + '\n'
      );
    }

    // Get test IDs
    const testIds = tests.map(test => test._id.toString());

    // Fetch all submissions with createdat date within range, for found tests and colid
    const submissions = await testsubmissionds1.find({
      testid: { $in: testIds },
      colid,
      createdat: { $gte: startDate, $lte: endDate }
    });

    exportLines.push(`--- ${submissions.length} Submissions ---\n`);
    for (const submission of submissions) {
      exportLines.push('-------------------------------\n');
      exportLines.push(JSON.stringify(submission, null, 2) + '\n');
    }

    // Write everything to a text file
    const filePath = path.join(__dirname, 'test_export.txt');
    fs.writeFileSync(filePath, exportLines.join(''), 'utf8');

    console.log(`Export complete. Data written to ${filePath}`);
  } catch (err) {
    console.error('Error exporting data:', err);
  } finally {
    mongoose.disconnect();
  }
}

exportByCreatedAt();
