import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface CuteAuthAvatarProps {
  /** Field currently receiving user keyboard focus */
  focusField: 'none' | 'email' | 'password' | 'confirm_password';
  /** Whether the user toggled password visibility to plain text */
  showPassword?: boolean;
  /** Length of characters in email field to dynamically steer eye gaze */
  emailLength?: number;
  /** Whether form submission is currently in-flight */
  isSubmitting?: boolean;
  /** Whether an authentication or validation error occurred */
  hasError?: boolean;
}

export const CuteAuthAvatar: React.FC<CuteAuthAvatarProps> = ({
  focusField,
  showPassword = false,
  emailLength = 0,
  isSubmitting = false,
  hasError = false,
}) => {
  // Natural blinking interval
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    // Only blink when eyes are open (not covering eyes)
    if (focusField === 'password' || focusField === 'confirm_password') {
      return;
    }

    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 160);
    }, 3600);

    return () => clearInterval(blinkInterval);
  }, [focusField]);

  // Determine current mascot posture
  const isCoveringEyes = (focusField === 'password' || focusField === 'confirm_password') && !showPassword;
  const isPeeking = (focusField === 'password' || focusField === 'confirm_password') && showPassword;
  const isLookingAtEmail = focusField === 'email';

  // Calculate horizontal pupil shift based on email text length (clamped between -4 and +4)
  const pupilX = isLookingAtEmail ? Math.min(Math.max((emailLength - 12) * 0.4, -4), 4) : 0;
  const pupilY = isLookingAtEmail ? 4 : 0;

  return (
    <div className="flex flex-col items-center justify-center select-none py-1">
      <motion.div
        className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center"
        animate={
          isSubmitting
            ? { y: [0, -6, 0, -4, 0], transition: { repeat: Infinity, duration: 1.2 } }
            : hasError
            ? { rotate: [-2, 2, -2, 2, 0], transition: { duration: 0.4 } }
            : { y: [0, -2, 0], transition: { repeat: Infinity, duration: 3.5, ease: 'easeInOut' } }
        }
      >
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full drop-shadow-md overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Body Gradient */}
            <linearGradient id="owlBodyGrad" x1="80" y1="30" x2="80" y2="150" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#3730A3" />
            </linearGradient>

            {/* Belly Gradient */}
            <linearGradient id="owlBellyGrad" x1="80" y1="75" x2="80" y2="140" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#EEF2FF" />
              <stop offset="100%" stopColor="#E0E7FF" />
            </linearGradient>

            {/* Wing Gradient */}
            <linearGradient id="owlWingGrad" x1="0" y1="0" x2="30" y2="45" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#312E81" />
            </linearGradient>

            {/* Cap Gradient */}
            <linearGradient id="capGrad" x1="40" y1="15" x2="120" y2="35" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
          </defs>

          {/* Shadow beneath avatar */}
          <ellipse cx="80" cy="148" rx="42" ry="7" fill="rgba(15, 23, 42, 0.12)" />

          {/* Little Yellow Owl Feet */}
          <ellipse cx="65" cy="144" rx="8" ry="4.5" fill="#F59E0B" />
          <ellipse cx="95" cy="144" rx="8" ry="4.5" fill="#F59E0B" />

          {/* Main Body */}
          <motion.rect
            x="32"
            y="38"
            width="96"
            height="106"
            rx="48"
            fill="url(#owlBodyGrad)"
            stroke="#312E81"
            strokeWidth="2.5"
          />

          {/* Belly Plume */}
          <motion.ellipse
            cx="80"
            cy="104"
            rx="34"
            ry="38"
            fill="url(#owlBellyGrad)"
            stroke="#C7D2FE"
            strokeWidth="1.5"
          />

          {/* Decorative Little Feathers on Belly */}
          <path d="M72 96 Q80 102 88 96" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
          <path d="M68 110 Q80 116 92 110" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
          <path d="M74 124 Q80 130 86 124" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />

          {/* Cute Rosy Cheeks (Blushing when shy / covering eyes) */}
          <motion.circle
            cx="48"
            cy="84"
            r="7"
            fill="#FB7185"
            animate={{ opacity: isCoveringEyes ? 0.9 : 0.45, scale: isCoveringEyes ? 1.25 : 1 }}
            transition={{ duration: 0.3 }}
          />
          <motion.circle
            cx="112"
            cy="84"
            r="7"
            fill="#FB7185"
            animate={{ opacity: isCoveringEyes ? 0.9 : 0.45, scale: isCoveringEyes ? 1.25 : 1 }}
            transition={{ duration: 0.3 }}
          />

          {/* ===================== EYES & GLASSES LAYER ===================== */}
          {/* Eyeball Backgrounds */}
          <circle cx="58" cy="74" r="17" fill="#FFFFFF" stroke="#312E81" strokeWidth="2" />
          <circle cx="102" cy="74" r="17" fill="#FFFFFF" stroke="#312E81" strokeWidth="2" />

          {/* LEFT EYE */}
          <g>
            {isCoveringEyes ? (
              // Shy Closed Eye Left ( ^ shape )
              <motion.path
                d="M48 76 Q58 66 68 76"
                stroke="#1E1B4B"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.2 }}
              />
            ) : isBlinking ? (
              // Blinking Horizontal Slit
              <line x1="48" y1="74" x2="68" y2="74" stroke="#1E1B4B" strokeWidth="3" strokeLinecap="round" />
            ) : (
              // Open Eye with Pupil + Highlights
              <motion.g
                animate={{ x: pupilX, y: pupilY }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              >
                <circle cx="58" cy="74" r="9" fill="#1E1B4B" />
                <circle cx="55" cy="71" r="3.2" fill="#FFFFFF" />
                <circle cx="61" cy="77" r="1.5" fill="#FFFFFF" />
              </motion.g>
            )}
          </g>

          {/* RIGHT EYE */}
          <g>
            {isCoveringEyes ? (
              // Shy Closed Eye Right ( ^ shape )
              <motion.path
                d="M92 76 Q102 66 112 76"
                stroke="#1E1B4B"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.2 }}
              />
            ) : isPeeking ? (
              // Peeking Right Eye: Open wide with curious highlight!
              <motion.g animate={{ x: 2, y: 1 }} transition={{ duration: 0.2 }}>
                <circle cx="102" cy="74" r="9.5" fill="#1E1B4B" />
                <circle cx="99" cy="70" r="3.5" fill="#FFFFFF" />
                <circle cx="105" cy="77" r="1.8" fill="#FFFFFF" />
              </motion.g>
            ) : isBlinking ? (
              // Blinking Horizontal Slit
              <line x1="92" y1="74" x2="112" y2="74" stroke="#1E1B4B" strokeWidth="3" strokeLinecap="round" />
            ) : (
              // Normal Open Eye
              <motion.g
                animate={{ x: pupilX, y: pupilY }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              >
                <circle cx="102" cy="74" r="9" fill="#1E1B4B" />
                <circle cx="99" cy="71" r="3.2" fill="#FFFFFF" />
                <circle cx="105" cy="77" r="1.5" fill="#FFFFFF" />
              </motion.g>
            )}
          </g>

          {/* Round Scholar Spectacles Frame */}
          <circle cx="58" cy="74" r="19" fill="none" stroke="#F59E0B" strokeWidth="2.8" opacity="0.9" />
          <circle cx="102" cy="74" r="19" fill="none" stroke="#F59E0B" strokeWidth="2.8" opacity="0.9" />
          {/* Glasses Bridge */}
          <path d="M77 72 Q80 69 83 72" stroke="#F59E0B" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Glasses Temples (to ears) */}
          <line x1="39" y1="74" x2="33" y2="72" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <line x1="121" y1="74" x2="127" y2="72" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />

          {/* Cute Little Beak */}
          <polygon points="76,82 84,82 80,92" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />

          {/* ===================== GRADUATION CAP (MORTARBOARD) ===================== */}
          <g>
            {/* Cap Skull Cap */}
            <ellipse cx="80" cy="38" rx="28" ry="10" fill="#0F172A" />
            {/* Diamond Board */}
            <polygon
              points="80,18 128,32 80,44 32,32"
              fill="url(#capGrad)"
              stroke="#334155"
              strokeWidth="2"
            />
            {/* Cap Center Button */}
            <ellipse cx="80" cy="31" rx="4" ry="2.5" fill="#F59E0B" />
            {/* Hanging Golden Tassel */}
            <motion.path
              d="M80 32 Q98 34 104 46"
              stroke="#F59E0B"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
              animate={isSubmitting ? { rotate: [-5, 5, -5] } : {}}
              transition={{ repeat: Infinity, duration: 0.8 }}
            />
            <motion.circle cx="104" cy="48" r="3" fill="#F59E0B" />
          </g>

          {/* ===================== ANIMATED WINGS / PAWS ===================== */}
          {/* LEFT WING / PAW */}
          <motion.g
            initial={false}
            animate={
              isCoveringEyes
                ? { x: 26, y: -24, rotate: 42 } // Raised over left eye
                : isPeeking
                ? { x: 22, y: -14, rotate: 32 } // Partially covering left
                : { x: 0, y: 0, rotate: 0 }     // Resting at side
            }
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            {/* Wing Shape */}
            <path
              d="M32 78 C20 86 16 112 28 126 C38 138 50 120 46 102 Z"
              fill="url(#owlWingGrad)"
              stroke="#312E81"
              strokeWidth="2"
            />
            {/* Paw Pads when raised */}
            {isCoveringEyes && (
              <circle cx="36" cy="116" r="3.5" fill="#C7D2FE" opacity="0.8" />
            )}
          </motion.g>

          {/* RIGHT WING / PAW */}
          <motion.g
            initial={false}
            animate={
              isCoveringEyes
                ? { x: -26, y: -24, rotate: -42 } // Raised over right eye
                : isPeeking
                ? { x: 0, y: 12, rotate: -10 }    // Lowers right wing to peek!
                : { x: 0, y: 0, rotate: 0 }      // Resting at side
            }
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            {/* Wing Shape */}
            <path
              d="M128 78 C140 86 144 112 132 126 C122 138 110 120 114 102 Z"
              fill="url(#owlWingGrad)"
              stroke="#312E81"
              strokeWidth="2"
            />
            {/* Paw Pads when raised */}
            {isCoveringEyes && (
              <circle cx="124" cy="116" r="3.5" fill="#C7D2FE" opacity="0.8" />
            )}
          </motion.g>
        </svg>
      </motion.div>

      {/* Playful Interactive Subtitle Speech Bubble */}
      <AnimatePresence mode="wait">
        {isCoveringEyes ? (
          <motion.div
            key="covering"
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            className="mt-1 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 shadow-xs"
          >
            <span>🙈</span>
            <span>Nova is looking away so your password is safe!</span>
          </motion.div>
        ) : isPeeking ? (
          <motion.div
            key="peeking"
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            className="mt-1 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 shadow-xs"
          >
            <span>👀</span>
            <span>Psst, Nova sees you revealed it!</span>
          </motion.div>
        ) : isLookingAtEmail ? (
          <motion.div
            key="email"
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            className="mt-1 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-[11px] font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5 shadow-xs"
          >
            <span>🦉</span>
            <span>Enter your university or Google credentials</span>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            className="mt-1 px-2.5 py-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1"
          >
            <span>✨</span>
            <span>Welcome to Learnova</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
