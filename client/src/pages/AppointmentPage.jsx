import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, Star, BookCopy, Calendar, User, ClipboardCheck, Sparkles } from 'lucide-react';

// --- Import the separate booking step components ---
import ServiceSelectionStep from '../components/booking/ServiceSelectionStep.jsx';
import ScheduleStep from '../components/booking/ScheduleStep.jsx';
import BookingProgressTracker from '../components/booking/BookingProgressTracker.jsx';


// --- MOCK DATA (to be replaced by API calls) ---
const membershipTiers = [
    { name: 'Summa Cum Laude', subtitle: 'Long-Term Member', price: '$139.99/mo', features: ['Enhanced AI-driven learning plans', 'Exclusive access to premium content', 'Special member-only webinars', 'Personalized progress tracking'], current: false },
    { name: 'Magna Cum Laude', subtitle: 'Active Member', price: '$35/session', features: ['Access to personalized resources', 'Interactive study guides', 'Priority scheduling for follow-ups'], current: true },
    { name: 'Cum Laude', subtitle: 'Basic Access User', price: 'Free', features: ['Basic learning models', 'Limited use of AI assistants', 'Preview access to platform features'], current: false },
];
const tutors = [ {id: 'davis', name: 'Mr. Davis'}, {id: 'chen', name: 'Ms. Chen'}, {id: 'ford', name: 'Mr. Ford'} ];

// --- Reusable Components ---
const Card = ({ children, className = '' }) => (<div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>{children}</div>);

// --- Sub-components for each booking step (except the imported ones) ---

const SubjectAndGoalsStep = ({ onNext, onBack, onFormChange, bookingDetails }) => (
     <div><h2 className="text-2xl font-bold text-center mb-6">2. Subject & Learning Goals</h2><div className="space-y-4"><select name="subject" value={bookingDetails.subject || ''} onChange={onFormChange} className="w-full p-3 border rounded-lg"><option value="" disabled>Select a Subject</option><option>Algebra</option><option>Chemistry</option><option>English</option><option>History</option></select><textarea name="goals" value={bookingDetails.goals || ''} onChange={onFormChange} placeholder="What would you like to focus on in this session?" className="w-full p-3 border rounded-lg h-32"></textarea></div><div className="flex justify-between mt-8"><button onClick={onBack} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300"><ArrowLeft className="inline w-4 h-4" /> Back</button><button onClick={onNext} disabled={!bookingDetails.subject || !bookingDetails.goals} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300">Next <ArrowRight className="inline w-4 h-4" /></button></div></div>
);

const TutorPreferenceStep = ({ onSelect, onNext, onBack, bookingDetails }) => (
    <div><h2 className="text-2xl font-bold text-center mb-6">4. Select a Tutor</h2><div className="space-y-3">{tutors.map(tutor => <div key={tutor.id} onClick={()=>onSelect('tutor', tutor)} className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${bookingDetails.tutor?.id === tutor.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}><img src={`https://placehold.co/40x40/E2E8F0/4A5568?text=${tutor.name.charAt(0)}`} className="rounded-full mr-4" alt=""/><p className="font-semibold">{tutor.name}</p></div>)}<div onClick={()=>onSelect('tutor', {id: 'any', name: 'Any Available'})} className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${bookingDetails.tutor?.id === 'any' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}><Sparkles className="w-10 h-10 text-yellow-500 mr-4" /><p className="font-semibold">No Preference (assign best available)</p></div></div><div className="flex justify-between mt-8"><button onClick={onBack} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300"><ArrowLeft className="inline w-4 h-4" /> Back</button><button onClick={onNext} disabled={!bookingDetails.tutor} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300">Next <ArrowRight className="inline w-4 h-4" /></button></div></div>
);

