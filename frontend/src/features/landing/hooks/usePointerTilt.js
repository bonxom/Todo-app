import { useEffect, useRef } from 'react';

const effectIsSupported = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && typeof window.requestAnimationFrame === 'function'
  && window.matchMedia('(pointer: fine)').matches
  && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

export const usePointerTilt = ({ maxTilt = 7, maxShift = 10 } = {}) => {
  const frameRef = useRef(0);

  useEffect(() => () => {
    if (frameRef.current && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(frameRef.current);
    }
  }, []);

  const reset = (element) => {
    element.style.setProperty('--tilt-x', '0deg');
    element.style.setProperty('--tilt-y', '0deg');
    element.style.setProperty('--pointer-x', '0px');
    element.style.setProperty('--pointer-y', '0px');
  };

  return {
    onPointerMove: (event) => {
      if (!effectIsSupported()) {
        return;
      }

      const element = event.currentTarget;
      const { left, top, width, height } = element.getBoundingClientRect();

      if (!width || !height) {
        return;
      }

      const x = (event.clientX - left) / width - 0.5;
      const y = (event.clientY - top) / height - 0.5;

      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = window.requestAnimationFrame(() => {
        element.style.setProperty('--tilt-x', `${(-y * maxTilt).toFixed(2)}deg`);
        element.style.setProperty('--tilt-y', `${(x * maxTilt).toFixed(2)}deg`);
        element.style.setProperty('--pointer-x', `${(x * maxShift).toFixed(2)}px`);
        element.style.setProperty('--pointer-y', `${(y * maxShift).toFixed(2)}px`);
      });
    },
    onPointerLeave: (event) => reset(event.currentTarget),
  };
};
