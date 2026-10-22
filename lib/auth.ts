import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

let globalSession: Session | null = null;
let globalUser: User | null = null;
let globalLoading = true;

const listeners = new Set<() => void>();

let initializationPromise: Promise<void> | null = null;
let authListenerRegistered = false;
let authRevision = 0;

const SESSION_RESTORE_TIMEOUT_MS = 8000;

function notify() {
  listeners.forEach((listener) => listener());
}

export function setAuth(session: Session | null) {
  authRevision += 1;
  globalSession = session;
  globalUser = session?.user ?? null;
  globalLoading = false;
  notify();
}

export function initializeAuth(): Promise<void> {
  if (initializationPromise) {
    return initializationPromise;
  }

  globalLoading = true;
  notify();

  const startingRevision = authRevision;

  if (!authListenerRegistered) {
    supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(session);
    });

    authListenerRegistered = true;
  }

  const restoreSession = Promise.resolve()
    .then(() => supabase.auth.getSession())
    .then(({ data, error }) => {
      if (error) {
        throw error;
      }

      // Do not overwrite a newer sign-in or sign-out.
      if (authRevision === startingRevision) {
        setAuth(data.session);
      }
    })
    .catch((error: unknown) => {
      console.error(
        '[auth] Session restoration failed:',
        error
      );

      if (authRevision === startingRevision) {
        setAuth(null);
      }
    });

  let timeoutHandle:
    | ReturnType<typeof setTimeout>
    | undefined;

  const timeout = new Promise<void>((resolve) => {
    timeoutHandle = setTimeout(() => {
      if (globalLoading) {
        console.warn(
          '[auth] Session restoration timed out.'
        );

        // Release the loading screen instead of spinning forever.
        // Do not invalidate a session restoration that may finish later.
        globalLoading = false;
        notify();
      }

      resolve();
    }, SESSION_RESTORE_TIMEOUT_MS);
  });

  initializationPromise = Promise.race([
    restoreSession,
    timeout,
  ]).then(() => {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
  });

  return initializationPromise;
}

export function useAuth(): AuthState {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => {
      forceRender((n) => n + 1);
    };

    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    session: globalSession,
    user: globalUser,
    loading: globalLoading,
  };
}

export type SignUpProfile = {
  full_name: string;
  role: 'student' | 'teacher';
};

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: profile
        ? {
            full_name: profile.full_name,
            role: profile.role,
          }
        : {},
    },
  });

  if (!error && data.session) {
    setAuth(data.session);
  }

  return { data, error };
}

export async function signIn(
  email: string,
  password: string
) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (!error && data.session) {
    setAuth(data.session);
  }

  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (!error) {
    setAuth(null);
  }

  return { error: error?.message ?? null };
}