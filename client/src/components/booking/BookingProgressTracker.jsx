import React from 'react';
import { Check } from 'lucide-react';

/**
 * A component that displays a visual progress tracker for a multi-step process.
 * @param {object} props - The component's props.
 * @param {number} props.currentStep - The current active step (1-based index).
 * @param {string[]} [props.steps] - An array of strings representing the step labels.
 */
export default function BookingProgressTracker({ currentStep = 1, totalSteps = 5, steps }) {
    
    // Default steps if none are provided
    const defaultSteps = ['Service', 'Details', 'Schedule', 'Tutor', 'Confirm'];
    const stepLabels = steps || defaultSteps.slice(0, totalSteps);

    return (
        <div className="flex items-center w-full">
            {stepLabels.map((step, index) => {
                const stepNumber = index + 1;
                const isCompleted = stepNumber < currentStep;
                const isActive = stepNumber === currentStep;

                return (
                    <React.Fragment key={step}>
                        {/* The step circle and label */}
                        <div className="flex flex-col items-center text-center">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                                    isCompleted ? 'bg-green-500 text-white' :
                                    isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                                }`}
                            >
                                {isCompleted ? <Check /> : <span>{stepNumber}</span>}
                            </div>
                            <p className={`mt-2 text-sm font-semibold transition-colors duration-300 ${isActive || isCompleted ? 'text-blue-600' : 'text-gray-500'}`}>
                                {step}
                            </p>
                        </div>
                        
                        {/* The connector line between steps */}
                        {index < stepLabels.length - 1 && (
                            <div
                                className={`flex-1 h-1 mx-2 transition-colors duration-500 ${
                                    isCompleted || isActive ? 'bg-blue-500' : 'bg-gray-200'
                                }`}
                            ></div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
