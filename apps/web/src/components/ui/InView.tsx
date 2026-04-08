"use client";

import React, { useRef, useEffect, useState } from "react";

interface InViewProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  threshold?: number;
  rootMargin?: string;
}

export const InView = ({
  children,
  className = "",
  style,
  threshold = 0.1,
  rootMargin = "-60px",
}: InViewProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div
      ref={ref}
      className={isVisible ? className : "opacity-0"}
      style={isVisible ? style : undefined}
    >
      {children}
    </div>
  );
};
