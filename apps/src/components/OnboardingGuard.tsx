/**
 * OnboardingGuard
 *
 * Wraps the /onboarding route. Enforces two rules:
 *
 * 1. A user must be signed in.
 * 2. They must have JUST signed up (justSignedUp flag) AND not yet
 *    completed onboarding (no localStorage entry).
 *
 * If either rule fails → redirect to "/".
 *
 * This means:
 *  - A logged-in user who navigates to /onboarding manually after
 *    completing it once will be bounced back home.
 *  - A returning user who signs in normally never reaches /onboarding.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOnboarding } from '../hooks/useOnboarding';

export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, justSignedUp } = useAuth();
  const { needsOnboarding } = useOnboarding(user?.id ?? null);

  // Not logged in at all
  if (!user) return <Navigate to="/login" replace />;

  // Already completed onboarding, or didn't arrive via sign-up
  if (!justSignedUp || !needsOnboarding) return <Navigate to="/" replace />;

  return <>{children}</>;
}
