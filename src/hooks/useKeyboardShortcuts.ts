import { useEffect } from "react";

type KeyboardShortcutsHandlers = {
  onNextPage?: () => void;
  onPreviousPage?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onToggleFocus?: () => void;
  onToggleSurahIndex?: () => void;
  onToggleJuzIndex?: () => void;
  onToggleHistoricalMistakes?: () => void;
  onToggleTools?: () => void;
};

export function useKeyboardShortcuts(handlers: KeyboardShortcutsHandlers) {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable ||
        target.tagName === "SELECT"
      ) {
        return;
      }

      // Ignore if modifier keys are pressed (except for specific shortcuts)
      const isModifierOnly = event.ctrlKey || event.metaKey || event.altKey || event.shiftKey;

      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();
          handlers.onNextPage?.();
          break;
        case "ArrowLeft":
          event.preventDefault();
          handlers.onPreviousPage?.();
          break;
        case "=":
        case "+":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handlers.onZoomIn?.();
          }
          break;
        case "-":
        case "_":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handlers.onZoomOut?.();
          }
          break;
        case "0":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handlers.onResetZoom?.();
          }
          break;
        case "f":
        case "F":
          if (!event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            handlers.onToggleFocus?.();
          }
          break;
        case "s":
        case "S":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handlers.onToggleSurahIndex?.();
          }
          break;
        case "j":
        case "J":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handlers.onToggleJuzIndex?.();
          }
          break;
        case "h":
        case "H":
          if (!event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            handlers.onToggleHistoricalMistakes?.();
          }
          break;
        case "t":
        case "T":
          if (!event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            handlers.onToggleTools?.();
          }
          break;
        case "Escape":
          // Close modals or exit focus mode
          if (handlers.onToggleFocus) {
            handlers.onToggleFocus();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handlers]);
}
