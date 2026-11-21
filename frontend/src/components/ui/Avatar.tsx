import React, { useState, useEffect } from 'react';
import { isAvatarImageUrl, getAvatarFallbackInitials } from '../../utils/avatarUtils';

export interface AvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
  imgClassName?: string;
  fallbackText?: string;
  alt?: string;
}

export { isAvatarImageUrl, getAvatarFallbackInitials };

/**
 * Robust User Avatar component for Learnova.
 * Handles:
 * 1. Image URLs (http, https, data:image, /path)
 * 2. Automatic error fallback on 404 / broken remote image links -> flips to initials
 * 3. 2-letter uppercase initials extraction with null/empty safety
 * 4. Stored initials in `avatar` field (e.g. 'SC', 'JL')
 */
export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  className = 'w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs',
  imgClassName,
  fallbackText,
  alt,
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state if image source changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const isUrl = isAvatarImageUrl(src);
  const safeInitials =
    (!isUrl && src && src.trim()) ||
    getAvatarFallbackInitials(name, fallbackText);

  const shouldRenderImage = isUrl && !hasError;

  // Infer rounded class from container className if imgClassName not specified
  const roundedClass = className.includes('rounded-2xl')
    ? 'rounded-2xl'
    : className.includes('rounded-xl')
    ? 'rounded-xl'
    : className.includes('rounded-lg')
    ? 'rounded-lg'
    : 'rounded-full';

  return (
    <div
      className={`${className} flex items-center justify-center shrink-0 overflow-hidden select-none`}
    >
      {shouldRenderImage ? (
        <img
          src={src!}
          alt={alt || name || 'Avatar'}
          className={imgClassName || `w-full h-full ${roundedClass} object-cover`}
          onError={() => setHasError(true)}
        />
      ) : (
        <span>{safeInitials}</span>
      )}
    </div>
  );
};
