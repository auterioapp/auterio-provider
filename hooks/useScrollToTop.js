import { useEffect, useRef } from 'react';

export default function useScrollToTop(scrollSignal) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (!scrollSignal) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo?.({ y: 0, animated: true });
    });
  }, [scrollSignal]);
  return scrollRef;
}
