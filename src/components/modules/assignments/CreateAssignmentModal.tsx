"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2, BookOpen, FileText, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Dialog } from "@headlessui/react";
import { SURAHS } from "@/lib/mushaf/surahData";
import type { ClassworkPhase, HomeworkItem } from "@/lib/db/models/Assignment";

const assignmentSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  studentName: z.string().min(1, "Student name is required"),
  // Classwork
  classworkSabq: z.array(
    z.object({
      assignmentRange: z.string().min(1, "Range is required"),
      details: z.string().optional(),
      surahNumber: z.number().optional(),
      surahName: z.string().optional(),
      fromAyah: z.number().optional(),
      toAyah: z.number().optional(),
    }),
  ),
  classworkSabqi: z.array(
    z.object({
      assignmentRange: z.string().min(1, "Range is required"),
      details: z.string().optional(),
      surahNumber: z.number().optional(),
      surahName: z.string().optional(),
      fromAyah: z.number().optional(),
      toAyah: z.number().optional(),
    }),
  ),
  classworkManzil: z.array(
    z.object({
      assignmentRange: z.string().min(1, "Range is required"),
      details: z.string().optional(),
      surahNumber: z.number().optional(),
      surahName: z.string().optional(),
      fromAyah: z.number().optional(),
      toAyah: z.number().optional(),
    }),
  ),
  // Homework
  homeworkEnabled: z.boolean(),
  homeworkItems: z.array(
    z.object({
      type: z.enum(["sabq", "sabqi", "manzil"]),
      rangeMode: z.enum(["surah_ayah", "surah_surah", "juz_juz", "multiple_juz"]),
      fromSurah: z.number().min(1).max(114),
      fromSurahName: z.string(),
      fromAyah: z.number().min(1),
      toSurah: z.number().min(1).max(114),
      toSurahName: z.string(),
      toAyah: z.number().min(1),
      juzList: z.array(z.number()).optional(),
      content: z.string().optional(),
    }),
  ),
  pdfId: z.string().optional(),
  qaidahBook: z.enum(["qaidah1", "qaidah2"]).optional(),
  qaidahPage: z.number().optional(),
  comment: z.string().optional(),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

type StudentOption = {
  id: string;
  name: string;
  email: string;
};

type CreateAssignmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  students: StudentOption[];
  onSuccess: () => void;
  ticketId?: string; // Optional: if creating from ticket
  weeklyEvaluationId?: string; // Optional: if creating from evaluation
};

