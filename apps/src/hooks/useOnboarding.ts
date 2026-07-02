/**
 * useOnboarding
 *
 * Tracks whether the current user has completed onboarding.
 * State is persisted in localStorage so it survives page refreshes.
 *
 * Key: "linko_onboarding_done_<userId>"
 * - If missing  → user has never done onboarding
 * - If "true"   → onboarding is complete, never show again
 *
 * Usage:
 *   const { needsOnboarding, completeOnboarding } = useOnboarding(userId);
 */

const KEY = (userId: string) => `linko_onboarding_done_${userId}`;

export function useOnboarding(userId: string | null) {
  const key = userId ? KEY(userId) : null;

  // true  → the user still needs to go through onboarding
  // false → they've already done it (or no user at all)
  const needsOnboarding = key ? localStorage.getItem(key) !== 'true' : false;

  /** Call this when the user finishes OR skips the onboarding wizard */
  const completeOnboarding = () => {
    if (key) localStorage.setItem(key, 'true');
  };

  return { needsOnboarding, completeOnboarding };
}
