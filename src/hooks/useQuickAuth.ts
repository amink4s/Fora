'use client';

import { useState, useEffect, useCallback } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

/**
 * Represents the current authenticated user state
 */
interface AuthenticatedUser {
  /** The user's Farcaster ID (FID) */
  fid: number;
}

/**
 * Possible authentication states for QuickAuth
 */
type QuickAuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

/**
 * Return type for the useQuickAuth hook
 */
interface UseQuickAuthReturn {
  /** Current authenticated user data, or null if not authenticated */
  authenticatedUser: AuthenticatedUser | null;
  /** Current authentication status */
  status: QuickAuthStatus;
  /** Function to initiate the sign-in process using QuickAuth */
  signIn: () => Promise<boolean>;
  /** Function to sign out and clear the current authentication state */
  signOut: () => Promise<void>;
  /** Function to retrieve the current authentication token */
  getToken: () => Promise<string | null>;
}

/**
 * Custom hook for managing QuickAuth authentication state
 *
 * This hook provides a complete authentication flow using Farcaster's QuickAuth:
 * - Automatically checks for existing authentication on mount
 * - Validates tokens with the server-side API
 * - Manages authentication state in memory (no persistence)
 * - Provides sign-in/sign-out functionality
 *
 * QuickAuth tokens are managed in memory only, so signing out of the Farcaster
 * client will automatically sign the user out of this mini app as well.
 *
 * @returns {UseQuickAuthReturn} Object containing user state and authentication methods
 *
 * @example
 * ```tsx
 * const { authenticatedUser, status, signIn, signOut } = useQuickAuth();
 *
 * if (status === 'loading') return <div>Loading...</div>;
 * if (status === 'unauthenticated') return <button onClick={signIn}>Sign In</button>;
 *
 * return (
 *   <div>
 *     <p>Welcome, FID: {authenticatedUser?.fid}</p>
 *     <button onClick={signOut}>Sign Out</button>
 *   </div>
 * );
 * ```
 */
export function useQuickAuth(): UseQuickAuthReturn {
  // Current authenticated user data
  const [authenticatedUser, setAuthenticatedUser] =
    useState<AuthenticatedUser | null>(null);
  // Current authentication status
  const [status, setStatus] = useState<QuickAuthStatus>('loading');

  /**
   * Validates a QuickAuth token with the server-side API
   *
   * @param {string} authToken - The JWT token to validate
   * @returns {Promise<AuthenticatedUser | null>} User data if valid, null otherwise
   */
  const validateTokenWithServer = async (
    authToken: string,
  ): Promise<AuthenticatedUser | null> => {
    try {
      const validationResponse = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: authToken }),
      });

      if (validationResponse.ok) {
        const responseData = await validationResponse.json();
        return responseData.user;
      }

      return null;
    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  };

  /**
   * Checks for existing authentication token and validates it on component mount
   * This runs automatically when the hook is first used
   */
  useEffect(() => {
    const checkExistingAuthentication = async () => {
      try {
        // Attempt to retrieve existing token from QuickAuth SDK
        const { token } = await sdk.quickAuth.getToken();

        if (token) {
          // Validate the token with our server-side API
          const validatedUserSession = await validateTokenWithServer(token);

          if (validatedUserSession) {
            // Token is valid, set authenticated state
            setAuthenticatedUser(validatedUserSession);
            setStatus('authenticated');
          } else {
            // Token is invalid or expired, clear authentication state
            setStatus('unauthenticated');
          }
        } else {
          // No existing token found, user is not authenticated
          setStatus('unauthenticated');
        }
      } catch (error) {
        console.error('Error checking existing authentication:', error);
        setStatus('unauthenticated');
      }
    };

    checkExistingAuthentication();
  }, []);

  /**
   * Initiates the QuickAuth sign-in process
   *
   * Uses sdk.quickAuth.getToken() to get a QuickAuth session token.
   * If there is already a session token in memory that hasn't expired,
   * it will be immediately returned, otherwise a fresh one will be acquired.
   *
   * @returns {Promise<boolean>} True if sign-in was successful, false otherwise
   */
  const signIn = useCallback(async (): Promise<boolean> => {
    try {
      setStatus('loading');

      // Try to get a QuickAuth session token. If the QuickAuth helper fails
      // (for example user previously declined a prompt or the frame blocked it),
      // fallback to invoking the Farcaster SignIn action which triggers the
      // client's sign-in flow.
      let token: string | undefined | null = null;
      try {
        const result = await sdk.quickAuth.getToken();
        token = result?.token;
      } catch (err) {
        console.warn('quickAuth.getToken failed, attempting fallback signIn action:', err);
        try {
          // Ask our backend for a QuickAuth nonce, then invoke the Farcaster
          // sign-in action with that nonce so the client can present a
          // proper SIWF/QuickAuth flow.
          try {
            const resp = await fetch('/api/auth/nonce');
            const json = await resp.json();
            const nonce = json?.nonce || json?.challenge || json?.data?.nonce;
            if (nonce) {
              await sdk.actions.signIn({ nonce });
            } else {
              // Fallback to calling signIn without a nonce if the endpoint
              // doesn't return one; the SDK may still prompt the user.
              await sdk.actions.signIn({} as any);
            }
          } catch (fetchErr) {
            console.warn('Failed to fetch nonce for signIn fallback:', fetchErr);
            // Still try to invoke signIn so the client may prompt the user.
            await sdk.actions.signIn({} as any);
          }
          // Try to get the token again after the user completes sign-in
          const retry = await sdk.quickAuth.getToken();
          token = retry?.token;
        } catch (err2) {
          console.warn('Fallback signIn action failed:', err2);
          token = null;
        }
      }

      if (token) {
        // Validate the token with our server-side API
        const validatedUserSession = await validateTokenWithServer(token);

        if (validatedUserSession) {
          // Authentication successful, update user state
          setAuthenticatedUser(validatedUserSession);
          setStatus('authenticated');
          return true;
        }
      }

      // Authentication failed, clear user state
      setStatus('unauthenticated');
      return false;
    } catch (error) {
      console.error('Sign-in process failed:', error);
      setStatus('unauthenticated');
      return false;
    }
  }, []);

  /**
   * Signs out the current user and clears the authentication state
   *
   * Since QuickAuth tokens are managed in memory only, this simply clears
   * the local user state. The actual token will be cleared when the
   * user signs out of their Farcaster client.
   */
  const signOut = useCallback(async (): Promise<void> => {
    // Clear local user state
    setAuthenticatedUser(null);
    setStatus('unauthenticated');
  }, []);

  /**
   * Retrieves the current authentication token from QuickAuth
   *
   * @returns {Promise<string | null>} The current auth token, or null if not authenticated
   */
  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      const { token } = await sdk.quickAuth.getToken();
      return token;
    } catch (error) {
      console.error('Failed to retrieve authentication token:', error);
      return null;
    }
  }, []);

  return {
    authenticatedUser,
    status,
    signIn,
    signOut,
    getToken,
  };
}