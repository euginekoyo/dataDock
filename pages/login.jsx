
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext'; // Adjust path as needed
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth(); // Use AuthProvider's login function

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('Login: Attempting login with', { email });
      const result = await login(email, password); // Use AuthProvider's login
      if (result.success) {
        console.log('Login: Redirecting to /dashboard');
        await router.push('/'); // Redirect to dashboard
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      console.error('Login: Error during login', err.message);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-50 to-pink-900">

        {/* Login card */}
        <div className="relative backdrop-blur-xl bg-white border border-white/20 rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4 transition-all duration-300 hover:bg-white/15 hover:border-white/30">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-6 shadow-lg">
              <Lock className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-3xl font-bold text-slate-700 mb-2">Welcome Back</h1>
            <p className="text-slate-500">Sign in to your account</p>
          </div>

          {/* Error message */}
          {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl backdrop-blur-sm">
                <p className="text-black text-sm text-center">{error}</p>
              </div>
          )}

          {/* Form */}
          <div className="space-y-6">
            {/* Email field */}
            <div className="relative">
              <label className="block text-slate-500 text-sm font-medium mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-800" />
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/10 border border-black rounded-2xl text-black placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                    placeholder="Enter your email"
                    required
                />
              </div>
            </div>

            {/* Password field */}
            <div className="relative">
              <label className="block text-slate-500 text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-800" />
                <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-white/10 border border-black rounded-2xl text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                    placeholder="Enter your password"
                    required
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-4 px-6 rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <a href="#" className="text-white/70 hover:text-white text-sm transition-colors">
              Forgot your password?
            </a>
          </div>
        </div>
      </div>
  );
}
