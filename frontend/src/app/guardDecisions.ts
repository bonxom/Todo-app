export interface GuardAuthState {
  isAuthReady: boolean;
  token: string | null;
}

export type ProtectedDecision = 'loading' | '/login' | 'outlet';
export type PublicOnlyDecision = 'loading' | '/dashboard' | 'outlet';
export type RootDecision = 'loading' | '/dashboard' | 'landing';

export const getProtectedDecision = (auth: GuardAuthState): ProtectedDecision => {
  if (!auth.isAuthReady) {
    return 'loading';
  }
  return auth.token ? 'outlet' : '/login';
};

export const getPublicOnlyDecision = (auth: GuardAuthState): PublicOnlyDecision => {
  if (!auth.isAuthReady) {
    return 'loading';
  }
  return auth.token ? '/dashboard' : 'outlet';
};

export const getRootDecision = (auth: GuardAuthState): RootDecision => {
  if (!auth.isAuthReady) {
    return 'loading';
  }
  return auth.token ? '/dashboard' : 'landing';
};
