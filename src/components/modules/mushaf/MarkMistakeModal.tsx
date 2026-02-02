"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Info } from "lucide-react";
import toast from "react-hot-toast";
import { Dialog } from "@headlessui/react";
import { AudioRecorder } from "./AudioRecorder";
import {
  TAJWEED_RULES,
  TAJWEED_EXPLANATIONS,
  getTajweedRulesForType,
  getTajweedExplanationForType,
  MADD_TYPES,
  HOLD_REQUIRED_TYPES,
  FOCUS_LETTERS_TYPES,
} from "@/constants/tajweedRules";

const mistakeSchema = z.object({
  type: z.string().min(1, "Mistake type is required"),
  category: z.enum(["tajweed", "letter", "stop", "memory", "other", "atkees"]),
  page: z.number().min(1).max(604),
  surah: z.number().min(1).max(114).optional(),
  ayah: z.number().min(1).optional(),
  wordIndex: z.number().min(0),
  letterIndex: z.number().min(0).optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  tajweedData: z
    .object({
      stretchCount: z.number().min(0).max(6).optional(),
      holdRequired: z.boolean().optional(),
      focusLetters: z.array(z.string()).optional(),
      tajweedRule: z.string().optional(),
      teacherNote: z.string().optional(),
    })
    .optional(),
  note: z.string().optional(),
  audioUrl: z.string().url().optional().or(z.literal("")),
});

// Enhanced schema with conditional validation for Tajweed
const createTajweedSchema = (mistakeType: string) => {
  const baseSchema = mistakeSchema;
  
  if (MADD_TYPES.includes(mistakeType)) {
    return baseSchema.refine(
      (data) => {
        if (data.category === "tajweed" && data.tajweedData) {
          return data.tajweedData.stretchCount !== undefined && data.tajweedData.stretchCount >= 2;
        }
        return true;
      },
      {
        message: "Stretch count is required for Madd mistakes (minimum 2 harakah)",
        path: ["tajweedData", "stretchCount"],
      }
    );
  }
  
  return baseSchema;
};

type MistakeFormData = z.infer<typeof mistakeSchema>;

type MarkMistakeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  page: number;
  wordIndex: number;
  letterIndex?: number;
  selectedLetter?: string;
  wordText?: string;
  position?: { x: number; y: number };
  surah?: number;
  ayah?: number;
  onSave: (data: MistakeFormData) => Promise<void>;
};

const mistakeTypes = [
  { value: "madd", category: "tajweed", label: "Madd (Stretch)" },
  { value: "ghunnah", category: "tajweed", label: "Ghunnah (Nasalization)" },
  { value: "idgham", category: "tajweed", label: "Idgham (Assimilation)" },
  { value: "ikhfa", category: "tajweed", label: "Ikhfa (Concealment)" },
  { value: "qalqalah", category: "tajweed", label: "Qalqalah (Echo)" },
  { value: "wrong_letter", category: "letter", label: "Wrong Letter" },
  { value: "missing_letter", category: "letter", label: "Missing Letter" },
  { value: "extra_letter", category: "letter", label: "Extra Letter" },
  { value: "wrong_stop", category: "stop", label: "Wrong Stop" },
  { value: "missing_stop", category: "stop", label: "Missing Stop" },
  { value: "memory_error", category: "memory", label: "Memory Error" },
  { value: "atkees", category: "atkees", label: "Atkees" },
  { value: "hesitation", category: "other", label: "Hesitation" },
  { value: "other", category: "other", label: "Other" },
];

// Helper function to parse focus letters from comma-separated string
const parseFocusLetters = (input: string): string[] => {
  if (!input || input.trim() === "") return [];
  return input
    .split(",")
    .map((letter) => letter.trim())
    .filter((letter) => letter.length > 0);
};

// Helper function to format focus letters for display
const formatFocusLetters = (letters: string[]): string => {
  return letters.join(", ");
};

