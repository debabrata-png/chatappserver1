// controllers/collaborationctlr.js
const collaborationpostds = require('../Models/collaborationpostds');
const collaborationrequestds = require('../Models/collaborationrequestds');
const collaborationds = require('../Models/collaborationds');
const project = require('../Models/projects');
const notificationds = require('../Models/notificationds');
const User = require('../Models/user'); // Your user model
const facultyprofileds = require('../Models/facultyProfileds');
const Patent = require('../Models/patents');
const Pub = require('../Models/publications'); // Your publication model
const seminar = require('../Models/seminar');
const Consultancy = require('../Models/consultancy');

// ======================
// COLLABORATION POST CONTROLLERS
// ======================
exports.createcollaborationpost = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      projectId,
      publicationId,
      user, 
      colid, 
      department,
      requiredSkills,
      collaborationType,
      maxCollaborators,
      visibility,
      deadline,
      postFor, // ✅ NEW
      otherType // ✅ NEW
    } = req.body;

    // Validation
    if (postFor === 'other' && !otherType) {
      return res.status(400).json({
        success: false,
        message: 'Other type is required when post is for other'
      });
    }

    if (postFor === 'project' && !projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required when post is for project'
      });
    }

    if (postFor === 'publication' && !publicationId) {
      return res.status(400).json({
        success: false,
        message: 'Publication ID is required when post is for publication'
      });
    }

    const newPost = await collaborationpostds.create({
      title,
      description,
      projectId,
      publicationId,
      user,
      colid,
      department,
      requiredSkills: requiredSkills || [],
      collaborationType,
      maxCollaborators: maxCollaborators || 3,
      visibility: visibility || 'cross-college',
      deadline,
      postFor,
      otherType
    });

    res.status(201).json({
      success: true,
      message: 'Collaboration post created successfully',
      data: newPost
    });

  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to create collaboration post',
    //   error: error.message
    // });
  }
};
// controllers/collaborationctlr.js - Enhanced to include owner profile
exports.getcollaborationposts = async (req, res) => {
    try {
        const { colid, user } = req.query;

        // Get posts with owner profile information
        const posts = await collaborationpostds.find({
            $or: [
                { colid: parseInt(colid) },
                { visibility: 'cross-college' },
                { visibility: 'public' }
            ],
            status: 'open'
        })
        .populate('projectId')
        .sort({ postedAt: -1 });

        // ✅ ENHANCED: Fetch owner profile for each post
        const postsWithOwnerProfiles = await Promise.all(
            posts.map(async (post) => {
                try {
                    // Get owner's basic info
                    const ownerInfo = await User.findOne({
                        email: post.user,
                        colid: post.colid
                    }).select('name email department photo role');

                    // Get owner's faculty profile
                    const ownerFacultyProfile = await facultyprofileds.findOne({
                        user: post.user,
                        colid: post.colid
                    }).select('designation currentInstitution aboutMe');

                    return {
                        ...post.toObject(),
                        ownerProfile: {
                            userInfo: ownerInfo,
                            facultyProfile: ownerFacultyProfile
                        }
                    };
                } catch (error) {
                    return post.toObject();
                }
            })
        );

        res.json({
            success: true,
            message: 'Collaboration posts retrieved successfully',
            data: postsWithOwnerProfiles
        });

    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve collaboration posts',
        //     error: error.message
        // });
    }
};


