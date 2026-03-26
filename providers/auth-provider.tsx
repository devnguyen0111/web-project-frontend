"use client";

import {
  login as loginApi,
  logout as logoutApi,
  me,
  register as registerApi,
} from "@/lib/api/auth";
import { clearTokens, getAccessToken } from "@/lib/api/token-store";
import type { AuthPayload, AuthUser, RegisterResponse } from "@/lib/types";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  initializing: boolean;
  login: (payload: LoginPayload) => Promise<AuthPayload>;
  register: (payload: RegisterPayload) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;
    setInitializing(true);

    const accessToken = getAccessToken();
    if (!accessToken) {
      setUser(null);
      setInitializing(false);
      return () => {
        active = false;
      };
    }

    me()
      .then((loaded) => {
        if (active) {
          setUser(loaded);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setInitializing(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function login(payload: LoginPayload) {
    setLoading(true);
    try {
      const response = await loginApi(payload);
      if (!response.requiresTwoFactor) {
        setUser(response.user);
      } else {
        setUser(null);
      }
      return response;
    } finally {
      setLoading(false);
    }
  }

  async function register(payload: RegisterPayload) {
    setLoading(true);
    try {
      const response = await registerApi(payload);
      return response;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    try {
      await logoutApi();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function refreshProfile() {
    setLoading(true);
    try {
      const profile = await me();
      setUser(profile);
    } finally {
      setLoading(false);
    }
  }

  function clearSession() {
    clearTokens();
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      initializing,
      login,
      register,
      logout,
      refreshProfile,
      clearSession,
    }),
    [initializing, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
