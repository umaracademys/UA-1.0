"use client";

import { useState } from "react";
import { Star } from "lucide-react";

type StarRatingProps = {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
};

export function StarRating({
  rating,
  onRatingChange,
  readOnly = false,
  size = "md",
  showValue = false,
}: StarRatingProps) {
  const [hoveredRating, setHoveredRating] = useState(0);

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const handleClick = (value: number) => {
    if (!readOnly && onRatingChange) {
      onRatingChange(value);
    }
  };

  const handleMouseEnter = (value: number) => {
    if (!readOnly) {
      setHoveredRating(value);
    }
  };

  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoveredRating(0);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((value) => {
          const isFilled = value <= displayRating;
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleClick(value)}
              onMouseEnter={() => handleMouseEnter(value)}
              onMouseLeave={handleMouseLeave}
              disabled={readOnly}
              className={`transition-colors ${
                readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"
              }`}
            >
              <Star
                className={`${sizeClasses[size]} ${
                  isFilled ? "fill-yellow-400 text-yellow-400" : "text-neutral-300"
                } transition-colors`}
              />
            </button>
          );
        })}
      </div>
      {showValue && (
        <span className="text-sm font-medium text-neutral-600">
          {rating.toFixed(1)} / 5.0
        </span>
      )}
    </div>
  );
}
