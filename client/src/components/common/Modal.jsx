import React from 'react';
import { Sparkles, BrainCircuit, Loader2 } from 'lucide-react';

export default function Modal({ title, content, onClose, isLoading, contentType }) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full">
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
                    <div className="text-gray-700 max-h-[60vh] overflow-y-auto pr-2">
                        {contentType === 'json' && content.questions ? (
                            <div className="space-y-6">{content.questions.map((q, index) => (
                                <div key={index} className="border-b pb-4 last:border-b-0">
                                    <p className="font-bold text-gray-800 mb-3">{index + 1}. {q.question_text}</p>
                                    <ul className="space-y-2">{q.options.map((option, i) => (
                                        <li key={i} className={`p-3 rounded-lg text-sm ${option === q.correct_answer ? 'bg-green-100 border border-green-300 font-semibold' : 'bg-gray-50'}`}>{option}</li>
                                    ))}</ul>
                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm"><p><span className="font-semibold">Explanation:</span> {q.explanation}</p></div>
                                </div>
                            ))}</div>
                        ) : (
                            <div className="whitespace-pre-wrap">{typeof content === 'string' ? content : JSON.stringify(content, null, 2)}</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}