export function CreateAssignmentModal({
  isOpen,
  onClose,
  students,
  onSuccess,
  ticketId,
  weeklyEvaluationId,
}: CreateAssignmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [availablePDFs, setAvailablePDFs] = useState<Array<{ _id: string; title: string }>>([]);
  const [activeTab, setActiveTab] = useState<"classwork" | "homework" | "qaidah">("classwork");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
    setValue,
  } = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      homeworkEnabled: false,
      classworkSabq: [],
      classworkSabqi: [],
      classworkManzil: [],
      homeworkItems: [],
    },
  });

  const {
    fields: sabqFields,
    append: appendSabq,
    remove: removeSabq,
  } = useFieldArray({ control, name: "classworkSabq" });
  const {
    fields: sabqiFields,
    append: appendSabqi,
    remove: removeSabqi,
  } = useFieldArray({ control, name: "classworkSabqi" });
  const {
    fields: manzilFields,
    append: appendManzil,
    remove: removeManzil,
  } = useFieldArray({ control, name: "classworkManzil" });
  const {
    fields: homeworkFields,
    append: appendHomework,
    remove: removeHomework,
  } = useFieldArray({ control, name: "homeworkItems" });

  const homeworkEnabled = watch("homeworkEnabled");

  // Load PDFs on mount
  useEffect(() => {
    if (isOpen) {
      fetchPDFs();
    }
  }, [isOpen]);

  const fetchPDFs = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/pdfs", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (response.ok && result.pdfs) {
        setAvailablePDFs(result.pdfs.map((pdf: any) => ({ _id: pdf._id, title: pdf.title })));
      }
    } catch (error) {
      console.error("Failed to load PDFs:", error);
    }
  };

  const addClassworkEntry = (type: "sabq" | "sabqi" | "manzil") => {
    const entry = {
      assignmentRange: "",
      details: "",
      surahNumber: undefined,
      surahName: "",
      fromAyah: undefined,
      toAyah: undefined,
    };
    if (type === "sabq") appendSabq(entry);
    else if (type === "sabqi") appendSabqi(entry);
    else appendManzil(entry);
  };

  const addHomeworkItem = () => {
    appendHomework({
      type: "sabq",
      rangeMode: "surah_ayah",
      fromSurah: 1,
      fromSurahName: "Al-Fatihah",
      fromAyah: 1,
      toSurah: 1,
      toSurahName: "Al-Fatihah",
      toAyah: 7,
      content: "",
    });
  };

  const onSubmit = async (data: AssignmentFormData) => {
    if (!selectedStudent) {
      toast.error("Please select a student");
      return;
    }

    const selectedStudentData = students.find((s) => s.id === selectedStudent);
    if (!selectedStudentData) {
      toast.error("Selected student not found");
      return;
    }

    setLoading(true);
    try {
      // Build classwork structure
      const classwork = {
        sabq: data.classworkSabq.map((entry) => ({
          type: "sabq" as const,
          assignmentRange: entry.assignmentRange,
          details: entry.details || "",
          surahNumber: entry.surahNumber,
          surahName: entry.surahName || "",
          fromAyah: entry.fromAyah,
          toAyah: entry.toAyah,
          createdAt: new Date(),
        })),
        sabqi: data.classworkSabqi.map((entry) => ({
          type: "sabqi" as const,
          assignmentRange: entry.assignmentRange,
          details: entry.details || "",
          surahNumber: entry.surahNumber,
          surahName: entry.surahName || "",
          fromAyah: entry.fromAyah,
          toAyah: entry.toAyah,
          createdAt: new Date(),
        })),
        manzil: data.classworkManzil.map((entry) => ({
          type: "manzil" as const,
          assignmentRange: entry.assignmentRange,
          details: entry.details || "",
          surahNumber: entry.surahNumber,
          surahName: entry.surahName || "",
          fromAyah: entry.fromAyah,
          toAyah: entry.toAyah,
          createdAt: new Date(),
        })),
      };

      // Build homework structure
      const homework: any = {
        enabled: data.homeworkEnabled,
        items: data.homeworkItems.map((item) => ({
          type: item.type,
          range: {
            mode: item.rangeMode,
            from: {
              surah: item.fromSurah,
              surahName: item.fromSurahName,
              ayah: item.fromAyah,
            },
            to: {
              surah: item.toSurah,
              surahName: item.toSurahName,
              ayah: item.toAyah,
            },
            ...(item.rangeMode === "juz_juz" || item.rangeMode === "multiple_juz"
              ? { juzList: item.juzList || [] }
              : {}),
          },
          source: {
            suggestedFrom: ticketId ? "ticket" : "manual",
            ticketIds: ticketId ? [ticketId] : [],
          },
          content: item.content || "",
        })),
      };

      // Add PDF if selected
      if (data.pdfId) {
        homework.pdfId = data.pdfId;
      }

      // Add Qaidah homework if provided
      if (data.qaidahBook && data.qaidahPage) {
        homework.qaidahHomework = {
          book: data.qaidahBook,
          page: data.qaidahPage,
          teachingDate: new Date(),
        };
      }

      const token = localStorage.getItem("token");
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: selectedStudent,
          studentName: selectedStudentData.name,
          ticketId,
          weeklyEvaluationId,
          classwork,
          homework,
          comment: data.comment || "",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to create assignment");
      }

      toast.success("Assignment created successfully!");
      reset();
      setSelectedStudent("");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error((error as Error).message || "Failed to create assignment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
            <Dialog.Title className="text-lg font-semibold text-neutral-900">
              Create New Assignment
            </Dialog.Title>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6">
            {/* Student Selection */}
            <div className="mb-6">
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">Student *</label>
              <select
                value={selectedStudent}
                onChange={(e) => {
                  setSelectedStudent(e.target.value);
                  const student = students.find((s) => s.id === e.target.value);
                  if (student) {
                    setValue("studentId", e.target.value);
                    setValue("studentName", student.name);
                  }
                }}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Select a student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.email})
                  </option>
                ))}
              </select>
              {errors.studentId && (
                <p className="mt-1 text-xs text-red-600">{errors.studentId.message}</p>
              )}
            </div>

            {/* Tabs */}
            <div className="mb-6 border-b border-neutral-200">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("classwork")}
                  className={`border-b-2 px-4 py-2 text-sm font-medium ${
                    activeTab === "classwork"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  <BookOpen className="mr-2 inline h-4 w-4" />
                  Classwork
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("homework")}
                  className={`border-b-2 px-4 py-2 text-sm font-medium ${
                    activeTab === "homework"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  <FileText className="mr-2 inline h-4 w-4" />
                  Homework
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("qaidah")}
                  className={`border-b-2 px-4 py-2 text-sm font-medium ${
                    activeTab === "qaidah"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  Qaidah
                </button>
              </div>
            </div>

            {/* Classwork Tab */}
            {activeTab === "classwork" && (
              <div className="space-y-6">
                {/* Sabq */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-neutral-900">Sabq (New Lesson)</h3>
                    <button
                      type="button"
                      onClick={() => addClassworkEntry("sabq")}
                      className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      <Plus className="h-3 w-3" />
                      Add Entry
                    </button>
                  </div>
                  <div className="space-y-3">
                    {sabqFields.map((field, index) => (
                      <div key={field.id} className="rounded-lg border border-neutral-200 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-neutral-600">Entry {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeSabq(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs text-neutral-600">Assignment Range *</label>
                            <input
                              {...register(`classworkSabq.${index}.assignmentRange`)}
                              type="text"
                              className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                              placeholder="e.g., Surah Al-Fatiha, Ayah 1-7"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-neutral-600">Surah</label>
                            <select
                              {...register(`classworkSabq.${index}.surahNumber`, { valueAsNumber: true })}
                              onChange={(e) => {
                                const surah = SURAHS.find((s) => s.id === parseInt(e.target.value));
                                if (surah) {
                                  setValue(`classworkSabq.${index}.surahName`, surah.arabicName);
                                }
                              }}
                              className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                            >
                              <option value="">Select Surah</option>
                              {SURAHS.map((surah) => (
                                <option key={surah.id} value={surah.id}>
                                  {surah.id}. {surah.englishName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-neutral-600">From Ayah</label>
                            <input
                              {...register(`classworkSabq.${index}.fromAyah`, { valueAsNumber: true })}
                              type="number"
                              className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-neutral-600">To Ayah</label>
                            <input
                              {...register(`classworkSabq.${index}.toAyah`, { valueAsNumber: true })}
                              type="number"
                              className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="mb-1 block text-xs text-neutral-600">Details</label>
                            <textarea
                              {...register(`classworkSabq.${index}.details`)}
                              rows={2}
                              className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                              placeholder="Additional notes..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sabqi */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-neutral-900">Sabqi (Review)</h3>
                    <button
                      type="button"
                      onClick={() => addClassworkEntry("sabqi")}
                      className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      <Plus className="h-3 w-3" />
                      Add Entry
                    </button>
                  </div>
                  <div className="space-y-3">
                    {sabqiFields.map((field, index) => (
                      <div key={field.id} className="rounded-lg border border-neutral-200 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-neutral-600">Entry {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeSabqi(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs text-neutral-600">Assignment Range *</label>
                            <input
                              {...register(`classworkSabqi.${index}.assignmentRange`)}
                              type="text"
                              className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                              placeholder="e.g., Surah Al-Fatiha, Ayah 1-7"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-neutral-600">Surah</label>
                            <select
                              {...register(`classworkSabqi.${index}.surahNumber`, { valueAsNumber: true })}
                              onChange={(e) => {
                                const surah = SURAHS.find((s) => s.id === parseInt(e.target.value));
                                if (surah) {
                                  setValue(`classworkSabqi.${index}.surahName`, surah.arabicName);
                                }
                              }}
                              className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                            >
                              <option value="">Select Surah</option>
                              {SURAHS.map((surah) => (
                                <option key={surah.id} value={surah.id}>
                                  {surah.id}. {surah.englishName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-neutral-600">From Ayah</label>
                            <input
                              {...register(`classworkSabqi.${index}.fromAyah`, { valueAsNumber: true })}
                              type="number"
                              className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-neutral-600">To Ayah</label>
                            <input
                              {...register(`classworkSabqi.${index}.toAyah`, { valueAsNumber: true })}
                              type="number"
                              className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="mb-1 block text-xs text-neutral-600">Details</label>
                            <textarea
                              {...register(`classworkSabqi.${index}.details`)}
                              rows={2}
                              className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                              placeholder="Additional notes..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Manzil */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-neutral-900">Manzil (Memorization)</h3>
                    <button
                      type="button"
                      onClick={() => addClassworkEntry("manzil")}
                      className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      <Plus className="h-3 w-3" />
                      Add Entry
                    </button>
                  </div>
                  <div className="space-y-3">
                    {manzilFields.map((field, index) => (
                      <div key={field.id} className="rounded-lg border border-neutral-200 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-neutral-600">Entry {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeManzil(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs text-neutral-600">Assignment Range *</label>
                            <input
                              {...register(`classworkManzil.${index}.assignmentRange`)}
                              type="text"
                              className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                              placeholder="e.g., Surah Al-Fatiha, Ayah 1-7"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-neutral-600">Surah</label>
                            <select
                              {...register(`classworkManzil.${index}.surahNumber`, { valueAsNumber: true })}
                              onChange={(e) => {
                                const surah = SURAHS.find((s) => s.id === parseInt(e.target.value));
                                if (surah) {
                                  setValue(`classworkManzil.${index}.surahName`, surah.arabicName);
                                }
                              }}
                              className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                            >
                              <option value="">Select Surah</option>
                              {SURAHS.map((surah) => (
                                <option key={surah.id} value={surah.id}>
                                  {surah.id}. {surah.englishName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-neutral-600">From Ayah</label>
                            <input
                              {...register(`classworkManzil.${index}.fromAyah`, { valueAsNumber: true })}
                              type="number"
                              className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-neutral-600">To Ayah</label>
                            <input
                              {...register(`classworkManzil.${index}.toAyah`, { valueAsNumber: true })}
                              type="number"
                              className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="mb-1 block text-xs text-neutral-600">Details</label>
                            <textarea
                              {...register(`classworkManzil.${index}.details`)}
                              rows={2}
                              className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                              placeholder="Additional notes..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Homework Tab */}
            {activeTab === "homework" && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="homeworkEnabled"
                    {...register("homeworkEnabled")}
                    className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="homeworkEnabled" className="text-sm font-medium text-neutral-700">
                    Enable Homework
                  </label>
                </div>

                {homeworkEnabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-neutral-900">Homework Items</h3>
                      <button
                        type="button"
                        onClick={addHomeworkItem}
                        className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        <Plus className="h-3 w-3" />
                        Add Item
                      </button>
                    </div>

                    <div className="space-y-4">
                      {homeworkFields.map((field, index) => (
                        <div key={field.id} className="rounded-lg border border-neutral-200 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-medium text-neutral-600">Item {index + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeHomework(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="mb-1 block text-xs text-neutral-600">Type *</label>
                              <select
                                {...register(`homeworkItems.${index}.type`)}
                                className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                              >
                                <option value="sabq">Sabq</option>
                                <option value="sabqi">Sabqi</option>
                                <option value="manzil">Manzil</option>
                              </select>
                            </div>

                            <div>
                              <label className="mb-1 block text-xs text-neutral-600">Range Mode *</label>
                              <select
                                {...register(`homeworkItems.${index}.rangeMode`)}
                                className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                              >
                                <option value="surah_ayah">Surah-Ayah</option>
                                <option value="surah_surah">Surah-Surah</option>
                                <option value="juz_juz">Juz-Juz</option>
                                <option value="multiple_juz">Multiple Juz</option>
                              </select>
                            </div>

                            <div>
                              <label className="mb-1 block text-xs text-neutral-600">From Surah *</label>
                              <select
                                {...register(`homeworkItems.${index}.fromSurah`, { valueAsNumber: true })}
                                onChange={(e) => {
                                  const surah = SURAHS.find((s) => s.id === parseInt(e.target.value));
                                  if (surah) {
                                    setValue(`homeworkItems.${index}.fromSurahName`, surah.arabicName);
                                  }
                                }}
                                className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                              >
                                {SURAHS.map((surah) => (
                                  <option key={surah.id} value={surah.id}>
                                    {surah.id}. {surah.englishName}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="mb-1 block text-xs text-neutral-600">From Ayah *</label>
                              <input
                                {...register(`homeworkItems.${index}.fromAyah`, { valueAsNumber: true })}
                                type="number"
                                min={1}
                                className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs text-neutral-600">To Surah *</label>
                              <select
                                {...register(`homeworkItems.${index}.toSurah`, { valueAsNumber: true })}
                                onChange={(e) => {
                                  const surah = SURAHS.find((s) => s.id === parseInt(e.target.value));
                                  if (surah) {
                                    setValue(`homeworkItems.${index}.toSurahName`, surah.arabicName);
                                  }
                                }}
                                className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                              >
                                {SURAHS.map((surah) => (
                                  <option key={surah.id} value={surah.id}>
                                    {surah.id}. {surah.englishName}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="mb-1 block text-xs text-neutral-600">To Ayah *</label>
                              <input
                                {...register(`homeworkItems.${index}.toAyah`, { valueAsNumber: true })}
                                type="number"
                                min={1}
                                className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                              />
                            </div>

                            <div className="col-span-2">
                              <label className="mb-1 block text-xs text-neutral-600">Content/Instructions</label>
                              <textarea
                                {...register(`homeworkItems.${index}.content`)}
                                rows={3}
                                className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                                placeholder="Homework instructions..."
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* PDF Selection */}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-neutral-700">PDF Document (Optional)</label>
                      <select
                        {...register("pdfId")}
                        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">No PDF</option>
                        {availablePDFs.map((pdf) => (
                          <option key={pdf._id} value={pdf._id}>
                            {pdf.title}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-neutral-500">
                        Select a PDF to attach. Annotations can be added after assignment creation.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Qaidah Tab */}
            {activeTab === "qaidah" && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">Qaidah Book</label>
                  <select
                    {...register("qaidahBook")}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">No Qaidah Homework</option>
                    <option value="qaidah1">Qaidah 1</option>
                    <option value="qaidah2">Qaidah 2</option>
                  </select>
                </div>

                {watch("qaidahBook") && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-neutral-700">Page Number</label>
                    <input
                      {...register("qaidahPage", { valueAsNumber: true })}
                      type="number"
                      min={1}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Enter page number"
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      Qaidah homework will be added to the homework section when enabled.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Comment */}
            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">Comment/Notes</label>
              <textarea
                {...register("comment")}
                rows={3}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Additional notes or comments..."
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedStudent}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Assignment"}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
