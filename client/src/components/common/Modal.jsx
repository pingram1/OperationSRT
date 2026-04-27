import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, BrainCircuit, Loader2, CheckCircle, XCircle } from 'lucide-react';
import Dialog from './Dialog.jsx';

/**
 * AI content modal — renders markdown explanations or interactive
 * multiple-choice question sets. Wraps the accessible Dialog primitive so
 * it inherits focus trap, escape-to-close, body scroll lock and a11y
 * labelling instead of hand-rolling its own backdrop.
 *
 * Public API is preserved for existing call sites (Dashboard.jsx).
 *
 * @param {object} props
 * @param {string} props.title
 * @param {string|object|null} props.content
 *   Markdown string for `contentType="text"`; `{ questions: [...] }`
 *   shape for `contentType="json"`.
 * @param {() => void} props.onClose
 * @param {boolean} props.isLoading
 * @param {('text'|'json')} props.contentType
 */
export default function Modal({ title, content, onClose, isLoading, contentType }) {
    const [selectedAnswers, setSelectedAnswers] = useState({});

    useEffect(() => {
        if (contentType === 'json' && content?.questions) {
            setSelectedAnswers({});
        }
    }, [content, contentType]);

    const handleAnswerSelect = (questionIndex, selectedOption) => {
        if (!selectedAnswers[questionIndex]) {
            setSelectedAnswers((prev) => ({
                ...prev,
                [questionIndex]: selectedOption,
            }));
        }
    };

    const isCorrect = (question, selectedOption) =>
        selectedOption === question.correct_answer;

    const getOptionStyle = (question, option, questionIndex, selectedOption) => {
        const hasAnswered = selectedAnswers[questionIndex];

        if (!hasAnswered) {
            return 'bg-gray-50 hover:bg-blue-50 hover:border-blue-300 border border-gray-200 cursor-pointer transition-all';
        }

        const isSelected = option === selectedOption;
        const isCorrectAnswer = option === question.correct_answer;

        if (isCorrectAnswer) {
            return 'bg-green-100 border-2 border-green-400 font-semibold';
        }
        if (isSelected && !isCorrectAnswer) {
            return 'bg-red-100 border-2 border-red-400 font-semibold';
        }
        return 'bg-gray-50 border border-gray-200 opacity-60';
    };

    const TitleIcon = contentType === 'json' ? BrainCircuit : Sparkles;
    const titleIconColor = contentType === 'json' ? 'text-blue-500' : 'text-yellow-500';

    return (
        <Dialog
            isOpen
            onClose={onClose}
            size={contentType === 'text' ? 'xl' : 'lg'}
            title={
                <span className="flex items-center text-2xl font-bold text-gray-800">
                    <TitleIcon className={`w-6 h-6 mr-2 ${titleIconColor}`} aria-hidden="true" />
                    {title}
                </span>
            }
        >
            {isLoading ? (
                <div className="flex justify-center items-center h-48" role="status" aria-live="polite">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" aria-hidden="true" />
                    <span className="sr-only">Loading…</span>
                </div>
            ) : (
                <div className="text-gray-700">
                    {contentType === 'json'
                        && content
                        && typeof content === 'object'
                        && Array.isArray(content.questions)
                        && content.questions.length > 0 ? (
                        <div className="space-y-6">
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>Instructions:</strong> Click on an answer choice to select it. After selecting, you&apos;ll see if you got it right and receive an explanation.
                                </p>
                            </div>
                            {content.questions.map((q, index) => {
                                const selectedOption = selectedAnswers[index];
                                const hasAnswered = !!selectedOption;
                                const correct = hasAnswered && isCorrect(q, selectedOption);

                                return (
                                    <div key={index} className="border-b pb-6 last:border-b-0">
                                        <div className="flex items-start justify-between mb-3">
                                            <p className="font-bold text-gray-800 flex-1">
                                                {index + 1}. {q.question_text}
                                            </p>
                                            {hasAnswered && (
                                                <div className="ml-3" aria-hidden="true">
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
                                        h1: ({ ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900" {...props} />,
                                        h2: ({ ...props }) => <h2 className="text-xl font-bold mt-6 mb-3 text-gray-900" {...props} />,
                                        h3: ({ ...props }) => <h3 className="text-lg font-bold mt-4 mb-2 text-gray-800" {...props} />,
                                        p: ({ ...props }) => <p className="mb-3 text-gray-700 leading-relaxed" {...props} />,
                                        ul: ({ ...props }) => <ul className="list-disc mb-4 space-y-2 text-gray-700 ml-6" {...props} />,
                                        ol: ({ ...props }) => <ol className="list-decimal mb-4 space-y-2 text-gray-700 ml-6" {...props} />,
                                        li: ({ children, className, ...props }) => {
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
                                        input: ({ type, checked, ...props }) => {
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
                                        strong: ({ ...props }) => <strong className="font-semibold text-gray-900" {...props} />,
                                        em: ({ ...props }) => <em className="italic" {...props} />,
                                        code: ({ inline, ...props }) =>
                                            inline ? (
                                                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                                            ) : (
                                                <code className="block bg-gray-100 p-3 rounded text-sm font-mono overflow-x-auto mb-3" {...props} />
                                            ),
                                        blockquote: ({ ...props }) => <blockquote className="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-600" {...props} />,
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
        </Dialog>
    );
}
