const AIJob = require('../Models/aijobds');

// Create a new background job
exports.createAIJob = async (req, res) => {
    try {
        const {
            type,       // e.g. "generate_test_questions"
            payload,    // e.g. { topic: "Math", count: 10 }
            user,
            colid
        } = req.body;

        if (!type || !payload || !user || !colid) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: type, payload, user, colid"
            });
        }

        // Create the job in 'pending' state
        const newJob = new AIJob({
            user,
            colid,
            type,
            payload,
            status: 'pending',
            attempts: 0,
            nextRunAt: new Date() // Run immediately
        });

        const savedJob = await newJob.save();

        // Respond immediately with the Job ID
        res.status(200).json({
            success: true,
            message: "Job queued successfully",
            jobId: savedJob._id,
            status: 'pending'
        });

    } catch (error) {
        console.error("Error queueing job:", error);
        res.status(500).json({
            success: false,
            message: "Failed to queue job",
            error: error.message
        });
    }
};

// Check job status (Polling fallback if socket fails)
exports.getJobStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await AIJob.findById(jobId);

        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }

        res.status(200).json({
            success: true,
            data: {
                _id: job._id,
                status: job.status,
                result: job.result,
                error: job.lastError,
                attempts: job.attempts,
                createdat: job.createdat,
                completedat: job.completedat
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
