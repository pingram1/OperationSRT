import React, { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

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

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    // Mock data for available time slots
    const availableTimes = ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'];
    
    const handleDateSelect = (day) => {
        const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        onSelect('date', selectedDate);
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
                            <h4 className="font-semibold mb-2">Available Times for {bookingDetails.date.toDateString()}</h4>
                            {availableTimes.map(time => (
                                <button key={time} onClick={() => onSelect('time', time)} className={`w-full p-3 border rounded-lg text-left transition-colors ${bookingDetails.time === time ? 'bg-blue-600 text-white font-bold' : 'bg-white hover:bg-gray-100'}`}>
                                    {time}
                                </button>
                            ))}
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
