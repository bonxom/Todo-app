import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import {
  getProtectedDecision,
  getPublicOnlyDecision,
  getRootDecision,
} from './guardDecisions';
import {
  ProtectedGuard,
  PublicOnlyGuard,
  RootGuard,
} from './routeGuards';
import { useAuthStore } from '../stores/useAuthStore';

describe('route guard decisions', () => {
  it('waits until authentication bootstrap completes', () => {
    expect(getProtectedDecision({ isAuthReady: false, token: null })).toBe('loading');
    expect(getProtectedDecision({ isAuthReady: false, token: 'token' })).toBe('loading');
    expect(getPublicOnlyDecision({ isAuthReady: false, token: 'token' })).toBe('loading');
    expect(getPublicOnlyDecision({ isAuthReady: false, token: null })).toBe('loading');
    expect(getRootDecision({ isAuthReady: false, token: null })).toBe('loading');
  });

  it('redirects protected guests and admits authenticated users', () => {
    expect(getProtectedDecision({ isAuthReady: true, token: null })).toBe('/login');
    expect(getProtectedDecision({ isAuthReady: true, token: 'token' })).toBe('outlet');
  });

  it('redirects authenticated users away from public-only routes', () => {
    expect(getPublicOnlyDecision({ isAuthReady: true, token: 'token' })).toBe('/dashboard');
    expect(getPublicOnlyDecision({ isAuthReady: true, token: null })).toBe('outlet');
  });

  it('selects the root destination', () => {
    expect(getRootDecision({ isAuthReady: true, token: 'token' })).toBe('/dashboard');
    expect(getRootDecision({ isAuthReady: true, token: null })).toBe('landing');
  });
});

describe('route guard components', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
    useAuthStore.setState({ isAuthReady: false });
  });

  it('ProtectedGuard shows loading when auth is not ready', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedGuard />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Checking your session…')).toBeInTheDocument();
  });

  it('ProtectedGuard redirects guest to /login when ready without token', () => {
    useAuthStore.setState({ isAuthReady: true, token: null });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedGuard />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('ProtectedGuard renders outlet when ready with token', () => {
    useAuthStore.setState({ isAuthReady: true, token: 'fake-token' });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedGuard />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('PublicOnlyGuard redirects authenticated user to /dashboard', () => {
    useAuthStore.setState({ isAuthReady: true, token: 'fake-token' });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<PublicOnlyGuard />}>
            <Route path="/login" element={<div>Login Page</div>} />
          </Route>
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('RootGuard redirects authenticated user to /dashboard', () => {
    useAuthStore.setState({ isAuthReady: true, token: 'fake-token' });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<RootGuard />}>
            <Route path="/" element={<div>Landing Page</div>} />
          </Route>
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });
});
