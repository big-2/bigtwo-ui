/**
 * JWT utility functions for safe parsing and extraction
 */

/**
 * Extracts session_id from JWT token with proper error handling
 * 
 * @param jwt - The JWT token string
 * @returns The session_id from the JWT payload, or null if parsing fails
 * 
 * @example
 * const sessionId = extractSessionIdFromJWT(token);
 * if (sessionId) {
 *   // Use session ID
 * } else {
 *   // Handle invalid JWT
 * }
 */
export const extractSessionIdFromJWT = (jwt: string): string | null => {
  try {
    if (!jwt || typeof jwt !== 'string') {
      console.error('[JWT] Invalid JWT: not a string or empty');
      return null;
    }
    
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      console.error('[JWT] Invalid JWT format: expected 3 parts, got', parts.length);
      return null;
    }
    
    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]));
    
    if (!payload.session_id) {
      console.error('[JWT] JWT payload missing session_id field');
      return null;
    }
    
    return payload.session_id;
  } catch (error) {
    console.error('[JWT] Failed to parse JWT:', error);
    return null;
  }
};

/**
 * Type definition for JWT payload structure
 */
export interface JWTPayload {
  session_id: string;
  username: string;
  exp: number;
  iat: number;
}

