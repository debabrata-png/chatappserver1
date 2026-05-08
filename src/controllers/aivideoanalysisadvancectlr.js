const aivideoanalysisds = require('../Models/aivideoanalysisdsadvance');
const classnew = require('../Models/classnewadvance');
const classenr1 = require('../Models/classenr1advance');
const massignments = require('../Models/massignmentsadvance');
const messageds = require('../Models/messageds');
const gptapikeyds = require('../Models/gptapikeyds');
const YouTubeService = require('../services/youtubeService');
const GeminiVideoService = require('../services/geminiVideoService');

// ✅ FIXED: Room generation using coursecode only
const generateAIChatRoom = (coursecode) => {
  if (!coursecode || typeof coursecode !== 'string') {
    throw new Error('Invalid coursecode provided');
  }
  const safeCourseCode = coursecode.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `ai-chat-${safeCourseCode}`;
};

// ✅ FIXED: Generate detailed assignment prompts
const generateDetailedAssignmentPrompt = (videoAnalysis, topic, courseLevel) => {
  return `
GENERATE A DETAILED STUDENT ASSIGNMENT based on this video analysis:

TOPIC: ${topic}
VIDEO ANALYSIS: ${videoAnalysis.summary}
COURSE LEVEL: ${courseLevel}

ASSIGNMENT STRUCTURE REQUIRED:
1. ASSIGNMENT TITLE: Create an engaging title
2. CLEAR DESCRIPTION: Write 2-3 paragraphs explaining what students need to do
3. SPECIFIC QUESTIONS: Create 5-8 detailed questions that students must answer
4. PRACTICAL EXERCISES: Include 2-3 hands-on activities
5. DELIVERABLES: List exactly what students must submit
6. GRADING RUBRIC: Clear assessment criteria

MAKE IT STUDENT-FRIENDLY:
- Use clear, simple language
- Include specific examples
- Provide step-by-step instructions
- Make questions thought-provoking but answerable
- Include estimated time for completion

Return as JSON:
{
  "assignmentTitle": "Clear assignment title here",
  "description": "2-3 paragraph description that explains the assignment clearly to students. Include context about the video and what they'll learn.",
  "questions": [
    {
      "number": 1,
      "question": "Detailed question with context and examples",
      "type": "analysis",
      "points": 10
    }
  ],
  "practicalExercises": [
    {
      "title": "Exercise title",
      "description": "Step-by-step instructions",
      "deliverable": "What to submit"
    }
  ],
  "deliverables": [
    "Written report (2-3 pages)",
    "Completed worksheet",
    "Reflection essay (500 words)"
  ],
  "gradingRubric": {
    "criteria": [
      {"aspect": "Content Understanding", "points": 40, "description": "Clear criteria"},
      {"aspect": "Critical Analysis", "points": 30, "description": "Clear criteria"},
      {"aspect": "Presentation", "points": 30, "description": "Clear criteria"}
    ]
  },
  "estimatedTime": "3-4 hours",
  "learningOutcomes": ["Specific outcomes students will achieve"]
}`;
};

// ✅ FIXED: Monitor scheduled classes - ONLY TODAY'S CLASSES
exports.monitorscheduledclassesadvance = async (req, res) => {
  try {
    const { colid, user } = req.query;
    if (!colid || !user) {
      return res.status(400).json({
        success: false,
        message: 'colid and user are required'
      });
    }

    // FIXED: Get classes for TODAY only (not 30 days)
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const scheduledClasses = await classnew.find({
      user: user,
      colid: parseInt(colid),
      // FIXED: Only today's classes
      classdate: {
        $gte: todayStart,
        $lte: todayEnd
      },
      topic: { $exists: true, $ne: '', $ne: null }
    }).sort({ classdate: 1, classtime: 1 });

    // Check enrollment for each class
    const classesWithEnrollments = await Promise.all(
      scheduledClasses.map(async (classItem) => {
        const hasEnrollments = await classenr1.findOne({
          coursecode: classItem.coursecode,
          colid: parseInt(colid),
          active: 'Yes'
        });
        return hasEnrollments ? classItem : null;
      })
    );

    const validClasses = classesWithEnrollments.filter(Boolean);

    res.json({
      success: true,
      message: 'Today\'s scheduled classes monitored successfully',
      data: validClasses,
      count: validClasses.length,
      triggerAI: validClasses.length > 0
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to monitor scheduled classes',
      error: error.message
    });
  }
};

