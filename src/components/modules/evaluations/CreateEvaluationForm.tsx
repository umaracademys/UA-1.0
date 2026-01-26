"use client";

import { useState, useEffect } from "react";
import { Plus, X, Save, Send } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { StarRating } from "./StarRating";

const evaluationSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  weekStartDate: z.string().min(1, "Week start date is required"),
  categories: z
    .array(
      z.object({
        name: z.string().min(1, "Category name is required"),
        rating: z.number().min(1).max(5),
        comments: z.string().optional(),
      }),
    )
    .min(1, "At least one category is required"),
  overallComments: z.string().optional(),
});

type EvaluationFormData = z.infer<typeof evaluationSchema>;

type CreateEvaluationFormProps = {
  students: Array<{ _id: string; fullName: string; email: string }>;
  templates?: Array<{
    id: string;
    name: string;
    categories: Array<{ name: string; description: string }>;
  }>;
  onSubmit: (data: EvaluationFormData, status: "draft" | "submitted") => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<EvaluationFormData>;
};

const DEFAULT_CATEGORIES = [
  { name: "Attendance", rating: 3, comments: "" },
  { name: "Participation", rating: 3, comments: "" },
  { name: "Recitation Quality", rating: 3, comments: "" },
  { name: "Homework Completion", rating: 3, comments: "" },
];

export function CreateEvaluationForm({
  students,
  templates = [],
  onSubmit,
  onCancel,
  initialData,
}: CreateEvaluationFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EvaluationFormData>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: {
      studentId: initialData?.studentId || "",
      weekStartDate: initialData?.weekStartDate || new Date().toISOString().split("T")[0],
      categories: initialData?.categories || DEFAULT_CATEGORIES,
      overallComments: initialData?.overallComments || "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "categories",
  });

  const watchedCategories = watch("categories");

  // Auto-save to draft every 30 seconds
  useEffect(() => {
    if (!autoSaveEnabled || isSubmitting) return;

    const interval = setInterval(async () => {
      const formData = watch();
      if (formData.studentId && formData.categories.length > 0) {
        try {
          await onSubmit(formData, "draft");
          setLastSaved(new Date());
        } catch (error) {
          // Silent fail for auto-save
        }
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoSaveEnabled, isSubmitting, watch, onSubmit]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      const newCategories = template.categories.map((cat) => ({
        name: cat.name,
        rating: 3,
        comments: "",
      }));
      setValue("categories", newCategories);
      setSelectedTemplate(templateId);
    }
  };

  const handleSaveDraft = async (data: EvaluationFormData) => {
    try {
      await onSubmit(data, "draft");
      setLastSaved(new Date());
      toast.success("Saved as draft");
    } catch (error) {
      toast.error((error as Error).message || "Failed to save draft");
    }
  };

  const handleSubmitForReview = async (data: EvaluationFormData) => {
    try {
      await onSubmit(data, "submitted");
      toast.success("Evaluation submitted for review");
    } catch (error) {
      toast.error((error as Error).message || "Failed to submit evaluation");
    }
  };

  return (
    <form className="space-y-6">
      {/* Student Selector */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Student *</label>
        <select
          {...register("studentId")}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">Select student</option>
          {students.map((student) => (
            <option key={student._id} value={student._id}>
              {student.fullName} ({student.email})
            </option>
          ))}
        </select>
        {errors.studentId && <p className="mt-1 text-xs text-red-600">{errors.studentId.message}</p>}
      </div>

      {/* Week Start Date */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Week Start Date *</label>
        <input
          type="date"
          {...register("weekStartDate")}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        {errors.weekStartDate && (
          <p className="mt-1 text-xs text-red-600">{errors.weekStartDate.message}</p>
        )}
      </div>

      {/* Template Selector */}
      {templates.length > 0 && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Use Template</label>
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">Select a template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Categories */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-neutral-700">Evaluation Categories *</label>
          <button
            type="button"
            onClick={() => append({ name: "", rating: 3, comments: "" })}
            className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Category
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <input
                  {...register(`categories.${index}.name`)}
                  placeholder="Category name"
                  className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="ml-2 rounded-md p-2 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-neutral-600">Rating</label>
                <StarRating
                  rating={watchedCategories[index]?.rating || 3}
                  onRatingChange={(rating) => setValue(`categories.${index}.rating`, rating)}
                  size="md"
                  showValue
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Comments</label>
                <textarea
                  {...register(`categories.${index}.comments`)}
                  rows={2}
                  placeholder="Add comments about this category..."
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          ))}
        </div>
        {errors.categories && (
          <p className="mt-1 text-xs text-red-600">{errors.categories.message}</p>
        )}
      </div>

      {/* Overall Comments */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Overall Comments</label>
        <textarea
          {...register("overallComments")}
          rows={4}
          placeholder="Add overall comments about the student's performance..."
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Auto-save indicator */}
      {lastSaved && (
        <div className="text-xs text-neutral-500">
          Last saved: {lastSaved.toLocaleTimeString()}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={handleSubmit(handleSaveDraft)}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save as Draft
          </button>
          <button
            type="button"
            onClick={handleSubmit(handleSubmitForReview)}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Submit for Review
          </button>
        </div>
      </div>
    </form>
  );
}
