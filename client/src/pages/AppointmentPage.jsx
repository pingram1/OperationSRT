import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, Star, BookCopy, Calendar, User, ClipboardCheck, Sparkles } from 'lucide-react';

// --- MOCK DATA (to be replaced by API calls) ---
const membershipTiers = [
    { name: 'Summa Cum Laude', subtitle: 'Long-Term Member', price: '$139.99/mo', features: ['Enhanced AI-driven learning plans', 'Exclusive access to premium content', 'Special member-only webinars', 'Personalized progress tracking'], current: false },
    { name: 'Magna Cum Laude', subtitle: 'Active Member', price: '$35/session', features: ['Access to personalized resources', 'Interactive study guides', 'Priority scheduling for follow-ups'], current: true },
    { name: 'Cum Laude', subtitle: 'Basic Access User', price: 'Free', features: ['Basic learning models', 'Limited use of AI assistants', 'Preview access to platform features'], current: false },
];
const services = [
    { id: 'solo', name: 'Solo Session (1-week plan)', price: 35, duration: 60 },
    { id: 'group', name: 'Group Sessions (3-4 students)', price: 124.99, duration: 90 },
    { id: 'consult', name: 'Consultation', price: 0, duration: 30 },
];
const tutors = [ {id: 'davis', name: 'Mr. Davis'}, {id: 'chen', name: 'Ms. Chen'}, {id: 'ford', name: 'Mr. Ford'} ];

// --- Reusable Components ---
const Card = ({ children, className = '' }) => (<div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>{children}</div>);
const ProgressTracker = ({ currentStep }) => {
    const steps = ['Service', 'Details', 'Schedule', 'Tutor', 'Confirm'];
    return ( <div className="flex justify-between items-center mb-8">{steps.map((step, index) => (
        <React.Fragment key={step}>
            <div className="flex flex-col items-center text-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${index + 1 <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {index + 1 < currentStep ? <Check /> : <span>{index + 1}</span>}
                </div>
                <p className={`mt-2 text-sm font-semibold ${index + 1 <= currentStep ? 'text-blue-600' : 'text-gray-500'}`}>{step}</p>
            </div>
            {index < steps.length - 1 && <div className={`flex-1 h-1 mx-2 ${index + 1 < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`}></div>}
        </React.Fragment>
    ))}</div>);
};

