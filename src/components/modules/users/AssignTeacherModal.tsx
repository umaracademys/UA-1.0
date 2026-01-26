"use client";

import { Fragment, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import toast from "react-hot-toast";

type TeacherOption = {
  id: string;
  name: string;
};

type AssignTeacherModalProps = {
  open: boolean;
  onClose: () => void;
  studentName: string;
  teachers: TeacherOption[];
  currentTeacherIds: string[];
  onSave: (teacherIds: string[]) => Promise<void>;
};

export function AssignTeacherModal({
  open,
  onClose,
  studentName,
  teachers,
  currentTeacherIds,
  onSave,
}: AssignTeacherModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(currentTeacherIds);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredTeachers = useMemo(
    () =>
      teachers.filter((teacher) =>
        teacher.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [teachers, search],
  );

  const toggleTeacher = (teacherId: string) => {
    setSelectedIds((prev) =>
      prev.includes(teacherId) ? prev.filter((id) => id !== teacherId) : [...prev, teacherId],
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(selectedIds);
      toast.success("Teachers updated.");
      onClose();
    } catch (error) {
      toast.error((error as Error).message || "Failed to update teachers.");
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
                  Assign Teachers
                </Dialog.Title>
                <p className="mt-1 text-sm text-neutral-500">
                  Manage teachers for {studentName}.
                </p>

                <div className="mt-4">
                  <input
                    className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                    placeholder="Search teachers"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                <div className="mt-4 max-h-60 space-y-2 overflow-y-auto">
                  {filteredTeachers.map((teacher) => (
                    <label
                      key={teacher.id}
                      className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm"
                    >
                      <span>{teacher.name}</span>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(teacher.id)}
                        onChange={() => toggleTeacher(teacher.id)}
                      />
                    </label>
                  ))}
                  {filteredTeachers.length === 0 && (
                    <p className="text-sm text-neutral-500">No teachers found.</p>
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
                    className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
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
