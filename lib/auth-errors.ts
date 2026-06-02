/**
 * Convert technical auth errors into user-friendly messages
 * Shows: what happened, why it happened, and how to fix it
 */

export interface FriendlyErrorMessage {
  title: string
  description: string
  action: string
}

export function getFriendlyAuthError(errorMessage: string | null): FriendlyErrorMessage {
  if (!errorMessage) {
    return {
      title: 'Authentication Error',
      description: 'Something went wrong during sign-in. Please try again.',
      action: 'Try again or contact support if the problem persists.',
    }
  }

  const error = errorMessage.toLowerCase()

  // PKCE code verifier not found
  if (error.includes('pkce') || error.includes('code_verifier') || error.includes('verifier not found')) {
    return {
      title: 'Session Expired or Browser Issue',
      description:
        'Your sign-in started in a different browser, tab, or the browser data was cleared. This prevents completing the Google sign-in process.',
      action:
        'Please close this tab and try signing in again. Make sure to use the same browser and not clear cookies during sign-in.',
    }
  }

  // Invalid or expired authorization code
  if (error.includes('invalid_grant') || error.includes('expired')) {
    return {
      title: 'Sign-In Took Too Long',
      description:
        'Your Google sign-in approval link expired or was used already. This usually happens if you wait too long or try to use the same link twice.',
      action: 'Try signing in again. If using Google, approve the request within a few minutes.',
    }
  }

  // Invalid credentials
  if (error.includes('invalid_login_credentials') || error.includes('invalid email')) {
    return {
      title: 'Email or Password Incorrect',
      description: 'The email address or password you entered is not correct.',
      action: 'Double-check your email and password, then try again. Use "Forgot password?" if you need to reset it.',
    }
  }

  // User already exists
  if (error.includes('user_already_exists') || error.includes('already registered')) {
    return {
      title: 'Account Already Exists',
      description: 'An account with this email address already exists.',
      action: 'Sign in instead of creating a new account. Use "Forgot password?" if you forgot your password.',
    }
  }

  // Email not confirmed
  if (error.includes('email_not_confirmed') || error.includes('email_not_verified')) {
    return {
      title: 'Please Confirm Your Email',
      description: 'You need to verify your email address before you can sign in.',
      action: 'Check your email for a confirmation link and click it, then try signing in again.',
    }
  }

  // Network or server error
  if (error.includes('network') || error.includes('fetch') || error.includes('connection')) {
    return {
      title: 'Connection Problem',
      description:
        'We could not reach the server. This might be a temporary connection issue or the server is temporarily unavailable.',
      action: 'Check your internet connection and try again in a few moments.',
    }
  }

  // OAuth provider error
  if (error.includes('oauth') || error.includes('provider')) {
    return {
      title: 'Google Sign-In Not Available',
      description:
        'There was a problem connecting to Google. This might be a temporary issue with Google or your account permissions.',
      action: 'Try again, or use email and password to sign in instead.',
    }
  }

  // Default fallback
  return {
    title: 'Sign-In Failed',
    description: `An error occurred: ${errorMessage}`,
    action: 'Please try again or contact support if the problem continues.',
  }
}

/**
 * Format error message for display on login page
 */
export function formatAuthErrorForDisplay(errorMessage: FriendlyErrorMessage): string {
  return `${errorMessage.title}\n\n${errorMessage.description}\n\n${errorMessage.action}`
}