// ✅ FIXED: Complete processaivideoanalysis function
exports.processaivideoanalysisadvance = async (req, res) => {
  try {
    const { classid, user, colid } = req.body;
    if (!classid || !user || !colid) {
      return res.status(400).json({
        success: false,
        message: 'classid, user, and colid are required'
      });
    }

    const classData = await classnew.findById(classid);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // ✅ FIXED: Generate room using coursecode only
    const chatRoomId = generateAIChatRoom(classData.coursecode);

    const existingAnalysis = await aivideoanalysisds.findOne({
      classid: classid,
      user: user,
      colid: parseInt(colid),
      status: 'completed'
    });

    if (existingAnalysis) {
      return res.json({
        success: true,
        message: 'AI analysis already completed for this class',
        data: {
          analysisId: existingAnalysis._id,
          chatRoomId: existingAnalysis.chatRoomId,
          status: 'completed'
        }
      });
    }

    const apiKeyData = await gptapikeyds.findOne({
      user: user,
      colid: parseInt(colid),
      isactive: true
    });

    if (!apiKeyData) {
      return res.status(404).json({
        success: false,
        message: 'API keys not configured. Please set up your Gemini and YouTube API keys first.'
      });
    }

    const geminiKey = apiKeyData.usepersonalkey ? apiKeyData.personalapikey : apiKeyData.defaultapikey;
    if (!geminiKey || !apiKeyData.youtubeapikey) {
      return res.status(400).json({
        success: false,
        message: 'Both Gemini AI and YouTube API keys are required'
      });
    }

    let aiAnalysis = await aivideoanalysisds.findOne({
      classid: classid,
      user: user,
      colid: parseInt(colid)
    });

    if (aiAnalysis) {
      aiAnalysis.status = 'searching';
      aiAnalysis.chatRoomId = chatRoomId;
      aiAnalysis.processingLog = ['Restarting AI analysis with stable room ID'];
      await aiAnalysis.save();
    } else {
      aiAnalysis = await aivideoanalysisds.create({
        name: classData.name,
        user: user,
        colid: parseInt(colid),
        classid: classid,
        coursecode: classData.coursecode,
        coursename: classData.course,
        topic: classData.topic,
        status: 'searching',
        chatRoomId: chatRoomId,
        processingLog: ['AI analysis started with stable room ID']
      });
    }

    // Start background processing with improved error handling
    processVideoAnalysisBackgroundWithRetry(aiAnalysis._id, apiKeyData, req.app.get('io'));

    res.json({
      success: true,
      message: 'AI video analysis started successfully',
      data: {
        analysisId: aiAnalysis._id,
        chatRoomId: aiAnalysis.chatRoomId,
        status: 'searching',
        topic: classData.topic
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to start AI video analysis',
      error: error.message
    });
  }
};

// ✅ FIXED: Enhanced background processing function with better assignment creation
async function processVideoAnalysisBackgroundWithRetry(analysisId, apiKeyData, io) {
  let analysis;
  try {
    analysis = await aivideoanalysisds.findById(analysisId);
    if (!analysis) return;

    // Step 1: Search YouTube videos
    await aivideoanalysisds.findByIdAndUpdate(analysisId, {
      status: 'searching',
      $push: { processingLog: `Searching YouTube for videos about: ${analysis.topic}` }
    });

    const youtubeService = new YouTubeService(apiKeyData.youtubeapikey);
    const videos = await youtubeService.searchEducationalVideos(analysis.topic, {
      maxResults: 5,
      courseLevel: 'undergraduate'
    });

    if (videos.length === 0) {
      throw new Error('No educational videos found for this topic');
    }

    await aivideoanalysisds.findByIdAndUpdate(analysisId, {
      youtubeVideos: videos,
      status: 'analyzing',
      $push: { processingLog: `Found ${videos.length} educational videos` }
    });

    // Step 2: Analyze video with retry logic
    const selectedVideo = videos[0];
    const geminiService = new GeminiVideoService();
    const geminiKey = apiKeyData.usepersonalkey ? apiKeyData.personalapikey : apiKeyData.defaultapikey;
    geminiService.initialize(geminiKey);

    let videoAnalysis;
    try {
      videoAnalysis = await geminiService.analyzeEducationalVideo(
        selectedVideo.url,
        selectedVideo.title,
        analysis.topic,
        'undergraduate'
      );
    } catch (error) {
      if (error.message.includes('quota exceeded') || error.message.includes('service overloaded')) {
        videoAnalysis = geminiService.createFallbackAnalysis(analysis.topic, 'undergraduate');
      } else {
        throw error;
      }
    }

    await aivideoanalysisds.findByIdAndUpdate(analysisId, {
      selectedVideoUrl: selectedVideo.url,
      selectedVideoTitle: selectedVideo.title,
      aiSummary: videoAnalysis.summary,
      aiDiscussion: videoAnalysis.discussion,
      learningObjectives: videoAnalysis.learningObjectives,
      difficultyLevel: videoAnalysis.difficultyLevel,
      keyTimestamps: videoAnalysis.keyTimestamps,
      relevanceScore: videoAnalysis.relevanceScore,
      status: 'generating',
      $push: { processingLog: 'Video analysis completed, generating assignment...' }
    });

    // Step 3: Generate ENHANCED assignment with detailed questions
    let assignmentData;
    try {
      const enhancedPrompt = generateDetailedAssignmentPrompt(
        videoAnalysis, 
        analysis.topic, 
        'undergraduate'
      );
      
      assignmentData = await geminiService.generateAssignmentWithPrompt(enhancedPrompt);
      
      // Ensure questions array exists and has proper format
      if (!assignmentData.questions || assignmentData.questions.length === 0) {
        assignmentData.questions = [
          {
            number: 1,
            question: `Analyze the main concepts discussed in the video about ${analysis.topic}. Provide specific examples and explain their significance.`,
            type: "analysis",
            points: 25
          },
          {
            number: 2,
            question: `Compare and contrast the key points presented in the video with your existing knowledge of ${analysis.topic}.`,
            type: "comparison",
            points: 25
          },
          {
            number: 3,
            question: `Identify three practical applications of the concepts discussed in the video and explain how they could be implemented.`,
            type: "application",
            points: 25
          },
          {
            number: 4,
            question: `Write a critical evaluation of the video content, discussing both strengths and areas for improvement.`,
            type: "evaluation", 
            points: 25
          }
        ];
      }

    } catch (error) {
      // Fallback with detailed questions
      assignmentData = {
        assignmentTitle: `Comprehensive Analysis: ${analysis.topic}`,
        description: `This assignment requires you to thoroughly analyze the educational video about ${analysis.topic}. You will demonstrate your understanding through detailed responses, critical analysis, and practical applications. Please watch the video carefully and take notes before answering the questions.\n\nInstructions: Answer all questions completely, providing specific examples from the video. Each response should be well-structured with clear explanations. Use proper grammar and cite the video content when relevant.`,
        questions: [
          {
            number: 1,
            question: `After watching the video, summarize the three most important concepts about ${analysis.topic}. For each concept, provide: (a) a clear definition in your own words, (b) why it's significant, and (c) a specific example from the video.`,
            type: "analysis",
            points: 25
          },
          {
            number: 2,
            question: `The video presents various aspects of ${analysis.topic}. Choose one aspect that you found most interesting or challenging. Explain why you selected this aspect and discuss how it relates to real-world applications.`,
            type: "reflection",
            points: 20
          },
          {
            number: 3,
            question: `Based on the video content, create a step-by-step process or framework that demonstrates your understanding of ${analysis.topic}. Include at least 5 steps with detailed explanations.`,
            type: "creation",
            points: 25
          },
          {
            number: 4,
            question: `Compare the information presented in the video with what you already knew about ${analysis.topic}. What new insights did you gain? Were there any concepts that contradicted your previous understanding?`,
            type: "comparison",
            points: 15
          },
          {
            number: 5,
            question: `Design a practical scenario where the knowledge from this video about ${analysis.topic} could be applied. Describe the scenario, the challenges involved, and how the video content helps solve these challenges.`,
            type: "application",
            points: 15
          }
        ],
        practicalExercises: [
          {
            title: "Concept Mapping",
            description: "Create a visual concept map showing the relationships between key ideas from the video",
            deliverable: "Digital or hand-drawn concept map (submit as image/PDF)"
          },
          {
            title: "Real-World Connection",
            description: "Find a news article or current example that relates to the video topic and write a 300-word analysis",
            deliverable: "Article link + analysis document"
          }
        ],
        deliverables: [
          "Complete written responses to all 5 questions (minimum 200 words each)",
          "Concept map showing key relationships",
          "Real-world application analysis (300 words)",
          "Reflection on learning outcomes (150 words)"
        ],
        estimatedTime: "3-4 hours",
        learningOutcomes: [
          `Demonstrate comprehensive understanding of ${analysis.topic}`,
          "Apply critical thinking to analyze educational content",
          "Connect theoretical concepts to practical applications",
          "Develop skills in academic writing and analysis"
        ]
      };
    }

    // Step 4: Create assignment using your existing schema - NO CHANGES NEEDED
    try {
      // Prepare student-friendly description using your existing fields
      let assignmentTitle = assignmentData.assignmentTitle || `Video Analysis: ${analysis.topic}`;
      
      // Create comprehensive description with questions in the description field
      let fullDescription = assignmentData.description || `Analyze the educational video about ${analysis.topic}. Complete all questions and submit your responses.\n\n`;
      
      // Add formatted questions to description
      if (assignmentData.questions && assignmentData.questions.length > 0) {
        fullDescription += "📝 **QUESTIONS TO ANSWER:**\n\n";
        assignmentData.questions.forEach((q, index) => {
          fullDescription += `**Q${q.number || index + 1}: ${q.question}**\n`;
          fullDescription += `Type: ${q.type || 'Analysis'} | Points: ${q.points || 10}\n\n`;
        });
      }
      
      // Add practical exercises if available
      if (assignmentData.practicalExercises && assignmentData.practicalExercises.length > 0) {
        fullDescription += "🔧 **PRACTICAL EXERCISES:**\n\n";
        assignmentData.practicalExercises.forEach((exercise, index) => {
          fullDescription += `**${exercise.title}:**\n${exercise.description}\n`;
          fullDescription += `Deliverable: ${exercise.deliverable}\n\n`;
        });
      }
      
      // Add what to submit
      if (assignmentData.deliverables && assignmentData.deliverables.length > 0) {
        fullDescription += "📋 **SUBMIT THE FOLLOWING:**\n";
        assignmentData.deliverables.forEach((item, index) => {
          fullDescription += `${index + 1}. ${item}\n`;
        });
        fullDescription += "\n";
      } else {
        fullDescription += "📋 **SUBMIT THE FOLLOWING:**\n";
        fullDescription += "1. Complete answers to all questions (minimum 150 words each)\n";
        fullDescription += "2. Document/PDF format preferred\n";
        fullDescription += "3. Include your name and registration number\n\n";
      }
      
      // Add grading info
      if (assignmentData.gradingRubric && assignmentData.gradingRubric.criteria) {
        fullDescription += "📊 **GRADING CRITERIA:**\n";
        assignmentData.gradingRubric.criteria.forEach((criterion) => {
          fullDescription += `• ${criterion.aspect}: ${criterion.points}% - ${criterion.description}\n`;
        });
        fullDescription += "\n";
      }
      
      // Add video reference
      if (analysis.selectedVideoUrl) {
        fullDescription += `🎥 **REFERENCE VIDEO:** ${analysis.selectedVideoTitle || 'Educational Video'}\n`;
        fullDescription += `Watch here: ${analysis.selectedVideoUrl}\n\n`;
      }
      
      // Add estimated time and instructions
      fullDescription += `⏱️ **ESTIMATED TIME:** ${assignmentData.estimatedTime || '2-3 hours'}\n`;
      fullDescription += `📅 **DUE DATE:** Check the due date above\n\n`;
      fullDescription += "💡 **INSTRUCTIONS:**\n";
      fullDescription += "- Watch the video completely before starting\n";
      fullDescription += "- Take notes while watching\n";
      fullDescription += "- Answer questions in detail with examples\n";
      fullDescription += "- Proofread before submission\n";
      fullDescription += "- Submit on time to avoid penalties";

      // Create assignment using your existing schema - NO CHANGES NEEDED
      const newAssignment = await massignments.create({
        name: analysis.name,
        user: analysis.user, 
        colid: analysis.colid,
        year: new Date().getFullYear().toString(),
        course: analysis.coursename || analysis.topic,
        coursecode: analysis.coursecode,
        assignment: assignmentTitle, // Your existing field
        description: fullDescription, // Your existing field  
        duedate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Your existing field - 1 week
        type: 'AI Video Analysis', // Your existing field
        methodology: 'Video Analysis with Questions', // Your existing field
        learning: assignmentData.learningOutcomes ? 
          assignmentData.learningOutcomes.join('; ') : 
          `Critical analysis and understanding of ${analysis.topic}`, // Your existing field
        doclink: analysis.selectedVideoUrl || '', // Your existing field
        status1: 'Active', // Your existing field
        comments: `Auto-generated from AI video analysis on ${new Date().toLocaleDateString()}` // Your existing field
      });
      
      // Update the analysis status - using existing aivideoanalysisds fields only
      await aivideoanalysisds.findByIdAndUpdate(analysisId, {
        status: 'completed',
        processingEndTime: new Date(),
        // Store assignment ID in existing generatedAssignments array
        $push: {
          generatedAssignments: {
            assignmentId: newAssignment._id,
            title: assignmentTitle,
            createdAt: new Date()
          }
        }
      });

      // Notify via socket
      if (io) {
        io.emit('videoanalysis-update', {
          analysisId,
          status: 'completed',
          assignmentCreated: true,
          assignmentId: newAssignment._id,
          assignmentTitle: assignmentTitle,
          message: '✅ Assignment created successfully with detailed questions!'
        });
      }
      // Send AI chat message with results
      await sendAIChatMessageWithStatus(analysis, videoAnalysis, selectedVideo, assignmentData, 'completed', io);

    } catch (assignmentError) {
      console.error('Assignment creation failed:', assignmentError);
      
      // Update status to completed even if assignment fails
      await aivideoanalysisds.findByIdAndUpdate(analysisId, {
        status: 'completed',
        processingEndTime: new Date(),
        error: 'Assignment generation failed: ' + assignmentError.message
      });
      
      if (io) {
        io.emit('videoanalysis-update', {
          analysisId,
          status: 'error',
          message: 'Video analysis completed but assignment creation failed'
        });
      }
    }

    // Update quota usage
    await gptapikeyds.findOneAndUpdate(
      { user: analysis.user, colid: analysis.colid },
      {
        $inc: {
          currentusage: 25,
          youtubequotaused: 100
        },
        lastusagedate: new Date(),
        youtubelastusage: new Date()
      }
    );

  } catch (error) {
    if (analysis) {
      let errorMessage = error.message;
      if (error.message.includes('quota exceeded')) {
        errorMessage = '⚠️ Gemini API quota exceeded. Please try again later or check your API quota limits.';
      } else if (error.message.includes('No educational videos found')) {
        errorMessage = 'No suitable educational videos found for this topic. Try a different topic or check your YouTube API quota.';
      }

      await aivideoanalysisds.findByIdAndUpdate(analysisId, {
        status: 'failed',
        $push: { processingLog: `Error: ${errorMessage}` }
      });

      await sendErrorMessage(analysis, errorMessage, io);
    }
  }
}

// ✅ Enhanced AI message broadcasting
async function sendAIChatMessageWithStatus(analysis, videoAnalysis, selectedVideo, assignmentData, status, io) {
  try {
    let statusEmoji = '✅';
    let statusMessage = 'AI Analysis Complete!';
    if (status === 'fallback') {
      statusEmoji = '⚠️';
      statusMessage = 'AI Analysis Complete (Fallback Mode)';
    }

    const aiMessage = {
      room: analysis.chatRoomId,
      sender: 'ai@system.com',
      sendername: 'AI Assistant',
      role: 'ai',
      message: `${statusEmoji} **${statusMessage}**\n\n` +
        `📚 **Topic**: ${analysis.topic}\n\n` +
        `🎥 **Video Found**: ${selectedVideo?.title || 'Educational content'}\n` +
        (selectedVideo?.url ? `🔗 **Link**: ${selectedVideo.url}\n\n` : '') +
        `📝 **Summary**:\n${videoAnalysis.summary}\n\n` +
        `💬 **Discussion**:\n${videoAnalysis.discussion || 'Detailed discussion about the topic and its educational significance.'}\n\n` +
        `🎯 **Learning Objectives**:\n${videoAnalysis.learningObjectives.map(obj => `• ${obj}`).join('\n')}\n\n` +
        `📊 **Difficulty Level**: ${videoAnalysis.difficultyLevel}\n` +
        `⭐ **Relevance Score**: ${(videoAnalysis.relevanceScore * 100).toFixed(1)}%\n\n` +
        `📋 **Assignment Created**: ${assignmentData.assignmentTitle}\n` +
        `📄 **Description**: ${assignmentData.description.substring(0, 200)}${assignmentData.description.length > 200 ? '...' : ''}\n` +
        `❓ **Questions**: ${assignmentData.questions ? assignmentData.questions.length : 0} questions generated\n` +
        `🔬 **Exercises**: ${assignmentData.practicalExercises ? assignmentData.practicalExercises.length : 0} exercises included\n` +
        `⏱️ **Estimated Time**: ${assignmentData.estimatedTime || '3-4 hours'}\n\n` +
        `🎓 **Learning Outcomes**:\n${(assignmentData.learningOutcomes || []).map(outcome => `• ${outcome}`).join('\n')}`,
      msgtype: 'ai_analysis',
      colid: analysis.colid,
      course: analysis.coursename || analysis.coursecode,
      coursecode: analysis.coursecode,
      timestamp: new Date()
    };

    await messageds.create(aiMessage);

    if (io) {
      const facultyRoom = analysis.chatRoomId;
      const studentRoom = `${analysis.chatRoomId}_view`;
      io.to(facultyRoom).emit('receive_ai_message', aiMessage);
      io.to(studentRoom).emit('receive_ai_message', aiMessage);

      const statusUpdate = {
        analysisId: analysis._id,
        classId: analysis.classid,
        status: 'completed',
        topic: analysis.topic,
        coursecode: analysis.coursecode,
        assignmentTitle: assignmentData.assignmentTitle,
        timestamp: new Date()
      };
      io.to(facultyRoom).emit('ai_analysis_status_update', statusUpdate);
      io.to(studentRoom).emit('ai_analysis_status_update', statusUpdate);
    }

  } catch (error) {
    // console.error('Error sending AI chat message:', error);
  }
}

// Enhanced error message
async function sendErrorMessage(analysis, errorMessage, io) {
  try {
    const errorMsg = {
      room: analysis.chatRoomId,
      sender: 'ai@system.com',
      sendername: 'AI Assistant',
      role: 'ai',
      message: `❌ **AI Analysis Failed**\n\n` +
        `**Topic**: ${analysis.topic}\n` +
        `**Error**: ${errorMessage}\n\n` +
        `💡 **Next Steps:**\n` +
        `• Check your API key quotas in the AI Settings\n` +
        `• Try again in a few minutes if quota exceeded\n` +
        `• Contact support if the problem persists`,
      msgtype: 'ai_error',
      colid: analysis.colid,
      course: analysis.coursename || analysis.coursecode,
      coursecode: analysis.coursecode,
      timestamp: new Date()
    };

    await messageds.create(errorMsg);
    if (io) {
      io.to(analysis.chatRoomId).emit('ai_error', { error: errorMessage });
      io.to(`${analysis.chatRoomId}_view`).emit('ai_error', { error: errorMessage });
    }
  } catch (error) {
    // console.error('Error sending error message:', error);
  }
}

// Get AI video analyses by user
exports.getaivideoanalysisbyuseradvance = async (req, res) => {
  try {
    const { colid, user } = req.query;
    if (!colid || !user) {
      return res.status(400).json({
        success: false,
        message: 'colid and user are required'
      });
    }

    const analyses = await aivideoanalysisds.find({
      user: user,
      colid: parseInt(colid)
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'AI video analyses retrieved successfully',
      data: analyses,
      count: analyses.length
    });

  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to retrieve AI video analyses',
    //   error: error.message
    // });
  }
};

// Get AI chat messages for a specific room
exports.getaichatmessagesadvance = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const { colid, coursecode } = req.query;

    if (!chatRoomId) {
      return res.status(400).json({
        success: false,
        message: 'Chat room ID is required'
      });
    }

    let query = { room: chatRoomId };
    if (colid) {
      query.colid = parseInt(colid);
    }
    if (coursecode) {
      query.coursecode = coursecode;
    }

    const messages = await messageds.find(query)
      .sort({ timestamp: 1 })
      .limit(100);

    res.json({
      success: true,
      message: 'AI chat messages retrieved successfully',
      data: messages,
      count: messages.length
    });

  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to retrieve AI chat messages',
    //   error: error.message
    // });
  }
};

// Delete AI analysis
exports.deleteaivideoanalysisadvance = async (req, res) => {
  try {
    const { id } = req.params;
    const { colid, user } = req.query;

    const deleted = await aivideoanalysisds.findOneAndDelete({
      _id: id,
      colid: parseInt(colid),
      user: user
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'AI analysis not found'
      });
    }

    res.json({
      success: true,
      message: 'AI analysis deleted successfully'
    });

  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to delete AI analysis',
    //   error: error.message
    // });
  }
};