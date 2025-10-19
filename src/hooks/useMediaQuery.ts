import { useState, useEffect } from 'react';

/**
 * Custom hook to match media queries
 * @param query - CSS media query string (e.g., "(max-width: 767px)")
 * @returns boolean indicating if the media query matches
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    // Set initial value
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    // Create listener for changes
    const listener = () => setMatches(media.matches);

    // Use addEventListener for modern browsers
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

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