export function MarkMistakeModal({
  isOpen,
  onClose,
  page,
  wordIndex,
  letterIndex,
  selectedLetter,
  wordText,
  position,
  surah,
  ayah,
  onSave,
}: MarkMistakeModalProps) {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [markEntireWord, setMarkEntireWord] = useState(letterIndex === undefined);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setValue,
    trigger,
  } = useForm<MistakeFormData>({
    resolver: zodResolver(mistakeSchema),
    defaultValues: {
      page,
      wordIndex,
      letterIndex: markEntireWord ? undefined : letterIndex,
      position: position || { x: 0, y: 0 },
      surah,
      ayah,
      category: "other",
    },
  });

  // Update letterIndex when toggle changes
  useEffect(() => {
    if (markEntireWord) {
      setValue("letterIndex", undefined);
    } else if (letterIndex !== undefined) {
      setValue("letterIndex", letterIndex);
    }
  }, [markEntireWord, letterIndex, setValue]);

  const selectedType = watch("type");
  const selectedCategory = watch("category");
  const selectedMistakeType = mistakeTypes.find((t) => t.value === selectedType);
  const tajweedRulesForType = selectedType ? getTajweedRulesForType(selectedType) : [];
  const tajweedExplanation = selectedType ? getTajweedExplanationForType(selectedType) : undefined;
  const tajweedData = watch("tajweedData");

  // Auto-set category when type changes
  useEffect(() => {
    if (selectedMistakeType) {
      setValue("category", selectedMistakeType.category as any);
    }
  }, [selectedMistakeType, setValue]);

  // Handle focus letters input change
  const handleFocusLettersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const letters = parseFocusLetters(e.target.value);
    setValue("tajweedData.focusLetters", letters);
  };

  // Get current focus letters as string for input
  const focusLettersString = tajweedData?.focusLetters ? formatFocusLetters(tajweedData.focusLetters) : "";

  // Check if current mistake type requires specific fields
  const isMaddType = MADD_TYPES.includes(selectedType);
  const requiresHold = HOLD_REQUIRED_TYPES.includes(selectedType);
  const canHaveFocusLetters = FOCUS_LETTERS_TYPES.includes(selectedType);

  const handleAudioRecorded = (blob: Blob, url: string) => {
    setAudioBlob(blob);
    setAudioUrl(url);
    setValue("audioUrl", url);
  };

  const handleAudioRemoved = () => {
    setAudioBlob(null);
    setAudioUrl("");
    setValue("audioUrl", "");
  };

  const onSubmit = async (data: MistakeFormData) => {
    try {
      // Validate Tajweed-specific requirements
      if (isTajweed) {
        // For Madd types, stretch count is required
        if (isMaddType && (!data.tajweedData?.stretchCount || data.tajweedData.stretchCount < 2)) {
          toast.error("Stretch count is required for Madd mistakes (minimum 2 harakah)");
          return;
        }
      }

      // Upload audio if recorded
      let finalAudioUrl = data.audioUrl || "";
      if (audioBlob && !finalAudioUrl.startsWith("/uploads/") && !finalAudioUrl.startsWith("blob:")) {
        setIsUploadingAudio(true);
        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, `mistake-${Date.now()}.webm`);

          const token = localStorage.getItem("token");
          const uploadResponse = await fetch("/api/upload/audio", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error || "Failed to upload audio");
          }

          const uploadData = await uploadResponse.json();
          finalAudioUrl = uploadData.url;
        } catch (uploadError) {
          console.error("Audio upload error:", uploadError);
          toast.error((uploadError as Error).message || "Failed to upload audio");
          setIsUploadingAudio(false);
          return;
        } finally {
          setIsUploadingAudio(false);
        }
      }

      // Ensure tajweedData is only included for Tajweed mistakes
      const submitData: MistakeFormData = {
        ...data,
        audioUrl: finalAudioUrl,
        tajweedData: isTajweed ? data.tajweedData : undefined,
      };

      await onSave(submitData);
      reset();
      setAudioUrl("");
      setAudioBlob(null);
      onClose();
    } catch (error) {
      toast.error((error as Error).message || "Failed to save mistake");
    }
  };

  const isTajweed = selectedCategory === "tajweed";

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <Dialog.Title className="text-lg font-semibold text-neutral-900">Mark Mistake</Dialog.Title>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="max-h-[calc(100vh-200px)] overflow-y-auto p-6">
            <div className="space-y-4">
              {/* Selected Word Info */}
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-neutral-900">
                    Page {page}, Word {wordIndex + 1}
                    {letterIndex !== undefined && !markEntireWord && (
                      <span className="text-primary">, Letter {letterIndex + 1}</span>
                    )}
                    {surah && ayah && ` - Surah ${surah}, Ayah ${ayah}`}
                  </p>
                  
                  {wordText && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500">Word:</span>
                      <span className="text-lg font-arabic text-neutral-900" dir="rtl">
                        {wordText}
                      </span>
                    </div>
                  )}
                  
                  {selectedLetter && letterIndex !== undefined && !markEntireWord && (
                    <div className="flex items-center gap-2 rounded-md bg-blue-50 p-2">
                      <span className="text-xs text-neutral-500">Selected Letter:</span>
                      <span className="text-2xl font-arabic text-blue-700" dir="rtl">
                        {selectedLetter}
                      </span>
                      <span className="text-xs text-neutral-500">
                        (Letter {letterIndex + 1} of {wordText?.length || 0})
                      </span>
                    </div>
                  )}
                  
                  {letterIndex !== undefined && (
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={markEntireWord}
                          onChange={(e) => setMarkEntireWord(e.target.checked)}
                          className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs text-neutral-600">
                          Mark entire word instead of specific letter
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Mistake Type */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Mistake Type *</label>
                <select
                  {...register("type")}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select mistake type</option>
                  {mistakeTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.type && <p className="mt-1 text-xs text-red-600">{errors.type.message}</p>}
              </div>

              {/* Category (auto-set, but can be overridden) */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Category *</label>
                <select
                  {...register("category")}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="tajweed">Tajweed</option>
                  <option value="letter">Letter</option>
                  <option value="stop">Stop</option>
                  <option value="memory">Memory</option>
                  <option value="atkees">Atkees</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Tajweed-specific fields */}
              {isTajweed && (
                <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start justify-between">
                    <h4 className="text-sm font-semibold text-blue-900">Tajweed Details</h4>
                    {tajweedExplanation && (
                      <div className="group relative">
                        <Info className="h-4 w-4 text-blue-600 cursor-help" />
                        <div className="absolute right-0 top-6 z-10 hidden w-64 rounded-lg border border-neutral-200 bg-white p-3 text-xs shadow-lg group-hover:block">
                          <p className="font-semibold text-neutral-900 mb-1">{tajweedExplanation.title}</p>
                          <p className="text-neutral-600 mb-2">{tajweedExplanation.description}</p>
                          <div className="mt-2">
                            <p className="font-medium text-neutral-700 mb-1">Common Mistakes:</p>
                            <ul className="list-disc list-inside space-y-0.5 text-neutral-600">
                              {tajweedExplanation.commonMistakes.map((mistake, idx) => (
                                <li key={idx}>{mistake}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="mt-2 pt-2 border-t border-neutral-200">
                            <p className="font-medium text-neutral-700 mb-1">Correct Practice:</p>
                            <p className="text-neutral-600">{tajweedExplanation.correctPractice}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tajweed Rule Selection */}
                  {tajweedRulesForType.length > 0 && (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                        Tajweed Rule *
                      </label>
                      <select
                        {...register("tajweedData.tajweedRule")}
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">Select rule</option>
                        {tajweedRulesForType.map((rule) => (
                          <option key={rule.id} value={rule.id}>
                            {rule.name}
                            {rule.description && ` - ${rule.description}`}
                          </option>
                        ))}
                      </select>
                      {errors.tajweedData?.tajweedRule && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.tajweedData.tajweedRule.message}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Stretch Count (Harakah) - For Madd types */}
                  {isMaddType && (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                        Stretch Count (Harakah) *
                      </label>
                      <select
                        {...register("tajweedData.stretchCount", {
                          required: "Stretch count is required for Madd",
                          valueAsNumber: true,
                        })}
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">Select harakah count</option>
                        <option value={2}>2 Harakah (Natural Madd)</option>
                        <option value={4}>4 Harakah (Secondary Madd)</option>
                        <option value={6}>6 Harakah (Necessary Madd)</option>
                      </select>
                      {errors.tajweedData?.stretchCount && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.tajweedData.stretchCount.message}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-neutral-500">
                        Select the required duration for this madd type
                      </p>
                    </div>
                  )}

                  {/* Hold Required - For Idgham, Iqlab, Ikhfa, Ghunnah */}
                  {requiresHold && (
                    <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
                      <label className="flex items-center gap-2">
                        <input
                          {...register("tajweedData.holdRequired")}
                          type="checkbox"
                          className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="text-xs font-medium text-neutral-700">Hold Required (Ghunnah)</span>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            This rule requires a nasal sound (ghunnah) lasting 2 harakah
                          </p>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Focus Letters - For applicable types */}
                  {canHaveFocusLetters && (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                        Focus Letters {tajweedRulesForType.length > 0 && "(if applicable)"}
                      </label>
                      <input
                        type="text"
                        value={focusLettersString}
                        onChange={handleFocusLettersChange}
                        placeholder="e.g., ن، م، ي، و or ب، ت، ث"
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <p className="mt-1 text-xs text-neutral-500">
                        Enter Arabic letters this rule applies to, separated by commas (e.g., "ن، م" or "ب، ت، ث")
                      </p>
                      {tajweedRulesForType.length > 0 && tajweedData?.tajweedRule && (
                        <p className="mt-1 text-xs text-blue-600">
                          Suggested letters for selected rule:{" "}
                          {tajweedRulesForType
                            .find((r) => r.id === tajweedData.tajweedRule)
                            ?.letters?.join(", ") || "N/A"}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Teacher Note (Tajweed-specific) */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                      Teacher Note (Tajweed-specific)
                    </label>
                    <textarea
                      {...register("tajweedData.teacherNote")}
                      rows={3}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Explain the specific Tajweed issue, what the student did wrong, and how to correct it..."
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      Provide detailed feedback about this specific Tajweed mistake
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Notes</label>
                <textarea
                  {...register("note")}
                  rows={3}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Enter any additional notes about this mistake..."
                />
              </div>

              {/* Audio Recording */}
              <AudioRecorder
                onAudioRecorded={handleAudioRecorded}
                onAudioRemoved={handleAudioRemoved}
                initialAudioUrl={audioUrl || undefined}
                maxDuration={120}
              />
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-neutral-200 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploadingAudio}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingAudio ? "Uploading Audio..." : "Save Mistake"}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
