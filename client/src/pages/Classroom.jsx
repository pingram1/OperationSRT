import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Users, FileText, Send, Hand } from 'lucide-react';

// --- MOCK DATA (to be replaced by API calls) ---
const sessionData = {
    subject: "Algebra II - Polynomial Functions",
    tutor: "Mr. Davis",
    participants: [
        { id: 1, name: "Mr. Davis (Tutor)", avatar: 'https://placehold.co/40x40/E2E8F0/4A5568?text=MD' },
        { id: 2, name: "Alex Smith", avatar: 'https://placehold.co/40x40/E2E8F0/4A5568?text=AS' },
        { id: 3, name: "Ben Carter", avatar: 'https://placehold.co/40x40/E2E8F0/4A5568?text=BC' },
    ],
    chatMessages: [
        { id: 1, name: "Mr. Davis", text: "Welcome, everyone! We'll start in just a moment." },
        { id: 2, name: "Alex Smith", text: "Hi! Looking forward to it." },
    ]
};

// --- Reusable Components ---
const Card = ({ children, className = '' }) => (<div className={`bg-white rounded-xl shadow-md p-4 sm:p-6 ${className}`}>{children}</div>);

// --- Classroom Page Main Component ---
export default function ClassroomPage() {
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'participants', 'notes'
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState(sessionData.chatMessages);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (chatInput.trim() === '') return;
        const newMessage = { id: messages.length + 1, name: "You", text: chatInput };
        setMessages([...messages, newMessage]);
        setChatInput('');
    };

    const ChatTab = () => (
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
            <form onSubmit={handleSendMessage} className="p-4 border-t">
                <div className="relative">
                    <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message..." className="w-full pr-10 p-2 border rounded-lg" />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600"><Send className="w-5 h-5" /></button>
                </div>
            </form>
        </div>
    );
    
    const ParticipantsTab = () => (
        <div className="p-4 space-y-3">
             {sessionData.participants.map(p => (
                <div key={p.id} className="flex items-center gap-3">
                     <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-full" />
                     <p className="font-medium">{p.name}</p>
                </div>
             ))}
        </div>
    );

    const NotesTab = () => (
        <div className="p-4 h-full">
            <textarea className="w-full h-full border rounded-lg p-3 text-sm" placeholder="Collaborative notes for the session..."></textarea>
        </div>
    );

    const renderSidebarContent = () => {
        switch (activeTab) {
            case 'chat': return <ChatTab />;
            case 'participants': return <ParticipantsTab />;
            case 'notes': return <NotesTab />;
            default: return null;
        }
    };
    
    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* Main Content Area */}
            <main className="flex-1 flex flex-col p-4 sm:p-6">
                <header className="mb-4">
                    <h1 className="text-2xl font-bold text-gray-800">{sessionData.subject}</h1>
                    <p className="text-gray-600">Led by {sessionData.tutor}</p>
                </header>
                
                {/* Video Player Area */}
                <div className="flex-grow bg-black rounded-xl flex items-center justify-center text-white relative">
                    <p>Main video stream would appear here.</p>
                    {/* Video Controls */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-800/50 backdrop-blur-sm rounded-full p-2 flex items-center space-x-2">
                        <button onClick={() => setIsMuted(!isMuted)} className={`p-3 rounded-full transition-colors ${isMuted ? 'bg-red-500' : 'bg-gray-600 hover:bg-gray-500'}`}>
                            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </button>
                        <button onClick={() => setIsVideoOff(!isVideoOff)} className={`p-3 rounded-full transition-colors ${isVideoOff ? 'bg-red-500' : 'bg-gray-600 hover:bg-gray-500'}`}>
                            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                        </button>
                        <button className="p-3 bg-gray-600 rounded-full hover:bg-gray-500 transition-colors">
                            <Hand className="w-6 h-6" />
                        </button>
                        <button className="p-3 bg-red-600 rounded-full hover:bg-red-700 transition-colors">
                            <PhoneOff className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </main>

            {/* Sidebar */}
            <aside className="w-80 bg-white flex flex-col h-screen shadow-lg">
                 <div className="border-b flex">
                    <button onClick={() => setActiveTab('chat')} className={`flex-1 flex justify-center items-center gap-2 p-4 text-sm font-semibold ${activeTab === 'chat' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>
                        <MessageSquare className="w-5 h-5"/> Chat
                    </button>
                    <button onClick={() => setActiveTab('participants')} className={`flex-1 flex justify-center items-center gap-2 p-4 text-sm font-semibold ${activeTab === 'participants' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>
                        <Users className="w-5 h-5"/> Participants ({sessionData.participants.length})
                    </button>
                     <button onClick={() => setActiveTab('notes')} className={`flex-1 flex justify-center items-center gap-2 p-4 text-sm font-semibold ${activeTab === 'notes' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>
                        <FileText className="w-5 h-5"/> Notes
                    </button>
                </div>
                {renderSidebarContent()}
            </aside>
        </div>
    );
}