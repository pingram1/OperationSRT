import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Users, FileText, Send, Hand } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getUserBookings, getBookingById } from '../api/bookings.js';
import { useSearchParams, Link } from 'react-router-dom';

// --- Reusable Components ---
const Card = ({ children, className = '' }) => (<div className={`bg-white rounded-xl shadow-md p-4 sm:p-6 ${className}`}>{children}</div>);

// ChatTab Component - extracted to maintain stable identity
const ChatTabComponent = React.memo(({ messages, chatInput, onInputChange, onSendMessage, inputRef }) => (
    <div className="flex flex-col h-full">
        <div className="flex-grow space-y-4 overflow-y-auto p-4">
            {messages.map(msg => (
                <div key={msg.id} className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-sm text-gray-600 flex-shrink-0">{msg.name.charAt(0)}</div>
                    <div>
                        <p className="font-semibold text-sm">{msg.name}</p>
                        <div className="bg-gray-100 p-2 rounded-lg text-sm">{msg.text}</div>
                    </div>
                </div>
            ))}
        </div>
        <form onSubmit={onSendMessage} className="p-4 border-t">
            <div className="relative">
                <input 
                    ref={inputRef}
                    type="text" 
                    value={chatInput} 
                    onChange={onInputChange} 
                    placeholder="Type a message..." 
                    className="w-full pr-10 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    autoComplete="off"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600"><Send className="w-5 h-5" /></button>
            </div>
        </form>
    </div>
));

