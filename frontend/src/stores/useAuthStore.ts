import { create } from "zustand";
import {
  clearStoredAuth,
  persistAuthSession,
  readAuthSnapshot,
  updateStoredTokens,
  updateStoredUser,
} from "../shared/services/authStorage";
import type { AuthSession, AuthSnapshot, User } from "../shared/types/domain";

export interface AuthState extends AuthSnapshot {
  isAuthReady: boolean;
  sessionRevision: number;
  setSession: (session: AuthSession) => void;
  updateTokens: (tokens: { token?: string; accessToken?: string; refreshToken?: string }) => void;
  clearSession: () => void;
  syncUser: (user: User | null) => void;
  setAuthReady: (isAuthReady: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  ...readAuthSnapshot(),
  isAuthReady: false,
  sessionRevision: 0,
  setSession: (session) => {
    const snapshot = persistAuthSession(session);
    set((state) => ({
      ...snapshot,
      isAuthReady: true,
      sessionRevision: state.sessionRevision + 1,
    }));
  },
  updateTokens: (tokens) => {
    const snapshot = updateStoredTokens(tokens);
    set((state) => ({
      token: snapshot.token,
      refreshToken: snapshot.refreshToken,
      user: state.user,
    }));
    // sessionRevision is NOT incremented: token rotation is not a session change.
  },
  clearSession: () => {
    clearStoredAuth();
    set((state) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthReady: true,
      sessionRevision: state.sessionRevision + 1,
    }));
  },
  syncUser: (user) => {
    updateStoredUser(user);
    set({ user });
    // sessionRevision is NOT incremented: profile sync is not a session change.
  },
  setAuthReady: (isAuthReady) => set({ isAuthReady }),
}));
