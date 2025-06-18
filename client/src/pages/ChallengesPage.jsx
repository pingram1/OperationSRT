import React, { useState, useMemo } from 'react';
import { Trophy, Zap, BrainCircuit, BookCopy, ChevronRight } from 'lucide-react';

// --- MOCK DATA (to be replaced by API calls) ---
const challengesData = [
    { id: 1, title: 'Algebra Power-Up', subject: 'Algebra', difficulty: 'Medium', reward: '50 XP', status: 'new', description: 'Solve 10 quadratic equations in under 15 minutes.' },
    { id: 2, title: 'Physics Velocity Victor', subject: 'Physics', difficulty: 'Hard', reward: '100 XP', status: 'new', description: 'Correctly answer 5 problems about kinematic equations.' },
    { id: 3, title: 'Literature Legend', subject: 'English', difficulty: 'Medium', reward: '75 XP', status: 'inprogress', progress: 60, description: 'Identify the primary theme in 3 of 5 provided short stories.' },
    { id: 4, title: 'Chemistry Catalyst', subject: 'Chemistry', difficulty: 'Easy', reward: '25 XP', status: 'completed', description: 'Balance 10 chemical equations.' },
    { id: 5, title: 'History Buff', subject: 'History', difficulty: 'Easy', reward: '25 XP', status: 'completed', description: 'Match 15 historical events to their correct dates.' },
];

// --- Reusable Components ---
const Card = ({ children, className = '' }) => (<div className={`bg-white rounded-xl shadow-md p-6 transition-all hover:shadow-lg hover:scale-[1.02] ${className}`}>{children}</div>);
const Pill = ({ text, className = '' }) => (<div className={`text-xs font-semibold px-3 py-1 rounded-full ${className}`}>{text}</div>);

// --- Challenges Page Main Component ---
export default function ChallengesPage() {
    const [activeTab, setActiveTab] = useState('new');

    const filteredChallenges = useMemo(() => {
        return challengesData.filter(c => c.status === activeTab);
    }, [activeTab]);

    const ChallengeCard = ({ challenge }) => {
        const difficultyColors = {
            Easy: 'bg-green-100 text-green-700',
            Medium: 'bg-yellow-100 text-yellow-700',
            Hard: 'bg-red-100 text-red-700',
        };

        return (
            <Card className="flex flex-col">
                <div className="flex-grow">
                    <div className="flex justify-between items-start mb-2">
                        <Trophy className="w-8 h-8 text-yellow-500" />
                        <Pill text={challenge.difficulty} className={difficultyColors[challenge.difficulty]} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1">{challenge.title}</h3>
                    <p className="text-sm font-semibold text-blue-600 mb-3">{challenge.subject}</p>
                    <p className="text-gray-600 text-sm mb-4">{challenge.description}</p>
                    
                    {challenge.status === 'inprogress' && (
                        <div className="mb-4">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${challenge.progress}%` }}></div>
                            </div>
                             <p className="text-right text-xs mt-1 text-gray-500">{challenge.progress}% complete</p>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <div className="flex items-center">
                        <Zap className="w-4 h-4 text-yellow-400 mr-1" />
                        <span className="text-sm font-semibold">{challenge.reward}</span>
                    </div>
                    <button className="flex items-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg">
                        {challenge.status === 'new' && 'Start Challenge'}
                        {challenge.status === 'inprogress' && 'Continue'}
                        {challenge.status === 'completed' && 'View Results'}
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                </div>
            </Card>
        );
    };

    return (
        <div>
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Challenges</h1>
                <p className="text-gray-600">Test your knowledge, earn rewards, and climb the leaderboard.</p>
            </header>

            {/* Filter Tabs */}
            <div className="flex border-b mb-6">
                <button onClick={() => setActiveTab('new')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'new' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>New</button>
                <button onClick={() => setActiveTab('inprogress')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'inprogress' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>In Progress</button>
                <button onClick={() => setActiveTab('completed')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'completed' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>Completed</button>
            </div>

            {/* Challenges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredChallenges.length > 0 ? (
                    filteredChallenges.map(challenge => <ChallengeCard key={challenge.id} challenge={challenge} />)
                ) : (
                    <div className="col-span-full text-center py-16 text-gray-500">
                        <p className="font-semibold">No challenges in this category.</p>
                        <p>Check back later for new challenges!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
