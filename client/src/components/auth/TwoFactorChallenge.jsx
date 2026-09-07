import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import { verifyTwoFactorLogin } from '../../api/auth.js';
import Button from '../common/Button.jsx';

/**
 * Second step of a 2FA-gated login. Renders after the credential check returns
 * `twoFactorRequired`. Collects the 6-digit authenticator code, exchanges the
 * challenge token for real session tokens, and hands the result back to the
 * parent login page (which owns token storage + navigation).
 *
 * @param {object} props
 * @param {string} props.challengeToken - Short-lived token from /login.
 * @param {(data: object) => void} props.onSuccess - Receives { token, refreshToken, user }.
 * @param {() => void} props.onBack - Return to the credential form.
 */
export default function TwoFactorChallenge({ challengeToken, onSuccess, onBack }) {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleChange = (e) => {
        // Authenticator codes are numeric; strip everything else and cap at 6.
        const next = e.target.value.replace(/\D/g, '').slice(0, 6);
        setCode(next);
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (code.length !== 6) {
            setError('Enter the 6-digit code from your authenticator app.');
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            const data = await verifyTwoFactorLogin(challengeToken, code);
            onSuccess(data);
        } catch (err) {
            if (err.status === 401) {
                setError('Your sign-in session expired. Please enter your password again.');
            } else {
                setError(err.message || 'Verification failed. Please try again.');
            }
            setCode('');
            inputRef.current?.focus();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                        <ShieldCheck className="w-8 h-8 text-blue-600" aria-hidden="true" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Two-Factor Verification</h2>
                <p className="text-gray-500 mt-2">
                    Enter the 6-digit code from your authenticator app to finish signing in.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <div>
                    <label htmlFor="twofa-code" className="block text-sm font-medium text-gray-700">
                        Verification code
                    </label>
                    <input
                        id="twofa-code"
                        ref={inputRef}
                        name="code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={code}
                        onChange={handleChange}
                        placeholder="000000"
                        className="mt-1 w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {error && (
                    <div className="flex items-center p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <Button type="submit" isLoading={isLoading} className="w-full">
                    Verify &amp; Sign In
                </Button>
            </form>

            <button
                type="button"
                onClick={onBack}
                disabled={isLoading}
                className="mt-6 w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Back to sign in
            </button>
        </div>
    );
}
