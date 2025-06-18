import React from 'react';
import { ArrowRight } from 'lucide-react';

// Mock data for the services offered. In a real app, this would come from an API.
const services = [
    { id: 'solo', name: 'Solo Session (1-week plan)', price: 35, duration: 60 },
    { id: 'group', name: 'Group Sessions (3-4 students)', price: 124.99, duration: 90 },
    { id: 'consult', name: 'Consultation', price: 0, duration: 30 },
];

/**
 * A component for the first step of the booking process, allowing users
 * to select the type of session they want to book.
 * @param {object} props - The component's props.
 * @param {Function} props.onSelect - Callback to update the main booking state with the selected service.
 * @param {Function} props.onNext - Callback to proceed to the next step.
 * @param {object} props.bookingDetails - The current state of the booking details to highlight the selected service.
 */
export default function ServiceSelectionStep({ onSelect, onNext, bookingDetails }) {
    return (
        <div>
            <h2 className="text-2xl font-bold text-center mb-6">1. Select Your Service</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {services.map(service => (
                    <div
                        key={service.id}
                        onClick={() => onSelect('service', service)}
                        className={`p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                            bookingDetails.service?.id === service.id 
                                ? 'border-blue-500 bg-blue-50 shadow-lg' 
                                : 'border-gray-200 hover:border-blue-400 hover:shadow-md'
                        }`}
                        aria-labelledby={`service-name-${service.id}`}
                        role="button"
                        tabIndex={0}
                    >
                        <h3 id={`service-name-${service.id}`} className="font-bold text-lg text-gray-800">{service.name}</h3>
                        <p className="text-2xl font-bold my-2 text-gray-900">${service.price.toFixed(2)}</p>
                        <p className="text-sm text-gray-500">{service.duration} minutes</p>
                    </div>
                ))}
            </div>

            {/* Navigation Button */}
            <div className="text-right mt-8">
                <button
                    onClick={onNext}
                    disabled={!bookingDetails.service}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center ml-auto"
                >
                    Next <ArrowRight className="inline w-4 h-4 ml-2" />
                </button>
            </div>
        </div>
    );
};
