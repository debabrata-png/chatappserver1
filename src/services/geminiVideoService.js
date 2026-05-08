const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiVideoService {
  constructor() {
    this.genAI = null;
    this.model = null;
  }

  // Initialize with API key from your existing system
  initialize(apiKey) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    });
  }

  async generateContentWithRetries(prompt, maxRetries = 3) {
    let retryCount = 0;
    while (retryCount < maxRetries) {
      try {
        if (retryCount > 0) {
          const waitTime = Math.min(Math.pow(2, retryCount) * 30000, 300000);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        const result = await this.model.generateContent(prompt);
        return result;
      } catch (error) {
        if (error.status === 503) {
          retryCount++;
          if (retryCount < maxRetries) {
            continue;
          } else {
            throw new Error('Gemini API service overloaded after maximum retries');
          }
        } else {
          throw error;
        }
      }
    }
    throw new Error('Maximum retries reached');
  }

  async analyzeEducationalVideo(videoUrl, videoTitle, topic, courseLevel = 'undergraduate') {
    try {
      // ✅ ENHANCED: Added discussion generation to prompt
      const prompt = `Analyze this educational video about "${topic}" for ${courseLevel} students:

Title: "${videoTitle}"
URL: ${videoUrl}

Provide comprehensive analysis in JSON format:
{
  "summary": "150-word summary of key educational concepts",
  "discussion": "Brief discussion explaining the topic in detail (200-250 words) with educational insights and practical applications",
  "learningObjectives": ["objective1", "objective2", "objective3"],
  "difficultyLevel": "beginner|intermediate|advanced",
  "keyTimestamps": [{"time": "2:30", "concept": "Key concept"}],
  "relevanceScore": 0.85,
  "recommendedUse": "How to use in curriculum"
}`;

      const result = await this.generateContentWithRetries(prompt, 3);
      const responseText = result.response.text().trim();
      const cleanResponse = responseText.replace(/``````\n?/g, '').trim();
      
      try {
        const analysis = JSON.parse(cleanResponse);
        return analysis;
      } catch (parseError) {
        return this.createFallbackAnalysis(topic, courseLevel);
      }

    } catch (error) {
      if (error.message.includes('quota exceeded') || error.message.includes('service overloaded')) {
        return this.createFallbackAnalysis(topic, courseLevel);
      }
      return this.createFallbackAnalysis(topic, courseLevel);
    }
  }

  // ✅ COMPLETELY DYNAMIC: Assignment generation with detailed prompts
  async generateAssignment(videoAnalysis, topic, courseLevel = 'undergraduate') {
    try {
      const prompt = `Based on the video analysis provided, create a comprehensive educational assignment for the topic: "${topic}" at ${courseLevel} level.

Video Analysis Context:
- Summary: ${videoAnalysis.summary}
- Learning Objectives: ${videoAnalysis.learningObjectives.join(', ')}
- Difficulty Level: ${videoAnalysis.difficultyLevel}
- Discussion Points: ${videoAnalysis.discussion || 'General topic discussion'}

Generate a detailed assignment that includes:
1. Creative and relevant assignment title
2. Clear description explaining what students need to do
3. 5-8 thought-provoking questions based on the video content
4. 3-5 practical exercises or activities
5. Clear deliverables students must submit
6. Detailed grading rubric with specific criteria
7. Realistic estimated completion time
8. Learning outcomes students will achieve

Respond ONLY with valid JSON in this exact format:
{
  "assignmentTitle": "Creative title for the assignment",
  "description": "Detailed description of what students need to do (200-300 words)",
  "questions": [
    "Question 1 based on video content",
    "Question 2 exploring deeper concepts", 
    "Question 3 about practical applications",
    "Question 4 encouraging critical thinking",
    "Question 5 connecting to real-world scenarios"
  ],
  "practicalExercises": [
    "Hands-on exercise 1",
    "Research activity 2", 
    "Creative project 3"
  ],
  "deliverables": [
    "Written report (2-3 pages)",
    "Practical demonstration",
    "Reflection summary"
  ],
  "gradingRubric": "Detailed grading criteria with specific percentages and expectations",
  "estimatedTime": "X hours",
  "learningOutcomes": [
    "Specific skill students will develop",
    "Knowledge area they will master",
    "Practical application they will achieve"
  ]
}`;

      const result = await this.generateContentWithRetries(prompt, 3);
      const responseText = result.response.text().trim();
      
      // ✅ ENHANCED: Better JSON cleaning and parsing
      let cleanResponse = responseText;
      cleanResponse = cleanResponse.replace(/``````\n?/g, '');
      cleanResponse = cleanResponse.replace(/^``````$/g, '');
      cleanResponse = cleanResponse.trim();
      
      const jsonStart = cleanResponse.indexOf('{');
      const jsonEnd = cleanResponse.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
      }

      try {
        const assignment = JSON.parse(cleanResponse);
        
        if (!assignment.assignmentTitle || !assignment.description || !assignment.questions) {
          throw new Error('Missing required assignment fields');
        }
        
        assignment.questions = Array.isArray(assignment.questions) ? assignment.questions : [];
        assignment.practicalExercises = Array.isArray(assignment.practicalExercises) ? assignment.practicalExercises : [];
        assignment.deliverables = Array.isArray(assignment.deliverables) ? assignment.deliverables : [];
        assignment.learningOutcomes = Array.isArray(assignment.learningOutcomes) ? assignment.learningOutcomes : [];
        
        return assignment;
        
      } catch (parseError) {
        return this.createFallbackAssignment(topic, courseLevel);
      }

    } catch (error) {
      if (error.message.includes('quota exceeded') || error.message.includes('service overloaded')) {
        return this.createFallbackAssignment(topic, courseLevel);
      }
      return this.createFallbackAssignment(topic, courseLevel);
    }
  }

  // ✅ ENHANCED: Fallback analysis with discussion
  createFallbackAnalysis(topic, courseLevel) {
    return {
      summary: `Educational content about ${topic}. This video covers fundamental concepts and provides practical examples suitable for ${courseLevel} students. The content includes theoretical explanations and real-world applications to help students understand the topic better.`,
      
      discussion: `${topic} is a fundamental concept that plays a crucial role in modern education and practical applications. This topic encompasses various aspects including theoretical foundations, practical implementations, and real-world scenarios. Students studying ${topic} should focus on understanding the core principles, analyzing different approaches, and applying the knowledge to solve practical problems. The educational value of this content lies in its ability to bridge theoretical concepts with practical applications, making it highly relevant for ${courseLevel} students. By engaging with this material, students will develop critical thinking skills and gain comprehensive understanding of how ${topic} applies in various contexts and scenarios.`,
      
      learningObjectives: [
        `Understand the core concepts of ${topic}`,
        `Apply ${topic} principles in practical scenarios`,
        `Analyze and evaluate examples related to ${topic}`
      ],
      difficultyLevel: courseLevel === 'graduate' ? 'advanced' : 'intermediate',
      keyTimestamps: [
        {"time": "0:00", "concept": "Introduction and overview"},
        {"time": "5:00", "concept": "Main concepts explained"},
        {"time": "10:00", "concept": "Practical examples"}
      ],
      relevanceScore: 0.75,
      recommendedUse: `This video can be used to introduce students to ${topic} concepts and provide foundational understanding`
    };
  }

  // ✅ ENHANCED: Dynamic fallback assignment
  createFallbackAssignment(topic, courseLevel) {
    return {
      assignmentTitle: `Comprehensive Study: ${topic} - ${courseLevel.charAt(0).toUpperCase() + courseLevel.slice(1)} Level Analysis`,
      
      description: `This assignment focuses on developing a thorough understanding of ${topic} through comprehensive analysis and practical application. Students will engage with the educational content provided and demonstrate their learning through various assessment methods. The assignment is designed for ${courseLevel} students and emphasizes both theoretical understanding and practical application of concepts related to ${topic}. Students should approach this assignment by first reviewing the provided educational materials, then conducting additional research, and finally synthesizing their learning into the required deliverables.`,
      
      questions: [
        `Define and explain the core concepts of ${topic} as presented in the educational material.`,
        `How do the principles of ${topic} apply to real-world scenarios? Provide specific examples.`,
        `What are the most significant challenges or limitations when working with ${topic}?`,
        `Compare and contrast different approaches or methodologies within ${topic}.`,
        `Analyze the practical implications of ${topic} in your field of study or career interests.`,
        `What future developments or trends do you foresee in the field of ${topic}?`,
        `How would you explain ${topic} to someone who has no prior knowledge of the subject?`
      ],
      
      practicalExercises: [
        `Research and present a case study demonstrating the application of ${topic} in industry`,
        `Create a visual diagram or flowchart explaining the key processes in ${topic}`,
        `Develop a practical example or scenario that illustrates the concepts of ${topic}`,
        `Compare three different resources or perspectives on ${topic} and analyze their approaches`
      ],
      
      deliverables: [
        `Comprehensive written analysis (3-4 pages) covering all assignment questions`,
        `Visual presentation or infographic summarizing key concepts`,
        `Practical demonstration or example with detailed explanation`,
        `Reflection essay on learning outcomes and personal insights (1-2 pages)`
      ],
      
      gradingRubric: `Assessment will be based on: Understanding and accuracy of concepts (30%), Quality of analysis and critical thinking (25%), Practical application and examples (20%), Clarity of communication and presentation (15%), Creativity and innovation in approach (10%). Each component will be evaluated on a scale of Excellent (90-100%), Proficient (80-89%), Developing (70-79%), and Needs Improvement (below 70%).`,
      
      estimatedTime: `4-6 hours`,
      
      learningOutcomes: [
        `Demonstrate comprehensive understanding of ${topic} principles and concepts`,
        `Apply critical thinking skills to analyze and evaluate ${topic}-related scenarios`,
        `Develop effective communication skills through written and visual presentations`,
        `Connect theoretical knowledge to practical, real-world applications`,
        `Enhance research and analytical skills through independent study`
      ]
    };
  }
}

module.exports = GeminiVideoService;