// Get Posts by User
exports.getcollaborationpostsbyuser = async (req, res) => {
    try {
        const { user, colid } = req.query;

        const posts = await collaborationpostds.find({
            user,
            colid: parseInt(colid)
        })
            .populate('projectId')
            .sort({ postedAt: -1 });

        res.json({
            success: true,
            message: 'User collaboration posts retrieved successfully',
            data: posts
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve user posts',
        //     error: error.message
        // });
    }
};

// Update Collaboration Post
exports.updatecollaborationpost = async (req, res) => {
    try {
        const { id } = req.query;
        const updateData = req.body;

        const updatedPost = await collaborationpostds.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).populate('projectId');

        if (!updatedPost) {
            return res.status(404).json({
                success: false,
                message: 'Collaboration post not found'
            });
        }

        res.json({
            success: true,
            message: 'Collaboration post updated successfully',
            data: updatedPost
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to update collaboration post',
        //     error: error.message
        // });
    }
};

// Delete Collaboration Post
exports.deletecollaborationpost = async (req, res) => {
    try {
        const { id } = req.query;

        const deletedPost = await collaborationpostds.findByIdAndDelete(id);

        if (!deletedPost) {
            return res.status(404).json({
                success: false,
                message: 'Collaboration post not found'
            });
        }

        res.json({
            success: true,
            message: 'Collaboration post deleted successfully',
            data: deletedPost
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to delete collaboration post',
        //     error: error.message
        // });
    }
};

// ======================
// COLLABORATION REQUEST CONTROLLERS
// ======================

// Send Collaboration Request
exports.sendcollaborationrequest = async (req, res) => {
    try {
        const {
            postId, requesterUser, requesterColid, ownerUser, ownerColid,
            message, requestedRole, proposedContribution
        } = req.body;

        // Check if request already exists
        const existingRequest = await collaborationrequestds.findOne({
            postId,
            requesterUser,
            requesterColid,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                message: 'Request already sent for this collaboration'
            });
        }

        const newRequest = await collaborationrequestds.create({
            postId,
            requesterUser,
            requesterColid,
            ownerUser,
            ownerColid,
            message,
            requestedRole,
            proposedContribution
        });

        // Create notification for owner
        await notificationds.create({
            recipientUser: ownerUser,
            recipientColid: ownerColid,
            type: 'collaboration_request',
            title: 'New Collaboration Request',
            message: `${requesterUser} wants to collaborate on your project`,
            referenceId: newRequest._id,
            referenceType: 'CollaborationRequest',
            redirectUrl: `/collaboration/requests/${newRequest._id}`,
            senderUser: requesterUser,
            senderColid: requesterColid
        });

        res.status(201).json({
            success: true,
            message: 'Collaboration request sent successfully',
            data: newRequest
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to send collaboration request',
        //     error: error.message
        // });
    }
};

// Get Collaboration Requests (Received)
exports.getcollaborationrequests = async (req, res) => {
    try {
        const { user, colid } = req.query;

        const requests = await collaborationrequestds.find({
            ownerUser: user,
            ownerColid: parseInt(colid)
        })
            .populate('postId')
            .sort({ requestedAt: -1 });

        res.json({
            success: true,
            message: 'Collaboration requests retrieved successfully',
            data: requests
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve collaboration requests',
        //     error: error.message
        // });
    }
};

// Get Sent Collaboration Requests
exports.getsentcollaborationrequests = async (req, res) => {
    try {
        const { user, colid } = req.query;

        const requests = await collaborationrequestds.find({
            requesterUser: user,
            requesterColid: parseInt(colid)
        })
            .populate('postId')
            .sort({ requestedAt: -1 });

        res.json({
            success: true,
            message: 'Sent collaboration requests retrieved successfully',
            data: requests
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve sent requests',
        //     error: error.message
        // });
    }
};

// Accept Collaboration Request - FIXED TO HANDLE EXISTING ROOMS
exports.acceptcollaborationrequest = async (req, res) => {
  try {
    const { requestId } = req.body;

    // Validate required fields
    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'requestId is required'
      });
    }

    const request = await collaborationrequestds.findById(requestId)
      .populate('postId');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Collaboration request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request has already been processed'
      });
    }

    // Update request status
    request.status = 'accepted';
    request.respondedAt = new Date();
    await request.save();

    // ✅ NEW: Check if collaboration already exists for this post
    let existingCollaboration = await collaborationds.findOne({
      postId: request.postId._id,
      status: 'active'
    });

    let chatRoomId;
    let collaboration;

    if (existingCollaboration) {
      // ✅ Add new participant to existing collaboration
      const newParticipant = {
        user: request.requesterUser,
        colid: request.requesterColid,
        role: request.requestedRole,
        joinedAt: new Date()
      };

      // Check if participant already exists (safety check)
      const participantExists = existingCollaboration.participants.some(
        p => p.user === request.requesterUser && p.colid === request.requesterColid
      );

      if (!participantExists) {
        existingCollaboration.participants.push(newParticipant);
        existingCollaboration.lastActivity = new Date();
        await existingCollaboration.save();
      }

      collaboration = existingCollaboration;
      chatRoomId = existingCollaboration.chatRoomId;
    } else {
      // ✅ Create new collaboration room
      chatRoomId = `collab_${request.postId._id}_${Date.now()}`;

      const collaborationData = {
        postId: request.postId._id,
        targetType: request.postId.postFor || 'project',
        targetId: request.postId.projectId || request.postId.publicationId || request.postId._id,
        participants: [
          {
            user: request.ownerUser,
            colid: request.ownerColid,
            role: 'Owner'
          },
          {
            user: request.requesterUser,
            colid: request.requesterColid,
            role: request.requestedRole
          }
        ],
        chatRoomId
      };

      // Add projectId only if it exists
      if (request.postId.projectId) {
        collaborationData.projectId = request.postId.projectId;
      }

      collaboration = await collaborationds.create(collaborationData);
    }

    // Update collaboration post
    await collaborationpostds.findByIdAndUpdate(
      request.postId._id,
      { $inc: { currentCollaborators: 1 } }
    );

    // Create notification for requester
    await notificationds.create({
      recipientUser: request.requesterUser,
      recipientColid: request.requesterColid,
      type: 'request_accepted',
      title: 'Collaboration Request Accepted',
      message: `Your collaboration request has been accepted! ${existingCollaboration ? 'You have been added to the existing collaboration room.' : 'A new collaboration room has been created.'}`,
      referenceId: collaboration._id,
      referenceType: 'Collaboration',
      redirectUrl: `/collaboration/chat/${chatRoomId}`,
      senderUser: request.ownerUser,
      senderColid: request.ownerColid
    });

    res.json({
      success: true,
      message: `Collaboration request accepted successfully. ${existingCollaboration ? 'Added to existing room.' : 'New room created.'}`,
      data: { 
        collaboration, 
        chatRoomId,
        isNewRoom: !existingCollaboration
      }
    });

  } catch (error) {
    // console.error('Accept collaboration request error:', error);
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to accept collaboration request',
    //   error: error.message
    // });
  }
};

// Reject Collaboration Request - FIXED
exports.rejectcollaborationrequest = async (req, res) => {
    try {
        const { requestId, rejectionReason } = req.body;

        // ✅ ADD: Validate required fields
        if (!requestId) {
            return res.status(400).json({
                success: false,
                message: 'requestId is required'
            });
        }

        const request = await collaborationrequestds.findById(requestId);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Collaboration request not found'
            });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Request has already been processed'
            });
        }

        // Update request status
        request.status = 'rejected';
        request.respondedAt = new Date();
        await request.save();

        // Create notification for requester
        await notificationds.create({
            recipientUser: request.requesterUser,
            recipientColid: request.requesterColid,
            type: 'request_rejected',
            title: 'Collaboration Request Rejected',
            message: rejectionReason || 'Your collaboration request has been rejected',
            referenceId: request._id,
            referenceType: 'CollaborationRequest',
            redirectUrl: `/collaboration/requests/${request._id}`,
            senderUser: request.ownerUser,
            senderColid: request.ownerColid
        });

        res.json({
            success: true,
            message: 'Collaboration request rejected successfully',
            data: request
        });

    } catch (error) {
        // ✅ FIXED: UNCOMMENTED ERROR HANDLING
        // console.error('Reject collaboration request error:', error);
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to reject collaboration request',
        //     error: error.message
        // });
    }
};