// --- Classroom Page Main Component ---
export default function ClassroomPage() {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('sessionId');
    
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'participants', 'notes'
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [sessionData, setSessionData] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const chatInputRef = useRef(null);

    useEffect(() => {
        const fetchSessionData = async () => {
            try {
                setIsLoading(true);
                let currentSession = null;
                
                // If sessionId is provided, try to fetch it directly first
                if (sessionId) {
                    try {
                        currentSession = await getBookingById(sessionId);
                    } catch (error) {
                        console.warn('Failed to fetch booking by ID, trying getUserBookings:', error);
                        // Fallback to getUserBookings if direct fetch fails
                    }
                }
                
                // If we don't have a session yet, fetch from getUserBookings
                if (!currentSession) {
                    const response = await getUserBookings();
                    // Handle paginated response format
                    const bookings = response.bookings || response || [];
                
                if (sessionId) {
                    currentSession = bookings.find(b => (b._id || b.id) === sessionId);
                } else {
                    // Get first scheduled session
                    currentSession = bookings.find(b => 
                        b.status === 'scheduled' && new Date(b.sessionDate) > new Date()
                    );
                    }
                }
                
                if (currentSession) {
                    setSessionData(currentSession);
                    // Build participants list from session data
                    const parts = [];
                    if (currentSession.tutor) {
                        const tutorName = currentSession.tutor.name || 'Tutor';
                        const tutorInitials = tutorName.split(' ').map(n => n[0]).join('');
                        parts.push({
                            id: currentSession.tutor._id || currentSession.tutor.id,
                            name: `${tutorName} (Tutor)`,
                            avatar: currentSession.tutor.avatar || `https://placehold.co/40x40/E2E8F0/4A5568?text=${tutorInitials}`
                        });
                    }
                    if (currentSession.student) {
                        const studentName = currentSession.student.name || 'Student';
                        const studentInitials = studentName.split(' ').map(n => n[0]).join('');
                        parts.push({
                            id: currentSession.student._id || currentSession.student.id,
                            name: studentName,
                            avatar: currentSession.student.avatar || `https://placehold.co/40x40/E2E8F0/4A5568?text=${studentInitials}`
                        });
                    }
                    setParticipants(parts);
                }
            } catch (error) {
                console.error('Failed to fetch session data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        if (user) {
            fetchSessionData();
        }
    }, [user, sessionId]);

    const handleSendMessage = useCallback((e) => {
        e.preventDefault();
        if (chatInput.trim() === '') return;
        const newMessage = { 
            id: Date.now(), 
            name: user?.name || "You", 
            text: chatInput,
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, newMessage]);
        setChatInput('');
    }, [chatInput, user?.name]);

    const handleChatInputChange = useCallback((e) => {
        setChatInput(e.target.value);
    }, []);

    
    const ParticipantsTab = (
        <div className="p-4 space-y-3">
             {participants.length > 0 ? participants.map(p => (
                <div key={p.id} className="flex items-center gap-3">
                     <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-full" />
                     <p className="font-medium">{p.name}</p>
                </div>
             )) : (
                <p className="text-center text-gray-500 py-4">No participants found.</p>
             )}
        </div>
    );

    const NotesTab = (
        <div className="p-4 h-full">
            <textarea className="w-full h-full border rounded-lg p-3 text-sm" placeholder="Collaborative notes for the session..."></textarea>
        </div>
    );

    const renderSidebarContent = () => {
        switch (activeTab) {
            case 'chat': 
                return (
                    <ChatTabComponent 
                        messages={messages}
                        chatInput={chatInput}
                        onInputChange={handleChatInputChange}
                        onSendMessage={handleSendMessage}
                        inputRef={chatInputRef}
                    />
                );
            case 'participants': return ParticipantsTab;
            case 'notes': return NotesTab;
            default: return null;
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex h-screen bg-gray-100 font-sans items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">Loading session...</p>
                </div>
            </div>
        );
    }

    if (!sessionData) {
        // For admin/super_admin, redirect to Booking Management instead of customer booking flow
        const bookingPath = (user?.role === 'admin' || user?.role === 'super_admin') 
            ? '/admin-bookings' 
            : '/appointments';
        
        return (
            <div className="flex h-screen bg-gray-100 font-sans items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">No active session found.</p>
                    <Link 
                        to={bookingPath} 
                        className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        {(user?.role === 'admin' || user?.role === 'super_admin') 
                            ? 'Go to Booking Management' 
                            : 'Book a Session'}
                    </Link>
                </div>
            </div>
        );
    }

    const tutorName = sessionData.tutor?.name || 'Tutor TBD';
    const subject = sessionData.subject || 'Session';
    
    // Determine which room URL to use
    // Tutors get hostRoomUrl, students get roomUrl
    const isTutor = user?.role === 'tutor' || (user?.role === 'super_admin' && sessionData.tutor && (sessionData.tutor._id === user._id || sessionData.tutor.id === user.id));
    const wherebyRoom = sessionData.wherebyRoom;
    const roomUrl = wherebyRoom 
        ? (isTutor && wherebyRoom.hostRoomUrl ? wherebyRoom.hostRoomUrl : wherebyRoom.roomUrl)
        : null;
    
    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* Main Content Area */}
            <main className="flex-1 flex flex-col p-4 sm:p-6">
                <header className="mb-4">
                    <h1 className="text-2xl font-bold text-gray-800">{subject}</h1>
                    <p className="text-gray-600">Led by {tutorName}</p>
                    {sessionData.sessionType === 'virtual' && !roomUrl && (
                        <p className="text-sm text-yellow-600 mt-2">
                            ⚠️ Video room not available. Please contact support.
                        </p>
                    )}
                </header>
                
                {/* Video Player Area */}
                <div className="flex-grow bg-black rounded-xl relative overflow-hidden">
                    {sessionData.sessionType === 'virtual' && roomUrl ? (
                        <iframe
                            src={roomUrl}
                            allow="camera; microphone; fullscreen; speaker; display-capture"
                            className="w-full h-full border-0"
                            title="Whereby Video Room"
                        />
                    ) : sessionData.sessionType === 'virtual' ? (
                        <div className="flex items-center justify-center h-full text-white">
                            <div className="text-center">
                                <p className="text-lg mb-2">Video room not available</p>
                                <p className="text-sm text-gray-400">The video room for this session could not be loaded.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-white">
                            <div className="text-center">
                                <p className="text-lg mb-2">In-Person Session</p>
                                <p className="text-sm text-gray-400">This is an in-person session. No video room is needed.</p>
                            </div>
                    </div>
                    )}
                </div>
            </main>

            {/* Sidebar */}
            <aside className="w-80 bg-white flex flex-col h-screen shadow-lg">
                 <div className="border-b flex px-2">
                    <button onClick={() => setActiveTab('chat')} className={`flex-1 flex justify-center items-center gap-2 py-4 px-2 text-sm font-semibold ${activeTab === 'chat' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>
                        <MessageSquare className="w-5 h-5"/> Chat
                    </button>
                    <button onClick={() => setActiveTab('participants')} className={`flex-1 flex justify-center items-center gap-2 py-4 px-2 text-sm font-semibold ${activeTab === 'participants' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>
                        <Users className="w-5 h-5"/> Participants ({participants.length})
                    </button>
                     <button onClick={() => setActiveTab('notes')} className={`flex-1 flex justify-center items-center gap-2 py-4 px-2 text-sm font-semibold ${activeTab === 'notes' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>
                        <FileText className="w-5 h-5"/> Notes
                    </button>
                </div>
                {renderSidebarContent()}
            </aside>
        </div>
    );
}