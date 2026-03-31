import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Clock } from 'lucide-react';
import { getChallengeById, startChallenge, submitAnswer, completeChallenge } from '../api/challenges.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { QuestionRenderer } from '../components/challenges/QuestionRenderer';
import { normalizeChallengeQuestion } from '../utils/normalizeChallengeQuestion';
import { isAnswerIncomplete } from '../utils/challengeAnswerGuards';

const Card = ({ children, className = '' }) => (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>{children}</div>
);

export default function ChallengePlayPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, refreshUser } = useAuth();
    const [challenge, setChallenge] = useState(null);
    const [attempt, setAttempt] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    /** Polymorphic answer: string | boolean | Record<string,string> | number */
    const [answer, setAnswer] = useState(undefined);
    const [showResult, setShowResult] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [completed, setCompleted] = useState(false);
    const [sessionStartTime, setSessionStartTime] = useState(null);
    const [timeElapsedInSession, setTimeElapsedInSession] = useState(0);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        const loadChallenge = async () => {
            try {
                setIsLoading(true);
                const data = await getChallengeById(id);
                setChallenge(data.challenge);
                
                if (data.attempt) {
                    // If attempt is already completed, show completion screen
                    if (data.attempt.status === 'completed' || data.attempt.status === 'failed') {
                        setCompleted(true);
                        setAttempt(data.attempt);
                    } else {
                        // Active attempt - set session start time to now (only count time while user is on page)
                        setSessionStartTime(new Date());
                        setAttempt(data.attempt);
                        setCurrentQuestionIndex(data.attempt.currentQuestion || 0);
                    }
                } else {
                    // Start new attempt
                    const startData = await startChallenge(id);
                    setAttempt(startData.attempt);
                    setChallenge(startData.challenge);
                    // Set session start time to now for new attempts
                    setSessionStartTime(new Date());
                }
            } catch (error) {
                console.error('Failed to load challenge:', error);
                alert('Failed to load challenge. Please try again.');
                navigate('/challenges');
            } finally {
                setIsLoading(false);
            }
        };

        loadChallenge();
    }, [id, isAuthenticated, navigate]);

    const handleTimeExpired = useCallback(async () => {
        // Time ran out - mark attempt as failed and redirect to new challenges
        try {
            setCompleted(true);
            // Complete the challenge with current progress (will likely fail due to time limit)
            const result = await completeChallenge(id);
            setAttempt(result.attempt);
            // Show a message and redirect to challenges page (new challenges tab)
            alert('Time expired! The challenge has ended. You\'ll need to start over.');
            navigate('/challenges');
        } catch (error) {
            console.error('Failed to handle time expiration:', error);
            // Still redirect even if API call fails
            alert('Time expired! The challenge has ended.');
            navigate('/challenges');
        }
    }, [id, navigate]);

    // Timer for speed-run challenges - only counts while user is actively on the page
    useEffect(() => {
        if (!challenge || !attempt || challenge.timeLimit === null || completed || !sessionStartTime) return;
        if (attempt.status === 'completed' || attempt.status === 'failed') {
            return; // Don't run timer if already completed/failed
        }

        // Calculate time remaining based on session start time, not attempt start time
        // timeLimit is in seconds (as per Challenge model)
        const totalTime = challenge.timeLimit;
        const elapsed = Math.floor((new Date() - sessionStartTime) / 1000);
        const remaining = Math.max(0, totalTime - elapsed);

        setTimeRemaining(remaining);
        setTimeElapsedInSession(elapsed);

        // If time ran out immediately (shouldn't happen, but handle it)
        if (remaining <= 0) {
            handleTimeExpired();
            return;
        }

        const timer = setInterval(() => {
            setTimeElapsedInSession(prev => {
                const newElapsed = prev + 1;
                const newRemaining = Math.max(0, totalTime - newElapsed);
                setTimeRemaining(newRemaining);
                
                if (newRemaining <= 0) {
                    clearInterval(timer);
                    handleTimeExpired();
                    return newElapsed;
                }
                return newElapsed;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [challenge, attempt, completed, sessionStartTime, handleTimeExpired]);

    const currentQuestionRaw = challenge?.questions?.[currentQuestionIndex];
    const normalizedQuestion = useMemo(
        () =>
            currentQuestionRaw
                ? normalizeChallengeQuestion(currentQuestionRaw, currentQuestionIndex)
                : null,
        [currentQuestionRaw, currentQuestionIndex]
    );

    useEffect(() => {
        setAnswer(undefined);
        setShowResult(false);
    }, [currentQuestionIndex]);

    const handleSubmitAnswer = async () => {
        if (!normalizedQuestion || isAnswerIncomplete(normalizedQuestion, answer)) return;

        try {
            setIsSubmitting(true);
            const questionStartTime = Date.now();
            const result = await submitAnswer(id, {
                questionIndex: currentQuestionIndex,
                answer,
                timeSpent: Math.floor((Date.now() - questionStartTime) / 1000),
            });

            setIsCorrect(result.isCorrect);
            setShowResult(true);
            setAttempt(result.attempt);

            // Auto-advance after 2 seconds or if completed
            setTimeout(() => {
                if (result.attempt.status === 'completed' || result.attempt.status === 'failed') {
                    setCompleted(true);
                    // Refresh user data when challenge is completed
                    if (refreshUser) {
                        refreshUser();
                    }
                } else if (currentQuestionIndex < challenge.questions.length - 1) {
                    setCurrentQuestionIndex(currentQuestionIndex + 1);
                    setAnswer(undefined);
                    setShowResult(false);
                } else {
                    // Last question answered - challenge should be completed via submitAnswer
                    // But call handleComplete to ensure everything is properly finalized
                    handleComplete();
                }
                setIsSubmitting(false);
            }, 2000);
        } catch (error) {
            console.error('Failed to submit answer:', error);
            alert('Failed to submit answer. Please try again.');
            setIsSubmitting(false);
        }
    };

    const handleComplete = async () => {
        try {
            // Only call completeChallenge if not already completed
            // (It might have been completed via submitAnswer on the last question)
            if (attempt && (attempt.status === 'completed' || attempt.status === 'failed')) {
                setCompleted(true);
            } else {
                const result = await completeChallenge(id);
                setAttempt(result.attempt);
                setCompleted(true);
            }
            // Refresh user data to update XP and level in the context
            if (refreshUser) {
                await refreshUser();
            }
        } catch (error) {
            console.error('Failed to complete challenge:', error);
            // If error is because attempt is already completed, that's okay
            if (error.message && error.message.includes('No active attempt')) {
                // Try to fetch the completed attempt
                try {
                    const data = await getChallengeById(id);
                    if (data.attempt && (data.attempt.status === 'completed' || data.attempt.status === 'failed')) {
                        setAttempt(data.attempt);
                        setCompleted(true);
                    }
                } catch (fetchError) {
                    console.error('Failed to fetch attempt:', fetchError);
                }
            }
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading challenge...</p>
                </div>
            </div>
        );
    }

    if (!challenge) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card>
                    <p className="text-gray-600">Challenge not found.</p>
                    <button onClick={() => navigate('/challenges')} className="mt-4 text-blue-600">
                        Back to Challenges
                    </button>
                </Card>
            </div>
        );
    }

    if (completed && attempt) {
        const passed = attempt.status === 'completed';
        const percentage = attempt.percentage || 0;

        return (
            <div className="min-h-screen p-8">
                <Card className="max-w-2xl mx-auto text-center">
                    <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
                        passed ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                        {passed ? (
                            <Check className="w-10 h-10 text-green-600" />
                        ) : (
                            <X className="w-10 h-10 text-red-600" />
                        )}
                    </div>
                    <h2 className="text-3xl font-bold mb-2">
                        {passed ? 'Challenge Completed!' : 'Challenge Failed'}
                    </h2>
                    <p className="text-gray-600 mb-6">
                        {passed 
                            ? `You earned ${attempt.xpEarned} XP!` 
                            : `You scored ${percentage}%. You need ${challenge.passingScore}% to pass.`}
                    </p>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div>
                            <p className="text-sm text-gray-500">Score</p>
                            <p className="text-2xl font-bold">{percentage}%</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Time</p>
                            <p className="text-2xl font-bold">
                                {attempt.timeSpent ? 
                                    `${Math.floor(attempt.timeSpent / 60)}:${(attempt.timeSpent % 60).toString().padStart(2, '0')}` :
                                    '0:00'
                                }
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">XP Earned</p>
                            <p className="text-2xl font-bold text-yellow-600">{attempt.xpEarned || 0}</p>
                        </div>
                    </div>
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => {
                                // Navigate back and force a refresh by adding a timestamp
                                // This ensures the challenges list refetches with updated status
                                navigate('/challenges', { 
                                    replace: false, // Use push to trigger navigation event
                                    state: { refresh: Date.now() } // Add state to trigger refresh
                                });
                            }}
                            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
                        >
                            Back to Challenges
                        </button>
                        {!passed && (
                            <button
                                onClick={() => {
                                    setCompleted(false);
                                    setCurrentQuestionIndex(0);
                                    setAnswer(undefined);
                                    setShowResult(false);
                                    startChallenge(id).then(data => {
                                        setAttempt(data.attempt);
                                    });
                                }}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                            >
                                Try Again
                            </button>
                        )}
                    </div>
                </Card>
            </div>
        );
    }

    const currentQuestion = challenge.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / challenge.questions.length) * 100;
    const canSubmit =
        normalizedQuestion && !isAnswerIncomplete(normalizedQuestion, answer);

    return (
        <div className="min-h-screen p-8">
            <button
                onClick={() => navigate('/challenges')}
                className="mb-4 flex items-center text-gray-600 hover:text-gray-800"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Challenges
            </button>

            <Card className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-2xl font-bold">{challenge.title}</h1>
                            <p className="text-gray-600">{challenge.description}</p>
                        </div>
                        {timeRemaining !== null && (
                            <div className="flex items-center text-red-600">
                                <Clock className="w-5 h-5 mr-2" />
                                <span className="font-bold">
                                    {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        Question {currentQuestionIndex + 1} of {challenge.questions.length}
                    </p>
                </div>

                {/* Question */}
                {currentQuestion && normalizedQuestion && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">{normalizedQuestion.text}</h2>

                        <QuestionRenderer
                            question={normalizedQuestion}
                            value={answer}
                            onChange={setAnswer}
                            disabled={isSubmitting}
                            showResult={showResult}
                            isCorrect={isCorrect}
                        />

                        {showResult && (
                            <div className={`mt-4 p-4 rounded-lg ${
                                isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                            }`}>
                                <div className="flex items-center mb-2">
                                    {isCorrect ? (
                                        <Check className="w-5 h-5 text-green-600 mr-2" />
                                    ) : (
                                        <X className="w-5 h-5 text-red-600 mr-2" />
                                    )}
                                    <span className={`font-semibold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                                        {isCorrect ? 'Correct!' : 'Incorrect'}
                                    </span>
                                </div>
                                {normalizedQuestion.explanation && (
                                    <p className="text-sm text-gray-700">{normalizedQuestion.explanation}</p>
                                )}
                            </div>
                        )}

                        {!showResult && (
                            <button
                                onClick={handleSubmitAnswer}
                                disabled={!canSubmit || isSubmitting}
                                className="mt-6 w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Answer'}
                            </button>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
}

