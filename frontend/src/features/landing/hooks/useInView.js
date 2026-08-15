import { useEffect, useRef, useState } from 'react';

export const useInView = ({ threshold = 0.2, once = true, rootMargin = '0px' } = {}) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(() => (
    typeof IntersectionObserver === 'undefined' || typeof window === 'undefined'
  ));

  useEffect(() => {
    const element = ref.current;

    if (!element || typeof IntersectionObserver === 'undefined' || typeof window === 'undefined') {
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        if (!once) {
          setIsVisible(false);
        }
        return;
      }

      setIsVisible(true);

      if (once) {
        observer.unobserve(entry.target);
      }
    }, { threshold, rootMargin });

    observer.observe(element);
    return () => observer.disconnect();
  }, [once, rootMargin, threshold]);

  return { ref, isVisible };
};
