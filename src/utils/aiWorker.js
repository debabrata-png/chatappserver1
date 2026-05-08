const AIJob = require('../Models/aijobds');
const gptapikeyds = require('../Models/gptapikeyds');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Helper sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Circuit Breaker State (Global to the worker)
let failureCount = 0;
let lastFailureTime = 0;
const CIRCUIT_BREAKER_THRESHOLD = 5; // Open circuit after 5 consecutive SYSTEM failures
const CIRCUIT_RESET_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// The Main Robust AI Call Function (Private to worker)
// Returns { success: true, text: "..." } or throws Error
async function executeProprietaryAI(prompt, user, colid, retries = 3) {
    // Check Circuit
    if (failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
        if (Date.now() - lastFailureTime > CIRCUIT_RESET_TIMEOUT) {
            failureCount = 0; // Reset
        } else {
            throw new Error("AI Service is locally suspended (Circuit Open)");
        }
    }

    // Get Key
    const apiKeyData = await gptapikeyds.findOne({
        colid: parseInt(colid),
        isactive: true
    }).sort({ createdat: -1 });

    if (!apiKeyData) throw new Error("No active API key found for this institution");

    const genAI = new GoogleGenerativeAI(apiKeyData.personalapikey || apiKeyData.defaultapikey);
    // Use user's preferred model or default to stable flash
    const modelName = "gemini-2.5-flash-lite";
    const model = genAI.getGenerativeModel({ model: modelName });

    let currentTry = 0;

    while (currentTry < retries) {
        try {
            // Hard Timeout of 45s for the AI call itself
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("AI Model Timed Out")), 45000)
            );

            const resultPromise = model.generateContent(prompt);
            const result = await Promise.race([resultPromise, timeoutPromise]);

            const responseText = result.response.text();

            // Success! Update Usage & Reset Circuit
            await gptapikeyds.findByIdAndUpdate(apiKeyData._id, { $inc: { currentusage: 20 } });
            failureCount = 0;

            return responseText;

        } catch (error) {
            currentTry++;
            //console.error(`AI Worker Attempt ${currentTry} failed: ${error.message}`);

            // Check if we should retry immediately or escalate
            const isRetryable =
                error.message.includes("Timed Out") ||
                error.message.includes("503") ||
                error.message.includes("429");

            if (!isRetryable || currentTry >= retries) {
                // If it's a hard error (like auth) or we ran out of retries,
                // We count it towards the circuit breaker
                failureCount++;
                lastFailureTime = Date.now();
                throw error;
            }

            // Exponential Backoff BEFORE next retry within this job run
            // 1s, 2s, 4s...
            await sleep(1000 * Math.pow(2, currentTry));
        }
    }
}

// The Worker Function - To be called periodically or by trigger
const processPendingJobs = async (io) => {
    // 1. Find a job
    // Must be 'pending' AND 'nextRunAt' <= Now
    const job = await AIJob.findOne({
        status: 'pending',
        nextRunAt: { $lte: new Date() }
    }).sort({ nextRunAt: 1 }); // Process oldest due jobs first

    if (!job) return; // Nothing to do

    // 2. Lock it (Set processing)
    job.status = 'processing';
    job.nextRunAt = new Date(Date.now() + 2 * 60 * 1000); // Heartbeat: set next run 2 mins from now in case we crash
    job.updatedat = new Date();
    await job.save();

    try {
        //console.log(`[Worker] Processing Job ${job._id} (${job.type})`);

        // 3. Prepare Payload
        let prompt = "";
        if (job.type === 'generate_class_topics') {
            const { course, hours, keyword } = job.payload;
            prompt = `Generate exactly ${hours} topics for "${course}"${keyword ? ` focusing on "${keyword}"` : ''}. Format as numbered list: 1. Topic...`;
        }
        else if (job.type === 'generate_test_questions') {
            const { topic, count, difficulty } = job.payload;

            // Robust Prompt
            prompt = `
Generate exactly ${count} multiple-choice questions on ${topic}.
Difficulty: ${difficulty.toUpperCase()}
Each question MUST have exactly 4 options labeled A, B, C, and D.
Return ONLY valid JSON with this specific structure:
{
  "questions": [
    {
      "question": "The question text",
      "optiona": "Option A text",
      "optionb": "Option B text",
      "optionc": "Option C text",
      "optiond": "Option D text",
      "correctanswer": "a", 
      "explanation": "Brief explanation of why the answer is correct",
      "concept": "Key concept covered"
    }
  ]
}
IMPORTANT: The correctanswer property must be one of: "a", "b", "c", or "d".
`;
        }

        if (!prompt) throw new Error("Unknown Job Type");

        // 4. Run AI
        const resultText = await executeProprietaryAI(prompt, job.user, job.colid);

        // 5. Parse & Validate JSON (Robustness Step)
        let parsedResult;
        try {
            // Remove markdown code blocks if present
            const cleanText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
            // Try extracting JSON from substring if there's extra text
            const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : cleanText;

            parsedResult = JSON.parse(jsonStr);

            // Normalize structure
            if (parsedResult.questions) parsedResult = parsedResult.questions;
            if (!Array.isArray(parsedResult)) throw new Error("Result is not an array");

        } catch (parseError) {
            // //console.warn(`[Worker] JSON Parse Warning: ${parseError.message}. Saving raw text.`);
            // We don't fail the job on parse error, we let frontend handle or we could decide to retry.
            // For robustness, getting *some* result is better than a crash loop.
            parsedResult = { raw: resultText, parsed: false };
        }

        // 6. Success
        job.status = 'completed';
        job.result = parsedResult;
        job.completedat = new Date();
        await job.save();

        // //console.log(`[Worker] Job ${job._id} Completed.`);

        // 7. Real-time Notification
        if (io) {
            io.to(`job_${job._id}`).emit('job_completed', {
                jobId: job._id,
                result: parsedResult,
                status: 'completed'
            });
        }

    } catch (error) {
        //console.error(`[Worker] Job ${job._id} Failed:`, error.message);

        // 7. Robust Failure Handling
        job.attempts += 1;
        job.lastError = error.message;

        if (job.attempts >= 5) {
            // Permanent Failure
            job.status = 'failed';
            if (io) {
                io.to(`job_${job._id}`).emit('job_failed', {
                    jobId: job._id,
                    error: error.message
                });
            }
        } else {
            // Retry Later (Backoff)
            job.status = 'pending';
            const backoffSeconds = Math.pow(2, job.attempts) * 30; // 30s, 60s, 120s...
            job.nextRunAt = new Date(Date.now() + backoffSeconds * 1000);
            //console.log(`[Worker] Rescheduling Job ${job._id} for ${job.nextRunAt}`);
        }
        await job.save();
    }
};

// Start the Loop (Call this from app.js)
const startWorker = (io) => {
    // //console.log("🚀 AI Background Worker Started");
    setInterval(() => {
        processPendingJobs(io).catch(err => console.error("Worker Loop Error:", err));
    }, 2000); // Check every 2 seconds
};

module.exports = { startWorker };
