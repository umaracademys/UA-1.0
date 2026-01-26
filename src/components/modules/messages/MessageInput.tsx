"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

type MessageInputProps = {
  onSend: (content: string, attachments?: File[]) => Promise<void>;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
};

export function MessageInput({
  onSend,
  onTypingStart,
  onTypingStop,
  disabled = false,
  placeholder = "Type a message...",
  maxLength,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounced typing indicators
  const debouncedTypingStop = useDebouncedCallback(() => {
    setIsTyping(false);
    onTypingStop?.();
  }, 1000);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (maxLength && value.length > maxLength) return;
    
    setContent(value);

    // Typing indicators
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      onTypingStart?.();
    }
    debouncedTypingStop();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    // Allow sending with only attachments (no text)
    if (!content.trim() && (!attachments || attachments.length === 0)) return;
    if (disabled) return;

    const contentToSend = content.trim();
    const attachmentsToSend = attachments.length > 0 ? attachments : undefined;

    setContent("");
    setAttachments([]);
    setIsTyping(false);
    onTypingStop?.();

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      await onSend(contentToSend, attachmentsToSend);
    } catch (error) {
      // Restore content on error
      setContent(contentToSend);
      setAttachments(attachmentsToSend || []);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const canSend = content.trim().length > 0 || attachments.length > 0;

  return (
    <div className="border-t border-neutral-200 bg-white p-4">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-sm"
            >
              <span className="text-neutral-700">{file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="rounded p-0.5 text-neutral-400 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* File Upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,application/pdf,audio/*"
        />

        {/* Text Input */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-neutral-50"
            style={{ maxHeight: "120px", minHeight: "40px" }}
          />
          {maxLength && (
            <p className="mt-1 text-xs text-neutral-500">
              {content.length}/{maxLength}
            </p>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!canSend || disabled}
          className="rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