// --- Sub-components for each booking step ---
const ServiceSelectionStep = ({ onSelect, onNext, bookingDetails }) => (
    <div><h2 className="text-2xl font-bold text-center mb-6">1. Select Your Service</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-6">{services.map(service => (
        <div key={service.id} onClick={() => onSelect('service', service)} className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${bookingDetails.service?.id === service.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400'}`}>
            <h3 className="font-bold text-lg">{service.name}</h3>
            <p className="text-2xl font-bold my-2">${service.price.toFixed(2)}</p>
            <p className="text-sm text-gray-500">{service.duration} minutes</p>
        </div>
    ))}</div><div className="text-right mt-8"><button onClick={onNext} disabled={!bookingDetails.service} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300">Next <ArrowRight className="inline w-4 h-4" /></button></div></div>
);
const SubjectAndGoalsStep = ({ onNext, onBack, onFormChange, bookingDetails }) => (
     <div><h2 className="text-2xl font-bold text-center mb-6">2. Subject & Learning Goals</h2><div className="space-y-4"><select name="subject" value={bookingDetails.subject || ''} onChange={onFormChange} className="w-full p-3 border rounded-lg"><option value="" disabled>Select a Subject</option><option>Algebra</option><option>Chemistry</option><option>English</option><option>History</option></select><textarea name="goals" value={bookingDetails.goals || ''} onChange={onFormChange} placeholder="What would you like to focus on in this session?" className="w-full p-3 border rounded-lg h-32"></textarea></div><div className="flex justify-between mt-8"><button onClick={onBack} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300"><ArrowLeft className="inline w-4 h-4" /> Back</button><button onClick={onNext} disabled={!bookingDetails.subject || !bookingDetails.goals} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300">Next <ArrowRight className="inline w-4 h-4" /></button></div></div>
);
const ScheduleStep = ({ onSelect, onNext, onBack, bookingDetails }) => {
    // Basic calendar logic for demonstration
    const [date, setDate] = useState(new Date());
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const availableTimes = ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'];
    return (<div><h2 className="text-2xl font-bold text-center mb-6">3. Choose a Date & Time</h2><div className="md:flex gap-6"><div className="flex-1 mb-6 md:mb-0"><div className="flex justify-between items-center mb-4"><button onClick={() => setDate(new Date(date.setMonth(date.getMonth() - 1)))}>&larr;</button><h3 className="font-semibold">{date.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3><button onClick={() => setDate(new Date(date.setMonth(date.getMonth() + 1)))}>&rarr;</button></div><div className="grid grid-cols-7 gap-1 text-center text-sm"><div className="font-semibold">S</div><div className="font-semibold">M</div><div className="font-semibold">T</div><div className="font-semibold">W</div><div className="font-semibold">T</div><div className="font-semibold">F</div><div className="font-semibold">S</div>{Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`}></div>)}{Array.from({ length: daysInMonth }).map((_, day) => <div key={day} onClick={() => onSelect('date', new Date(date.setDate(day + 1)))} className={`p-2 rounded-full cursor-pointer ${bookingDetails.date?.getDate() === day + 1 ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}>{day + 1}</div>)}</div></div><div className="flex-1">{bookingDetails.date ? <div className="space-y-2">{availableTimes.map(time => <button key={time} onClick={() => onSelect('time', time)} className={`w-full p-3 border rounded-lg ${bookingDetails.time === time ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>{time}</button>)}</div> : <p className="text-center text-gray-500">Please select a date.</p>}</div></div><div className="flex justify-between mt-8"><button onClick={onBack} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300"><ArrowLeft className="inline w-4 h-4" /> Back</button><button onClick={onNext} disabled={!bookingDetails.time} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300">Next <ArrowRight className="inline w-4 h-4" /></button></div></div>);
};
const TutorPreferenceStep = ({ onSelect, onNext, onBack, bookingDetails }) => (
    <div><h2 className="text-2xl font-bold text-center mb-6">4. Select a Tutor</h2><div className="space-y-3">{tutors.map(tutor => <div key={tutor.id} onClick={()=>onSelect('tutor', tutor)} className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${bookingDetails.tutor?.id === tutor.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}><img src={`https://placehold.co/40x40/E2E8F0/4A5568?text=${tutor.name.charAt(0)}`} className="rounded-full mr-4" alt=""/><p className="font-semibold">{tutor.name}</p></div>)}<div onClick={()=>onSelect('tutor', {id: 'any', name: 'Any Available'})} className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${bookingDetails.tutor?.id === 'any' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}><Sparkles className="w-10 h-10 text-yellow-500 mr-4" /><p className="font-semibold">No Preference (assign best available)</p></div></div><div className="flex justify-between mt-8"><button onClick={onBack} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300"><ArrowLeft className="inline w-4 h-4" /> Back</button><button onClick={onNext} disabled={!bookingDetails.tutor} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300">Next <ArrowRight className="inline w-4 h-4" /></button></div></div>
);
const ReviewAndConfirmStep = ({ onBack, bookingDetails }) => {
    const { service, subject, goals, date, time, tutor } = bookingDetails;
    return(<div><h2 className="text-2xl font-bold text-center mb-6">5. Review & Confirm</h2><div className="bg-gray-50 p-6 rounded-lg space-y-4"><div><p className="text-sm text-gray-500">SERVICE</p><p className="font-bold text-lg">{service?.name}</p></div><hr/><div><p className="text-sm text-gray-500">DETAILS</p><p className="font-semibold">{subject}</p><p className="text-sm text-gray-600 mt-1">{goals}</p></div><hr/><div><p className="text-sm text-gray-500">WHEN</p><p className="font-semibold">{date?.toDateString()} at {time}</p></div><hr/><div><p className="text-sm text-gray-500">TUTOR</p><p className="font-semibold">{tutor?.name}</p></div></div><div className="flex justify-between mt-8"><button onClick={onBack} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300"><ArrowLeft className="inline w-4 h-4" /> Back</button><button className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 text-lg">Confirm & Book for ${service?.price.toFixed(2)}</button></div></div>)
};

// --- Appointments Page Main Component ---
export default function AppointmentPage() {
    const [activeTab, setActiveTab] = useState('booking'); // 'booking' or 'membership'
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
                <Card className="max-w-4xl mx-auto"><ProgressTracker currentStep={currentStep} /><hr className="my-8" />{renderBookingStep()}</Card>
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
