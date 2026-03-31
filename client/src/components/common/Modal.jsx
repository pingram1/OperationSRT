import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, BrainCircuit, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function Modal({ title, content, onClose, isLoading, contentType }) {
    // State to track selected answers for each question
    const [selectedAnswers, setSelectedAnswers] = useState({});

    // Reset selected answers when content changes
    useEffect(() => {
        if (contentType === 'json' && content?.questions) {
            setSelectedAnswers({});
        }
    }, [content, contentType]);

    // Handle answer selection
    const handleAnswerSelect = (questionIndex, selectedOption) => {
        // Only allow selection if not already answered
        if (!selectedAnswers[questionIndex]) {
            setSelectedAnswers(prev => ({
                ...prev,
                [questionIndex]: selectedOption
            }));
        }
    };

    // Check if answer is correct
    const isCorrect = (question, selectedOption) => {
        return selectedOption === question.correct_answer;
    };

    // Get option styling based on selection state
    const getOptionStyle = (question, option, questionIndex, selectedOption) => {
        const hasAnswered = selectedAnswers[questionIndex];
        
        if (!hasAnswered) {
            // Not answered yet - show as clickable
            return 'bg-gray-50 hover:bg-blue-50 hover:border-blue-300 border border-gray-200 cursor-pointer transition-all';
        }

        // Answer has been selected - show feedback
        const isSelected = option === selectedOption;
        const isCorrectAnswer = option === question.correct_answer;
        
        if (isCorrectAnswer) {
            // Always highlight correct answer in green
            return 'bg-green-100 border-2 border-green-400 font-semibold';
        } else if (isSelected && !isCorrectAnswer) {
            // Highlight wrong selected answer in red
            return 'bg-red-100 border-2 border-red-400 font-semibold';
        } else {
            // Other options - muted
            return 'bg-gray-50 border border-gray-200 opacity-60';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-xl shadow-2xl p-8 ${contentType === 'text' ? 'max-w-4xl' : 'max-w-2xl'} w-full max-h-[90vh] flex flex-col`}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        {contentType === 'json' ? <BrainCircuit className="w-6 h-6 mr-2 text-blue-500" /> : <Sparkles className="w-6 h-6 mr-2 text-yellow-500" />}
                        {title}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-2xl leading-none">&times;</button>
                </div>
                {isLoading ? (
                    <div className="flex justify-center items-center h-48"><Loader2 className="w-12 h-12 text-blue-500 animate-spin" /></div>
                ) : (
                    <div className="text-gray-700 flex-1 overflow-y-auto pr-2">
                        {contentType === 'json' && content && typeof content === 'object' && Array.isArray(content.questions) && content.questions.length > 0 ? (
                            <div className="space-y-6">
                                {content.questions.length > 0 && (
                                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-sm text-blue-800">
                                            <strong>Instructions:</strong> Click on an answer choice to select it. After selecting, you'll see if you got it right and receive an explanation.
                                        </p>
                                    </div>
                                )}
                                {content.questions.map((q, index) => {
                                    const selectedOption = selectedAnswers[index];
                                    const hasAnswered = !!selectedOption;
                                    const correct = hasAnswered && isCorrect(q, selectedOption);

                                    return (
                                        <div key={index} className="border-b pb-6 last:border-b-0">
                                            <div className="flex items-start justify-between mb-3">
                                                <p className="font-bold text-gray-800 flex-1">{index + 1}. {q.question_text}</p>
                                                {hasAnswered && (
                                                    <div className="ml-3">
                                                        {correct ? (
                                                            <CheckCircle className="w-6 h-6 text-green-500" />
                                                        ) : (
                                                            <XCircle className="w-6 h-6 text-red-500" />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <ul className="space-y-2 mb-4">
                                                {q.options.map((option, i) => {
                                                    const style = getOptionStyle(q, option, index, selectedOption);
                                                    return (
                                                        <li
                                                            key={i}
                                                            onClick={() => !hasAnswered && handleAnswerSelect(index, option)}
                                                            className={`p-3 rounded-lg text-sm ${style} ${!hasAnswered ? 'cursor-pointer' : 'cursor-default'}`}
                                                        >
                                                            {option}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                            {hasAnswered && (
                                                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                                    <div className="flex items-start mb-2">
                                                        <span className={`font-semibold mr-2 ${correct ? 'text-green-700' : 'text-red-700'}`}>
                                                            {correct ? '✓ Correct!' : '✗ Incorrect'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700">
                                                        <span className="font-semibold text-gray-800">Explanation:</span> {q.explanation}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="markdown-content prose prose-sm max-w-none">
                                {content && typeof content === 'string' ? (
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900" {...props} />,
                                            h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-6 mb-3 text-gray-900" {...props} />,
                                            h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-4 mb-2 text-gray-800" {...props} />,
                                            p: ({node, ...props}) => <p className="mb-3 text-gray-700 leading-relaxed" {...props} />,
                                            ul: ({node, ...props}) => <ul className="list-disc mb-4 space-y-2 text-gray-700 ml-6" {...props} />,
                                            ol: ({node, ...props}) => <ol className="list-decimal mb-4 space-y-2 text-gray-700 ml-6" {...props} />,
                                            li: ({node, children, className, ...props}) => {
                                                // Handle task list items with custom styling
                                                const isTaskListItem = className?.includes('task-list-item');
                                                if (isTaskListItem) {
                                                    return (
                                                        <li className="list-none my-2" {...props}>
                                                            {children}
                                                        </li>
                                                    );
                                                }
                                                return <li className="my-1 ml-2" {...props}>{children}</li>;
                                            },
                                            input: ({node, type, checked, ...props}) => {
                                                if (type === 'checkbox') {
                                                    return (
                                                        <input 
                                                            type="checkbox" 
                                                            checked={checked || false} 
                                                            disabled 
                                                            className="mt-1 mr-3 h-4 w-4 text-blue-600 cursor-not-allowed"
                                                            readOnly
                                                            {...props}
                                                        />
                                                    );
                                                }
                                                return <input type={type} {...props} />;
                                            },
                                            strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                                            em: ({node, ...props}) => <em className="italic" {...props} />,
                                            code: ({node, inline, ...props}) => 
                                                inline ? (
                                                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                                                ) : (
                                                    <code className="block bg-gray-100 p-3 rounded text-sm font-mono overflow-x-auto mb-3" {...props} />
                                                ),
                                            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-600" {...props} />,
                                        }}
                                    >
                                        {content}
                                    </ReactMarkdown>
                                ) : content && typeof content === 'object' ? (
                                    <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded">{JSON.stringify(content, null, 2)}</pre>
                                ) : (
                                    <div className="p-4 text-center text-gray-500">
                                        <p>No content available.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}