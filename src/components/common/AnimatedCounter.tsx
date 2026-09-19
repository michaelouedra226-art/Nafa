import React, { useEffect, useState, useRef } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number; // en millisecondes
  currency?: string;
  className?: string;
  sign?: "+" | "-" | "none";
  isPrivate?: boolean;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 600,
  currency = "F",
  className = "",
  sign = "none",
  isPrivate = false,
}) => {
  const [currentValue, setCurrentValue] = useState<number>(value);
  const prevValueRef = useRef<number>(value);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;

    // Si pas de changement réel
    if (startValue === endValue) {
      setCurrentValue(endValue);
      return;
    }

    const startTime = performance.now();

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing out cubic: 1 - Math.pow(1 - progress, 3)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(startValue + (endValue - startValue) * easeOut);

      setCurrentValue(nextValue);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(updateCounter);
      } else {
        prevValueRef.current = endValue;
        setCurrentValue(endValue);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateCounter);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration]);

  const formatted = Math.round(Math.abs(currentValue))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  const signStr = sign === "+" ? "+" : sign === "-" ? "−" : "";

  return (
    <span
      className={`font-fraunces font-bold tab-num inline-flex items-baseline transition-all duration-300 ${
        isPrivate ? "filter blur-sm select-none" : ""
      } ${className}`}
    >
      {signStr}
      {formatted}
      {currency && <span className="ml-1 text-[0.8em] font-medium">{currency}</span>}
    </span>
  );
};
