import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Clock, Calendar } from 'lucide-react';

/**
 * Component for configuring session options for Summa Cum Laude membership plan.
 * Allows users to choose between base plan (1 hour/week) or additional options.
 */
export default function SessionSetupStep({ plan, onNext, onBack, selectedConfiguration, onConfigurationChange }) {
    const [configuration, setConfiguration] = useState(selectedConfiguration || {
        sessionsPerWeek: plan.sessionConfig?.baseSessionsPerWeek || 1,
        sessionDuration: plan.sessionConfig?.baseSessionDuration || 60,
        additionalOption: null,
    });

    const baseConfig = plan.sessionConfig || {};
    const additionalOptions = baseConfig.additionalSessionOptions || [];

    const handleSelect = (option) => {
        const newConfig = {
            sessionsPerWeek: option.sessionsPerWeek,
            sessionDuration: option.sessionDuration,
            additionalOption: option.label,
        };
        setConfiguration(newConfig);
        if (onConfigurationChange) {
            onConfigurationChange(newConfig);
        }
    };

    const handleSelectBase = () => {
        const baseConfig = {
            sessionsPerWeek: plan.sessionConfig?.baseSessionsPerWeek || 1,
            sessionDuration: plan.sessionConfig?.baseSessionDuration || 60,
            additionalOption: null,
        };
        setConfiguration(baseConfig);
        if (onConfigurationChange) {
            onConfigurationChange(baseConfig);
        }
    };

    const isBaseSelected = configuration.sessionsPerWeek === baseConfig.baseSessionsPerWeek && 
                          configuration.sessionDuration === baseConfig.baseSessionDuration &&
                          !configuration.additionalOption;

    return (
        <div>
            <h2 className="text-2xl font-bold text-center mb-2">Configure Your Sessions</h2>
            <p className="text-center text-gray-600 mb-6">
                Choose your preferred session schedule for your Summa Cum Laude membership
            </p>

            <div className="space-y-4 max-w-2xl mx-auto">
                {/* Base Plan Option */}
                <div
                    onClick={handleSelectBase}
                    className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                        isBaseSelected
                            ? 'border-blue-500 bg-blue-50 shadow-lg'
                            : 'border-gray-200 hover:border-blue-400 hover:shadow-md'
                    }`}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center mb-2">
                                <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                                <h3 className="font-bold text-lg text-gray-800">Base Plan</h3>
                            </div>
                            <p className="text-gray-600 mb-3">
                                {baseConfig.baseSessionsPerWeek || 1} session per week
                            </p>
                            <div className="flex items-center text-sm text-gray-500">
                                <Clock className="w-4 h-4 mr-1" />
                                <span>{(baseConfig.baseSessionDuration || 60)} minutes per session</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                {baseConfig.sessionsPerMonth || 4} hours total per month
                            </p>
                        </div>
                        {isBaseSelected && (
                            <div className="ml-4">
                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs">✓</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Additional Options */}
                {additionalOptions.length > 0 && (
                    <>
                        <div className="text-center my-4">
                            <span className="text-gray-400 text-sm">OR</span>
                        </div>
                        {additionalOptions.map((option, index) => {
                            const isSelected = configuration.sessionsPerWeek === option.sessionsPerWeek &&
                                             configuration.sessionDuration === option.sessionDuration &&
                                             configuration.additionalOption === option.label;
                            
                            return (
                                <div
                                    key={index}
                                    onClick={() => handleSelect(option)}
                                    className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                                        isSelected
                                            ? 'border-blue-500 bg-blue-50 shadow-lg'
                                            : 'border-gray-200 hover:border-blue-400 hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center mb-2">
                                                <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                                                <h3 className="font-bold text-lg text-gray-800">{option.label}</h3>
                                            </div>
                                            <div className="flex items-center text-sm text-gray-500">
                                                <Clock className="w-4 h-4 mr-1" />
                                                <span>{option.sessionDuration} minutes per session</span>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">
                                                8 hours total per month
                                            </p>
                                            {option.additionalCost > 0 && (
                                                <div className="mt-2">
                                                    <p className="text-lg font-bold text-blue-600">
                                                        ${(plan.price + option.additionalCost).toFixed(2)}/month
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        (Base: ${plan.price.toFixed(2)}/mo + ${option.additionalCost.toFixed(2)})
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <div className="ml-4">
                                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                                    <span className="text-white text-xs">✓</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
                <button
                    onClick={onBack}
                    className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 flex items-center"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </button>
                <button
                    onClick={onNext}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 flex items-center"
                >
                    Continue to Payment <ArrowRight className="w-4 h-4 ml-2" />
                </button>
            </div>
        </div>
    );
}

