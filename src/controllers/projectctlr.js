const Project = require('../Models/projects'); // Add this import

// ======================
// PROJECT CONTROLLERS
// ======================

// Create Project
exports.createproject = async (req, res) => {
    try {
        const { 
            name, user, colid, project, agency, type, yop, 
            department, funds, status1, comments, level, duration,
            doclink 
        } = req.body;

        const newProject = await Project.create({
            name,
            user,
            colid,
            project,
            agency,
            type,
            yop,
            department,
            funds,
            status1,
            comments,
            level,
            duration,
            doclink
        });

        res.status(201).json({
            success: true,
            message: 'Project created successfully',
            data: newProject
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to create project',
        //     error: error.message
        // });
    }
};

// Get Projects by User
exports.getprojectsbyuser = async (req, res) => {
    try {
        const { user, colid } = req.query;

        const projects = await Project.find({ 
            user, 
            colid: parseInt(colid) 
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            message: 'Projects retrieved successfully',
            data: projects
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve projects',
        //     error: error.message
        // });
    }
};

// Update Project (POST method with query parameters)
exports.updateproject = async (req, res) => {
    try {
        const { id } = req.query;
        const updateData = req.body;

        const updatedProject = await Project.findByIdAndUpdate(
            id, 
            updateData, 
            { new: true }
        );

        if (!updatedProject) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.json({
            success: true,
            message: 'Project updated successfully',
            data: updatedProject
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to update project',
        //     error: error.message
        // });
    }
};

// Delete Project (GET method with query parameters)
exports.deleteproject = async (req, res) => {
    try {
        const { id } = req.query;

        const deletedProject = await Project.findByIdAndDelete(id);

        if (!deletedProject) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.json({
            success: true,
            message: 'Project deleted successfully',
            data: deletedProject
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to delete project',
        //     error: error.message
        // });
    }
};
