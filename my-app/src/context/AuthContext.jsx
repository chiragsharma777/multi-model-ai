import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function getSession() {
      const {
        data,
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error(
          "Failed to get session:",
          error
        );
      }

      if (mounted) {
        setSession(data?.session || null);
        setUser(data?.session?.user || null);
        setLoading(false);
      }
    }

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // =========================
  // SIGN UP
  // =========================

  async function signUp(email, password) {
    return await supabase.auth.signUp({
      email,
      password,
    });
  }

  // =========================
  // SIGN IN
  // =========================

  async function signIn(email, password) {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  // =========================
  // FORGOT PASSWORD
  // =========================

  async function resetPassword(email) {
    return await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );
  }

  // =========================
  // UPDATE PASSWORD
  // =========================

  async function updatePassword(newPassword) {
    return await supabase.auth.updateUser({
      password: newPassword,
    });
  }

  // =========================
  // SIGN OUT
  // =========================

  async function signOut() {
    return await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,

        signUp,
        signIn,

        resetPassword,
        updatePassword,

        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
