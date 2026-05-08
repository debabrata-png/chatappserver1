const Consultancy = require('../Models/consultancy');

// ======================
// CONSULTANCY CONTROLLERS
// ======================

// Create Consultancy
exports.createconsultancy = async (req, res) => {
    try {
        const { 
            name, user, colid, year, duration, consultant, advisor, 
            department, trainees, title, role, agency, contact, 
            revenue, status1, doclink, comments 
        } = req.body;

        const newConsultancy = await Consultancy.create({
            name,
            user,
            colid,
            year,
            duration,
            consultant,
            advisor,
            department,
            trainees,
            title,
            role,
            agency,
            contact,
            revenue,
            status1,
            doclink,
            comments
        });

        res.status(201).json({
            success: true,
            message: 'Consultancy created successfully',
            data: newConsultancy
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to create consultancy',
        //     error: error.message
        // });
    }
};

// Get Consultancies by User
exports.getconsultanciesbyuser = async (req, res) => {
    try {
        const { user, colid } = req.query;

        const consultancies = await Consultancy.find({ 
            user, 
            colid: parseInt(colid) 
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            message: 'Consultancies retrieved successfully',
            data: consultancies
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve consultancies',
        //     error: error.message
        // });
    }
};

// Update Consultancy (POST method with query parameters)
exports.updateconsultancy = async (req, res) => {
    try {
        const { id } = req.query;
        const updateData = req.body;

        const updatedConsultancy = await Consultancy.findByIdAndUpdate(
            id, 
            updateData, 
            { new: true }
        );

        if (!updatedConsultancy) {
            return res.status(404).json({
                success: false,
                message: 'Consultancy not found'
            });
        }

        res.json({
            success: true,
            message: 'Consultancy updated successfully',
            data: updatedConsultancy
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to update consultancy',
        //     error: error.message
        // });
    }
};

// Delete Consultancy (GET method with query parameters)
exports.deleteconsultancy = async (req, res) => {
    try {
        const { id } = req.query;

        const deletedConsultancy = await Consultancy.findByIdAndDelete(id);

        if (!deletedConsultancy) {
            return res.status(404).json({
                success: false,
                message: 'Consultancy not found'
            });
        }

        res.json({
            success: true,
            message: 'Consultancy deleted successfully',
            data: deletedConsultancy
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to delete consultancy',
        //     error: error.message
        // });
    }
};
