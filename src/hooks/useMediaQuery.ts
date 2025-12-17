import { useState, useEffect } from 'react';

/**
 * Custom hook to match media queries
 * @param query - CSS media query string (e.g., "(max-width: 767px)")
 * @returns boolean indicating if the media query matches
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => {
    // Initialize from window.matchMedia to prevent hydration mismatch
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(query);

    // Set initial value (in case window wasn't available during useState init)
    setMatches(media.matches);

    // Create listener for changes
    const listener = () => setMatches(media.matches);

    // Use addEventListener for modern browsers
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [query]); // Only query in dependencies, not matches

  return matches;
};

/**
 * Convenience hook for checking if viewport is mobile size
 * Uses Tailwind's default md breakpoint (768px)
 * @returns boolean indicating if viewport is mobile size
 */
export const useIsMobile = (): boolean => {
  return useMediaQuery('(max-width: 767px)');
};

/**
 * Convenience hook for checking if viewport is small mobile size
 * Uses Tailwind's default sm breakpoint (640px)
 * @returns boolean indicating if viewport is small mobile size
 */
export const useIsSmallMobile = (): boolean => {
  return useMediaQuery('(max-width: 639px)');
};

/**
 * Convenience hook for responsive card sizing
 * Returns 'mobile' for <640px, 'tablet' for 640-767px, 'desktop' for 768px+
 */
export const useScreenSize = (): 'mobile' | 'tablet' | 'desktop' => {
  const isSmallMobile = useMediaQuery('(max-width: 639px)');
  const isMobile = useMediaQuery('(max-width: 767px)');

  if (isSmallMobile) return 'mobile';
  if (isMobile) return 'tablet';
  return 'desktop';
};