const ReviewAndConfirmStep = ({ onBack, bookingDetails }) => {
    const { service, subject, goals, date, time, tutor } = bookingDetails;
    return(<div><h2 className="text-2xl font-bold text-center mb-6">5. Review & Confirm</h2><div className="bg-gray-50 p-6 rounded-lg space-y-4"><div><p className="text-sm text-gray-500">SERVICE</p><p className="font-bold text-lg">{service?.name}</p></div><hr/><div><p className="text-sm text-gray-500">DETAILS</p><p className="font-semibold">{subject}</p><p className="text-sm text-gray-600 mt-1">{goals}</p></div><hr/><div><p className="text-sm text-gray-500">WHEN</p><p className="font-semibold">{date?.toDateString()} at {time}</p></div><hr/><div><p className="text-sm text-gray-500">TUTOR</p><p className="font-semibold">{tutor?.name}</p></div></div><div className="flex justify-between mt-8"><button onClick={onBack} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300"><ArrowLeft className="inline w-4 h-4" /> Back</button><button className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 text-lg">Confirm & Book for ${service?.price.toFixed(2)}</button></div></div>)
};

// --- Appointments Page Main Component ---
export default function AppointmentPage() {
    const [activeTab, setActiveTab] = useState('booking');
    const [currentStep, setCurrentStep] = useState(1);
    const [bookingDetails, setBookingDetails] = useState({});

    const handleSelect = (field, value) => setBookingDetails(prev => ({ ...prev, [field]: value }));
    const handleFormChange = (e) => setBookingDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const nextStep = () => setCurrentStep(prev => prev + 1);
    const prevStep = () => setCurrentStep(prev => prev - 1);

    const renderBookingStep = () => {
        switch (currentStep) {
            case 1: return <ServiceSelectionStep onSelect={handleSelect} onNext={nextStep} bookingDetails={bookingDetails} />;
            case 2: return <SubjectAndGoalsStep onNext={nextStep} onBack={prevStep} onFormChange={handleFormChange} bookingDetails={bookingDetails} />;
            case 3: return <ScheduleStep onSelect={handleSelect} onNext={nextStep} onBack={prevStep} bookingDetails={bookingDetails} />;
            case 4: return <TutorPreferenceStep onSelect={handleSelect} onNext={nextStep} onBack={prevStep} bookingDetails={bookingDetails} />;
            case 5: return <ReviewAndConfirmStep onBack={prevStep} bookingDetails={bookingDetails} />;
            default: return <p>Thank you for booking!</p>;
        }
    };
    
    return (
        <div className="bg-gray-100 min-h-screen font-sans p-8">
            <header className="mb-8"><h1 className="text-3xl font-bold text-gray-800">Appointments & Memberships</h1><p className="text-gray-600">Schedule your sessions or manage your membership plan.</p></header>
            
            <div className="flex justify-center border-b mb-8"><div className="flex items-center bg-gray-200 rounded-lg p-1">
                <button onClick={() => setActiveTab('booking')} className={`px-6 py-2 rounded-md text-sm font-semibold ${activeTab === 'booking' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}>Booking</button>
                <button onClick={() => setActiveTab('membership')} className={`px-6 py-2 rounded-md text-sm font-semibold ${activeTab === 'membership' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}>Membership Plans</button>
            </div></div>

            {activeTab === 'booking' && (
                <Card className="max-w-4xl mx-auto">
                    <BookingProgressTracker currentStep={currentStep} />
                    <hr className="my-8" />
                    {renderBookingStep()}
                </Card>
            )}

            {activeTab === 'membership' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">{membershipTiers.map(tier => (
                    <Card key={tier.name} className={`flex flex-col ${tier.current ? 'border-2 border-blue-500' : ''}`}>
                        <div className="text-center mb-4"><h3 className="text-2xl font-bold text-gray-800">{tier.name}</h3><p className="text-gray-500">{tier.subtitle}</p></div>
                        <div className="text-center my-4"><span className="text-4xl font-bold">{tier.price}</span></div>
                        <ul className="space-y-3 my-4 flex-grow">{tier.features.map(feature => <li key={feature} className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-1" /><span>{feature}</span></li>)}</ul>
                        <button disabled={tier.current} className={`w-full py-2 mt-4 rounded-lg font-semibold ${tier.current ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{tier.current ? 'Your Current Plan' : 'Select Plan'}</button>
                    </Card>
                ))}</div>
            )}
        </div>
    );
}
