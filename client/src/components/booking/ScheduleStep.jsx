import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { getAvailableTimeSlots } from '../../api/availability';

/**
 * A component for the third step of the booking process, allowing users
 * to select a date and time for their appointment.
 * @param {object} props - The component's props.
 * @param {Function} props.onSelect - Callback to update the main booking state.
 * @param {Function} props.onNext - Callback to proceed to the next step.
 * @param {Function} props.onBack - Callback to return to the previous step.
 * @param {object} props.bookingDetails - The current state of the booking details.
 */
export default function ScheduleStep({ onSelect, onNext, onBack, bookingDetails }) {
    // State for managing the calendar's currently displayed month and year
    const [currentDate, setCurrentDate] = useState(new Date());
    const [availableTimes, setAvailableTimes] = useState([]);
    const [isLoadingTimes, setIsLoadingTimes] = useState(false);
    const [timesError, setTimesError] = useState('');

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    // Get session duration from service (default: 60 minutes for solo, 90 for group, 30 for consult)
    const getSessionDuration = () => {
        if (bookingDetails.service?.id === 'consult') return 30;
        if (bookingDetails.service?.id === 'group') return 90;
        return 60; // solo or default
    };

    // Fetch available time slots when date is selected
    useEffect(() => {
        const fetchAvailableTimes = async () => {
            if (!bookingDetails.date) {
                setAvailableTimes([]);
                return;
            }

            setIsLoadingTimes(true);
            setTimesError('');

            try {
                // Get tutor ID if tutor is already selected (might happen if user goes back)
                const tutorId = bookingDetails.tutor?._id || bookingDetails.tutor?.id || null;
                // Only use tutor ID if it's a real tutor (not 'any')
                const effectiveTutorId = tutorId && tutorId !== 'any' ? tutorId : null;

                const duration = getSessionDuration();
                const slots = await getAvailableTimeSlots(
                    bookingDetails.date,
                    effectiveTutorId,
                    duration,
                    30 // 30-minute intervals
                );

                setAvailableTimes(slots || []);
                
                // If a time was previously selected but is no longer available, clear it
                if (bookingDetails.time && slots.length > 0 && !slots.includes(bookingDetails.time)) {
                    console.log(`Selected time ${bookingDetails.time} is no longer available for the selected tutor. Clearing selection.`);
                    // Use setTimeout to avoid state update during render
                    setTimeout(() => onSelect('time', null), 0);
                } else if (bookingDetails.time && slots.length === 0) {
                    // No slots available, clear selection
                    setTimeout(() => onSelect('time', null), 0);
                }
            } catch (error) {
                console.error('Failed to fetch available times:', error);
                setTimesError(error.message || 'Failed to load available times. Please try again.');
                setAvailableTimes([]);
            } finally {
                setIsLoadingTimes(false);
            }
        };

        fetchAvailableTimes();
        // Note: We intentionally don't include onSelect in dependencies to avoid infinite loops
        // The effect only runs when date, tutor, or service changes, which is the desired behavior
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        bookingDetails.date?.getTime(), // Use getTime() to compare dates properly
        bookingDetails.tutor?._id || bookingDetails.tutor?.id,
        bookingDetails.service?.id
    ]);
    
    const handleDateSelect = (day) => {
        const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        // Set time to start of day to avoid timezone issues
        selectedDate.setHours(0, 0, 0, 0);
        onSelect('date', selectedDate);
        // Clear selected time when date changes
        onSelect('time', null);
    };

    const handleMonthChange = (offset) => {
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-center mb-6">3. Choose a Date & Time</h2>
            <div className="md:flex md:space-x-8">
                {/* Calendar Component */}
                <div className="flex-1 mb-6 md:mb-0">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => handleMonthChange(-1)} className="p-2 rounded-full hover:bg-gray-100" aria-label="Previous month"><ArrowLeft className="w-5 h-5" /></button>
                        <h3 className="font-semibold text-lg">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                        <button onClick={() => handleMonthChange(1)} className="p-2 rounded-full hover:bg-gray-100" aria-label="Next month"><ArrowRight className="w-5 h-5" /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-500">
                        <div className="font-semibold">S</div><div className="font-semibold">M</div><div className="font-semibold">T</div><div className="font-semibold">W</div><div className="font-semibold">T</div><div className="font-semibold">F</div><div className="font-semibold">S</div>
                        {/* Empty cells for days before the first of the month */}
                        {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`}></div>)}
                        {/* Day cells */}
                        {Array.from({ length: daysInMonth }).map((_, day) => {
                            const dayNumber = day + 1;
                            const isSelected = bookingDetails.date?.toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber).toDateString();
                            return (
                                <div key={dayNumber} onClick={() => handleDateSelect(dayNumber)} className={`py-2 rounded-full cursor-pointer transition-colors ${isSelected ? 'bg-blue-600 text-white font-bold' : 'hover:bg-gray-200'}`}>
                                    {dayNumber}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Time Slot Selector */}
                <div className="flex-1">
                    {bookingDetails.date ? (
                        <div className="space-y-2">
                            <h4 className="font-semibold mb-2">
                                Available Times for {bookingDetails.date.toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </h4>
                            {bookingDetails.tutor && bookingDetails.tutor.id !== 'any' && bookingDetails.tutor._id !== 'any' && (
                                <p className="text-sm text-gray-600 mb-2">
                                    Showing times for {bookingDetails.tutor.name || 'selected tutor'}
                                </p>
                            )}
                            {isLoadingTimes ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                                    <p className="text-gray-600">Loading available times...</p>
                                </div>
                            ) : timesError ? (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-700 text-sm">{timesError}</p>
                                </div>
                            ) : availableTimes.length > 0 ? (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {availableTimes.map(time => (
                                        <button 
                                            key={time} 
                                            onClick={() => onSelect('time', time)} 
                                            className={`w-full p-3 border rounded-lg text-left transition-colors ${
                                                bookingDetails.time === time 
                                                    ? 'bg-blue-600 text-white font-bold border-blue-600' 
                                                    : 'bg-white hover:bg-gray-100 border-gray-200'
                                            }`}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-yellow-800 text-sm">
                                        No available times for this date. Please select another date.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
                            <p className="text-center text-gray-500">Please select a date to see available times.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
                <button onClick={onBack} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 flex items-center"><ArrowLeft className="w-4 h-4 mr-2" /> Back</button>
                <button onClick={onNext} disabled={!bookingDetails.time} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 flex items-center">Next <ArrowRight className="w-4 h-4 ml-2" /></button>
            </div>
        </div>
    );
};
