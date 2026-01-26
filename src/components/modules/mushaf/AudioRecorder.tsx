"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";

type AudioRecorderProps = {
  onAudioRecorded: (audioBlob: Blob, audioUrl: string) => void;
  onAudioRemoved?: () => void;
  initialAudioUrl?: string;
  maxDuration?: number; // in seconds, default 120 (2 minutes)
};

export function AudioRecorder({
  onAudioRecorded,
  onAudioRemoved,
  initialAudioUrl,
  maxDuration = 120,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl || null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  // Check if audioUrl is a server URL (already uploaded) or a blob URL (local)
  const isServerUrl = audioUrl?.startsWith("/uploads/");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Check if MediaRecorder is supported
      if (!MediaRecorder.isTypeSupported) {
        toast.error("Audio recording is not supported in this browser");
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      // Use webm format (widely supported)
      const options: MediaRecorderOptions = {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : undefined,
      };

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setAudioBlob(blob);
        onAudioRecorded(blob, url);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        toast.error("An error occurred while recording");
        stopRecording();
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          // Auto-stop at max duration
          if (newTime >= maxDuration) {
            stopRecording();
            toast.success(`Recording stopped automatically at ${maxDuration} seconds`);
            return maxDuration;
          }
          return newTime;
        });
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      if ((error as Error).name === "NotAllowedError") {
        toast.error("Microphone access denied. Please allow microphone permissions.");
      } else if ((error as Error).name === "NotFoundError") {
        toast.error("No microphone found. Please connect a microphone.");
      } else {
        toast.error("Could not access microphone. Please check permissions.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingTime(0);
    if (onAudioRemoved) {
      onAudioRemoved();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("audio/")) {
        toast.error("Please select an audio file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }

      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setAudioBlob(file);
      onAudioRecorded(file, url);
    }
    // Reset input
    e.target.value = "";
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-neutral-700">
        Audio Explanation {audioUrl && "(Optional)"}
      </label>

      {!audioUrl ? (
        <div className="flex items-center gap-3">
          {!isRecording ? (
            <>
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <Mic className="h-4 w-4" />
                <span>Start Recording</span>
              </button>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                <Upload className="h-4 w-4" />
                <span>Upload Audio</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-2 rounded-lg bg-neutral-600 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
              >
                <Square className="h-4 w-4" />
                <span>Stop Recording</span>
              </button>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium text-neutral-700">
                  {formatTime(recordingTime)}
                </span>
                <span className="text-xs text-neutral-500">
                  / {formatTime(maxDuration)}
                </span>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <audio
            src={audioUrl}
            controls
            className="w-full h-10 rounded-lg"
            preload="metadata"
          >
            Your browser does not support the audio element.
          </audio>
          <div className="flex items-center justify-between">
            {!isServerUrl && (
              <button
                type="button"
                onClick={deleteRecording}
                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 focus:outline-none"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Recording</span>
              </button>
            )}
            {isServerUrl && (
              <span className="text-xs text-neutral-500 italic">
                Audio file already uploaded
              </span>
            )}
            {recordingTime > 0 && !isServerUrl && (
              <span className="text-xs text-neutral-500">
                Duration: {formatTime(recordingTime)}
              </span>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-neutral-500">
        Record an audio explanation of the mistake (max {formatTime(maxDuration)})
      </p>
    </div>
  );
}
