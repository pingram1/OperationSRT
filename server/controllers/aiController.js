const axios = require('axios');
const User = require('../models/User');

/**
 * @desc    Generate AI study plan based on upcoming sessions
 * @route   POST /api/ai/study-plan
 * @access  Private
 */
const generateStudyPlan = async (req, res) => {
    try {
        const { sessions, subjects } = req.body;
        const userId = req.user.id;

        // Fetch user to get student profile information
        const user = await User.findById(userId).select('studentProfile role');
        const studentProfile = user?.studentProfile || {};

        // Build context from sessions
        const sessionInfo = sessions.map(s => ({
            subject: s.subject || 'General',
            date: s.sessionDate,
            tutor: s.tutor?.name || 'Tutor to be assigned',
            type: s.serviceType || 'tutoring'
        }));

        // Create enhanced prompt with detailed formatting instructions
        const studentContext = [];
        if (studentProfile.gradeLevel) studentContext.push(`Grade Level: ${studentProfile.gradeLevel}`);
        if (studentProfile.grade) studentContext.push(`Grade: ${studentProfile.grade}`);
        if (studentProfile.subjectOfFocus && studentProfile.subjectOfFocus.length > 0) {
            studentContext.push(`Primary Subjects: ${studentProfile.subjectOfFocus.join(', ')}`);
        }
        if (studentProfile.learningStyle) studentContext.push(`Learning Style: ${studentProfile.learningStyle}`);
        if (studentProfile.academicGoals) studentContext.push(`Academic Goals: ${studentProfile.academicGoals}`);

        const prompt = `You are an expert educational AI tutor specializing in personalized learning strategies. Create a comprehensive, actionable weekly study plan for a student.

STUDENT CONTEXT:
${studentContext.length > 0 ? studentContext.map(ctx => `- ${ctx}`).join('\n') + '\n' : ''}- Upcoming Sessions: 
${sessionInfo.map((s, i) => `  ${i + 1}. ${s.subject} session on ${new Date(s.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date(s.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} with ${s.tutor}`).join('\n')}
- Subjects: ${subjects.join(', ') || studentProfile.subjectOfFocus?.join(', ') || 'Various subjects'}

OUTPUT FORMAT REQUIREMENTS:
Use markdown formatting with the following structure:

# 📚 Weekly Study Plan

## Overview
[Brief 2-3 sentence summary of the week's goals and focus areas]

## Daily Schedule

### Monday - [Subject] Preparation
- **Focus Area**: [Specific topic or concept]
- **Tasks**: 
  - [Task 1 with time estimate in parentheses]
  - [Task 2 with time estimate in parentheses]
  - [Task 3 with time estimate in parentheses]
- **Study Time**: [Total hours]
- **Preparation for**: [Upcoming session details if applicable]

[Repeat for each day of the week that has activities]

## Study Tips & Strategies
- [Tip 1 specific to the subjects being studied]
- [Tip 2 about time management and efficiency]
- [Tip 3 about retention and review]
- [Tip 4 about active learning techniques]

## Weekly Goals
- [ ] [Specific, measurable goal 1]
- [ ] [Specific, measurable goal 2]
- [ ] [Specific, measurable goal 3]

## Resources Needed
- [Resource 1 - specific textbooks, websites, or materials]
- [Resource 2 - practice problems, flashcards, etc.]

## Important Reminders
- [Reminder 1 - upcoming deadlines or sessions]
- [Reminder 2 - key dates or milestones]

INSTRUCTIONS:
1. Make each day's plan specific and actionable with concrete tasks
2. Align tasks directly with upcoming sessions (review relevant topics beforehand)
3. Include realistic time estimates for each task (in minutes or hours)
4. Use emojis sparingly for visual organization (📚 for study, 📝 for notes, ⏰ for time, ✅ for goals)
5. Keep the tone encouraging, supportive, and motivating
6. Include specific topics, chapters, or concepts when possible (not just generic "study math")
7. Suggest concrete study methods (e.g., "Create flashcards for vocabulary", "Solve 5 practice problems from chapter 3", "Review lecture notes from last week")
8. Consider the student's workload and suggest appropriate breaks
9. Prioritize preparation for upcoming sessions
10. Include review of previous session materials
11. Suggest when to take breaks and how long (e.g., "Take a 10-minute break after 45 minutes of study")
${studentProfile.learningStyle ? `12. Tailor study methods to the student's learning style (${studentProfile.learningStyle}). For Visual learners, suggest diagrams and visual aids. For Auditory learners, suggest reading aloud or listening to recordings. For Kinesthetic learners, suggest hands-on activities. For Reading/Writing learners, suggest note-taking and written exercises.` : ''}
${studentProfile.academicGoals ? `13. Align study activities with the student's academic goals: ${studentProfile.academicGoals}` : ''}
${studentProfile.gradeLevel ? `14. Ensure content and difficulty are appropriate for ${studentProfile.gradeLevel} level (${studentProfile.grade || 'general'})` : ''}

TONE: Supportive, clear, and actionable. Write as if you're a friendly, experienced tutor personally guiding the student through their week. Be specific and practical, avoiding vague advice.

FORMATTING NOTES:
- Use markdown headers (##, ###) for sections
- Use bold (**text**) for emphasis on key information
- Use bullet points (-) for lists
- Use checkboxes (- [ ]) for goals
- Keep paragraphs concise (2-3 sentences max)
- Use line breaks between sections for readability`;

        // Call Gemini API (you'll need to add your API key to environment variables)
        const apiKey = process.env.GEMINI_API_KEY?.trim() || '';
        
        if (!apiKey) {
            console.log('[generateStudyPlan] No API key found, using mock data');
            // Return a mock study plan if API key is not configured
            return res.json({
                studyPlan: `📚 Weekly Study Plan

Based on your upcoming sessions, here's your personalized study plan:

Monday - ${sessionInfo[0]?.subject || 'General'} Preparation
• Review previous session notes
• Complete any assigned practice problems
• Prepare questions for your tutor
• Study time: 1-2 hours

Tuesday - ${sessionInfo[1]?.subject || sessionInfo[0]?.subject || 'General'} Focus
• Work on challenging topics
• Use practice resources
• Study time: 1-2 hours

Wednesday - Review Day
• Review all subjects covered this week
• Complete practice exercises
• Study time: 1-2 hours

Thursday - Final Preparation
• Review session materials
• Prepare for upcoming sessions
• Study time: 1 hour

Friday - Practice Day
• Complete practice problems
• Review key concepts
• Study time: 1-2 hours

📝 Study Tips:
• Break study sessions into 25-minute blocks with 5-minute breaks
• Focus on one subject at a time
• Take notes during your tutoring sessions
• Ask questions when you don't understand something

💡 Remember: Consistent daily practice is more effective than cramming!`,
                generatedAt: new Date().toISOString()
            });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        console.log('[generateStudyPlan] Calling Gemini API with key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'none');
        
        const response = await axios.post(apiUrl, {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.8,  // Balanced creativity and focus (0.0-1.0)
                topK: 40,          // Consider top K tokens
                topP: 0.95,        // Nucleus sampling threshold
                maxOutputTokens: 2048,  // Maximum length of response
            }
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.data.candidates && response.data.candidates[0].content) {
            const studyPlan = response.data.candidates[0].content.parts[0].text;
            console.log('[generateStudyPlan] Successfully generated study plan');
            res.json({
                studyPlan,
                generatedAt: new Date().toISOString()
            });
        } else {
            console.error('[generateStudyPlan] Invalid response structure:', response.data);
            throw new Error('Invalid response from AI service');
        }
    } catch (error) {
        console.error('[generateStudyPlan] Error:', error.message);
        if (error.response) {
            console.error('[generateStudyPlan] API Error Response:', error.response.data);
        }
        res.status(500).json({ 
            message: 'Failed to generate study plan',
            error: error.response?.data?.error?.message || error.message 
        });
    }
};

/**
 * @desc    Generate practice questions for a subject
 * @route   POST /api/ai/practice-questions
 * @access  Private
 */
const generatePracticeQuestions = async (req, res) => {
    try {
        const { subject, difficulty = 'medium', numberOfQuestions = 5 } = req.body;
        const userId = req.user.id;

        if (!subject) {
            return res.status(400).json({ message: 'Subject is required' });
        }

        // Fetch user to get student profile information
        const user = await User.findById(userId).select('studentProfile role');
        const studentProfile = user?.studentProfile || {};
        
        // Adjust difficulty based on grade level if not explicitly set
        let adjustedDifficulty = difficulty;
        if (difficulty === 'medium' && studentProfile.gradeLevel) {
            if (studentProfile.gradeLevel === 'Elementary' || studentProfile.gradeLevel === 'Middle School') {
                adjustedDifficulty = 'easy';
            } else if (studentProfile.gradeLevel === 'College' || studentProfile.gradeLevel === 'Graduate') {
                adjustedDifficulty = 'hard';
            }
        }

        // Create enhanced prompt with detailed difficulty guidelines and formatting
        const studentContext = [];
        if (studentProfile.gradeLevel) studentContext.push(`Grade Level: ${studentProfile.gradeLevel}`);
        if (studentProfile.grade) studentContext.push(`Specific Grade: ${studentProfile.grade}`);
        if (studentProfile.learningStyle) studentContext.push(`Learning Style: ${studentProfile.learningStyle}`);
        if (studentProfile.academicGoals) studentContext.push(`Academic Goals: ${studentProfile.academicGoals}`);

        const prompt = `You are an expert ${subject} educator creating practice questions for students. Your goal is to create high-quality, educational questions that test understanding and application of concepts.

SUBJECT: ${subject}
DIFFICULTY LEVEL: ${adjustedDifficulty}${studentProfile.gradeLevel ? ` (adjusted for ${studentProfile.gradeLevel} level)` : ''}
NUMBER OF QUESTIONS: ${numberOfQuestions}
${studentContext.length > 0 ? `\nSTUDENT PROFILE:\n${studentContext.map(ctx => `- ${ctx}`).join('\n')}` : ''}

DIFFICULTY GUIDELINES:
- "easy": Basic concepts, definitions, simple recall, straightforward applications${studentProfile.gradeLevel === 'Elementary' || studentProfile.gradeLevel === 'Middle School' ? ' (perfect for this student\'s grade level)' : ' (typically grades 9-10 level or introductory college)'}
- "medium": Intermediate concepts, analysis, problem-solving, application of formulas or principles${studentProfile.gradeLevel === 'High School' ? ' (appropriate for this student\'s grade level)' : ' (typically grades 11-12 level or intermediate college)'}
- "hard": Advanced concepts, synthesis, complex problem-solving, multi-step reasoning, critical thinking${studentProfile.gradeLevel === 'College' || studentProfile.gradeLevel === 'Graduate' ? ' (challenging but appropriate for this student\'s level)' : ' (typically advanced high school or college level)'}
${studentProfile.gradeLevel ? `\nIMPORTANT: The student is at ${studentProfile.gradeLevel} level${studentProfile.grade ? ` (${studentProfile.grade})` : ''}. Ensure all questions are age-appropriate and aligned with the curriculum typically covered at this level.` : ''}

QUESTION REQUIREMENTS:
1. Each question must test genuine understanding, not just memorization
2. Distractors (wrong answers) should be plausible but clearly incorrect upon careful consideration
3. Questions should be progressive in difficulty (start with easier concepts, progress to more challenging)
4. Include real-world applications when relevant and appropriate
5. Make questions engaging, relevant, and interesting
6. Avoid trick questions, ambiguous wording, or overly pedantic distinctions
7. Each question should focus on a different key concept or skill within ${subject}
8. Questions should be age-appropriate and educationally valuable
9. Use clear, concise language that students at this level would understand
10. Ensure questions are solvable with the knowledge expected at this difficulty level

FORMAT REQUIREMENTS:
- Question text should be clear, concise, and complete (1-3 sentences max)
- Options (A, B, C, D) should be:
  * Parallel in structure and grammatical form
  * Similar in length (avoid one option being significantly longer)
  * Plausible but only one clearly correct
  * Labeled as "Option A", "Option B", "Option C", "Option D"
- Correct answer should not be obviously different from others in style or length
- Explanation should:
  * Clearly explain why the correct answer is right (2-3 sentences)
  * Briefly mention why other options are incorrect (1 sentence)
  * Reference the key concept or principle being tested
  * Be educational and help students learn from the question
  * Be written in a supportive, instructional tone

EXAMPLE OF EXCELLENT QUESTION STRUCTURE:
{
  "question_text": "In a quadratic equation ax² + bx + c = 0, what does the discriminant (b² - 4ac) determine about the solutions?",
  "options": [
    "Option A: The x-intercepts of the parabola",
    "Option B: The number and type of solutions (real vs. complex)",
    "Option C: The vertex coordinates of the parabola",
    "Option D: The axis of symmetry of the parabola"
  ],
  "correct_answer": "Option B: The number and type of solutions (real vs. complex)",
  "explanation": "The discriminant (b² - 4ac) determines the nature of the roots of a quadratic equation. If b² - 4ac > 0, there are two distinct real solutions. If b² - 4ac = 0, there is exactly one real solution (a repeated root). If b² - 4ac < 0, there are two complex conjugate solutions. The x-intercepts, vertex, and axis of symmetry are determined by other aspects of the quadratic function, not the discriminant itself."
}

CONTENT QUALITY STANDARDS:
- Questions should cover important, fundamental concepts in ${subject}
- Avoid trivial or overly obscure topics
- Ensure questions are fair and test what students should know at this level
- Make questions progressively more challenging if generating multiple questions
- Include variety in question types (conceptual, computational, analytical, application-based)

Generate exactly ${numberOfQuestions} high-quality questions following this exact structure, format, and quality standard. Each question should be unique and test different aspects of ${subject} at the ${difficulty} difficulty level.`;

        // Call Gemini API
        const apiKey = process.env.GEMINI_API_KEY?.trim() || '';
        
        if (!apiKey) {
            console.log('[generatePracticeQuestions] No API key found, using mock data');
            // Return mock questions if API key is not configured
            return res.json({
                questions: [
                    {
                        question_text: `What is a key concept in ${subject}?`,
                        options: [
                            "Option A",
                            "Option B (Correct)",
                            "Option C",
                            "Option D"
                        ],
                        correct_answer: "Option B (Correct)",
                        explanation: `This is the correct answer because it demonstrates understanding of ${subject} fundamentals.`
                    },
                    {
                        question_text: `Which of the following best describes ${subject}?`,
                        options: [
                            "Option A",
                            "Option B",
                            "Option C (Correct)",
                            "Option D"
                        ],
                        correct_answer: "Option C (Correct)",
                        explanation: `Option C correctly describes the core principles of ${subject}.`
                    }
                ],
                generatedAt: new Date().toISOString()
            });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        console.log('[generatePracticeQuestions] Calling Gemini API with key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'none');
        
        const response = await axios.post(apiUrl, {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.7,  // Slightly lower for more consistent, focused questions (0.0-1.0)
                topK: 40,          // Consider top K tokens
                topP: 0.95,        // Nucleus sampling threshold
                maxOutputTokens: 2048,  // Maximum length of response
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        questions: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    question_text: { 
                                        type: "STRING",
                                        description: "The question text, clear and concise (1-3 sentences)"
                                    },
                                    options: { 
                                        type: "ARRAY", 
                                        items: { type: "STRING" },
                                        description: "Array of exactly 4 multiple choice options, labeled as 'Option A', 'Option B', etc."
                                    },
                                    correct_answer: { 
                                        type: "STRING",
                                        description: "The correct answer, must match exactly one of the options"
                                    },
                                    explanation: { 
                                        type: "STRING",
                                        description: "Clear explanation (2-4 sentences) explaining why the answer is correct and why others are wrong"
                                    }
                                },
                                required: ["question_text", "options", "correct_answer", "explanation"]
                            }
                        }
                    },
                    required: ["questions"]
                }
            }
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.data.candidates && response.data.candidates[0].content) {
            const responseText = response.data.candidates[0].content.parts[0].text;
            const questionsData = JSON.parse(responseText);
            console.log('[generatePracticeQuestions] Successfully generated', questionsData.questions?.length || 0, 'questions');
            res.json({
                questions: questionsData.questions || [],
                generatedAt: new Date().toISOString()
            });
        } else {
            console.error('[generatePracticeQuestions] Invalid response structure:', response.data);
            throw new Error('Invalid response from AI service');
        }
    } catch (error) {
        console.error('[generatePracticeQuestions] Error:', error.message);
        if (error.response) {
            console.error('[generatePracticeQuestions] API Error Response:', error.response.data);
        }
        res.status(500).json({ 
            message: 'Failed to generate practice questions',
            error: error.response?.data?.error?.message || error.message 
        });
    }
};

module.exports = {
    generateStudyPlan,
    generatePracticeQuestions,
};

