import React from 'react';
import { Check, Star } from 'lucide-react';
import Button from '../common/Button.jsx'; // Assuming a reusable button component exists
import Card from '../common/Card.jsx';     // Assuming a reusable card component exists

// --- MOCK DATA (based on your uploaded images) ---
const membershipTiers = [
    { 
        name: 'Summa Cum Laude', 
        subtitle: 'Long-Term Member', 
        price: '$139.99',
        priceDetail: '/ 4-weeks',
        features: [
            'Enhanced AI-driven learning plans', 
            'Exclusive access to premium educational content', 
            'Special member-only webinars and Q&A sessions', 
            'Personalized progress tracking and reports'
        ],
        isCurrent: false,
        isFeatured: true,
    },
    { 
        name: 'Magna Cum Laude', 
        subtitle: 'Active Member', 
        price: '$35',
        priceDetail: '/ session',
        features: [
            'Access to personalized tutoring resources', 
            'Interactive study guides and practice tools', 
            'Priority scheduling for follow-up sessions',
            '1-month access for one-time session users'
        ],
        isCurrent: true,
    },
    { 
        name: 'Cum Laude', 
        subtitle: 'Basic Access User (Coming Soon)', 
        price: 'Free',
        priceDetail: '',
        features: [
            'Basic learning models', 
            'Limited use of AI assistants', 
            'Preview access to platform features',
            'Access for all students upon launch'
        ],
        isCurrent: false,
    },
];

/**
 * A component that displays the different membership tiers available.
 */
export default function MembershipTiers() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {membershipTiers.map(tier => (
                <Card 
                    key={tier.name} 
                    className={`flex flex-col ${tier.isCurrent ? 'border-2 border-blue-500' : ''} ${tier.isFeatured ? 'relative' : ''}`}
                >
                    {tier.isFeatured && (
                        <div className="absolute top-0 -right-4 bg-yellow-400 text-gray-800 font-bold px-4 py-1 rounded-full text-sm transform rotate-12">
                            <Star className="w-4 h-4 inline-block mr-1 -mt-1" />
                            Best Value
                        </div>
                    )}
                    
                    {/* Tier Header */}
                    <div className="text-center mb-4">
                        <h3 className="text-2xl font-bold text-gray-800">{tier.name}</h3>
                        <p className="text-gray-500">{tier.subtitle}</p>
                    </div>

                    {/* Price */}
                    <div className="text-center my-4">
                        <span className="text-4xl font-bold">{tier.price}</span>
                        {tier.priceDetail && <span className="text-gray-500">{tier.priceDetail}</span>}
                    </div>
                    
                    <hr className="my-6" />

                    {/* Features List */}
                    <ul className="space-y-3 my-4 flex-grow">
                        {tier.features.map(feature => (
                            <li key={feature} className="flex items-start">
                                <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-1" />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>

                    {/* Action Button */}
                    <Button 
                        disabled={tier.isCurrent} 
                        className="w-full mt-4"
                        variant={tier.isFeatured ? 'primary' : 'secondary'}
                    >
                        {tier.isCurrent ? 'Your Current Plan' : 'Select Plan'}
                    </Button>
                </Card>
            ))}
        </div>
    );
}
