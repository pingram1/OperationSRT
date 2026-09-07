import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useVisualizerAudio } from '../hooks/useVisualizerAudio';
import { useVisualizerConfetti } from '../hooks/useVisualizerConfetti';
import { SAMY_WORD_DATABASE } from './samyWordDatabase';
import styles from './samyVowelTeam.module.css';

const GAME_ID = 'samy_s_vowel_team';
const TOTAL_QUESTIONS = 10;

const MODE_LABELS = {
    1: { text: 'Mode 1: Vowel Team Lab', className: 'bg-sky-100 text-sky-800 border-sky-300' },
    2: { text: 'Mode 2: Context Kingdom', className: 'bg-teal-100 text-teal-800 border-teal-300' },
    3: { text: 'Mode 3: Imposter Hunt', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
};

function SamySnail({ expression = 'normal', className = '' }) {
    const pupilR = expression === 'happy' ? 5 : expression === 'hide' ? 2.5 : 3;
    const pupilFill = expression === 'happy' ? '#fbbf24' : expression === 'hide' ? '#047857' : '#ffffff';
    const mouthD = expression === 'happy'
        ? 'M145 80 Q150 90 155 80'
        : expression === 'hide'
            ? 'M148 85 Q152 79 154 85'
            : 'M148 78 Q152 82 150 85';

    return (
        <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
            <ellipse cx="90" cy="110" rx="45" ry="40" fill="#f59e0b" stroke="#d97706" strokeWidth="6" />
            <path d="M90 85 C115 85 125 110 110 125 C100 135 75 125 85 110 C90 105 100 110 95 115" stroke="#d97706" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M40 140 C55 140 65 140 85 140 C115 140 145 130 155 110 C165 90 170 65 155 60 C145 55 135 75 135 90 C135 110 115 115 90 115" stroke="#10b981" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="145" y1="60" x2="140" y2="35" stroke="#10b981" strokeWidth="5" strokeLinecap="round" />
            <line x1="155" y1="60" x2="160" y2="35" stroke="#10b981" strokeWidth="5" strokeLinecap="round" />
            <circle cx="140" cy="32" r="8" fill="#10b981" />
            <circle cx="160" cy="32" r="8" fill="#10b981" />
            <circle cx="140" cy="32" r={pupilR} fill={pupilFill} />
            <circle cx="160" cy="32" r={pupilR} fill={pupilFill} />
            <path d={mouthD} stroke="#047857" strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cx="143" cy="81" r="3" fill="#f43f5e" opacity="0.6" />
            <circle cx="155" cy="80" r="3" fill="#f43f5e" opacity="0.6" />
        </svg>
    );
}

export default function SamySVowelTeamAdventure({ onCompleteVisualizer, onExit }) {
    const canvasRef = useRef(null);
    const autoAdvanceRef = useRef(null);
    const completedRef = useRef(false);
    const scoreRef = useRef(0);
    const correctRef = useRef(0);

    const { playSound, isMuted, toggleSound } = useVisualizerAudio();
    const { burst } = useVisualizerConfetti(canvasRef);

    const [screen, setScreen] = useState('start');
    const [activeMode, setActiveMode] = useState(null);
    const [score, setScore] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [accuracyPoints, setAccuracyPoints] = useState(0);
    const [questionList, setQuestionList] = useState([]);
    const [currentCorrectAnswer, setCurrentCorrectAnswer] = useState('');
    const [customExplanation, setCustomExplanation] = useState('');
    const [hasAnswered, setHasAnswered] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [mascotExpression, setMascotExpression] = useState('normal');
    const [mascotSpeech, setMascotSpeech] = useState("We can do this! Think carefully!");
    const [mascotAnim, setMascotAnim] = useState('');
    const [dynamicWords, setDynamicWords] = useState([]);
    const [statsState, setStatsState] = useState({ totalAnswers: 0, correctAnswers: 0, history: {} });
    const [wordWallOpen, setWordWallOpen] = useState(false);
    const [teacherOpen, setTeacherOpen] = useState(false);
    const [wordWallFilter, setWordWallFilter] = useState('all');
    const [customWordInput, setCustomWordInput] = useState('');
    const [customPattern, setCustomPattern] = useState('ai');
    const [customToast, setCustomToast] = useState(null);

    const allWords = useMemo(() => [...SAMY_WORD_DATABASE, ...dynamicWords], [dynamicWords]);
    const currentWord = questionList[currentIndex];

    const getAllWords = useCallback(() => allWords, [allWords]);

    const finishGame = useCallback((finalScore, finalCorrect) => {
        if (completedRef.current) return;
        completedRef.current = true;
        const accuracy = Math.round((finalCorrect / TOTAL_QUESTIONS) * 100);
        playSound('victory');
        burst(150, ['#38bdf8', '#0ea5e9', '#0d9488', '#10b981', '#f59e0b', '#84cc16']);
        onCompleteVisualizer?.({
            gameId: GAME_ID,
            score: finalScore,
            accuracy,
            metadata: {
                mode: activeMode,
                correctCount: finalCorrect,
                totalQuestions: TOTAL_QUESTIONS,
            },
        });
    }, [activeMode, burst, onCompleteVisualizer, playSound]);

    const startGame = useCallback((modeNum) => {
        playSound('click');
        completedRef.current = false;
        const shuffled = [...getAllWords()].sort(() => 0.5 - Math.random());
        setActiveMode(modeNum);
        setCurrentIndex(0);
        setScore(0);
        scoreRef.current = 0;
        setAccuracyPoints(0);
        correctRef.current = 0;
        setQuestionList(shuffled.slice(0, TOTAL_QUESTIONS));
        setHasAnswered(false);
        setFeedback(null);
        setMascotExpression('normal');
        setMascotSpeech("Ready to play! Let's conquer these words!");
        setScreen('game');
    }, [getAllWords, playSound]);

    const buildQuestion = useCallback((wordObj, mode) => {
        if (!wordObj) return { prompt: '', display: null, clue: '', choices: [], correct: '', explanation: '' };

        if (mode === 1) {
            let displayWord = '';
            let correct = '';
            if (wordObj.type === 'ai') {
                displayWord = wordObj.word.replace(/ai/i, ' __ ');
                correct = 'ai';
            } else if (wordObj.type === 'ay') {
                displayWord = wordObj.word.replace(/ay/i, ' __ ');
                correct = 'ay';
            } else if (wordObj.word.toLowerCase().includes('v')) {
                displayWord = 'V_por';
                correct = 'a';
            } else {
                displayWord = `${wordObj.word.charAt(0)} _ ${wordObj.word.substring(2, 4)} _`;
                correct = 'a_e';
            }
            const options = wordObj.type === 'bonus' ? ['ai', 'ay', 'a_e', 'a'] : ['ai', 'ay'];
            return {
                prompt: 'Pick the missing vowel team to complete the word:',
                display: displayWord,
                clue: wordObj.clue,
                choices: options.map((opt) => ({
                    value: opt,
                    label: opt,
                    sub: opt === 'ai' ? 'Middle team' : opt === 'ay' ? 'Ending team' : 'Magic team',
                })),
                correct,
                explanation: '',
            };
        }

        if (mode === 2) {
            const displaySentence = wordObj.sentence.replace(new RegExp(wordObj.word, 'gi'), '_________');
            const distractors = getAllWords().filter((w) => w.word !== wordObj.word).sort(() => 0.5 - Math.random());
            const choices = [wordObj.word, distractors[0]?.word, distractors[1]?.word].filter(Boolean).sort(() => 0.5 - Math.random());
            return {
                prompt: 'Which word matches and fits correctly in the sentence blank?',
                display: displaySentence,
                clue: wordObj.clue,
                choices: choices.map((c) => ({ value: c, label: c })),
                correct: wordObj.word,
                explanation: '',
            };
        }

        const coin = Math.random() > 0.5;
        let puzzleGroup = [];
        let explanation = '';
        let correct = '';
        if (coin) {
            const aiPool = getAllWords().filter((w) => w.type === 'ai' && !w.isBonus);
            const ayPool = getAllWords().filter((w) => w.type === 'ay' && !w.isBonus);
            const sortedAi = aiPool.sort(() => 0.5 - Math.random()).slice(0, 3);
            const sortedAy = ayPool.sort(() => 0.5 - Math.random()).slice(0, 1);
            puzzleGroup = [...sortedAi, ...sortedAy];
            correct = sortedAy[0]?.word || '';
            explanation = `${correct} is the imposter because it uses ay at the end! The others use ai in the middle.`;
        } else {
            const ayPool = getAllWords().filter((w) => w.type === 'ay' && !w.isBonus);
            const aiPool = getAllWords().filter((w) => w.type === 'ai' && !w.isBonus);
            const sortedAy = ayPool.sort(() => 0.5 - Math.random()).slice(0, 3);
            const sortedAi = aiPool.sort(() => 0.5 - Math.random()).slice(0, 1);
            puzzleGroup = [...sortedAy, ...sortedAi];
            correct = sortedAi[0]?.word || '';
            explanation = `${correct} is the imposter because it uses ai in the middle! The others use ay at the end.`;
        }
        puzzleGroup.sort(() => 0.5 - Math.random());
        return {
            prompt: 'Identify the imposter word that uses a DIFFERENT spelling pattern:',
            display: null,
            clue: 'Three cards share the same vowel team rule, but one is an imposter!',
            choices: puzzleGroup.map((item) => ({ value: item.word, label: item.word })),
            correct,
            explanation,
        };
    }, [getAllWords]);

    const questionUi = useMemo(
        () => (currentWord && activeMode ? buildQuestion(currentWord, activeMode) : null),
        [activeMode, buildQuestion, currentIndex, currentWord],
    );

    useEffect(() => {
        if (questionUi) {
            setCurrentCorrectAnswer(questionUi.correct);
            setCustomExplanation(questionUi.explanation);
        }
    }, [questionUi]);

    const advanceQuestion = useCallback(() => {
        if (autoAdvanceRef.current) {
            clearTimeout(autoAdvanceRef.current);
            autoAdvanceRef.current = null;
        }
        playSound('click');
        setCurrentIndex((idx) => {
            const next = idx + 1;
            if (next < TOTAL_QUESTIONS) {
                setHasAnswered(false);
                setFeedback(null);
                return next;
            }
            setScreen('report');
            finishGame(scoreRef.current, correctRef.current);
            return idx;
        });
    }, [finishGame, playSound]);

    const submitAnswer = useCallback((chosen) => {
        if (hasAnswered || !currentWord) return;
        setHasAnswered(true);
        const isCorrect = chosen === currentCorrectAnswer;

        setStatsState((prev) => {
            const history = { ...prev.history };
            if (!history[currentWord.word]) history[currentWord.word] = 0;
            if (!isCorrect) history[currentWord.word] += 1;
            return {
                totalAnswers: prev.totalAnswers + 1,
                correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
                history,
            };
        });

        if (isCorrect) {
            const pts = currentWord.isBonus ? 20 : 10;
            scoreRef.current += pts;
            correctRef.current += 1;
            setScore(scoreRef.current);
            setAccuracyPoints(correctRef.current);
            playSound('correct');
            burst(45, ['#38bdf8', '#0ea5e9', '#0d9488', '#10b981', '#f59e0b']);
            setMascotExpression('happy');
            setMascotSpeech("Wow! You're super smart! Let's keep going!");
            setMascotAnim(styles.snailJump);
            setTimeout(() => setMascotAnim(''), 600);

            let desc = '';
            if (activeMode === 1) {
                desc = `${currentWord.word} is correct! ${currentWord.type === 'ai' ? 'Rule: ai goes in the middle.' : 'Rule: ay goes at the end.'}`;
            } else if (activeMode === 2) {
                desc = `Perfect fit! "${currentWord.sentence}"`;
            } else {
                desc = customExplanation;
            }
            setFeedback({
                isCorrect: true,
                title: currentWord.isBonus ? 'Brilliant! Bonus Correct (+20 pts)!' : 'Terrific! Correct!',
                desc,
            });
            autoAdvanceRef.current = setTimeout(advanceQuestion, 2500);
        } else {
            playSound('wrong');
            setMascotExpression('hide');
            setMascotSpeech("Don't worry! Learning is all about trying again!");
            setMascotAnim(styles.snailHide);
            setTimeout(() => setMascotAnim(''), 800);

            let desc = '';
            if (activeMode === 1) {
                desc = `The correct answer was ${currentCorrectAnswer} to spell ${currentWord.word}.`;
            } else if (activeMode === 2) {
                desc = `The correct matching word was ${currentWord.word}.`;
            } else {
                desc = customExplanation || `The imposter was ${currentCorrectAnswer}.`;
            }
            setFeedback({ isCorrect: false, title: 'Oops! Not quite.', desc });
            autoAdvanceRef.current = setTimeout(advanceQuestion, 4500);
        }
    }, [activeMode, advanceQuestion, burst, currentCorrectAnswer, currentWord, customExplanation, hasAnswered, playSound]);

    useEffect(() => () => {
        if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    }, []);

    const filteredWordWall = useMemo(() => {
        if (wordWallFilter === 'ai') return allWords.filter((w) => w.type === 'ai');
        if (wordWallFilter === 'ay') return allWords.filter((w) => w.type === 'ay');
        if (wordWallFilter === 'bonus') return allWords.filter((w) => w.isBonus);
        return allWords;
    }, [allWords, wordWallFilter]);

    const reportAccuracy = Math.round((accuracyPoints / TOTAL_QUESTIONS) * 100);

    const addCustomWord = () => {
        const raw = customWordInput.trim();
        if (!raw) {
            playSound('wrong');
            setCustomToast({ type: 'error', text: 'Please type a word first!' });
            return;
        }
        const cleanWord = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
        if (allWords.find((w) => w.word.toLowerCase() === cleanWord.toLowerCase())) {
            playSound('wrong');
            setCustomToast({ type: 'error', text: `"${cleanWord}" is already on your Word Wall!` });
            return;
        }
        const isBonus = customPattern === 'bonus';
        setDynamicWords((prev) => [...prev, {
            word: cleanWord,
            type: customPattern,
            clue: 'Custom spelling list word added during class session.',
            sentence: `The student successfully learned the custom word ${cleanWord}!`,
            isBonus,
        }]);
        playSound('victory');
        setCustomWordInput('');
        setCustomToast({ type: 'success', text: `"${cleanWord}" added to practice lists!` });
        setTimeout(() => setCustomToast(null), 4000);
    };

    const masteredStats = useMemo(() => {
        let mastered = 0;
        const troubled = [];
        allWords.forEach((item) => {
            const mistakes = statsState.history[item.word] || 0;
            if (mistakes === 0 && statsState.totalAnswers > 0) mastered += 1;
            else if (mistakes > 0) troubled.push({ word: item.word, count: mistakes });
        });
        const accuracy = statsState.totalAnswers > 0
            ? Math.round((statsState.correctAnswers / statsState.totalAnswers) * 100)
            : 0;
        return { mastered, troubled, accuracy };
    }, [allWords, statsState]);

    return (
        <div className={`concept-visualizer-root ${styles.root} bg-gradient-to-b from-sky-100 via-teal-50 to-emerald-100 min-h-[70vh] text-slate-800 flex flex-col rounded-2xl overflow-hidden`}>
            <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50 w-full h-full" aria-hidden="true" />

            <header className="bg-white/85 backdrop-blur-md border-b-2 border-sky-200 px-4 py-3 shadow-sm">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <button type="button" onClick={() => { playSound('click'); setScreen('start'); }} className="flex items-center space-x-3 text-left">
                        <div className="bg-teal-100 p-1.5 rounded-full border border-teal-300">
                            <SamySnail className="w-8 h-8 text-teal-600" />
                        </div>
                        <div>
                            <h1 className={`${styles.friendlyTitle} text-xl md:text-2xl font-bold text-teal-700 leading-none`}>Samy&apos;s Vowel Team</h1>
                            <span className="text-xs font-bold text-sky-600 tracking-widest uppercase">The &quot;ai&quot; &amp; &quot;ay&quot; Adventure</span>
                        </div>
                    </button>
                    <div className="flex items-center space-x-3">
                        <button type="button" onClick={toggleSound} className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600" aria-label={isMuted ? 'Unmute' : 'Mute'}>
                            {!isMuted ? (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                            ) : (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                            )}
                        </button>
                        <button type="button" onClick={() => { playSound('click'); setWordWallOpen(true); }} className="hidden md:flex items-center bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 text-sm font-semibold hover:bg-emerald-100">
                            🌟 Word Wall
                        </button>
                        <div className="bg-amber-100 border border-amber-300 text-amber-800 px-3 py-1.5 rounded-full font-extrabold text-sm flex items-center space-x-1">
                            <span>⭐ Score:</span>
                            <span className="text-amber-900">{score}</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow max-w-4xl w-full mx-auto p-4 flex flex-col justify-center">
                {screen === 'start' && (
                    <section className={`bg-white rounded-3xl border-2 border-teal-100 shadow-xl p-6 md:p-10 text-center max-w-2xl mx-auto w-full ${styles.popEffect}`}>
                        <div className={`relative w-40 h-40 mx-auto mb-6 ${styles.snailWiggle}`}>
                            <SamySnail className="w-full h-full drop-shadow-md" />
                        </div>
                        <h2 className={`${styles.friendlyTitle} text-3xl md:text-4xl font-extrabold text-teal-800 mb-2`}>Samy&apos;s Phonics Quest!</h2>
                        <p className="text-slate-600 mb-8 max-w-md mx-auto">Help Samy slide along his garden path by spelling and identifying tricky vowel team words!</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[1, 2, 3].map((mode) => (
                                <button key={mode} type="button" onClick={() => startGame(mode)} className="group bg-gradient-to-br from-sky-50 to-sky-100 hover:from-sky-100 hover:to-sky-200 border-2 border-sky-300 rounded-2xl p-5 text-left transition-all hover:-translate-y-1 shadow-sm">
                                    <div className="bg-sky-500 text-white w-10 h-10 rounded-xl flex items-center justify-center font-extrabold mb-3">{mode}</div>
                                    <h4 className="font-bold text-sky-900">{MODE_LABELS[mode].text.replace(/^Mode \d: /, '')}</h4>
                                </button>
                            ))}
                        </div>
                        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap justify-center gap-4">
                            <button type="button" onClick={() => setWordWallOpen(true)} className="text-teal-700 font-bold text-sm bg-teal-50 px-4 py-2 rounded-xl">📖 Study Word Wall (31 Words)</button>
                            <button type="button" onClick={() => setTeacherOpen(true)} className="text-indigo-700 font-bold text-sm bg-indigo-50 px-4 py-2 rounded-xl">🎓 Teacher&apos;s Report Card</button>
                            {onExit && <button type="button" onClick={onExit} className="text-slate-600 font-bold text-sm bg-slate-100 px-4 py-2 rounded-xl">Back to Gallery</button>}
                        </div>
                    </section>
                )}

                {screen === 'game' && currentWord && questionUi && (
                    <section className={`bg-white rounded-3xl border-2 border-teal-100 shadow-xl p-5 md:p-8 max-w-3xl mx-auto w-full ${styles.popEffect}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
                            <div className="flex items-center space-x-2 flex-wrap gap-2">
                                <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${MODE_LABELS[activeMode]?.className}`}>{MODE_LABELS[activeMode]?.text}</span>
                                <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${currentWord.isBonus ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse' : 'bg-purple-100 text-purple-800 border-purple-300'}`}>
                                    {currentWord.isBonus ? '🔥 BONUS WORD' : `Level ${currentIndex + 1}`}
                                </span>
                            </div>
                            <div className="flex items-center space-x-3 w-full md:w-auto">
                                <span className="text-sm font-bold text-slate-500">Progress:</span>
                                <div className="bg-slate-100 h-4 rounded-full flex-grow md:w-36 overflow-hidden border border-slate-200">
                                    <div className="bg-gradient-to-r from-teal-400 to-emerald-500 h-full transition-all duration-300" style={{ width: `${(currentIndex / TOTAL_QUESTIONS) * 100}%` }} />
                                </div>
                                <span className="text-sm font-bold text-slate-700">{currentIndex}/{TOTAL_QUESTIONS}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                            <div className="lg:col-span-3 space-y-6">
                                <div className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-200/60 shadow-inner text-center">
                                    <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">{questionUi.prompt}</span>
                                    {activeMode === 3 ? (
                                        <div className="text-lg md:text-xl font-bold text-slate-700 flex justify-center items-center gap-2 mt-3">
                                            <span className="text-3xl">🕵️‍♂️</span> Search the Group below!
                                        </div>
                                    ) : activeMode === 2 ? (
                                        <p className={`${styles.friendlyTitle} text-xl md:text-2xl font-semibold text-slate-700 mt-3 leading-relaxed`}>{questionUi.display}</p>
                                    ) : (
                                        <div className={`${styles.friendlyTitle} text-4xl md:text-5xl font-extrabold text-slate-800 tracking-wide mt-3`}>{questionUi.display}</div>
                                    )}
                                    <div className="text-slate-500 text-sm italic max-w-md mx-auto mt-2">&quot;{questionUi.clue}&quot;</div>
                                </div>

                                <div className={`grid gap-4 ${activeMode === 2 ? 'grid-cols-1 sm:grid-cols-3' : activeMode === 3 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                                    {questionUi.choices.map((choice) => (
                                        <button
                                            key={choice.value}
                                            type="button"
                                            disabled={hasAnswered}
                                            onClick={() => submitAnswer(choice.value)}
                                            className="bg-white hover:bg-sky-50 active:scale-95 border-2 border-sky-200 hover:border-sky-400 rounded-2xl py-5 px-4 font-bold text-xl text-sky-800 transition-all shadow-sm disabled:opacity-60"
                                        >
                                            <span className={`${styles.friendlyTitle} text-2xl font-black block`}>{choice.label}</span>
                                            {choice.sub && <span className="text-xs text-sky-500 font-bold uppercase tracking-widest">{choice.sub}</span>}
                                        </button>
                                    ))}
                                </div>

                                {feedback && (
                                    <div className={`rounded-2xl p-4 border-2 flex items-start space-x-3 ${feedback.isCorrect ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'}`}>
                                        <div className="text-2xl">{feedback.isCorrect ? '🎉' : '🐌'}</div>
                                        <div>
                                            <h4 className="font-extrabold text-base">{feedback.title}</h4>
                                            <p className="text-xs md:text-sm text-slate-700 mt-0.5">{feedback.desc}</p>
                                            <button type="button" onClick={advanceQuestion} className="mt-3 bg-slate-800 text-white font-bold text-xs py-1.5 px-4 rounded-lg hover:bg-slate-700">Continue</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-sky-50 rounded-2xl border border-sky-100 p-4 flex flex-col items-center text-center min-h-[220px]">
                                <span className="text-[10px] uppercase font-black text-sky-600 tracking-widest">Samy Says:</span>
                                <div className={`w-24 h-24 my-2 ${mascotAnim}`}>
                                    <SamySnail expression={mascotExpression} className="w-full h-full" />
                                </div>
                                <div className="bg-white rounded-xl p-2.5 border border-sky-200 text-xs text-sky-800 font-semibold shadow-sm w-full">&quot;{mascotSpeech}&quot;</div>
                            </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
                            <button type="button" onClick={() => setScreen('start')} className="text-slate-500 hover:text-slate-700 font-bold">← Quit Game</button>
                            {currentWord.isBonus && <span className="text-amber-600 font-extrabold">🔥 Bonus Challenge Active!</span>}
                        </div>
                    </section>
                )}

                {screen === 'report' && (
                    <section className={`bg-white rounded-3xl border-2 border-teal-100 shadow-xl p-6 md:p-8 text-center max-w-xl mx-auto w-full ${styles.popEffect}`}>
                        <div className="text-5xl mb-3">🏆</div>
                        <h2 className={`${styles.friendlyTitle} text-3xl font-extrabold text-teal-800`}>Adventure Completed!</h2>
                        <p className="text-slate-500 text-sm mt-1">{MODE_LABELS[activeMode]?.text} Results</p>
                        <div className="my-6 bg-slate-50 rounded-2xl p-6 border border-slate-200 flex justify-around items-center">
                            <div><span className="block text-3xl font-black text-amber-500">{score}</span><span className="text-xs text-slate-500 font-bold uppercase">Points</span></div>
                            <div><span className="block text-3xl font-black text-emerald-500">{reportAccuracy}%</span><span className="text-xs text-slate-500 font-bold uppercase">Accuracy</span></div>
                            <div><span className="block text-3xl font-black text-indigo-500">{accuracyPoints}/{TOTAL_QUESTIONS}</span><span className="text-xs text-slate-500 font-bold uppercase">Correct</span></div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button type="button" onClick={() => setScreen('start')} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-2xl">Choose Another Mode</button>
                            <button type="button" onClick={() => setWordWallOpen(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold py-3 px-6 rounded-2xl">Explore Word Wall</button>
                            {onExit && <button type="button" onClick={onExit} className="bg-white border border-slate-300 font-bold py-3 px-6 rounded-2xl">Back to Gallery</button>}
                        </div>
                    </section>
                )}
            </main>

            {wordWallOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
                        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-5 flex justify-between items-center">
                            <h3 className={`${styles.friendlyTitle} text-2xl font-bold`}>The Interactive Word Wall</h3>
                            <button type="button" onClick={() => setWordWallOpen(false)} className="bg-white/20 hover:bg-white/30 rounded-full p-1.5">✕</button>
                        </div>
                        <div className="bg-slate-50 px-5 py-3 border-b flex flex-wrap gap-2">
                            {['all', 'ai', 'ay', 'bonus'].map((f) => (
                                <button key={f} type="button" onClick={() => setWordWallFilter(f)} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${wordWallFilter === f ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200'}`}>{f}</button>
                            ))}
                        </div>
                        <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredWordWall.map((item) => (
                                <div key={item.word} className="border-2 border-sky-200 rounded-2xl p-4 space-y-2">
                                    <h4 className={`${styles.friendlyTitle} text-xl font-bold`}>{item.word}</h4>
                                    <p className="text-xs text-slate-500 italic">&quot;{item.clue}&quot;</p>
                                    <p className="text-xs text-slate-600"><strong>Example:</strong> {item.sentence}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {teacherOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
                        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-5 flex justify-between items-center">
                            <h3 className={`${styles.friendlyTitle} text-2xl font-bold`}>Teacher&apos;s Progress Report</h3>
                            <button type="button" onClick={() => setTeacherOpen(false)} className="bg-white/20 hover:bg-white/30 rounded-full p-1.5">✕</button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-center"><span className="text-xs font-bold text-indigo-700 uppercase block">Total Answers</span><span className="text-3xl font-black text-indigo-900">{statsState.totalAnswers}</span></div>
                                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center"><span className="text-xs font-bold text-emerald-700 uppercase block">Success Rate</span><span className="text-3xl font-black text-emerald-900">{masteredStats.accuracy}%</span></div>
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center"><span className="text-xs font-bold text-amber-700 uppercase block">Mastered</span><span className="text-3xl font-black text-amber-900">{masteredStats.mastered}/{allWords.length}</span></div>
                            </div>
                            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-3">
                                <h4 className="font-extrabold text-slate-800 text-sm">Add Custom Word to Lesson</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <input value={customWordInput} onChange={(e) => setCustomWordInput(e.target.value)} type="text" placeholder="Word (e.g. Clay)" className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm" />
                                    <select value={customPattern} onChange={(e) => setCustomPattern(e.target.value)} className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm">
                                        <option value="ai">ai pattern</option>
                                        <option value="ay">ay pattern</option>
                                        <option value="bonus">Bonus / Magic E</option>
                                    </select>
                                    <button type="button" onClick={addCustomWord} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-4 py-2 text-sm">➕ Add Word</button>
                                </div>
                                {customToast && <p className={`text-xs font-semibold ${customToast.type === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>{customToast.text}</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

SamySVowelTeamAdventure.propTypes = {
    onCompleteVisualizer: PropTypes.func,
    onExit: PropTypes.func,
};
