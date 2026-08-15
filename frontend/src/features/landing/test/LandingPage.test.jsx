import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '../LandingPage';
import { useInView } from '../hooks/useInView';
import { usePointerTilt } from '../hooks/usePointerTilt';

const renderLanding = () => render(<MemoryRouter><LandingPage /></MemoryRouter>);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LandingPage', () => {
  it('keeps the Orbit Control story and account links available without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    renderLanding();

    expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveAttribute('href', '#landing-main');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'landing-main');
    expect(screen.getByRole('heading', { name: /control the day/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /bring work into orbit/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /shape the workspace/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /turn progress into momentum/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /start with a clear orbit/i })).toBeVisible();
    expect(screen.getAllByText('68%')[0]).toBeVisible();
    expect(screen.getByRole('link', { name: /start your orbit/i })).toHaveAttribute('href', '/register');
    expect(screen.getAllByRole('link', { name: /^sign in$/i }).every((link) => link.getAttribute('href') === '/login')).toBe(true);
    expect(screen.getByRole('link', { name: /launch your workspace/i })).toHaveAttribute('href', '/register');
  });

  it('defaults an observed element to visible when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    const Probe = () => {
      const { ref, isVisible } = useInView();
      return <div ref={ref} data-testid="in-view-probe" data-visible={isVisible} />;
    };

    render(<Probe />);
    expect(screen.getByTestId('in-view-probe')).toHaveAttribute('data-visible', 'true');
  });

  it('leaves a coarse-pointer tilt target static', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));

    const Probe = () => {
      const tilt = usePointerTilt();
      return <div data-testid="tilt-probe" {...tilt} />;
    };

    render(<Probe />);
    const probe = screen.getByTestId('tilt-probe');
    fireEvent.pointerMove(probe, { clientX: 20, clientY: 20 });
    expect(probe).not.toHaveAttribute('style');
  });

  it('resets fine-pointer tilt variables on pointer exit', () => {
    vi.stubGlobal('matchMedia', vi.fn((query) => ({ matches: query === '(pointer: fine)' })));
    vi.stubGlobal('requestAnimationFrame', (callback) => {
      callback();
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const Probe = () => {
      const tilt = usePointerTilt();
      return <div data-testid="fine-tilt-probe" {...tilt} />;
    };

    render(<Probe />);
    const probe = screen.getByTestId('fine-tilt-probe');
    Object.defineProperty(probe, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    });
    fireEvent.pointerMove(probe, { clientX: 80, clientY: 20 });
    expect(probe.style.getPropertyValue('--tilt-x')).not.toBe('');
    fireEvent.pointerLeave(probe);
    expect(probe.style.getPropertyValue('--tilt-x')).toBe('0deg');
  });
});
