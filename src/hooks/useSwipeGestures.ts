import { useEffect, useRef } from "react";

type SwipeGestureHandlers = {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onDoubleTap?: () => void;
  onPinchZoom?: (scale: number) => void;
  onLongPress?: () => void;
};

export function useSwipeGestures(
  elementRef: React.RefObject<HTMLElement>,
  handlers: SwipeGestureHandlers,
  options: {
    swipeThreshold?: number;
    doubleTapDelay?: number;
    longPressDelay?: number;
  } = {}
) {
  const {
    swipeThreshold = 50,
    doubleTapDelay = 300,
    longPressDelay = 500,
  } = options;

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);
  const lastTap = useRef(0);
  const initialPinchDistance = useRef(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const lastPinchScale = useRef(1);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      isLongPress.current = false;

      if (e.touches.length === 1) {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;

        // Start long press timer
        if (handlers.onLongPress) {
          longPressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            handlers.onLongPress?.();
          }, longPressDelay);
        }
      } else if (e.touches.length === 2 && handlers.onPinchZoom) {
        // Pinch zoom start
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialPinchDistance.current = distance;
        lastPinchScale.current = 1;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Cancel long press if user moves
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      if (e.touches.length === 2 && handlers.onPinchZoom) {
        e.preventDefault(); // Prevent scrolling during pinch
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (initialPinchDistance.current > 0) {
          const scale = distance / initialPinchDistance.current;
          // Only call handler if scale changed significantly (avoid too many updates)
          if (Math.abs(scale - lastPinchScale.current) > 0.02) {
            handlers.onPinchZoom(scale);
            lastPinchScale.current = scale;
          }
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Cancel long press timer
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      // Reset pinch zoom tracking
      if (e.touches.length === 0) {
        initialPinchDistance.current = 0;
        lastPinchScale.current = 1;
      }

      if (e.changedTouches.length === 1 && !isLongPress.current) {
        touchEndX.current = e.changedTouches[0].clientX;
        touchEndY.current = e.changedTouches[0].clientY;

        handleSwipe();
        handleDoubleTap();
      }

      // Reset long press flag
      isLongPress.current = false;
    };

    const handleSwipe = () => {
      const diffX = touchStartX.current - touchEndX.current;
      const diffY = touchStartY.current - touchEndY.current;

      // Only trigger if swipe is significant enough
      if (Math.abs(diffX) > swipeThreshold || Math.abs(diffY) > swipeThreshold) {
        // Determine if horizontal or vertical swipe is dominant
        if (Math.abs(diffX) > Math.abs(diffY)) {
          // Horizontal swipe
          if (diffX > 0) {
            handlers.onSwipeLeft?.();
          } else {
            handlers.onSwipeRight?.();
          }
        } else {
          // Vertical swipe
          if (diffY > 0) {
            handlers.onSwipeUp?.();
          } else {
            handlers.onSwipeDown?.();
          }
        }
      }
    };

    const handleDoubleTap = () => {
      const now = Date.now();
      const tapLength = now - lastTap.current;

      if (tapLength < doubleTapDelay && tapLength > 0) {
        handlers.onDoubleTap?.();
        lastTap.current = 0; // Reset to prevent triple tap
      } else {
        lastTap.current = now;
      }
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: false });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [elementRef, handlers, swipeThreshold, doubleTapDelay, longPressDelay]);
}
