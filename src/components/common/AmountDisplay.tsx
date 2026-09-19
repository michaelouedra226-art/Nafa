import React from "react";
import { AnimatedCounter } from "./AnimatedCounter";

interface AmountDisplayProps {
  amount: number;
  currency?: string;
  className?: string;
  sign?: "+" | "-" | "none";
  color?: string;
  isPrivate?: boolean;
  animate?: boolean;
}

export const AmountDisplay: React.FC<AmountDisplayProps> = ({
  amount,
  currency = "F",
  className = "",
  sign = "none",
  color,
  isPrivate = false,
  animate = true,
}) => {
  if (animate) {
    return (
      <span style={color ? { color } : undefined} className="inline-flex">
        <AnimatedCounter
          value={amount}
          currency={currency}
          className={className}
          sign={sign}
          isPrivate={isPrivate}
        />
      </span>
    );
  }

  const formatted = Math.round(Math.abs(amount))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  const signStr = sign === "+" ? "+" : sign === "-" ? "−" : "";

  return (
    <span
      className={`font-fraunces font-bold tab-num inline-flex items-baseline ${
        isPrivate ? "filter blur-sm select-none" : ""
      } ${className}`}
      style={color ? { color } : undefined}
    >
      {signStr}
      {formatted}
      {currency && <span className="ml-1 text-[0.8em] font-medium">{currency}</span>}
    </span>
  );
};
