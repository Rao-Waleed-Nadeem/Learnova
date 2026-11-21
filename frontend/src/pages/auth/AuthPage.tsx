import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  X,
  Check,
} from 'lucide-react';
import { authApi, UserResponse } from '../../services/api/authApi';
import { CuteAuthAvatar } from '../../components/auth/CuteAuthAvatar';

interface AuthPageProps {
  initialMode?: 'signin' | 'register';
  onAuthSuccess: (user: UserResponse, token: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'signin',
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'register'>(initialMode);
  
  // Sign In State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register State
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Focus tracking for Cute Mascot Avatar
  const [focusField, setFocusField] = useState<'none' | 'email' | 'password' | 'confirm_password'>('none');

  // Status & Error
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

  // Track fast demo fill button click animation feedback
  const [activeFilledRole, setActiveFilledRole] = useState<'student' | 'teacher' | 'admin' | null>(null);

  // Initialize real Google Identity Services if client ID is provided in environment
  useEffect(() => {
    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            if (response?.credential) {
              setIsGoogleSubmitting(true);
              try {
                const res = await authApi.loginWithGoogle({
                  credential: response.credential,
                });
                let activeUser = res.user;
                if (!activeUser) {
                  activeUser = await authApi.getMe();
                }
                onAuthSuccess(activeUser, res.access_token);
              } catch (err: any) {
                setError(err.message || 'Google verification failed.');
              } finally {
                setIsGoogleSubmitting(false);
              }
            }
          },
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [onAuthSuccess]);

  // Fast demo account loader with tactile button flash
  const fillDemoAccount = (role: 'student' | 'teacher' | 'admin') => {
    setError(null);
    setMode('signin');
    setActiveFilledRole(role);
    setTimeout(() => setActiveFilledRole(null), 1200);

    if (role === 'student') {
      setEmail('student@learnova.edu');
      setPassword('student123');
    } else if (role === 'teacher') {
      setEmail('teacher@learnova.edu');
      setPassword('teacher123');
    } else {
      setEmail('admin@learnova.edu');
      setPassword('admin123');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide both your university email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authApi.login({
        email: email.trim().toLowerCase(),
        password,
      });

      let activeUser = res.user;
      if (!activeUser) {
        activeUser = await authApi.getMe();
      }

      onAuthSuccess(activeUser, res.access_token);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your email and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!regFullName.trim() || !regEmail.trim() || !regPassword) {
      setError('Please fill in all required registration fields.');
      return;
    }

    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authApi.register({
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        full_name: regFullName.trim(),
      });

      let activeUser = res.user;
      if (!activeUser) {
        activeUser = await authApi.getMe();
      }

      onAuthSuccess(activeUser, res.access_token);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try a different email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google Sign-In Handler
  const handleGoogleClick = () => {
    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    if (clientId && (window as any).google?.accounts?.id) {
      // Trigger native Google prompt
      (window as any).google.accounts.id.prompt();
    } else {
      // Open instant Google account selector
      setShowGoogleModal(true);
    }
  };

  const executeGoogleAuth = async (googleEmail: string, googleName: string, avatarUrl?: string) => {
    setError(null);
    setIsGoogleSubmitting(true);
    setShowGoogleModal(false);

    try {
      const res = await authApi.loginWithGoogle({
        credential: `dev-google-token:${googleEmail}:${googleName}`,
        email: googleEmail,
        full_name: googleName,
        avatar_url: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${googleEmail}`,
      });

      let activeUser = res.user;
      if (!activeUser) {
        activeUser = await authApi.getMe();
      }

      onAuthSuccess(activeUser, res.access_token);
    } catch (err: any) {
      setError(err.message || 'Google authentication failed. Please try again.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail.trim()) return;
    const name = customGoogleName.trim() || customGoogleEmail.split('@')[0].replace('.', ' ');
    executeGoogleAuth(customGoogleEmail.trim().toLowerCase(), name);
  };

  const currentEmailLength = mode === 'signin' ? email.length : regEmail.length;
  const currentShowPassword = mode === 'signin' ? showPassword : showRegPassword;

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0F1218] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      {/* Centered Split-Screen Card with Flexible Responsive Dimensions */}
      <div className="w-full max-w-5xl bg-white dark:bg-[#181C24] rounded-3xl shadow-2xl border border-[#D9DEE7] dark:border-[#2D3545] overflow-hidden flex flex-col md:flex-row min-h-[690px] transition-all duration-300">
        
        {/* ===================== LEFT SECTION: CLEAN EDUCATION IMAGE ===================== */}
        <div className="md:w-1/2 relative overflow-hidden min-h-[300px] md:min-h-[690px] bg-slate-100 dark:bg-slate-900">
          <img
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=85"
            alt="Higher Education & Collaborative Learning"
            className="w-full h-full object-cover"
          />
          {/* Subtle, elegant translucent brand tag in the top corner */}
          <div className="absolute top-6 left-6 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-black/40 backdrop-blur-md border border-white/20 text-white shadow-lg">
            <img src="/learnova-logo.png" alt="Learnova" className="h-7 w-auto object-contain" />
            <span className="font-extrabold text-base tracking-tight text-white leading-none">
              Learnova
            </span>
          </div>
        </div>

        {/* ===================== RIGHT SECTION: INTERACTIVE FORM & CUTE AVATAR ===================== */}
        <div className="md:w-1/2 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white dark:bg-[#181C24] overflow-y-auto">
          <div>
            {/* Form Toggle Header (Sign In vs Create Account) with Smooth Animated Slider */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
              <div className="relative flex items-center p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('signin');
                  }}
                  className={`relative z-10 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer ${
                    mode === 'signin'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {mode === 'signin' && (
                    <motion.div
                      layoutId="activeAuthTab"
                      className="absolute inset-0 bg-white dark:bg-[#1F2937] rounded-lg shadow-xs"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('register');
                  }}
                  className={`relative z-10 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer ${
                    mode === 'register'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {mode === 'register' && (
                    <motion.div
                      layoutId="activeAuthTab"
                      className="absolute inset-0 bg-white dark:bg-[#1F2937] rounded-lg shadow-xs"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">Create Account</span>
                </button>
              </div>

              <span className="text-xs text-gray-400 hidden sm:inline">
                {mode === 'signin' ? 'Access your dashboard' : 'Student self-registration'}
              </span>
            </div>

            {/* Interactive Cute Scholar Avatar ("Nova") that Closes Eyes during Password Entry */}
            <CuteAuthAvatar
              focusField={focusField}
              showPassword={currentShowPassword}
              emailLength={currentEmailLength}
              isSubmitting={isSubmitting || isGoogleSubmitting}
              hasError={Boolean(error)}
            />

            {/* Title & Subtitle */}
            <div className="mt-2 mb-4 text-center">
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {mode === 'signin' ? 'Welcome Back' : 'Begin Your Journey'}
              </h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {mode === 'signin'
                  ? 'Sign in with your Google account or institutional email.'
                  : 'Register a student account to get personalized adaptive learning.'}
              </p>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-medium"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ===================== GOOGLE / GMAIL SIGN IN BUTTON ===================== */}
            <div className="mb-4">
              <motion.button
                type="button"
                whileHover={{ scale: 1.015, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleClick}
                disabled={isSubmitting || isGoogleSubmitting}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E232E] hover:bg-gray-50 dark:hover:bg-[#252B38] text-gray-800 dark:text-gray-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-60"
              >
                {isGoogleSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                    <span>Signing in with Google...</span>
                  </>
                ) : (
                  <>
                    {/* Multicolored Authentic Google 'G' SVG Logo */}
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google (Gmail)</span>
                  </>
                )}
              </motion.button>

              {/* Aesthetic Divider */}
              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-gray-200 dark:border-gray-800 w-full" />
                <span className="bg-white dark:bg-[#181C24] px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  or with email
                </span>
                <div className="border-t border-gray-200 dark:border-gray-800 w-full" />
              </div>
            </div>

            {/* ===================== FORM SLOT: SIGN IN / REGISTER ===================== */}
            <div className="flex flex-col justify-center">
              {/* SIGN IN FORM */}
              {mode === 'signin' && (
                <form key="signin" onSubmit={handleSignIn} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="auth-email"
                      className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1"
                    >
                      University Email
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="auth-email"
                        type="email"
                        required
                        value={email}
                        onFocus={() => setFocusField('email')}
                        onBlur={() => setFocusField('none')}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@learnova.edu"
                        className="block w-full pl-10 pr-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E232E] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="auth-password"
                        className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300"
                      >
                        Password
                      </label>
                    </div>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onFocus={() => setFocusField('password')}
                        onBlur={() => setFocusField('none')}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pl-10 pr-10 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E232E] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.88 }}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </motion.button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-700 cursor-pointer"
                      />
                      <span className="text-gray-600 dark:text-gray-400 font-medium">
                        Stay signed in across reloads
                      </span>
                    </label>
                  </div>

                  {/* Animated Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={isSubmitting || isGoogleSubmitting}
                    whileHover={{ scale: 1.015, y: -1 }}
                    whileTap={{ scale: 0.985 }}
                    className="relative overflow-hidden w-full mt-1 py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to Learnova</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </form>
              )}

              {/* CREATE ACCOUNT FORM */}
              {mode === 'register' && (
                <form key="register" onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <label
                      htmlFor="reg-fullname"
                      className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Full Name
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-fullname"
                        type="text"
                        required
                        value={regFullName}
                        onFocus={() => setFocusField('none')}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="e.g. Alex Rivera"
                        className="block w-full pl-10 pr-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E232E] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="reg-email"
                      className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1"
                    >
                      University Email
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-email"
                        type="email"
                        required
                        value={regEmail}
                        onFocus={() => setFocusField('email')}
                        onBlur={() => setFocusField('none')}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="name@learnova.edu"
                        className="block w-full pl-10 pr-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E232E] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label
                        htmlFor="reg-pass"
                        className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Password
                      </label>
                      <div className="relative rounded-xl">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <input
                          id="reg-pass"
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          value={regPassword}
                          onFocus={() => setFocusField('password')}
                          onBlur={() => setFocusField('none')}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min 8 chars"
                          className="block w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E232E] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.88 }}
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                        >
                          {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </motion.button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="reg-confirm-pass"
                        className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Confirm
                      </label>
                      <div className="relative rounded-xl">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <input
                          id="reg-confirm-pass"
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          value={regConfirmPassword}
                          onFocus={() => setFocusField('confirm_password')}
                          onBlur={() => setFocusField('none')}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="block w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E232E] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Animated Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={isSubmitting || isGoogleSubmitting}
                    whileHover={{ scale: 1.015, y: -1 }}
                    whileTap={{ scale: 0.985 }}
                    className="w-full mt-1 py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Student Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </form>
              )}
            </div>

            {/* Quick 1-Click Demo Profiles with Tactile Bounce & Colored Glow */}
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-2 text-center">
                Quick Demo One-Click Fill
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => fillDemoAccount('student')}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                    activeFilledRole === 'student'
                      ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900/50 ring-2 ring-emerald-400 shadow-sm'
                      : 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/80'
                  }`}
                  title="Fill Alex Rivera (Student)"
                >
                  <span className="font-bold flex items-center gap-1">
                    Student
                    {activeFilledRole === 'student' && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                  </span>
                  <span className="text-[10px] opacity-75">Alex R.</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => fillDemoAccount('teacher')}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                    activeFilledRole === 'teacher'
                      ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-400 shadow-sm'
                      : 'border-blue-200 dark:border-blue-800/60 bg-blue-50/60 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 hover:bg-blue-100/80'
                  }`}
                  title="Fill Elena Rostova (Teacher)"
                >
                  <span className="font-bold flex items-center gap-1">
                    Teacher
                    {activeFilledRole === 'teacher' && <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                  </span>
                  <span className="text-[10px] opacity-75">Elena R.</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => fillDemoAccount('admin')}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                    activeFilledRole === 'admin'
                      ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/50 ring-2 ring-purple-400 shadow-sm'
                      : 'border-purple-200 dark:border-purple-800/60 bg-purple-50/60 dark:bg-purple-950/20 text-purple-800 dark:text-purple-300 hover:bg-purple-100/80'
                  }`}
                  title="Fill Sarah Connor (Admin)"
                >
                  <span className="font-bold flex items-center gap-1">
                    Admin
                    {activeFilledRole === 'admin' && <Check className="w-3 h-3 text-purple-600 dark:text-purple-400" />}
                  </span>
                  <span className="text-[10px] opacity-75">Sarah C.</span>
                </motion.button>
              </div>
            </div>
          </div>

          {/* Bottom Switch Link */}
          <div className="mt-5 text-center text-xs text-gray-500 dark:text-gray-400">
            {mode === 'signin' ? (
              <p>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('register');
                  }}
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Create student account
                </button>
              </p>
            ) : (
              <p>
                Already registered with Learnova?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('signin');
                  }}
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===================== GOOGLE ACCOUNT SELECTION MODAL (DEV & DEMO READY) ===================== */}
      <AnimatePresence>
        {showGoogleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white dark:bg-[#1E232E] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white">
                    Sign in with Google
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Choose a Google account to continue to <strong>Learnova</strong>.
              </p>

              {/* Fast 1-Click Google Profile Options */}
              <div className="mt-4 space-y-2">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    executeGoogleAuth(
                      'alex.rivera@gmail.com',
                      'Alex Rivera',
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
                    )
                  }
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-gray-50/60 dark:bg-gray-800/50 text-left transition cursor-pointer"
                >
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                    alt="Alex Rivera"
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/20"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 dark:text-white">Alex Rivera</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">alex.rivera@gmail.com</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    Student
                  </span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    executeGoogleAuth(
                      'elena.rostova@gmail.com',
                      'Elena Rostova',
                      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80'
                    )
                  }
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-gray-50/60 dark:bg-gray-800/50 text-left transition cursor-pointer"
                >
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80"
                    alt="Elena Rostova"
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/20"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 dark:text-white">Elena Rostova</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">elena.rostova@gmail.com</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    Teacher
                  </span>
                </motion.button>
              </div>

              {/* Or custom Google account */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                <form onSubmit={handleCustomGoogleSubmit} className="space-y-2">
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                    Or enter another Gmail account:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="yourname@gmail.com"
                      value={customGoogleEmail}
                      onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C24] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                    >
                      Continue
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
