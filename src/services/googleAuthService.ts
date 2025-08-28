// Global Google types for TypeScript
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: any) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

// Access the global google object safely
const google = (window as any).google;

import { OAuth2Client } from 'google-auth-library';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

interface GoogleUserInfo {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
}

interface GoogleAuthResponse {
  success: boolean;
  user?: GoogleUserInfo;
  accessToken?: string;
  error?: string;
}

class GoogleAuthService {
  private client?: OAuth2Client;

  constructor() {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('Google OAuth not configured - VITE_GOOGLE_CLIENT_ID not found');
      this.client = undefined;
      return;
    }

    this.client = new OAuth2Client({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    });
  }

  /**
   * Initialize Google Sign-In button
   */
  initializeGoogleSignIn(): void {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('Cannot initialize Google Sign-In: Client ID not configured');
      return;
    }

    // Load Google Identity Services script
    if (!document.getElementById('google-identity-script')) {
      const script = document.createElement('script');
      script.id = 'google-identity-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  /**
   * Handle Google OAuth sign-in with popup
   */
  async signInWithPopup(): Promise<GoogleAuthResponse> {
    try {
      if (!GOOGLE_CLIENT_ID) {
        throw new Error('Google OAuth not configured');
      }

      // Use Google Identity Services for modern OAuth flow
      return new Promise((resolve, reject) => {
        if (typeof google === 'undefined') {
          reject(new Error('Google Identity Services not loaded'));
          return;
        }

        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: any) => {
            try {
              const userInfo = await this.verifyGoogleToken(response.credential);
              resolve({
                success: true,
                user: userInfo,
                accessToken: response.credential
              });
            } catch (error) {
              reject(error);
            }
          }
        });

        // Trigger the sign-in prompt
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            reject(new Error('Google sign-in popup was closed or skipped'));
          }
        });
      });
    } catch (error) {
      console.error('Google sign-in error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google sign-in failed'
      };
    }
  }

  /**
   * Verify Google ID token and extract user info
   */
  async verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
    try {
      if (!this.client) {
        throw new Error('Google OAuth client not initialized');
      }

      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new Error('Invalid Google token payload');
      }

      return {
        sub: payload.sub || '',
        name: payload.name || '',
        given_name: payload.given_name || '',
        family_name: payload.family_name || '',
        picture: payload.picture || '',
        email: payload.email || '',
        email_verified: payload.email_verified || false,
      };
    } catch (error) {
      console.error('Token verification error:', error);
      throw new Error('Failed to verify Google token');
    }
  }

  /**
   * Handle Google One Tap sign-in
   */
  initializeOneTap(callback: (response: GoogleAuthResponse) => void): void {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('Cannot initialize Google One Tap: Client ID not configured');
      return;
    }

    if (typeof google === 'undefined') {
      console.warn('Google Identity Services not loaded');
      return;
    }

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response: any) => {
        try {
          const userInfo = await this.verifyGoogleToken(response.credential);
          callback({
            success: true,
            user: userInfo,
            accessToken: response.credential
          });
        } catch (error) {
          callback({
            success: false,
            error: error instanceof Error ? error.message : 'Google authentication failed'
          });
        }
      }
    });

    // Display the One Tap prompt
    google.accounts.id.prompt();
  }

  /**
   * Check if Google OAuth is properly configured
   */
  isConfigured(): boolean {
    return !!GOOGLE_CLIENT_ID;
  }

  /**
   * Sign out from Google
   */
  signOut(): void {
    if (typeof google !== 'undefined' && google.accounts?.id) {
      google.accounts.id.disableAutoSelect();
    }
  }
}

export const googleAuthService = new GoogleAuthService();
export default googleAuthService;
export type { GoogleUserInfo, GoogleAuthResponse };