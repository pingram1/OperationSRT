require('dotenv').config();
const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const connectDB = require('../config/db');

// Connect to database
connectDB();

const challenges = [
    // QA / demos: one item per `questionType` (see Challenge schema & ChallengePlayPage)
    {
        title: 'Question Types Demo',
        description:
            'Short challenge with one question each: multiple choice, true/false, fill-in-the-blank, matching, and error detection. Use for manual QA of the polymorphic question system.',
        subject: 'English',
        difficulty: 'Easy',
        challengeType: 'identification',
        xpReward: 15,
        gradeLevels: ['6', '7', '8', '9', '10', '11', '12', 'College', 'Independent Learner'],
        estimatedDuration: 8,
        questions: [
            {
                questionType: 'multiple_choice',
                question: 'Which word is a synonym for "happy"?',
                options: ['Melancholy', 'Joyful', 'Furious', 'Ancient'],
                correctAnswer: 'Joyful',
                explanation: '"Joyful" means full of happiness.',
                points: 1,
            },
            {
                questionType: 'true_false',
                question: 'The Pacific Ocean is the largest ocean on Earth by surface area.',
                correctAnswer: true,
                explanation: 'The Pacific covers more area than any other ocean.',
                points: 1,
            },
            {
                questionType: 'fill_in_the_blank',
                question: 'Complete the sentence.',
                fillTemplate: 'Shakespeare\'s "Hamlet" is an example of a {{blank}}.',
                correctAnswer: 'tragedy',
                caseSensitive: false,
                explanation: 'Hamlet is a tragic play.',
                points: 1,
            },
            {
                questionType: 'matching',
                question: 'Match each part of speech to an example word.',
                matchingPairs: [
                    { left: 'Noun', right: 'mountain' },
                    { left: 'Verb', right: 'sprint' },
                    { left: 'Adjective', right: 'brilliant' },
                ],
                explanation: 'Each example illustrates that part of speech.',
                points: 2,
            },
            {
                questionType: 'error_detection',
                question: 'Click the word that is incorrect in this sentence.',
                errorSentence: 'They goes to the library every Tuesday.',
                errorWordIndex: 1,
                explanation: 'With "they," the verb should be "go," not "goes."',
                points: 1,
            },
        ],
        passingScore: 60,
    },

    // Computer Science - Easy
    {
        title: 'Syntax Spotter',
        description: 'Find the single syntax error in 10 different small code snippets.',
        subject: 'Computer Science',
        difficulty: 'Easy',
        challengeType: 'troubleshooting',
        xpReward: 25,
        gradeLevels: ['6', '7', '8', '9', '10', '11', '12', 'College', 'Independent Learner'],
        questions: [
            {
                question: 'Find the syntax error in: `print("Hello World"`',
                options: ['Missing closing parenthesis', 'Missing semicolon', 'Wrong quotes', 'No error'],
                correctAnswer: 'Missing closing parenthesis',
                explanation: 'The print statement is missing a closing parenthesis.',
                points: 1,
            },
            {
                question: 'Find the syntax error in: `x = 5\nprint(x`',
                options: ['Missing closing parenthesis', 'Missing semicolon', 'Wrong variable name', 'No error'],
                correctAnswer: 'Missing closing parenthesis',
                explanation: 'The print statement is missing a closing parenthesis.',
                points: 1,
            },
            {
                question: 'Find the syntax error in: `if x == 5:\n    print(x)`',
                options: ['Missing colon', 'Wrong indentation', 'No error', 'Missing equals sign'],
                correctAnswer: 'No error',
                explanation: 'This code is syntactically correct.',
                points: 1,
            },
        ],
        passingScore: 70,
    },
    {
        title: 'Vocabulary Match-Up',
        description: 'Match 15 programming terms to their correct definitions.',
        subject: 'Computer Science',
        difficulty: 'Easy',
        challengeType: 'matching',
        xpReward: 25,
        gradeLevels: ['6', '7', '8', '9', '10', '11', '12', 'College', 'Independent Learner'],
        matchingPairs: [
            { left: 'Variable', right: 'A named storage location that holds a value' },
            { left: 'Loop', right: 'A control structure that repeats a block of code' },
            { left: 'Function', right: 'A reusable block of code that performs a specific task' },
            { left: 'API', right: 'Application Programming Interface - a set of rules for building software' },
            { left: 'Algorithm', right: 'A step-by-step procedure for solving a problem' },
        ],
        passingScore: 70,
    },
    
    // Math - Easy
    {
        title: 'Fraction Frenzy',
        description: 'Simplify 15 fractions or convert them from improper to mixed numbers.',
        subject: 'Math',
        difficulty: 'Easy',
        challengeType: 'accuracy',
        xpReward: 25,
        requiredStreak: 5,
        gradeLevels: ['3', '4', '5', '6', '7', '8'],
        questions: [
            {
                question: 'Simplify: 8/12',
                options: ['2/3', '4/6', '1/2', '3/4'],
                correctAnswer: '2/3',
                explanation: 'Both 8 and 12 can be divided by 4, resulting in 2/3.',
                points: 1,
            },
            {
                question: 'Simplify: 15/20',
                options: ['3/4', '5/6', '1/2', '7/8'],
                correctAnswer: '3/4',
                explanation: 'Both 15 and 20 can be divided by 5, resulting in 3/4.',
                points: 1,
            },
            {
                question: 'Convert to mixed number: 7/3',
                options: ['2 1/3', '2 2/3', '3 1/3', '1 2/3'],
                correctAnswer: '2 1/3',
                explanation: '7 divided by 3 is 2 with a remainder of 1, so 7/3 = 2 1/3.',
                points: 1,
            },
        ],
        passingScore: 70,
    },
    {
        title: 'Equation Evaluator',
        description: 'Solve 20 single-variable equations.',
        subject: 'Math',
        difficulty: 'Easy',
        challengeType: 'speed-run',
        xpReward: 25,
        timeLimit: 600, // 10 minutes
        gradeLevels: ['6', '7', '8', '9', '10'],
        questions: [
            {
                question: 'Solve for x: 2x + 5 = 15',
                options: ['x = 5', 'x = 10', 'x = 7.5', 'x = 4'],
                correctAnswer: 'x = 5',
                explanation: '2x = 10, so x = 5',
                points: 1,
            },
            {
                question: 'Solve for x: 3x - 7 = 14',
                options: ['x = 7', 'x = 9', 'x = 21', 'x = 5'],
                correctAnswer: 'x = 7',
                explanation: '3x = 21, so x = 7',
                points: 1,
            },
            {
                question: 'Solve for x: x/4 = 6',
                options: ['x = 24', 'x = 10', 'x = 2', 'x = 12'],
                correctAnswer: 'x = 24',
                explanation: 'x = 6 × 4 = 24',
                points: 1,
            },
        ],
        passingScore: 70,
    },
    
    // Science - Easy
    {
        title: 'Element Evangelist',
        description: 'Match 20 chemical element symbols to their correct names.',
        subject: 'Science',
        difficulty: 'Easy',
        challengeType: 'matching',
        xpReward: 25,
        gradeLevels: ['6', '7', '8', '9', '10', '11', '12', 'College'],
        matchingPairs: [
            { left: 'Fe', right: 'Iron' },
            { left: 'Au', right: 'Gold' },
            { left: 'K', right: 'Potassium' },
            { left: 'Na', right: 'Sodium' },
            { left: 'H', right: 'Hydrogen' },
            { left: 'O', right: 'Oxygen' },
            { left: 'C', right: 'Carbon' },
            { left: 'N', right: 'Nitrogen' },
        ],
        passingScore: 70,
    },
    {
        title: 'Cell Sorter',
        description: 'Correctly label 10 organelles on a diagram of an animal or plant cell.',
        subject: 'Science',
        difficulty: 'Easy',
        challengeType: 'identification',
        xpReward: 25,
        gradeLevels: ['6', '7', '8', '9', '10'],
        questions: [
            {
                question: 'What is the control center of the cell?',
                options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Cell membrane'],
                correctAnswer: 'Nucleus',
                explanation: 'The nucleus contains the cell\'s DNA and controls cell activities.',
                points: 1,
            },
            {
                question: 'Which organelle is responsible for producing energy?',
                options: ['Mitochondria', 'Nucleus', 'Ribosome', 'Golgi apparatus'],
                correctAnswer: 'Mitochondria',
                explanation: 'Mitochondria produce ATP, the energy currency of the cell.',
                points: 1,
            },
            {
                question: 'What organelle is found only in plant cells?',
                options: ['Chloroplast', 'Mitochondria', 'Nucleus', 'Ribosome'],
                correctAnswer: 'Chloroplast',
                explanation: 'Chloroplasts contain chlorophyll and are used for photosynthesis.',
                points: 1,
            },
        ],
        passingScore: 70,
    },
    
    // English - Easy
    {
        title: 'Punctuation Pro',
        description: 'Correctly add commas, apostrophes, and periods to 15 sentences.',
        subject: 'English',
        difficulty: 'Easy',
        challengeType: 'troubleshooting',
        xpReward: 25,
        gradeLevels: ['3', '4', '5', '6', '7', '8', '9', '10'],
        questions: [
            {
                question: 'Fix the punctuation: "I went to the store and bought apples bananas and oranges"',
                options: [
                    'I went to the store and bought apples, bananas, and oranges.',
                    'I went to the store and bought apples, bananas and oranges.',
                    'I went to the store, and bought apples, bananas, and oranges.',
                    'I went to the store and bought apples bananas, and oranges.',
                ],
                correctAnswer: 'I went to the store and bought apples, bananas, and oranges.',
                explanation: 'Use commas to separate items in a list, and add a period at the end.',
                points: 1,
            },
            {
                question: 'Fix the punctuation: "Its a beautiful day"',
                options: [
                    'It\'s a beautiful day.',
                    'Its a beautiful day.',
                    'It\'s a beautiful day',
                    'Its\' a beautiful day.',
                ],
                correctAnswer: 'It\'s a beautiful day.',
                explanation: 'Use an apostrophe for the contraction "it\'s" (it is) and add a period.',
                points: 1,
            },
        ],
        passingScore: 70,
    },
    {
        title: 'Figurative Language Finder',
        description: 'Read 10 sentences and identify the correct figurative language being used.',
        subject: 'English',
        difficulty: 'Easy',
        challengeType: 'identification',
        xpReward: 25,
        gradeLevels: ['4', '5', '6', '7', '8', '9', '10'],
        questions: [
            {
                question: 'Identify the figurative language: "The clouds are like cotton balls in the sky."',
                options: ['Simile', 'Metaphor', 'Personification', 'Hyperbole'],
                correctAnswer: 'Simile',
                explanation: 'A simile uses "like" or "as" to compare two things.',
                points: 1,
            },
            {
                question: 'Identify the figurative language: "The wind whispered through the trees."',
                options: ['Simile', 'Metaphor', 'Personification', 'Alliteration'],
                correctAnswer: 'Personification',
                explanation: 'Personification gives human qualities to non-human things.',
                points: 1,
            },
        ],
        passingScore: 70,
    },
    
    // History - Easy
    {
        title: 'Timeline Titan',
        description: 'Place 10 related historical events in correct chronological order.',
        subject: 'History',
        difficulty: 'Easy',
        challengeType: 'identification',
        xpReward: 25,
        gradeLevels: ['6', '7', '8', '9', '10', '11', '12'],
        questions: [
            {
                question: 'Which event happened first?',
                options: ['Declaration of Independence (1776)', 'Boston Tea Party (1773)', 'Revolutionary War begins (1775)', 'Constitution signed (1787)'],
                correctAnswer: 'Boston Tea Party (1773)',
                explanation: 'The Boston Tea Party occurred in 1773, before the Revolutionary War and Declaration of Independence.',
                points: 1,
            },
            {
                question: 'Which event happened last?',
                options: ['Declaration of Independence (1776)', 'Boston Tea Party (1773)', 'Revolutionary War begins (1775)', 'Constitution signed (1787)'],
                correctAnswer: 'Constitution signed (1787)',
                explanation: 'The Constitution was signed in 1787, after the Revolutionary War ended.',
                points: 1,
            },
        ],
        passingScore: 70,
    },
    {
        title: 'Map Master',
        description: 'Identify 15 countries on a modern world map.',
        subject: 'History',
        difficulty: 'Easy',
        challengeType: 'identification',
        xpReward: 25,
        gradeLevels: ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
        questions: [
            {
                question: 'Which country is located directly south of the United States?',
                options: ['Mexico', 'Canada', 'Brazil', 'Cuba'],
                correctAnswer: 'Mexico',
                explanation: 'Mexico shares a border with the southern United States.',
                points: 1,
            },
            {
                question: 'Which country is the largest by land area?',
                options: ['Russia', 'Canada', 'China', 'United States'],
                correctAnswer: 'Russia',
                explanation: 'Russia is the largest country by land area in the world.',
                points: 1,
            },
        ],
        passingScore: 70,
    },
];

async function seedChallenges() {
    try {
        // Clear existing challenges
        await Challenge.deleteMany({});
        console.log('Cleared existing challenges');

        // Insert new challenges
        const createdChallenges = await Challenge.insertMany(challenges);
        console.log(`✅ Successfully seeded ${createdChallenges.length} challenges`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error seeding challenges:', error);
        process.exit(1);
    }
}

// Run the seed function
seedChallenges();

