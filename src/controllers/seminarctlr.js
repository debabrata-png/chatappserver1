const Seminar = require('../Models/seminar');

// ======================
// SEMINAR CONTROLLERS
// ======================

// Create Seminar
exports.createseminar = async (req, res) => {
    try {
        const { 
            name, user, colid, title, duration, yop, membership, 
            amount, status1, comments, role, paper, level, doclink, type 
        } = req.body;

        const newSeminar = await Seminar.create({
            name,
            user,
            colid,
            title,
            duration,
            yop,
            membership,
            amount,
            status1,
            comments,
            role,
            paper,
            level,
            doclink,
            type
        });

        res.status(201).json({
            success: true,
            message: 'Seminar created successfully',
            data: newSeminar
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to create seminar',
        //     error: error.message
        // });
    }
};

// Get Seminars by User
exports.getseminarsbyuser = async (req, res) => {
    try {
        const { user, colid } = req.query;

        const seminars = await Seminar.find({ 
            user, 
            colid: parseInt(colid) 
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            message: 'Seminars retrieved successfully',
            data: seminars
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve seminars',
        //     error: error.message
        // });
    }
};

// Update Seminar (POST method with query parameters)
exports.updateseminar = async (req, res) => {
    try {
        const { id } = req.query;
        const updateData = req.body;

        const updatedSeminar = await Seminar.findByIdAndUpdate(
            id, 
            updateData, 
            { new: true }
        );

        if (!updatedSeminar) {
            return res.status(404).json({
                success: false,
                message: 'Seminar not found'
            });
        }

        res.json({
            success: true,
            message: 'Seminar updated successfully',
            data: updatedSeminar
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to update seminar',
        //     error: error.message
        // });
    }
};

// Delete Seminar (GET method with query parameters)
exports.deleteseminar = async (req, res) => {
    try {
        const { id } = req.query;

        const deletedSeminar = await Seminar.findByIdAndDelete(id);

        if (!deletedSeminar) {
            return res.status(404).json({
                success: false,
                message: 'Seminar not found'
            });
        }

        res.json({
            success: true,
            message: 'Seminar deleted successfully',
            data: deletedSeminar
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to delete seminar',
        //     error: error.message
        // });
    }
};
