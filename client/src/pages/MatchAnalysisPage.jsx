import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Search, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getAllUsers } from '../api/users';
import { getTutors } from '../api/users';
import { findTutorMatches, getCompatibilityAnalysis } from '../api/matching';
import LearningStyleVisualizer from '../components/matching/LearningStyleVisualizer';
import Card from '../components/common/Card.jsx';

export default function MatchAnalysisPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [tutors, setTutors] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedTutor, setSelectedTutor] = useState(null);
    const [matchResults, setMatchResults] = useState(null);
    const [matchAnalysis, setMatchAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
    const [error, setError] = useState('');

    // Check if user is admin or super_admin
    if (user?.role !== 'admin' && user?.role !== 'super_admin') {
        return (
            <div className="text-center py-16">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                <p className="text-gray-600">Only administrators can access this page.</p>
            </div>
        );
    }

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            setError('');
            console.log('[MatchAnalysisPage] Fetching students and tutors...');
            const [studentsData, tutorsData] = await Promise.all([
                getAllUsers(),
                getTutors(),
            ]);

            console.log('[MatchAnalysisPage] Raw students data:', studentsData?.length || 0);
            console.log('[MatchAnalysisPage] Raw tutors data:', tutorsData?.length || 0);

            // Filter students - only include actual students with completed assessments
            // Parents don't have learning style profiles, their children do
            const studentsList = (studentsData || []).filter(
                u => u.role === 'student' && 
                     u.learningStyleProfile?.assessmentCompleted
            );
            const tutorsList = (tutorsData || []).filter(
                t => t.learningStyleProfile?.assessmentCompleted
            );

            console.log('[MatchAnalysisPage] Filtered students with assessments:', studentsList.length);
            console.log('[MatchAnalysisPage] Filtered tutors with assessments:', tutorsList.length);

            setStudents(studentsList);
            setTutors(tutorsList);
            
            if (studentsList.length === 0) {
                setError('No students found with completed learning style assessments. Students must complete the assessment first.');
            }
        } catch (err) {
            console.error('[MatchAnalysisPage] Failed to fetch data:', err);
            setError('Failed to load students and tutors: ' + (err.message || 'Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleFindMatches = async () => {
        if (!selectedStudent) {
            setError('Please select a student first');
            return;
        }

        const studentId = selectedStudent._id || selectedStudent.id;
        console.log('[MatchAnalysisPage] Finding matches for student:', studentId, selectedStudent);

        try {
            setIsLoading(true);
            setError('');
            console.log('[MatchAnalysisPage] Calling findTutorMatches API...');
            const matches = await findTutorMatches(studentId, null, 5);
            console.log('[MatchAnalysisPage] Received matches:', matches);
            setMatchResults(matches.tutors || []);
            
            if (!matches.tutors || matches.tutors.length === 0) {
                setError('No tutor matches found. Make sure there are tutors with completed assessments.');
            }
        } catch (err) {
            console.error('[MatchAnalysisPage] Failed to find matches:', err);
            setError(err.message || 'Failed to find tutor matches. Please check the console for details.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewMatchDetails = async (tutor) => {
        if (!selectedStudent || !tutor) return;

        try {
            setIsLoadingAnalysis(true);
            const analysis = await getCompatibilityAnalysis(
                tutor._id || tutor.id,
                selectedStudent._id || selectedStudent.id
            );
            setSelectedTutor(tutor);
            setMatchAnalysis(analysis);
        } catch (err) {
            console.error('Failed to fetch match analysis:', err);
            setError('Failed to load match analysis');
        } finally {
            setIsLoadingAnalysis(false);
        }
    };

    return (
        <div>
            <header className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={() => navigate('/admin-panel')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Match Analysis</h1>
                        <p className="text-gray-600">Analyze learning style compatibility between students and tutors</p>
                    </div>
                </div>
            </header>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Selection Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Student
                                </label>
                                <select
                                    value={selectedStudent?._id || selectedStudent?.id || ''}
                                    onChange={(e) => {
                                        const studentId = e.target.value;
                                        console.log('[MatchAnalysisPage] Student selected:', studentId);
                                        const student = students.find(s => {
                                            const sId = s._id || s.id;
                                            return String(sId) === String(studentId);
                                        });
                                        console.log('[MatchAnalysisPage] Found student:', student);
                                        setSelectedStudent(student);
                                        setMatchResults(null);
                                        setMatchAnalysis(null);
                                        setSelectedTutor(null);
                                        setError('');
                                    }}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Choose a student...</option>
                                    {students.length === 0 ? (
                                        <option disabled>No students with completed assessments</option>
                                    ) : (
                                        students.map(student => {
                                            const studentId = student._id || student.id;
                                            return (
                                                <option key={studentId} value={studentId}>
                                                    {student.name}
                                                </option>
                                            );
                                        })
                                    )}
                                </select>
                            </div>

                            {selectedStudent && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleFindMatches();
                                    }}
                                    disabled={isLoading}
                                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                            Finding Matches...
                                        </>
                                    ) : (
                                        'Find Best Matches'
                                    )}
                                </button>
                            )}

                            {matchResults && matchResults.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                        Top {matchResults.length} Matches
                                    </h3>
                                    <div className="space-y-2">
                                        {matchResults.map((match, index) => (
                                            <button
                                                key={match.tutor._id || match.tutor.id}
                                                onClick={() => handleViewMatchDetails(match.tutor)}
                                                className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                                                    selectedTutor?._id === match.tutor._id || selectedTutor?.id === match.tutor.id
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-semibold text-sm">{match.tutor.name}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {match.tutor.tutorInfo?.subjects?.slice(0, 2).join(', ')}
                                                        </p>
                                                    </div>
                                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                                                        {Math.round(match.compatibilityScore * 100)}%
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Visualization Panel */}
                <div className="lg:col-span-2">
                    {selectedStudent && selectedTutor && matchAnalysis ? (
                        <LearningStyleVisualizer
                            student={selectedStudent}
                            tutor={selectedTutor}
                            matchAnalysis={matchAnalysis}
                            showComparison={true}
                        />
                    ) : selectedStudent && !selectedTutor ? (
                        <Card>
                            <div className="text-center py-16">
                                <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                    {matchResults && matchResults.length > 0
                                        ? 'Select a tutor match to view detailed analysis'
                                        : 'Click "Find Best Matches" to see tutor recommendations'}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {matchResults && matchResults.length > 0
                                        ? 'Choose from the matches on the left to see compatibility breakdown'
                                        : 'We\'ll analyze the student\'s learning style and find the best tutor matches'}
                                </p>
                            </div>
                        </Card>
                    ) : (
                        <Card>
                            <div className="text-center py-16">
                                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                    Select a Student
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Choose a student from the dropdown to begin match analysis
                                </p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

