import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import {
  getProtectedDecision,
  getPublicOnlyDecision,
  getRootDecision,
} from '../guardDecisions';
import {
  ProtectedGuard,
} from '../routeGuards';
import { useAuthStore } from '@/stores/useAuthStore';

describe('route guard decisions', () => {
  it('waits until authentication bootstrap completes', () => {
    expect(getProtectedDecision({ isAuthReady: false, token: null })).toBe('loading');
    expect(getProtectedDecision({ isAuthReady: false, token: 'token' })).toBe('loading');
    expect(getPublicOnlyDecision({ isAuthReady: false, token: 'token' })).toBe('loading');
    expect(getRootDecision({ isAuthReady: false, token: null })).toBe('loading');
  });

  it('redirects unauthenticated users to /login on protected routes', () => {
    expect(getProtectedDecision({ isAuthReady: true, token: null })).toBe('/login');
  });

  it('allows authenticated users to access protected routes', () => {
    expect(getProtectedDecision({ isAuthReady: true, token: 'token-abc' })).toBe('outlet');
  });

  it('redirects authenticated users away from public auth routes to /dashboard', () => {
    expect(getPublicOnlyDecision({ isAuthReady: true, token: 'token-abc' })).toBe('/dashboard');
  });

  it('allows guests to access public auth routes', () => {
    expect(getPublicOnlyDecision({ isAuthReady: true, token: null })).toBe('outlet');
  });

  it('redirects authenticated users at root to /dashboard', () => {
    expect(getRootDecision({ isAuthReady: true, token: 'token-abc' })).toBe('/dashboard');
  });

  it('renders landing page for guests at root', () => {
    expect(getRootDecision({ isAuthReady: true, token: null })).toBe('landing');
  });
});

describe('Guard components rendering', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().clearSession();
    useAuthStore.getState().setAuthReady(false);
  });

  it('renders loading screen while auth is not ready', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedGuard />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Checking your session/i)).toBeDefined();
  });

  it('renders child outlet when access is granted', () => {
    useAuthStore.getState().setSession({ accessToken: 'valid-token' });
    useAuthStore.getState().setAuthReady(true);

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedGuard />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeDefined();
  });
});
