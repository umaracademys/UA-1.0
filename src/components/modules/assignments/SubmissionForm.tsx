"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, File, Trash2, AlertTriangle, Mic, MicOff } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

const submissionSchema = z.object({
  content: z.string().optional(),
  link: z.string().url().optional().or(z.literal("")),
});

type SubmissionFormData = z.infer<typeof submissionSchema>;

type SubmissionFormProps = {
  assignmentId: string;
  studentId?: string;
  studentName?: string;
  onSubmit: () => void;
};

export function SubmissionForm({ assignmentId, studentId, studentName, onSubmit }: SubmissionFormProps) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const { register, handleSubmit, reset, watch } = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema),
  });

  const content = watch("content");
  const link = watch("link");

  // Audio recording functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", blob, "recitation.webm");

        try {
          const token = localStorage.getItem("token");
          const response = await fetch("/api/upload/audio", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          const result = await response.json();
          if (response.ok && result.url) {
            setAudioUrl(result.url);
            toast.success("Audio recorded successfully!");
          } else {
            throw new Error(result.message || "Failed to upload audio");
          }
        } catch (error) {
          toast.error((error as Error).message || "Failed to upload audio");
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast.error("Failed to access microphone. Please check permissions.");
      console.error("Recording error:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "audio/webm", "audio/mpeg"];
      return file.size <= maxSize && allowedTypes.includes(file.type);
    });

    if (validFiles.length !== files.length) {
      toast.error("Some files were rejected. Only PDF, JPEG, PNG, and audio files up to 10MB are allowed.");
    }

    setAttachments((prev) => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const onFormSubmit = async (data: SubmissionFormData) => {
    // Validate at least one submission method
    if (!data.content && !data.link && !audioUrl && attachments.length === 0) {
      toast.error("Please provide content, link, audio recording, or upload files");
      return;
    }

    setLoading(true);
    try {
      // Get student info from auth context or props
      const finalStudentId = studentId || user?.student?._id || user?._id || "";
      const finalStudentName = studentName || user?.fullName || "";

      if (!finalStudentId || !finalStudentName) {
        throw new Error("Student information is required");
      }

      // Prepare attachments as objects with name, url, type
      const attachmentObjects = attachments.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file), // In production, upload files first
        type: file.type,
        size: file.size,
      }));

      // Upload files if needed (in production, upload to server first)
      const uploadedAttachments = await Promise.all(
        attachmentObjects.map(async (att) => {
          if (att.url.startsWith("blob:")) {
            // Upload file to server
            const formData = new FormData();
            const file = attachments.find((f) => f.name === att.name);
            if (file) {
              formData.append("file", file);
              const token = localStorage.getItem("token");
              const uploadResponse = await fetch("/api/upload", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                body: formData,
              });
              const uploadResult = await uploadResponse.json();
              if (uploadResponse.ok && uploadResult.url) {
                return {
                  name: att.name,
                  url: uploadResult.url,
                  type: att.type,
                  size: att.size,
                };
              }
            }
          }
          return att;
        }),
      );

      const token = localStorage.getItem("token");
      const response = await fetch(`/api/assignments/${assignmentId}/submit-homework`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: data.content || "",
          link: data.link || "",
          audioUrl: audioUrl || "",
          attachments: uploadedAttachments,
          studentId: finalStudentId,
          studentName: finalStudentName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to submit homework");
      }

      toast.success("Homework submitted successfully!");
      reset();
      setAttachments([]);
      setAudioUrl("");
      onSubmit();
    } catch (error) {
      toast.error((error as Error).message || "Failed to submit homework");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Content</label>
        <textarea
          {...register("content")}
          rows={6}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          placeholder="Enter your submission content..."
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Link (Optional)</label>
        <input
          {...register("link")}
          type="url"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          placeholder="https://example.com"
        />
      </div>

      {/* Audio Recording */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Audio Recording</label>
        <div className="flex items-center gap-2">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              <Mic className="h-4 w-4" />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100"
            >
              <MicOff className="h-4 w-4" />
              <span>Stop Recording</span>
            </button>
          )}
          {audioUrl && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-1 text-sm text-green-700">
              <span>✓ Audio recorded</span>
              <audio src={audioUrl} controls className="h-6" />
            </div>
          )}
        </div>
      </div>

      {/* File Attachments */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Attachments</label>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-600 hover:bg-neutral-100">
            <Upload className="h-4 w-4" />
            <span>Upload files (PDF, JPEG, PNG, Audio - Max 10MB)</span>
            <input
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png,audio/webm,audio/mpeg"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>

          {attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-neutral-400" />
                    <span className="text-sm text-neutral-700">{file.name}</span>
                    <span className="text-xs text-neutral-500">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="rounded-md p-1 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || (!content && !link && !audioUrl && attachments.length === 0)}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit Homework"}
        </button>
      </div>
    </form>
  );
}
