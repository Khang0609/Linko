/**
 * AuthContext
 *
 * A minimal auth context that tracks:
 *  - user          → the current logged-in user (null if not signed in)
 *  - justSignedUp  → true ONLY immediately after a successful sign-up
 *                    (reset to false once consumed by the router)
 *
 * Replace the mock `signUp` / `signIn` / `signOut` bodies with your
 * real API calls (Firebase, Supabase, custom backend, etc.)
 */

import React, { createContext, useContext, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  user: User | null;
  justSignedUp: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  clearJustSignedUp: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [justSignedUp, setJustSignedUp] = useState(false);

  // ── Replace these with real API calls ──────────────────────────────────
  const signUp = async (email: string, _password: string, name: string) => {
    void _password;
    // Simulate API call
    const newUser: User = { id: email, email, name };
    setUser(newUser);
    setJustSignedUp(true); // ← this flag triggers the onboarding redirect
  };

  const signIn = async (email: string, _password: string) => {
    void _password;
    // Simulate API call — justSignedUp stays false for returning users
    const returningUser: User = { id: email, email, name: email };
    setUser(returningUser);
    setJustSignedUp(false);
  };
  // ───────────────────────────────────────────────────────────────────────

  const signOut = () => {
    setUser(null);
    setJustSignedUp(false);
  };

  // Called by the router once it has read and acted on the flag
  const clearJustSignedUp = () => setJustSignedUp(false);

  return (
    <AuthContext.Provider
      value={{ user, justSignedUp, signUp, signIn, signOut, clearJustSignedUp }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
