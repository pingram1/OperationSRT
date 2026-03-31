import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Eye, Ear, Hand, BookOpen, CheckCircle, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSubjects } from '../api/systemConfig';
import { getSecureToken } from '../api/authStorage';

// Reusable Components
const Card = ({ children, className = '' }) => (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>{children}</div>
);

const ProgressTracker = ({ currentStep, totalSteps, steps }) => {
    return (
        <div className="flex items-center w-full mb-8">
            {steps.map((step, index) => {
                const stepNumber = index + 1;
                const isCompleted = stepNumber < currentStep;
                const isActive = stepNumber === currentStep;

                return (
                    <React.Fragment key={step}>
                        <div className="flex items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                                isCompleted ? 'bg-green-500 text-white' :
                                isActive ? 'bg-blue-600 text-white' :
                                'bg-gray-200 text-gray-500'
                            }`}>
                                {isCompleted ? <CheckCircle className="w-6 h-6" /> : stepNumber}
                            </div>
                            <span className={`ml-2 text-sm font-medium ${
                                isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                            }`}>
                                {step}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`flex-1 h-1 mx-4 ${
                                isCompleted ? 'bg-green-500' : 'bg-gray-200'
                            }`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default function LearningStyleAssessment() {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [subjects, setSubjects] = useState([]);

    // Assessment answers state
    const [answers, setAnswers] = useState({
        // Visual vs Verbal
        prefers_diagrams: null,
        remembers_pictures: null,
        enjoys_visual_aids: null,
        // Sequential vs Global
        likes_step_by_step: null,
        prefers_ordered_learning: null,
        follows_procedures: null,
        // Active vs Reflective
        learns_by_doing: null,
        prefers_discussion: null,
        needs_think_time: null,
        // Structured vs Flexible
        prefers_schedule: null,
        adapts_easily: null,
        needs_routine: null,
        // Teaching strengths (for tutors)
        teaching_strengths: [],
        // Subject expertise (for tutors)
        subject_expertise: {},
        // Learning needs (for students)
        learning_needs: []
    });

    const isTutor = user?.role === 'tutor' || user?.role === 'super_admin';

    useEffect(() => {
        // Fetch subjects for tutor assessment
        if (isTutor) {
            getSubjects()
                .then(data => setSubjects(data.subjects || []))
                .catch(err => console.error('Failed to fetch subjects:', err));
        }
    }, [isTutor]);

    const steps = isTutor 
        ? ['Visual/Verbal', 'Sequential/Global', 'Active/Reflective', 'Structured/Flexible', 'Teaching Strengths', 'Subject Expertise', 'Review']
        : ['Visual/Verbal', 'Sequential/Global', 'Active/Reflective', 'Structured/Flexible', 'Learning Needs', 'Review'];

    const handleAnswer = (question, value) => {
        setAnswers(prev => ({
            ...prev,
            [question]: value
        }));
        setError('');
    };

    const handleMultiSelect = (question, value) => {
        setAnswers(prev => {
            const current = prev[question] || [];
            const updated = current.includes(value)
                ? current.filter(item => item !== value)
                : [...current, value];
            return { ...prev, [question]: updated };
        });
    };

    const handleSubjectExpertise = (subject, level) => {
        setAnswers(prev => ({
            ...prev,
            subject_expertise: {
                ...prev.subject_expertise,
                [subject]: level
            }
        }));
    };

    const nextStep = () => {
        if (validateStep()) {
            setCurrentStep(prev => Math.min(prev + 1, steps.length));
            setError('');
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
        setError('');
    };

    const validateStep = () => {
        switch (currentStep) {
            case 1:
                if (answers.prefers_diagrams === null || answers.remembers_pictures === null || answers.enjoys_visual_aids === null) {
                    setError('Please answer all questions in this section');
                    return false;
                }
                break;
            case 2:
                if (answers.likes_step_by_step === null || answers.prefers_ordered_learning === null || answers.follows_procedures === null) {
                    setError('Please answer all questions in this section');
                    return false;
                }
                break;
            case 3:
                if (answers.learns_by_doing === null || answers.prefers_discussion === null || answers.needs_think_time === null) {
                    setError('Please answer all questions in this section');
                    return false;
                }
                break;
            case 4:
                if (answers.prefers_schedule === null || answers.adapts_easily === null || answers.needs_routine === null) {
                    setError('Please answer all questions in this section');
                    return false;
                }
                break;
            case 5:
                if (isTutor && answers.teaching_strengths.length === 0) {
                    setError('Please select at least one teaching strength');
                    return false;
                }
                if (!isTutor && answers.learning_needs.length === 0) {
                    setError('Please select at least one learning need');
                    return false;
                }
                break;
            case 6:
                if (isTutor && Object.keys(answers.subject_expertise).length === 0) {
                    setError('Please rate your expertise in at least one subject');
                    return false;
                }
                break;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateStep()) {
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            // Prepare assessment data
            const assessmentData = {
                ...answers,
                active_reflective_indicators: [
                    answers.learns_by_doing,
                    answers.prefers_discussion,
                    answers.needs_think_time
                ],
                structured_flexible_indicators: [
                    answers.prefers_schedule,
                    answers.adapts_easily,
                    answers.needs_routine
                ]
            };

            const token = getSecureToken();
            const endpoint = isTutor ? '/api/assessment/tutor' : '/api/assessment/student';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ answers: assessmentData })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save assessment');
            }

            // Refresh user data
            await refreshUser();

            // Redirect to settings or dashboard
            navigate('/settings');
        } catch (err) {
            console.error('Assessment submission error:', err);
            setError(err.message || 'Failed to save assessment. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <Card>
                        <div className="flex items-center mb-6">
                            <Eye className="w-8 h-8 text-blue-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-800">Visual vs Verbal Learning</h2>
                        </div>
                        <p className="text-gray-600 mb-6">How do you process and retain information? Be honest—there are no wrong answers.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    When tackling a new concept, I typically need to see it illustrated (diagrams, charts, or sketches) before it fully clicks for me
                                </label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleAnswer('prefers_diagrams', true)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.prefers_diagrams === true ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => handleAnswer('prefers_diagrams', false)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.prefers_diagrams === false ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    I can recall details from images, diagrams, or visual examples I&apos;ve seen weeks ago more easily than from text or verbal explanations I&apos;ve heard
                                </label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleAnswer('remembers_pictures', true)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.remembers_pictures === true ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => handleAnswer('remembers_pictures', false)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.remembers_pictures === false ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    When studying or problem-solving, I naturally reach for whiteboards, diagrams, or videos—I feel less engaged when someone explains things only through words
                                </label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleAnswer('enjoys_visual_aids', true)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.enjoys_visual_aids === true ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => handleAnswer('enjoys_visual_aids', false)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.enjoys_visual_aids === false ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Card>
                );

            case 2:
                return (
                    <Card>
                        <div className="flex items-center mb-6">
                            <BookOpen className="w-8 h-8 text-blue-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-800">Sequential vs Global Thinking</h2>
                        </div>
                        <p className="text-gray-600 mb-6">How do you prefer to build understanding—in small steps or by seeing the big picture first?</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    I feel lost if someone jumps ahead or skips steps—I need to master each step in order before moving to the next
                                </label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleAnswer('likes_step_by_step', true)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.likes_step_by_step === true ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => handleAnswer('likes_step_by_step', false)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.likes_step_by_step === false ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    I learn best when material is presented in a clear, linear sequence (A → B → C) rather than jumping between topics or starting with the end goal
                                </label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleAnswer('prefers_ordered_learning', true)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.prefers_ordered_learning === true ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => handleAnswer('prefers_ordered_learning', false)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.prefers_ordered_learning === false ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    I prefer to follow a defined method or procedure when solving problems, rather than experimenting with different approaches on the fly
                                </label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleAnswer('follows_procedures', true)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.follows_procedures === true ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => handleAnswer('follows_procedures', false)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.follows_procedures === false ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Card>
                );

            case 3:
                return (
                    <Card>
                        <div className="flex items-center mb-6">
                            <Hand className="w-8 h-8 text-blue-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-800">Active vs Reflective Learning</h2>
                        </div>
                        <p className="text-gray-600 mb-6">Do you prefer to jump in and experiment, or pause to think before acting?</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    I learn best when I can immediately try things out, make mistakes, and adjust—sitting and listening first makes me restless
                                </label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleAnswer('learns_by_doing', true)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.learns_by_doing === true ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => handleAnswer('learns_by_doing', false)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.learns_by_doing === false ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    I understand concepts more deeply when I can talk them through with someone or debate different angles—thinking alone isn&apos;t enough for me
                                </label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleAnswer('prefers_discussion', true)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.prefers_discussion === true ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => handleAnswer('prefers_discussion', false)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.prefers_discussion === false ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    I need quiet time to process new information before I can discuss it or try it—being asked to respond or act immediately makes me uncomfortable
                                </label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleAnswer('needs_think_time', true)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.needs_think_time === true ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => handleAnswer('needs_think_time', false)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.needs_think_time === false ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Card>
                );

            case 4:
                return (
                    <Card>
                        <div className="flex items-center mb-6">
                            <Brain className="w-8 h-8 text-blue-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-800">Structured vs Flexible Learning</h2>
                        </div>
                        <p className="text-gray-600 mb-6">Do you thrive with predictability, or do you prefer flexibility and spontaneity?</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    I perform best when I know exactly what to expect—a clear schedule, defined goals, and a set plan reduce my anxiety and help me focus
                                </label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleAnswer('prefers_schedule', true)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.prefers_schedule === true ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => handleAnswer('prefers_schedule', false)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.prefers_schedule === false ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    I don&apos;t mind when plans change or we switch approaches mid-session—I can pivot quickly and don&apos;t feel thrown off by surprises
                                </label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleAnswer('adapts_easily', true)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.adapts_easily === true ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => handleAnswer('adapts_easily', false)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.adapts_easily === false ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    I learn more effectively when sessions follow a consistent format and routine—too much variation from week to week disrupts my progress
                                </label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleAnswer('needs_routine', true)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.needs_routine === true ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => handleAnswer('needs_routine', false)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                                            answers.needs_routine === false ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Card>
                );

            case 5:
                if (isTutor) {
                    const teachingStrengthsOptions = [
                        'Clear Explanations',
                        'Patient Teaching',
                        'Adaptive Teaching',
                        'Independent Learning',
                        'Visual Learning Support',
                        'Practice Opportunities',
                        'Structured Learning',
                        'Flexible Approach',
                        'Encouraging & Motivating',
                        'Problem-Solving Guidance'
                    ];

                    return (
                        <Card>
                            <div className="flex items-center mb-6">
                                <Brain className="w-8 h-8 text-blue-600 mr-3" />
                                <h2 className="text-2xl font-bold text-gray-800">Teaching Strengths</h2>
                            </div>
                            <p className="text-gray-600 mb-6">Select all that apply to your teaching style:</p>
                            
                            <div className="grid grid-cols-2 gap-3">
                                {teachingStrengthsOptions.map(strength => (
                                    <button
                                        key={strength}
                                        onClick={() => handleMultiSelect('teaching_strengths', strength)}
                                        className={`p-4 rounded-lg border-2 text-left transition-colors ${
                                            answers.teaching_strengths?.includes(strength)
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        {strength}
                                    </button>
                                ))}
                            </div>
                        </Card>
                    );
                } else {
                    const learningNeedsOptions = [
                        'Visual Learning Support',
                        'Practice Opportunities',
                        'Structured Learning',
                        'Flexible Approach',
                        'Clear Explanations',
                        'Patient Teaching',
                        'Problem-Solving Guidance',
                        'Encouragement & Motivation'
                    ];

                    return (
                        <Card>
                            <div className="flex items-center mb-6">
                                <Brain className="w-8 h-8 text-blue-600 mr-3" />
                                <h2 className="text-2xl font-bold text-gray-800">Learning Needs</h2>
                            </div>
                            <p className="text-gray-600 mb-6">Select what you need most from a tutor:</p>
                            
                            <div className="grid grid-cols-2 gap-3">
                                {learningNeedsOptions.map(need => (
                                    <button
                                        key={need}
                                        onClick={() => handleMultiSelect('learning_needs', need)}
                                        className={`p-4 rounded-lg border-2 text-left transition-colors ${
                                            answers.learning_needs?.includes(need)
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        {need}
                                    </button>
                                ))}
                            </div>
                        </Card>
                    );
                }

            case 6:
                if (isTutor) {
                    return (
                        <Card>
                            <div className="flex items-center mb-6">
                                <BookOpen className="w-8 h-8 text-blue-600 mr-3" />
                                <h2 className="text-2xl font-bold text-gray-800">Subject Expertise</h2>
                            </div>
                            <p className="text-gray-600 mb-6">Rate your proficiency level (0-10) for each subject you can teach:</p>
                            
                            <div className="space-y-4">
                                {subjects.map(subject => (
                                    <div key={subject}>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {subject}
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="range"
                                                min="0"
                                                max="10"
                                                value={answers.subject_expertise[subject] || 5}
                                                onChange={(e) => handleSubjectExpertise(subject, parseInt(e.target.value))}
                                                className="flex-1"
                                            />
                                            <span className="w-12 text-center font-semibold">
                                                {answers.subject_expertise[subject] || 5}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    );
                }
                // Fall through to review for students

            default: // Review step
                return (
                    <Card>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Review Your Assessment</h2>
                        <div className="space-y-4 text-sm">
                            <div>
                                <h3 className="font-semibold mb-2">Visual vs Verbal:</h3>
                                <p className="text-gray-600">
                                    Prefers diagrams: {answers.prefers_diagrams ? 'Yes' : 'No'} | 
                                    Remembers pictures: {answers.remembers_pictures ? 'Yes' : 'No'} | 
                                    Enjoys visual aids: {answers.enjoys_visual_aids ? 'Yes' : 'No'}
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2">Sequential vs Global:</h3>
                                <p className="text-gray-600">
                                    Likes step-by-step: {answers.likes_step_by_step ? 'Yes' : 'No'} | 
                                    Prefers ordered learning: {answers.prefers_ordered_learning ? 'Yes' : 'No'} | 
                                    Follows procedures: {answers.follows_procedures ? 'Yes' : 'No'}
                                </p>
                            </div>
                            {isTutor && (
                                <>
                                    <div>
                                        <h3 className="font-semibold mb-2">Teaching Strengths:</h3>
                                        <p className="text-gray-600">{answers.teaching_strengths?.join(', ') || 'None selected'}</p>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-2">Subject Expertise:</h3>
                                        <p className="text-gray-600">
                                            {Object.entries(answers.subject_expertise).map(([subj, level]) => `${subj}: ${level}`).join(', ') || 'None rated'}
                                        </p>
                                    </div>
                                </>
                            )}
                            {!isTutor && (
                                <div>
                                    <h3 className="font-semibold mb-2">Learning Needs:</h3>
                                    <p className="text-gray-600">{answers.learning_needs?.join(', ') || 'None selected'}</p>
                                </div>
                            )}
                        </div>
                    </Card>
                );
        }
    };

    if (!user) {
        return (
            <div className="text-center py-16">
                <p className="text-gray-600">Please log in to complete the assessment.</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-100 min-h-screen font-sans p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Learning Style Assessment</h1>
                    <p className="text-gray-600">
                        {isTutor 
                            ? 'Help us understand your teaching style to match you with the right students.'
                            : 'Help us understand how you learn best to match you with the perfect tutor.'}
                    </p>
                </div>

                <ProgressTracker currentStep={currentStep} totalSteps={steps.length} steps={steps} />

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {renderStep()}

                <div className="flex justify-between mt-6">
                    <button
                        onClick={prevStep}
                        disabled={currentStep === 1}
                        className="flex items-center px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Previous
                    </button>
                    {currentStep < steps.length ? (
                        <button
                            onClick={nextStep}
                            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Next
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? 'Saving...' : 'Complete Assessment'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

