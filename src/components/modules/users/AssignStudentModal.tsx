"use client";

import { Fragment, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import toast from "react-hot-toast";

type StudentOption = {
  id: string;
  name: string;
};

type AssignStudentModalProps = {
  open: boolean;
  onClose: () => void;
  teacherName: string;
  students: StudentOption[];
  currentStudentIds: string[];
  onSave: (studentIds: string[]) => Promise<void>;
};

export function AssignStudentModal({
  open,
  onClose,
  teacherName,
  students,
  currentStudentIds,
  onSave,
}: AssignStudentModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(currentStudentIds);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredStudents = useMemo(
    () =>
      students.filter((student) =>
        student.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [students, search],
  );

  const toggleStudent = (studentId: string) => {
    setSelectedIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(selectedIds);
      toast.success("Students updated.");
      onClose();
    } catch (error) {
      toast.error((error as Error).message || "Failed to update students.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                <Dialog.Title className="text-lg font-semibold text-neutral-900">
                  Assign Students
                </Dialog.Title>
                <p className="mt-1 text-sm text-neutral-500">
                  Manage students for {teacherName}.
                </p>

                <div className="mt-4">
                  <input
                    className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                    placeholder="Search students"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                <div className="mt-4 max-h-60 space-y-2 overflow-y-auto">
                  {filteredStudents.map((student) => (
                    <label
                      key={student.id}
                      className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm"
                    >
                      <span>{student.name}</span>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(student.id)}
                        onChange={() => toggleStudent(student.id)}
                      />
                    </label>
                  ))}
                  {filteredStudents.length === 0 && (
                    <p className="text-sm text-neutral-500">No students found.</p>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
