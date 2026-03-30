'use client';

import { useEffect, useRef, useState } from 'react';

export function CustomCursor() {
  const [isPointer, setIsPointer] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>();
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      window.matchMedia('(hover: none)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const animate = () => {
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.2;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.2;

      if (dotRef.current) {
        dotRef.current.style.left = `${targetRef.current.x}px`;
        dotRef.current.style.top = `${targetRef.current.y}px`;
      }

      if (circleRef.current) {
        circleRef.current.style.left = `${currentRef.current.x}px`;
        circleRef.current.style.top = `${currentRef.current.y}px`;
      }

      frameRef.current = window.requestAnimationFrame(animate);
    };

    const updatePosition = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
    };

    const updateCursor = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      setIsPointer(
        window.getComputedStyle(target).cursor === 'pointer' ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('[role="button"]') !== null
      );
    };

    window.addEventListener('mousemove', updatePosition);
    window.addEventListener('mouseover', updateCursor);
    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      window.removeEventListener('mouseover', updateCursor);
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className="custom-cursor-dot"
      />
      <div
        ref={circleRef}
        className={`custom-cursor-circle ${isPointer ? 'pointer' : ''}`}
      />
    </>
  );
}
