"use client";

import { useState } from "react";
import { Download, FileText, Image, Music, File } from "lucide-react";

type MessageAttachmentProps = {
  attachment: {
    filename: string;
    url: string;
    type?: string;
    size?: number;
  };
};

export function MessageAttachment({ attachment }: MessageAttachmentProps) {
  const [imageError, setImageError] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  const isImage = attachment.type?.startsWith("image/");
  const isPDF = attachment.type === "application/pdf";
  const isAudio = attachment.type?.startsWith("audio/");

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = () => {
    window.open(attachment.url, "_blank");
  };

  if (isImage && !imageError) {
    return (
      <>
        <div className="group relative cursor-pointer overflow-hidden rounded-lg border border-neutral-200">
          <img
            src={attachment.url}
            alt={attachment.filename}
            className="h-48 w-full object-cover transition-transform group-hover:scale-105"
            onError={() => setImageError(true)}
            onClick={() => setShowLightbox(true)}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
            <Download className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </div>

        {showLightbox && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setShowLightbox(false)}
          >
            <img
              src={attachment.url}
              alt={attachment.filename}
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }

  if (isPDF) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <div className="rounded-lg bg-red-100 p-2 text-red-700">
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-900">{attachment.filename}</p>
          {attachment.size && (
            <p className="text-xs text-neutral-500">{formatFileSize(attachment.size)}</p>
          )}
        </div>
        <button
          onClick={handleDownload}
          className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <div className="mb-2 flex items-center gap-2">
          <Music className="h-4 w-4 text-neutral-600" />
          <p className="text-sm font-medium text-neutral-900">{attachment.filename}</p>
        </div>
        <audio controls src={attachment.url} className="w-full">
          Your browser does not support the audio element.
        </audio>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <div className="rounded-lg bg-neutral-100 p-2 text-neutral-600">
        <File className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-neutral-900">{attachment.filename}</p>
        {attachment.size && (
          <p className="text-xs text-neutral-500">{formatFileSize(attachment.size)}</p>
        )}
      </div>
      <button
        onClick={handleDownload}
        className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100"
      >
        <Download className="h-4 w-4" />
      </button>
    </div>
  );
}
