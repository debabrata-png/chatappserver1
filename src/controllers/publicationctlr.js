const Pub = require('../Models/publications'); // Add this import

// ======================
// PUBLICATION CONTROLLERS
// ======================

// Create Publication
exports.createpublication = async (req, res) => {
    try {
        const { 
            name, user, colid, department, title, journal, yop, 
            issn, articlelink, journallink, hindex, citation, 
            status1, comments, level, citationindex, doclink, ugclisted 
        } = req.body;

        const newPublication = await Pub.create({
            name,
            user,
            colid,
            department,
            title,
            journal,
            yop,
            issn,
            articlelink,
            journallink,
            hindex,
            citation,
            status1,
            comments,
            level,
            citationindex,
            doclink,
            ugclisted
        });

        res.status(201).json({
            success: true,
            message: 'Publication created successfully',
            data: newPublication
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to create publication',
        //     error: error.message
        // });
    }
};

// Get Publications by User
exports.getpublicationsbyuser = async (req, res) => {
    try {
        const { user, colid } = req.query;

        const publications = await Pub.find({ 
            user, 
            colid: parseInt(colid) 
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            message: 'Publications retrieved successfully',
            data: publications
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve publications',
        //     error: error.message
        // });
    }
};

// Update Publication (POST method with query parameters)
exports.updatepublication = async (req, res) => {
    try {
        const { id } = req.query;
        const updateData = req.body;

        const updatedPublication = await Pub.findByIdAndUpdate(
            id, 
            updateData, 
            { new: true }
        );

        if (!updatedPublication) {
            return res.status(404).json({
                success: false,
                message: 'Publication not found'
            });
        }

        res.json({
            success: true,
            message: 'Publication updated successfully',
            data: updatedPublication
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to update publication',
        //     error: error.message
        // });
    }
};

// Delete Publication (GET method with query parameters)
exports.deletepublication = async (req, res) => {
    try {
        const { id } = req.query;

        const deletedPublication = await Pub.findByIdAndDelete(id);

        if (!deletedPublication) {
            return res.status(404).json({
                success: false,
                message: 'Publication not found'
            });
        }

        res.json({
            success: true,
            message: 'Publication deleted successfully',
            data: deletedPublication
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to delete publication',
        //     error: error.message
        // });
    }
};
