import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon } from 'lucide-react';

// This would typically be in its own file, e.g., /api/auth.js
const registerUserApi = async (userData) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Something went wrong');
  }

  return response.json(); // Returns the { token }
};


export default function SignupPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'student' // Default role
    });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const { name, email, password, role } = formData;
    const logoUrl = "https://i.ibb.co/L1A7fM1/logo.jpg";

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            const data = await registerUserApi(formData);
            console.log('Registration successful:', data);
            setSuccess('Registration successful! Please proceed to login.');
            // In a real app, you might store the token and redirect:
            // localStorage.setItem('token', data.token);
            // window.location.href = '/dashboard'; 
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 min-h-screen flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
                    <div className="text-center mb-8">
                         <img src={logoUrl} alt="StartRight Tutoring Logo" className="w-40 mx-auto mb-6" />
                        <h1 className="text-3xl font-bold text-gray-800">Create Your Account</h1>
                        <p className="text-gray-500 mt-2">Join the StartRight community.</p>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <div className="mt-1 relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input name="name" type="text" value={name} onChange={onChange} required className="w-full pl-10 pr-4 py-2.5 border rounded-lg" placeholder="John Doe" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email Address</label>
                            <div className="mt-1 relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input name="email" type="email" value={email} onChange={onChange} required className="w-full pl-10 pr-4 py-2.5 border rounded-lg" placeholder="you@example.com" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <div className="mt-1 relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input name="password" type="password" value={password} onChange={onChange} required minLength="6" className="w-full pl-10 pr-4 py-2.5 border rounded-lg" placeholder="••••••••" />
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">I am a...</label>
                            <select name="role" value={role} onChange={onChange} className="mt-1 block w-full pl-3 pr-10 py-2.5 border rounded-lg">
                                <option value="student">Student</option>
                                <option value="parent">Parent</option>
                                <option value="tutor">Tutor</option>
                            </select>
                        </div>
                        {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
                        {success && <div className="p-3 bg-green-100 text-green-700 rounded-lg">{success}</div>}
                        <div>
                            <button type="submit" className="w-full flex justify-center py-3 px-4 border rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                                Sign Up
                            </button>
                        </div>
                    </form>
                    <p className="mt-8 text-center text-sm text-gray-500">
                        Already have an account?{' '}
                        <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                           Sign In
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
