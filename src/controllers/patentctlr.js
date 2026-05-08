const Patent = require('../Models/patents'); // Add this import

// ======================
// PATENT CONTROLLERS
// ======================

// Create Patent
exports.createpatent = async (req, res) => {
    try {
        const { name, user, colid, title, patentnumber, doa, agency, status1, comments, doclink, patentstatus, yop } = req.body;

        const newPatent = await Patent.create({
            name,
            user,
            colid,
            title,
            patentnumber,
            doa,
            agency,
            status1,
            comments,
            doclink,
            patentstatus,
            yop
        });

        res.status(201).json({
            success: true,
            message: 'Patent created successfully',
            data: newPatent
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to create patent',
        //     error: error.message
        // });
    }
};

// Get Patents by User
exports.getpatentsbyuser = async (req, res) => {
    try {
        const { user, colid } = req.query;

        const patents = await Patent.find({ user, colid: parseInt(colid) }).sort({ createdAt: -1 });

        res.json({
            success: true,
            message: 'Patents retrieved successfully',
            data: patents
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve patents',
        //     error: error.message
        // });
    }
};

// Update Patent
exports.updatepatent = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedPatent = await Patent.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedPatent) {
            return res.status(404).json({
                success: false,
                message: 'Patent not found'
            });
        }

        res.json({
            success: true,
            message: 'Patent updated successfully',
            data: updatedPatent
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to update patent',
        //     error: error.message
        // });
    }
};

// Delete Patent
exports.deletepatent = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedPatent = await Patent.findByIdAndDelete(id);

        if (!deletedPatent) {
            return res.status(404).json({
                success: false,
                message: 'Patent not found'
            });
        }

        res.json({
            success: true,
            message: 'Patent deleted successfully',
            data: deletedPatent
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to delete patent',
        //     error: error.message
        // });
    }
};
