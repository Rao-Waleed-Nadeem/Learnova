import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { StudentUser } from '../../types';

interface SignInPageProps {
  onSignInSuccess: (user: StudentUser) => void;
  onNavigateToRegister: () => void;
  onSwitchToTeacher?: () => void;
  onSwitchToAdmin?: () => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({
  onSignInSuccess,
  onNavigateToRegister,
  onSwitchToTeacher,
  onSwitchToAdmin,
}) => {
  const [email, setEmail] = useState('a.rivera@learnova.edu');
  const [password, setPassword] = useState('learnova2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please provide both your university email and password.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      // Validated student credentials
      onSignInSuccess({
        id: 'std-alex',
        name: 'Alex Rivera',
        email: email.trim(),
        avatar: 'AR',
        role: 'student',
        bio: 'Computer Science undergraduate passionate about systems software and algorithms.',
        joinDate: '2026-09-15',
        preferences: {
          theme: 'light',
          leaderboardOptIn: true,
          emailNotifications: true,
        },
      });
    }, 450);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0F1218] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold text-xl shadow-md mb-4">
          L
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Welcome back to Learnova
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Sign in to your student account to resume your adaptive curriculum
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-[#181C24] py-8 px-6 sm:px-8 shadow-sm border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                University Email Address
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@learnova.edu"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E232E] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                  Forgot password?
                </span>
              </div>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Learning Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
              Demo Student Profile Preloaded:
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Alex Rivera (CS Undergrad)</span>
            </div>
          </div>
        </div>

        {/* Footer Links: Register & Switch to Teacher */}
        <div className="mt-6 text-center space-y-2 text-xs">
          <p className="text-gray-600 dark:text-gray-400">
            Don't have a student account yet?{' '}
            <button
              type="button"
              onClick={onNavigateToRegister}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Create an account
            </button>
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs">
            {onSwitchToTeacher && (
              <button
                type="button"
                onClick={onSwitchToTeacher}
                className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 underline cursor-pointer"
              >
                Teacher Portal
              </button>
            )}
            {onSwitchToAdmin && (
              <button
                type="button"
                onClick={onSwitchToAdmin}
                className="text-purple-600 hover:text-purple-800 dark:text-purple-400 font-semibold underline cursor-pointer"
              >
                Administrator Portal
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
