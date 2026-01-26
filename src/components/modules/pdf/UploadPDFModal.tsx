"use client";

import { useState, useRef, useEffect } from "react";
import { X, Upload, FileText, Users } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

type UploadPDFModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  students?: Array<{ _id: string; userId: { fullName: string } }>;
};

export function UploadPDFModal({
  isOpen,
  onClose,
  onSuccess,
  students = [],
}: UploadPDFModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Other");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const response = await axios.get("/api/pdfs/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast.error("Please select a PDF file");
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error("File size must be less than 50MB");
        return;
      }
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(".pdf", ""));
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.replace(".pdf", ""));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !category) {
      toast.error("Please fill in all required fields");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("category", category);
      formData.append("description", description);
      if (assignedTo.length > 0) {
        formData.append("assignedTo", JSON.stringify(assignedTo));
      }

      await axios.post("/api/pdfs", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            setProgress(percentCompleted);
          }
        },
      });

      toast.success("PDF uploaded successfully");
      onSuccess?.();
      handleClose();
    } catch (error) {
      toast.error((error as Error).message || "Failed to upload PDF");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setTitle("");
    setCategory("Other");
    setDescription("");
    setAssignedTo([]);
    setProgress(0);
    onClose();
  };

  const toggleStudent = (studentId: string) => {
    setAssignedTo((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg border border-neutral-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-neutral-900">Upload PDF</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {/* File Upload */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-neutral-700">PDF File *</label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 p-8 hover:border-indigo-400"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mb-2 h-8 w-8 text-neutral-400" />
              {file ? (
                <div className="text-center">
                  <FileText className="mx-auto h-6 w-6 text-indigo-600" />
                  <p className="mt-2 text-sm font-medium text-neutral-900">{file.name}</p>
                  <p className="text-xs text-neutral-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-neutral-600">Click to upload or drag and drop</p>
                  <p className="text-xs text-neutral-500">PDF files only (max 50MB)</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            {uploading && (
              <div className="mt-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full bg-indigo-600 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-500">{progress}% uploaded</p>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-neutral-700">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          {/* Category */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-neutral-700">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              required
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-neutral-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Assign to Students */}
          {students && students.length > 0 && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Assign to Students (Optional)
              </label>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-neutral-200 p-2">
                {students.map((student) => (
                  <label
                    key={student._id}
                    className="flex items-center gap-2 rounded-lg p-2 hover:bg-neutral-50"
                  >
                    <input
                      type="checkbox"
                      checked={assignedTo.includes(student._id)}
                      onChange={() => toggleStudent(student._id)}
                      className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-neutral-700">
                      {student.userId?.fullName || "Unknown"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file || !title}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload PDF"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
