import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getSubjects } from '../api/systemConfig';
import { useNavigate, useLocation } from 'react-router-dom';
import { Trophy, Zap, BrainCircuit, BookCopy, ChevronRight, Filter, Award, TrendingUp } from 'lucide-react';
import { getAllChallenges, getLeaderboard } from '../api/challenges.js';
import { useAuth } from '../contexts/AuthContext.jsx';

// --- Reusable Components ---
const Card = ({ children, className = '' }) => (<div className={`bg-white rounded-xl shadow-md p-6 transition-all hover:shadow-lg hover:scale-[1.02] ${className}`}>{children}</div>);
const Pill = ({ text, className = '' }) => (<div className={`text-xs font-semibold px-3 py-1 rounded-full ${className}`}>{text}</div>);

// --- Challenges Page Main Component ---
export default function ChallengesPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState('new');
    const [challenges, setChallenges] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [subjects, setSubjects] = useState([]);
    const [filters, setFilters] = useState({
        subject: '',
        difficulty: '',
    });
    const [showFilters, setShowFilters] = useState(false);

    // Fetch challenges - refetch when filters change or when component becomes visible
    useEffect(() => {
        const fetchChallenges = async () => {
            try {
                setIsLoading(true);
                console.log('Fetching challenges with filters:', filters);
                const data = await getAllChallenges(filters);
                console.log('Received challenges:', data);
                // Log status of each challenge for debugging
                data.forEach(challenge => {
                    if (challenge.title === 'Punctuation Pro') {
                        console.log('Punctuation Pro status:', challenge.status, 'full challenge data:', challenge);
                    }
                });
                setChallenges(data || []);
            } catch (error) {
                console.error('Failed to fetch challenges:', error);
                console.error('Error details:', error.message, error.status);
                setChallenges([]);
                // Show user-friendly error
                alert('Failed to load challenges. Please refresh the page.');
            } finally {
                setIsLoading(false);
            }
        };

        if (isAuthenticated) {
            fetchChallenges();
        }
    }, [filters, isAuthenticated]);

    // Refetch challenges when navigating back from a completed challenge
    // This is triggered by location.state.refresh or location.key change
    useEffect(() => {
        if (!isAuthenticated || location.pathname !== '/challenges') return;
        
        const fetchChallenges = async () => {
            try {
                setIsLoading(true);
                const data = await getAllChallenges(filters);
                console.log('Refetched challenges after navigation:', data);
                // Log Punctuation Pro status specifically
                const punctuationPro = data.find(c => c.title === 'Punctuation Pro');
                if (punctuationPro) {
                    console.log('Punctuation Pro after refetch:', {
                        status: punctuationPro.status,
                        title: punctuationPro.title,
                        _id: punctuationPro._id
                    });
                }
                setChallenges(data || []);
            } catch (error) {
                console.error('Failed to refetch challenges:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        // If navigation state includes refresh flag, refetch immediately
        if (location.state?.refresh) {
            // Small delay to ensure backend has processed the completion
            const timeoutId = setTimeout(fetchChallenges, 500);
            // Clear the refresh flag from location state
            window.history.replaceState({}, '', location.pathname);
            return () => clearTimeout(timeoutId);
        }
    }, [location.state?.refresh, location.key, isAuthenticated, filters, location.pathname]);

    // Fetch leaderboard
    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const data = await getLeaderboard(10);
                setLeaderboard(data || []);
            } catch (error) {
                console.error('Failed to fetch leaderboard:', error);
            }
        };

        fetchLeaderboard();
    }, []);

    // Refresh user data when component mounts or when navigating to this page
    // This ensures XP and level are up-to-date after completing challenges
    // Using useRef to track if we've already refreshed to prevent multiple calls
    const hasRefreshedRef = useRef(false);
    useEffect(() => {
        if (isAuthenticated && refreshUser && location.pathname === '/challenges' && !hasRefreshedRef.current) {
            hasRefreshedRef.current = true;
            refreshUser();
        }
        // Reset when pathname changes
        if (location.pathname !== '/challenges') {
            hasRefreshedRef.current = false;
        }
    }, [location.pathname, isAuthenticated]); // Removed refreshUser from dependencies - it's stable via useCallback

    // Also refresh user data when window regains focus (user returns to tab)
    // Using a ref to debounce focus events
    const focusRefreshRef = useRef(null);
    useEffect(() => {
        const handleFocus = () => {
            // Debounce focus refresh to prevent multiple rapid calls
            if (focusRefreshRef.current) {
                clearTimeout(focusRefreshRef.current);
            }
            focusRefreshRef.current = setTimeout(() => {
                if (isAuthenticated && refreshUser) {
                    refreshUser();
                }
            }, 1000); // Wait 1 second after focus before refreshing
        };

        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
            if (focusRefreshRef.current) {
                clearTimeout(focusRefreshRef.current);
            }
        };
    }, [isAuthenticated]); // Removed refreshUser from dependencies - it's stable via useCallback

    const filteredChallenges = useMemo(() => {
        if (!isAuthenticated) {
            // For non-authenticated users, show all challenges
            return challenges;
        }
        // For authenticated users, filter by status
        // Map status values: 'new' shows challenges with status 'new' or no status
        if (activeTab === 'new') {
            return challenges.filter(c => !c.status || c.status === 'new');
        } else if (activeTab === 'inprogress') {
            // Backend returns 'inprogress' (no dash) for in-progress attempts
            return challenges.filter(c => c.status === 'inprogress');
        } else if (activeTab === 'completed') {
            // Backend returns 'completed' for completed attempts
            return challenges.filter(c => c.status === 'completed');
        }
        return challenges.filter(c => c.status === activeTab);
    }, [challenges, activeTab, isAuthenticated]);

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
                        <span className="text-sm font-semibold">{challenge.xpReward} XP</span>
                    </div>
                    <button 
                        onClick={() => navigate(`/challenges/${challenge._id}`)}
                        className="flex items-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
                    >
                        {challenge.status === 'new' && 'Start Challenge'}
                        {challenge.status === 'inprogress' && 'Continue'}
                        {challenge.status === 'completed' && 'View Results'}
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                </div>
            </Card>
        );
    };

    const difficulties = ['Easy', 'Medium', 'Hard'];

    return (
        <div>
            {/* Header */}
            <header className="mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Challenges</h1>
                        <p className="text-gray-600">Test your knowledge, earn rewards, and climb the leaderboard.</p>
                    </div>
                    {isAuthenticated && user && (
                        <div className="text-right">
                            <div className="flex items-center text-blue-600 mb-1">
                                <Award className="w-5 h-5 mr-2" />
                                <span className="font-bold text-lg">{user.xp || 0} XP</span>
                            </div>
                            <p className="text-sm text-gray-500">Level {user.level || 1}</p>
                        </div>
                    )}
                </div>
            </header>

            {/* Leaderboard Preview */}
            {leaderboard.length > 0 && (
                <Card className="mb-6">
                    <div className="flex items-center mb-4">
                        <TrendingUp className="w-5 h-5 text-yellow-500 mr-2" />
                        <h2 className="text-lg font-bold">Top Performers</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {leaderboard.slice(0, 5).map((leader, index) => (
                            <div key={leader._id || leader.id} className="text-center">
                                <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center font-bold text-white ${
                                    index === 0 ? 'bg-yellow-500' : 
                                    index === 1 ? 'bg-gray-400' : 
                                    index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                                }`}>
                                    {index + 1}
                                </div>
                                <p className="text-sm font-semibold truncate">{leader.name}</p>
                                <p className="text-xs text-gray-500">{leader.xp || 0} XP</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Filters and Tabs */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    {isAuthenticated && (
                        <div className="flex border-b">
                            <button onClick={() => setActiveTab('new')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'new' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>New</button>
                            <button onClick={() => setActiveTab('inprogress')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'inprogress' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>In Progress</button>
                            <button onClick={() => setActiveTab('completed')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'completed' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>Completed</button>
                        </div>
                    )}
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center px-4 py-2 text-sm font-semibold text-gray-600 hover:text-blue-600"
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Filters
                    </button>
                </div>

                {/* Filter Dropdown */}
                {showFilters && (
                    <Card className="mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                                <select
                                    value={filters.subject}
                                    onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                                    className="w-full p-2 border rounded-lg"
                                >
                                    <option value="">All Subjects</option>
                                    {subjects.map(subject => (
                                        <option key={subject} value={subject}>{subject}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                                <select
                                    value={filters.difficulty}
                                    onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                                    className="w-full p-2 border rounded-lg"
                                >
                                    <option value="">All Difficulties</option>
                                    {difficulties.map(diff => (
                                        <option key={diff} value={diff}>{diff}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* Challenges Grid */}
            {isLoading ? (
                <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading challenges...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredChallenges.length > 0 ? (
                        filteredChallenges.map(challenge => <ChallengeCard key={challenge._id || challenge.id} challenge={challenge} />)
                    ) : (
                        <div className="col-span-full text-center py-16 text-gray-500">
                            <p className="font-semibold">No challenges in this category.</p>
                            <p>Check back later for new challenges!</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
