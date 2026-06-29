"use client";

import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabase";

export interface AuthState {
  user: User | null;
  loading: boolean;
  configured: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => ({
    user: null,
    // only "loading" when we actually have a backend to query
    loading: isSupabaseConfigured,
    configured: isSupabaseConfigured,
  }));

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return; // initial state already reflects "not configured"
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setState({ user: data.user ?? null, loading: false, configured: true });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        loading: false,
        configured: true,
      });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign up with email + password. Returns true when email confirmation is
   * required (no session yet), false when the user is signed in immediately.
   */
  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase לא מוגדר");
    // Confirmation emails link back to an existing app route (/auth), not a
    // non-existent /auth/callback — avoids "Invalid path specified in request URL".
    const emailRedirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });
    if (error) throw error;
    // With confirmation disabled a session is returned right away; with it
    // enabled the session is null until the user verifies their email.
    return !data.session;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase לא מוגדר");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase לא מוגדר");
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
  }, []);

  return { ...state, signUp, signIn, signOut, resetPassword };
}
