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

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase לא מוגדר");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
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

  return { ...state, signUp, signIn, signOut };
}
