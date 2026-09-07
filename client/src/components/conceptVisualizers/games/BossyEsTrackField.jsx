import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useVisualizerAudio } from '../hooks/useVisualizerAudio';
import { useVisualizerConfetti } from '../hooks/useVisualizerConfetti';
import { BOSSY_LEVEL_DATA } from './bossyLevelData';
import styles from './bossyTrackField.module.css';

const GAME_ID = 'bossy_es_track_field';

function shufflePair(correct, distractor) {
    return Math.random() > 0.5 ? [correct, distractor] : [distractor, correct];
}

function levelLabel(level) {
    if (level === 1) return { text: 'Level 1: The Warm-Up', className: 'bg-green-600 border-green-400' };
    if (level === 2) return { text: 'Level 2: The Hurdle Jump', className: 'bg-blue-600 border-blue-400' };
    return { text: 'Level 3: The Suffix Relay', className: 'bg-purple-600 border-purple-400' };
}

export default function BossyEsTrackField({ onCompleteVisualizer, onExit }) {
    const canvasRef = useRef(null);
    const autoAdvanceRef = useRef(null);
    const completedRef = useRef(false);
    const scoreRef = useRef(0);
    const correctRef = useRef(0);
    const { playSound, isMuted, toggleSound } = useVisualizerAudio();
    const { burst } = useVisualizerConfetti(canvasRef);

    const [screen, setScreen] = useState('start');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [runnerJumping, setRunnerJumping] = useState(false);

    const q = BOSSY_LEVEL_DATA[currentIndex];
    const progressPercent = screen === 'game' ? (currentIndex / BOSSY_LEVEL_DATA.length) * 100 : 0;
    const runnerPos = 4 + progressPercent * 0.85;
    const levelInfo = q ? levelLabel(q.level) : null;
    const choices = useMemo(() => (q ? shufflePair(q.correct, q.distractor) : []), [q?.correct, q?.distractor, currentIndex]);

    const finishGame = useCallback((finalScore, finalCorrect) => {
        if (completedRef.current) return;
        completedRef.current = true;
        const accuracy = Math.round((finalCorrect / BOSSY_LEVEL_DATA.length) * 100);
        playSound('correct');
        burst();
        onCompleteVisualizer?.({
            gameId: GAME_ID,
            score: finalScore,
            accuracy,
            metadata: { correctCount: finalCorrect, totalQuestions: BOSSY_LEVEL_DATA.length },
        });
    }, [burst, onCompleteVisualizer, playSound]);

    const startGame = useCallback(() => {
        playSound('click');
        completedRef.current = false;
        setScreen('game');
        setCurrentIndex(0);
        setScore(0);
        scoreRef.current = 0;
        setCorrectCount(0);
        correctRef.current = 0;
        setHasAnswered(false);
        setFeedback(null);
    }, [playSound]);

    const advanceToNext = useCallback(() => {
        if (autoAdvanceRef.current) {
            clearTimeout(autoAdvanceRef.current);
            autoAdvanceRef.current = null;
        }
        playSound('click');
        const next = currentIndex + 1;
        if (next < BOSSY_LEVEL_DATA.length) {
            setCurrentIndex(next);
            setHasAnswered(false);
            setFeedback(null);
        } else {
            setScreen('end');
            finishGame(scoreRef.current, correctRef.current);
        }
    }, [currentIndex, finishGame, playSound]);

    const handleAnswer = useCallback((selected) => {
        if (hasAnswered || !q) return;
        setHasAnswered(true);
        const isCorrect = selected === q.correct;

        if (isCorrect) {
            playSound('correct');
            scoreRef.current += q.level * 10;
            correctRef.current += 1;
            setScore(scoreRef.current);
            setCorrectCount(correctRef.current);
            setRunnerJumping(true);
            playSound('jump');
            setTimeout(() => setRunnerJumping(false), 600);
            setFeedback({ isCorrect: true, title: 'Awesome! Correct!', rule: q.rule });
            autoAdvanceRef.current = setTimeout(advanceToNext, 3000);
        } else {
            playSound('wrong');
            setFeedback({ isCorrect: false, title: `Oops! It was "${q.correct}".`, rule: q.rule });
            autoAdvanceRef.current = setTimeout(advanceToNext, 5000);
        }
    }, [advanceToNext, hasAnswered, playSound, q]);

    useEffect(() => () => {
        if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    }, []);

    const finalAccuracy = Math.round((correctCount / BOSSY_LEVEL_DATA.length) * 100);

    return (
        <div className={`concept-visualizer-root ${styles.root} min-h-[70vh] flex flex-col items-center py-6 px-4 rounded-2xl`}>
            <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" aria-hidden="true" />

            <header className={`w-full max-w-3xl flex justify-between items-center bg-blue-900/80 backdrop-blur-md rounded-2xl p-4 border-2 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)] mb-6 ${styles.animatePop}`}>
                <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-950 rounded-full flex items-center justify-center border-2 border-blue-300">
                        <svg viewBox="0 0 100 100" className="w-8 h-8" aria-hidden="true">
                            <path d="M20,50 Q10,20 30,30 Q40,40 50,40 Q60,40 70,30 Q90,20 80,50 Q75,70 50,70 Q25,70 20,50" fill="#3b82f6" />
                            <path d="M25,40 Q50,45 75,40 L70,35 Q50,40 30,35 Z" fill="#fde047" />
                            <ellipse cx="35" cy="55" rx="6" ry="8" fill="#0f172a" />
                            <ellipse cx="65" cy="55" rx="6" ry="8" fill="#0f172a" />
                        </svg>
                    </div>
                    <div>
                        <h1 className={`${styles.funTitle} text-2xl md:text-3xl text-blue-100 ${styles.textGlow}`}>Bossy E&apos;s Track Meet</h1>
                        <p className="text-blue-300 text-xs font-bold uppercase tracking-wider">The &quot;Silent E&quot; Phonics Race</p>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <button type="button" onClick={toggleSound} className="bg-blue-800 hover:bg-blue-700 p-2 rounded-full border border-blue-500 transition" aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}>
                        {!isMuted ? (
                            <svg className="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                        ) : (
                            <svg className="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                        )}
                    </button>
                    <div className="bg-blue-950 px-4 py-2 rounded-xl border-2 border-blue-400 font-bold text-blue-200 flex space-x-2">
                        <span>🏆 Score:</span>
                        <span className="text-yellow-400">{score}</span>
                    </div>
                </div>
            </header>

            <main className="w-full max-w-3xl flex-grow flex flex-col justify-center">
                {screen === 'start' && (
                    <section className={`bg-blue-900/60 backdrop-blur-sm border-2 border-blue-400 rounded-3xl p-8 text-center ${styles.animatePop} shadow-2xl relative overflow-hidden`}>
                        <h2 className={`${styles.funTitle} text-5xl text-yellow-300 mb-4 ${styles.textGlow}`}>Meet the Track Star!</h2>
                        <p className="text-blue-100 text-lg mb-6 max-w-lg mx-auto">
                            Help our blue friend train for the phonics relay! We are going to practice the special rules from your notebook.
                        </p>
                        <div className="bg-blue-950/80 border-2 border-blue-300 rounded-2xl p-5 mb-8 max-w-md mx-auto text-left shadow-inner">
                            <h3 className={`${styles.funTitle} text-xl text-pink-400 mb-2 border-b border-blue-800 pb-2`}>📖 The Official Rules:</h3>
                            <ul className="space-y-3 text-blue-100 font-bold text-sm">
                                <li className="flex items-start"><span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 shrink-0">1</span> The &quot;e&quot; at the end is SILENT.</li>
                                <li className="flex items-start"><span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 shrink-0">2</span> Bossy, Bossy, Bossy! He tells the vowel to say its name!</li>
                            </ul>
                        </div>
                        <div className="flex flex-wrap gap-3 justify-center">
                            <button type="button" onClick={startGame} className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-blue-900 font-black text-xl py-4 px-10 rounded-full shadow-[0_0_20px_rgba(250,204,21,0.6)] transform hover:scale-105 transition-all">
                                START THE RACE!
                            </button>
                            {onExit && (
                                <button type="button" onClick={onExit} className="bg-blue-800 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-full border border-blue-400">
                                    Back to Gallery
                                </button>
                            )}
                        </div>
                    </section>
                )}

                {screen === 'game' && q && (
                    <section className="w-full space-y-6">
                        <div className={`bg-blue-900/80 border border-blue-500 rounded-2xl p-4 flex justify-between items-center ${styles.animatePop}`}>
                            <div className={`${levelInfo.className} text-white font-bold px-4 py-1.5 rounded-full text-sm border shadow-md`}>
                                {levelInfo.text}
                            </div>
                            <div className="flex items-center space-x-3 w-1/2">
                                <span className="text-blue-200 text-xs font-bold uppercase tracking-widest">Finish Line</span>
                                <div className="h-4 bg-blue-950 rounded-full flex-grow border border-blue-700 overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-yellow-300 to-yellow-500 transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
                                </div>
                                <span className="text-blue-200 font-bold text-sm">{currentIndex + 1}/{BOSSY_LEVEL_DATA.length}</span>
                            </div>
                        </div>

                        <div className={`w-full bg-green-800 rounded-3xl border-4 border-white overflow-hidden relative h-40 shadow-xl ${styles.animatePop}`}>
                            <div className={`${styles.trackSurface} absolute bottom-0 w-full h-24 border-t-4 border-white flex flex-col justify-evenly py-1`}>
                                <div className="w-full border-t-2 border-dashed border-white/50" />
                                <div className="w-full border-t-2 border-dashed border-white/50" />
                            </div>
                            <div id="track-runner" className={`absolute bottom-4 w-16 h-16 transition-all duration-700 ease-out z-20 ${runnerJumping ? styles.alienJump : styles.alienRun}`} style={{ left: `${runnerPos}%` }}>
                                <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg" aria-hidden="true">
                                    <path d="M40,90 Q10,50 20,30 Q40,20 60,60" fill="#2563eb" stroke="#1e40af" strokeWidth="6" />
                                    <path d="M160,90 Q190,50 180,30 Q160,20 140,60" fill="#2563eb" stroke="#1e40af" strokeWidth="6" />
                                    <ellipse cx="100" cy="110" rx="55" ry="45" fill="#3b82f6" stroke="#1e40af" strokeWidth="6" />
                                    <path d="M45,95 Q100,105 155,95 L150,85 Q100,95 50,85 Z" fill="#facc15" />
                                    <circle cx="75" cy="110" r="8" fill="#0f172a" />
                                    <circle cx="125" cy="110" r="8" fill="#0f172a" />
                                </svg>
                            </div>
                        </div>

                        <div className={`bg-blue-800/90 border-2 border-blue-400 rounded-3xl p-6 md:p-8 shadow-2xl ${styles.animatePop}`}>
                            <h3 className="text-center text-blue-200 font-bold uppercase tracking-widest text-sm mb-4">
                                {q.type === 'intro' && "Add Bossy 'E'"}
                                {q.type === 'sentence' && 'Choose the Correct Word'}
                                {q.type === 'suffix' && "The Relay Hand-off: Add 'r'"}
                            </h3>

                            <div className="flex flex-col items-center justify-center min-h-[120px] mb-8">
                                {q.type === 'intro' && (
                                    <div className="flex items-center space-x-6">
                                        <span className={`${styles.funTitle} text-5xl md:text-6xl text-white tracking-widest`}>{q.short}</span>
                                        <span className="text-4xl text-yellow-400 font-black">+</span>
                                        <span className={`${styles.funTitle} text-5xl md:text-6xl text-pink-400`}>e</span>
                                        <span className="text-4xl text-blue-300 font-black">➔</span>
                                        <span className={`${styles.funTitle} text-5xl md:text-6xl text-blue-200 border-b-4 border-dashed border-blue-400 min-w-[120px] text-center pb-2`}>?</span>
                                    </div>
                                )}
                                {q.type === 'sentence' && (
                                    <p className="text-2xl md:text-3xl text-white font-bold text-center leading-relaxed max-w-2xl" dangerouslySetInnerHTML={{ __html: q.sentence.replace('___', '<span class="border-b-4 border-yellow-400 px-4 text-yellow-300">____</span>') }} />
                                )}
                                {q.type === 'suffix' && (
                                    <div className="flex flex-col items-center space-y-4">
                                        <div className="flex items-center space-x-3 opacity-60">
                                            <span className={`${styles.funTitle} text-3xl text-white`}>{q.base}</span>
                                            <span className="text-xl text-blue-300">➔</span>
                                            <span className={`${styles.funTitle} text-3xl text-pink-300`}>{q.middle}</span>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <span className={`${styles.funTitle} text-5xl text-pink-400`}>{q.middle}</span>
                                            <span className="text-4xl text-yellow-400 font-black">+</span>
                                            <span className={`${styles.funTitle} text-5xl text-green-400`}>r</span>
                                            <span className="text-4xl text-blue-300 font-black">➔</span>
                                            <span className={`${styles.funTitle} text-5xl text-blue-200 border-b-4 border-dashed border-blue-400 min-w-[150px] text-center pb-2`}>?</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
                                {choices.map((choice) => (
                                    <button
                                        key={choice}
                                        type="button"
                                        disabled={hasAnswered}
                                        onClick={() => handleAnswer(choice)}
                                        className="bg-blue-900 hover:bg-blue-700 active:scale-95 border-2 border-blue-400 rounded-2xl py-6 px-4 font-black text-3xl text-white transition-all shadow-md flex items-center justify-center disabled:opacity-60"
                                    >
                                        <span className={`${styles.funTitle} tracking-wide`}>{choice}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {feedback && (
                            <div className={`${feedback.isCorrect ? 'bg-green-900/90 border-green-500' : 'bg-rose-900/90 border-rose-500'} border-l-8 rounded-r-2xl p-5 shadow-lg flex justify-between items-center mt-4`}>
                                <div>
                                    <h4 className={`font-black text-xl mb-1 ${feedback.isCorrect ? 'text-green-300' : 'text-rose-300'}`}>{feedback.title}</h4>
                                    <p className={`text-sm font-bold ${feedback.isCorrect ? 'text-green-100' : 'text-rose-100'}`}>{feedback.rule}</p>
                                </div>
                                <button type="button" onClick={advanceToNext} className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition flex items-center shrink-0 ml-4">
                                    <span className="font-bold mr-2">Next</span>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        )}
                    </section>
                )}

                {screen === 'end' && (
                    <section className={`bg-blue-900/90 border-2 border-yellow-400 rounded-3xl p-8 text-center ${styles.animatePop} shadow-[0_0_30px_rgba(250,204,21,0.3)]`}>
                        <div className="text-6xl mb-4">🥇</div>
                        <h2 className={`${styles.funTitle} text-4xl text-yellow-300 mb-2`}>Race Completed!</h2>
                        <p className="text-blue-100 text-lg mb-8">You mastered the Bossy E rules perfectly!</p>
                        <div className="bg-blue-950 rounded-2xl p-6 max-w-md mx-auto mb-8 border border-blue-500 flex justify-around">
                            <div>
                                <span className="block text-sm text-blue-300 uppercase tracking-widest font-bold">Final Score</span>
                                <span className="text-4xl font-black text-yellow-400">{score}</span>
                            </div>
                            <div className="w-px bg-blue-700" />
                            <div>
                                <span className="block text-sm text-blue-300 uppercase tracking-widest font-bold">Accuracy</span>
                                <span className="text-4xl font-black text-green-400">{finalAccuracy}%</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3 justify-center">
                            <button type="button" onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white border-2 border-blue-400 font-bold text-lg py-3 px-8 rounded-full shadow-lg transition-transform hover:-translate-y-1">
                                Run Another Relay
                            </button>
                            {onExit && (
                                <button type="button" onClick={onExit} className="bg-blue-950 hover:bg-blue-900 text-white border border-blue-400 font-bold text-lg py-3 px-8 rounded-full">
                                    Back to Gallery
                                </button>
                            )}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

BossyEsTrackField.propTypes = {
    onCompleteVisualizer: PropTypes.func,
    onExit: PropTypes.func,
};
