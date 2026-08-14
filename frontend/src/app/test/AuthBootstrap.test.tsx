import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthBootstrap } from '../AuthBootstrap';
import { useAuthStore } from '@/stores/useAuthStore';
import { authService } from '@/shared/services/authService';
import { ApiError } from '@/shared/services/apiError';

vi.mock('@/shared/services/authService', () => ({
  authService: {
    getMe: vi.fn(),
  },
}));

describe('AuthBootstrap', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.getState().clearSession();
    useAuthStore.setState({ isAuthReady: false });

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  it('skips network request and marks ready immediately when no token exists', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap>
          <div data-testid="child">Child Content</div>
        </AuthBootstrap>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthReady).toBe(true);
    });

    expect(authService.getMe).not.toHaveBeenCalled();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('fetches user, calls syncUser, and marks ready on success', async () => {
    const mockUser = {
      _id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      role: 'USER' as const,
    };

    useAuthStore.getState().setSession({
      accessToken: 'valid-token',
      user: { email: 'old@example.com', name: 'Old User', role: 'USER' },
    });
    useAuthStore.setState({ isAuthReady: false });

    vi.mocked(authService.getMe).mockResolvedValue(mockUser);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap>
          <div data-testid="child">Child Content</div>
        </AuthBootstrap>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthReady).toBe(true);
    });

    expect(authService.getMe).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user?.name).toBe('Test User');
    expect(useAuthStore.getState().token).toBe('valid-token');
  });

  it('clears session and marks ready on terminal 401 ApiError', async () => {
    useAuthStore.getState().setSession({
      accessToken: 'expired-token',
      user: { email: 'test@example.com', name: 'Test', role: 'USER' },
    });
    useAuthStore.setState({ isAuthReady: false });

    vi.mocked(authService.getMe).mockRejectedValue(
      new ApiError('Unauthorized', 401, 'http', 'UNAUTHORIZED')
    );

    render(
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap>
          <div data-testid="child">Child Content</div>
        </AuthBootstrap>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthReady).toBe(true);
    });

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('clears session and marks ready on terminal 403 ApiError', async () => {
    useAuthStore.getState().setSession({
      accessToken: 'forbidden-token',
      user: { email: 'test@example.com', name: 'Test', role: 'USER' },
    });
    useAuthStore.setState({ isAuthReady: false });

    vi.mocked(authService.getMe).mockRejectedValue(
      new ApiError('Forbidden', 403, 'http', 'FORBIDDEN')
    );

    render(
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap>
          <div data-testid="child">Child Content</div>
        </AuthBootstrap>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthReady).toBe(true);
    });

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('retains session and marks ready on 500 server error', async () => {
    const initialUser = { email: 'test@example.com', name: 'Test', role: 'USER' as const };
    useAuthStore.getState().setSession({
      accessToken: 'valid-token',
      user: initialUser,
    });
    useAuthStore.setState({ isAuthReady: false });

    vi.mocked(authService.getMe).mockRejectedValue(
      new ApiError('Server Error', 500)
    );

    render(
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap>
          <div data-testid="child">Child Content</div>
        </AuthBootstrap>
      </QueryClientProvider>
    );

    await waitFor(
      () => {
        expect(useAuthStore.getState().isAuthReady).toBe(true);
      },
      { timeout: 2500 }
    );

    expect(useAuthStore.getState().token).toBe('valid-token');
    expect(useAuthStore.getState().user?.email).toBe('test@example.com');
  });

  it('retains session and marks ready on network error', async () => {
    const initialUser = { email: 'test@example.com', name: 'Test', role: 'USER' as const };
    useAuthStore.getState().setSession({
      accessToken: 'valid-token',
      user: initialUser,
    });
    useAuthStore.setState({ isAuthReady: false });

    vi.mocked(authService.getMe).mockRejectedValue(new Error('Network disconnected'));

    render(
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap>
          <div data-testid="child">Child Content</div>
        </AuthBootstrap>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthReady).toBe(true);
    });

    expect(useAuthStore.getState().token).toBe('valid-token');
    expect(useAuthStore.getState().user?.email).toBe('test@example.com');
  });
});