// ======================
// COLLABORATION CONTROLLERS
// ======================

// Get Active Collaborations
exports.getactivecollaborations = async (req, res) => {
    try {
        const { user, colid } = req.query;

        const collaborations = await collaborationds.find({
            'participants.user': user,
            'participants.colid': parseInt(colid),
            status: 'active'
        })
            .populate('postId')
            .populate('projectId')
            .sort({ lastActivity: -1 });

        res.json({
            success: true,
            message: 'Active collaborations retrieved successfully',
            data: collaborations
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve collaborations',
        //     error: error.message
        // });
    }
};

// Update Collaboration Activity
exports.updatecollaborationactivity = async (req, res) => {
    try {
        const { collaborationId } = req.body;

        await collaborationds.findByIdAndUpdate(
            collaborationId,
            { lastActivity: new Date() }
        );

        res.json({
            success: true,
            message: 'Collaboration activity updated'
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to update collaboration activity',
        //     error: error.message
        // });
    }
};

// ======================
// NOTIFICATION CONTROLLERS
// ======================

// Get Notifications
exports.getnotifications = async (req, res) => {
    try {
        const { user, colid } = req.query;

        const notifications = await notificationds.find({
            recipientUser: user,
            recipientColid: parseInt(colid)
        })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({
            success: true,
            message: 'Notifications retrieved successfully',
            data: notifications
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve notifications',
        //     error: error.message
        // });
    }
};

// Get Unread Notifications Count
exports.getunreadnotificationscount = async (req, res) => {
    try {
        const { user, colid } = req.query;

        const count = await notificationds.countDocuments({
            recipientUser: user,
            recipientColid: parseInt(colid),
            isRead: false
        });

        res.json({
            success: true,
            message: 'Unread notifications count retrieved',
            data: { count }
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to get unread notifications count',
        //     error: error.message
        // });
    }
};

// Mark Notification as Read
exports.marknotificationread = async (req, res) => {
    try {
        const { notificationId } = req.body;

        await notificationds.findByIdAndUpdate(
            notificationId,
            { isRead: true }
        );

        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to mark notification as read',
        //     error: error.message
        // });
    }
};

// Mark All Notifications as Read
exports.markallnotificationsread = async (req, res) => {
    try {
        const { user, colid } = req.body;

        await notificationds.updateMany(
            {
                recipientUser: user,
                recipientColid: parseInt(colid),
                isRead: false
            },
            { isRead: true }
        );

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to mark all notifications as read',
        //     error: error.message
        // });
    }
};

// ======================
// FACULTY PROFILE CONTROLLERS
// ======================

// Create or Update Faculty Profile - CAST ERROR FIXED
exports.createfacultyprofile = async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({
                success: false,
                message: 'Request body is missing'
            });
        }

        const {
            user,
            colid,
            aboutMe = '',
            currentInstitution = '',
            designation = '',
            workExperience = [],
            education = [],
            skills = [],
            researchInterests = [],
            socialLinks = {},
            achievements = [],
            profileVisibility = 'college-only'
        } = req.body;

        if (!user || !colid) {
            return res.status(400).json({
                success: false,
                message: 'User and colid are required fields'
            });
        }

        // ✅ FIXED: Properly format workExperience to prevent casting errors
        const formattedWorkExperience = workExperience.map(exp => {
            const workExp = {};
            
            // Only include fields that exist and are valid
            if (exp.institution && typeof exp.institution === 'string') {
                workExp.institution = exp.institution.trim();
            }
            
            if (exp.position && typeof exp.position === 'string') {
                workExp.position = exp.position.trim();
            }
            
            if (exp.startDate) {
                try {
                    workExp.startDate = new Date(exp.startDate);
                    // Validate the date
                    if (isNaN(workExp.startDate.getTime())) {
                        throw new Error('Invalid start date');
                    }
                } catch (error) {
                    workExp.startDate = new Date(); // Default to current date
                }
            }
            
            if (exp.endDate && exp.endDate !== '' && !exp.isCurrent) {
                try {
                    workExp.endDate = new Date(exp.endDate);
                    // Validate the date
                    if (isNaN(workExp.endDate.getTime())) {
                        throw new Error('Invalid end date');
                    }
                } catch (error) {
                    workExp.endDate = null;
                }
            } else {
                workExp.endDate = null;
            }
            
            if (exp.description && typeof exp.description === 'string') {
                workExp.description = exp.description.trim();
            }
            
            workExp.isCurrent = Boolean(exp.isCurrent);
            
            // Don't include _id field - let MongoDB auto-generate
            return workExp;
        });

        const profileData = {
            user,
            colid: parseInt(colid),
            aboutMe,
            currentInstitution,
            designation,
            workExperience: formattedWorkExperience,
            education,
            skills,
            researchInterests,
            socialLinks,
            achievements,
            profileVisibility
        };

        const profile = await facultyprofileds.findOneAndUpdate(
            { user, colid: parseInt(colid) },
            profileData,
            { 
                new: true, 
                upsert: true,
                runValidators: true
            }
        );

        res.json({
            success: true,
            message: 'Faculty profile updated successfully',
            data: profile
        });

    } catch (error) {
        // console.error('Faculty profile update error:', error);
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to update faculty profile',
        //     error: error.message
        // });
    }
};


// ✅ NEW: Dedicated Add Work Experience function
exports.addworkexperience = async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({
                success: false,
                message: 'Request body is missing'
            });
        }

        const { user, colid, workExperience } = req.body;

        // Validate required fields
        if (!user || !colid || !workExperience) {
            return res.status(400).json({
                success: false,
                message: 'User, colid, and workExperience are required'
            });
        }

        // Validate work experience structure
        if (!workExperience.institution || !workExperience.position || !workExperience.startDate) {
            return res.status(400).json({
                success: false,
                message: 'Institution, position, and startDate are required for work experience'
            });
        }

        const profile = await facultyprofileds.findOneAndUpdate(
            { user, colid: parseInt(colid) },
            { $push: { workExperience } },
            { new: true, upsert: true }
        );

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        res.json({
            success: true,
            message: 'Work experience added successfully',
            data: profile
        });
    } catch (error) {
        // console.error('Add work experience error:', error);
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to add work experience',
        //     error: error.message
        // });
    }
};

// Get Faculty Profile
exports.getfacultyprofile = async (req, res) => {
    try {
        const { user, colid } = req.query;

        // Get user basic info
        const userInfo = await User.findOne({
            email: user,
            colid: parseInt(colid)
        }).select('name email phone department photo role regno');

        // Get faculty profile
        const facultyProfile = await facultyprofileds.findOne({
            user,
            colid: parseInt(colid)
        });

        if (!userInfo) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Faculty profile retrieved successfully',
            data: {
                userInfo,
                facultyProfile
            }
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve faculty profile',
        //     error: error.message
        // });
    }
};

// Add Work Experience
exports.addworkexperience = async (req, res) => {
    try {
        const { user, colid, workExperience } = req.body;

        const profile = await facultyprofileds.findOneAndUpdate(
            { user, colid },
            { $push: { workExperience } },
            { new: true, upsert: true }
        );

        res.json({
            success: true,
            message: 'Work experience added successfully',
            data: profile
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to add work experience',
        //     error: error.message
        // });
    }
};

// Update Work Experience
exports.updateworkexperience = async (req, res) => {
    try {
        const { user, colid, experienceId, updateData } = req.body;

        const profile = await facultyprofileds.findOneAndUpdate(
            {
                user,
                colid,
                'workExperience._id': experienceId
            },
            {
                $set: {
                    'workExperience.$': updateData
                }
            },
            { new: true }
        );

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Work experience not found'
            });
        }

        res.json({
            success: true,
            message: 'Work experience updated successfully',
            data: profile
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to update work experience',
        //     error: error.message
        // });
    }
};

// Delete Work Experience
exports.deleteworkexperience = async (req, res) => {
    try {
        const { user, colid, experienceId } = req.query;

        const profile = await facultyprofileds.findOneAndUpdate(
            { user, colid },
            { $pull: { workExperience: { _id: experienceId } } },
            { new: true }
        );

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        res.json({
            success: true,
            message: 'Work experience deleted successfully',
            data: profile
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to delete work experience',
        //     error: error.message
        // });
    }
};

// Get Faculty Profile with All Works - FIXED AGGREGATION EXTRACTION
exports.getfacultyprofilewithworks = async (req, res) => {
    try {
        const { user, colid } = req.query;

        // Get user basic info
        const userAggregation = await User.aggregate([
            {
                $match: { 
                    email: user, 
                    colid: parseInt(colid) 
                }
            },
            {
                $project: {
                    name: 1, email: 1, phone: 1, department: 1, 
                    photo: 1, role: 1, regno: 1, _id: 1
                }
            }
        ]);

        if (!userAggregation || userAggregation.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userInfo = userAggregation[0];
        const facultyProfile = await facultyprofileds.findOne({
            user, colid: parseInt(colid)
        });

        // Projects Aggregation
        const projectsAggregation = await project.aggregate([
            { $match: { user: user, colid: parseInt(colid) } },
            {
                $facet: {
                    projects: [
                        { $sort: { yop: -1 } },
                        {
                            $project: {
                                name: 1, project: 1, agency: 1, type: 1, yop: 1,
                                department: 1, funds: 1, level: 1, duration: 1, status1: 1
                            }
                        }
                    ],
                    statistics: [
                        {
                            $group: {
                                _id: null,
                                totalProjects: { $sum: 1 },
                                totalFunds: { $sum: "$funds" },
                                avgFunds: { $avg: "$funds" }
                            }
                        }
                    ]
                }
            }
        ]);

        // Publications Aggregation
        const publicationsAggregation = await Pub.aggregate([
            { $match: { user: user, colid: parseInt(colid) } },
            {
                $facet: {
                    publications: [
                        { $sort: { yop: -1 } },
                        {
                            $project: {
                                name: 1, title: 1, journal: 1, yop: 1, issn: 1,
                                articlelink: 1, journallink: 1, hindex: 1, citation: 1,
                                level: 1, citationindex: 1, ugclisted: 1, status1: 1
                            }
                        }
                    ],
                    statistics: [
                        {
                            $group: {
                                _id: null,
                                totalPublications: { $sum: 1 },
                                ugcListedCount: {
                                    $sum: {
                                        $cond: [{ $eq: ["$ugclisted", "Yes"] }, 1, 0]
                                    }
                                },
                                totalCitations: {
                                    $sum: {
                                        $toInt: { $ifNull: ["$citation", "0"] }
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        ]);

        // Patents Aggregation
        const patentsAggregation = await Patent.aggregate([
            { $match: { user: user, colid: parseInt(colid) } },
            {
                $facet: {
                    patents: [
                        { $sort: { yop: -1 } },
                        {
                            $project: {
                                name: 1, title: 1, patentnumber: 1, yop: 1,
                                agency: 1, patentstatus: 1, doa: 1, doclink: 1, status1: 1
                            }
                        }
                    ],
                    statistics: [
                        {
                            $group: {
                                _id: null,
                                totalPatents: { $sum: 1 }
                            }
                        }
                    ]
                }
            }
        ]);

        // Seminars Aggregation
        const seminarsAggregation = await seminar.aggregate([
            { $match: { user: user, colid: parseInt(colid) } },
            {
                $facet: {
                    seminars: [
                        { $sort: { yop: -1 } },
                        {
                            $project: {
                                name: 1, title: 1, duration: 1, yop: 1, membership: 1,
                                amount: 1, role: 1, paper: 1, level: 1, type: 1, status1: 1
                            }
                        }
                    ],
                    statistics: [
                        {
                            $group: {
                                _id: null,
                                totalSeminars: { $sum: 1 },
                                totalAmount: { $sum: "$amount" },
                                avgAmount: { $avg: "$amount" }
                            }
                        }
                    ]
                }
            }
        ]);

        // Consultancies Aggregation
        const consultanciesAggregation = await Consultancy.aggregate([
            { $match: { user: user, colid: parseInt(colid) } },
            {
                $facet: {
                    consultancies: [
                        { $sort: { year: -1 } },
                        {
                            $project: {
                                name: 1, title: 1, year: 1, duration: 1, consultant: 1,
                                advisor: 1, department: 1, trainees: 1, role: 1,
                                agency: 1, contact: 1, revenue: 1, status1: 1
                            }
                        }
                    ],
                    statistics: [
                        {
                            $group: {
                                _id: null,
                                totalConsultancies: { $sum: 1 },
                                totalRevenue: { $sum: "$revenue" },
                                totalTrainees: { $sum: "$trainees" },
                                avgRevenue: { $avg: "$revenue" }
                            }
                        }
                    ]
                }
            }
        ]);

        // ✅ FIXED: Proper extraction of data and statistics
        const projects = projectsAggregation[0]?.projects || [];
        const projectStats = projectsAggregation[0]?.statistics[0] || {};

        const publications = publicationsAggregation[0]?.publications || [];
        const publicationStats = publicationsAggregation[0]?.statistics[0] || {};

        const patents = patentsAggregation[0]?.patents || [];
        const patentStats = patentsAggregation[0]?.statistics[0] || {};

        const seminars = seminarsAggregation[0]?.seminars || [];
        const seminarStats = seminarsAggregation[0]?.statistics[0] || {};

        const consultancies = consultanciesAggregation[0]?.consultancies || [];
        const consultancyStats = consultanciesAggregation[0]?.statistics[0] || {};

        // Calculate overall statistics
        const overallStats = {
            totalWorks: projects.length + publications.length + patents.length + 
                       seminars.length + consultancies.length,
            totalRevenue: (projectStats.totalFunds || 0) + (seminarStats.totalAmount || 0) + 
                         (consultancyStats.totalRevenue || 0)
        };

        res.json({
            success: true,
            message: 'Faculty profile with works retrieved successfully',
            data: {
                userInfo,
                facultyProfile,
                works: {
                    projects: { data: projects, statistics: projectStats },
                    publications: { data: publications, statistics: publicationStats },
                    patents: { data: patents, statistics: patentStats },
                    seminars: { data: seminars, statistics: seminarStats },
                    consultancies: { data: consultancies, statistics: consultancyStats }
                },
                overallStatistics: overallStats
            }
        });

    } catch (error) {
        // console.error('Faculty profile with works error:', error);
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve faculty profile with works',
        //     error: error.message
        // });
    }
};


// Get Faculty Profile Statistics - COMPLETELY FIXED
exports.getfacultyprofilestats = async (req, res) => {
    try {
        const { user, colid } = req.query;

        const statsAggregation = await Promise.all([
            // Projects statistics
            project.aggregate([
                { $match: { user: user, colid: parseInt(colid) } },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        totalFunds: { $sum: "$funds" },
                        avgFunds: { $avg: "$funds" },
                        latestYear: { $max: "$yop" }
                    }
                }
            ]),
            
            // Publications statistics
            Pub.aggregate([
                { $match: { user: user, colid: parseInt(colid) } },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        ugcListed: {
                            $sum: {
                                $cond: [{ $eq: ["$ugclisted", "Yes"] }, 1, 0]
                            }
                        },
                        totalCitations: {
                            $sum: {
                                $toInt: { $ifNull: ["$citation", "0"] }
                            }
                        },
                        latestYear: { $max: "$yop" }
                    }
                }
            ]),
            
            // Patents statistics
            Patent.aggregate([
                { $match: { user: user, colid: parseInt(colid) } },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        latestYear: { $max: "$yop" }
                    }
                }
            ]),
            
            // Seminars statistics
            seminar.aggregate([
                { $match: { user: user, colid: parseInt(colid) } },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        totalAmount: { $sum: "$amount" },
                        avgAmount: { $avg: "$amount" },
                        latestYear: { $max: "$yop" }
                    }
                }
            ]),
            
            // Consultancies statistics
            Consultancy.aggregate([
                { $match: { user: user, colid: parseInt(colid) } },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        totalRevenue: { $sum: "$revenue" },
                        totalTrainees: { $sum: "$trainees" },
                        avgRevenue: { $avg: "$revenue" },
                        latestYear: { $max: "$year" }
                    }
                }
            ])
        ]);

        const [projectStats, publicationStats, patentStats, seminarStats, consultancyStats] = statsAggregation;

        // ✅ FIXED: Proper extraction with safe access
        const profileStats = {
            projects: {
                count: projectStats[0]?.count || 0,
                totalFunds: projectStats[0]?.totalFunds || 0,
                avgFunds: Math.round((projectStats[0]?.avgFunds || 0) * 100) / 100,
                latestYear: projectStats[0]?.latestYear || 'N/A'
            },
            publications: {
                count: publicationStats[0]?.count || 0,
                ugcListed: publicationStats[0]?.ugcListed || 0,
                totalCitations: publicationStats[0]?.totalCitations || 0,
                latestYear: publicationStats[0]?.latestYear || 'N/A'
            },
            patents: {
                count: patentStats[0]?.count || 0,
                latestYear: patentStats[0]?.latestYear || 'N/A'
            },
            seminars: {
                count: seminarStats[0]?.count || 0,
                totalAmount: seminarStats[0]?.totalAmount || 0,
                avgAmount: Math.round((seminarStats[0]?.avgAmount || 0) * 100) / 100,
                latestYear: seminarStats[0]?.latestYear || 'N/A'
            },
            consultancies: {
                count: consultancyStats[0]?.count || 0,
                totalRevenue: consultancyStats[0]?.totalRevenue || 0,
                totalTrainees: consultancyStats[0]?.totalTrainees || 0,
                avgRevenue: Math.round((consultancyStats[0]?.avgRevenue || 0) * 100) / 100,
                latestYear: consultancyStats[0]?.latestYear || 'N/A'
            },
            summary: {
                totalWorks: (projectStats[0]?.count || 0) + (publicationStats[0]?.count || 0) +
                           (patentStats[0]?.count || 0) + (seminarStats[0]?.count || 0) +
                           (consultancyStats[0]?.count || 0),
                totalRevenue: (projectStats[0]?.totalFunds || 0) + (seminarStats[0]?.totalAmount || 0) +
                             (consultancyStats[0]?.totalRevenue || 0)
            }
        }

        res.json({
            success: true,
            message: 'Faculty profile statistics retrieved successfully',
            data: profileStats
        });

    } catch (error) {
        // console.error('Faculty profile stats error:', error);
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve profile statistics',
        //     error: error.message
        // });
    }
};


// Get Recent Activities using Aggregation
exports.getrecentactivities = async (req, res) => {
    try {
        const { user, colid, limit = 10 } = req.query;

        // Get recent activities from all collections
        const recentActivities = await Promise.all([
            project.aggregate([
                { $match: { user: user, colid: parseInt(colid) } },
                { $sort: { yop: -1 } },
                { $limit: parseInt(limit) },
                {
                    $project: {
                        type: { $literal: "project" },
                        title: "$project",
                        year: "$yop",
                        details: "$agency",
                        funds: "$funds",
                        _id: 1
                    }
                }
            ]),

            Pub.aggregate([
                { $match: { user: user, colid: parseInt(colid) } },
                { $sort: { yop: -1 } },
                { $limit: parseInt(limit) },
                {
                    $project: {
                        type: { $literal: "publication" },
                        title: "$title",
                        year: "$yop",
                        details: "$journal",
                        citation: "$citation",
                        _id: 1
                    }
                }
            ]),

            Patent.aggregate([
                { $match: { user: user, colid: parseInt(colid) } },
                { $sort: { yop: -1 } },
                { $limit: parseInt(limit) },
                {
                    $project: {
                        type: { $literal: "patent" },
                        title: "$title",
                        year: "$yop",
                        details: "$agency",
                        patentNumber: "$patentnumber",
                        _id: 1
                    }
                }
            ])
        ]);

        // Flatten and sort all activities by year
        const allActivities = recentActivities
            .flat()
            .sort((a, b) => parseInt(b.year) - parseInt(a.year))
            .slice(0, parseInt(limit));

        res.json({
            success: true,
            message: 'Recent activities retrieved successfully',
            data: allActivities
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve recent activities',
        //     error: error.message
        // });
    }
};
