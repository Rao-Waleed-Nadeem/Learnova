import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { StudentUser } from '../../types';

interface CreateAccountPageProps {
  onRegisterSuccess: (user: StudentUser) => void;
  onNavigateToSignIn: () => void;
}

export const CreateAccountPage: React.FC<CreateAccountPageProps> = ({
  onRegisterSuccess,
  onNavigateToSignIn,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required registration fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const initials = fullName
        .trim()
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      const newStudent: StudentUser = {
        id: `std-${Date.now()}`,
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        avatar: initials,
        role: 'student',
        bio: 'Enthusiastic learner at Learnova.',
        joinDate: new Date().toISOString().split('T')[0],
        preferences: {
          theme: 'light',
          leaderboardOptIn: true,
          emailNotifications: true,
        },
      };

      onRegisterSuccess(newStudent);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0F1218] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold text-xl shadow-md mb-4">
          L
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Create Student Account
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Join Learnova to start your personalized, adaptive learning journey
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-[#181C24] py-8 px-6 sm:px-8 shadow-sm border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jordan Reed"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E232E] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                University Email Address
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan@learnova.edu"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E232E] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-pass" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reg-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="block w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E232E] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="reg-confirm" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                Confirm Password
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E232E] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Register & Begin Learning</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onNavigateToSignIn}
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};
