"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

type AttendanceRecord = {
  date: Date | string;
  status: "present" | "absent" | "late" | "excused";
  checkInTime?: Date | string;
  checkOutTime?: Date | string;
};

type AttendanceCalendarProps = {
  records: AttendanceRecord[];
  onDayClick?: (date: Date) => void;
  month?: Date;
  onMonthChange?: (date: Date) => void;
};

const statusColors = {
  present: "bg-green-500",
  absent: "bg-red-500",
  late: "bg-yellow-500",
  excused: "bg-blue-500",
};

const statusLabels = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
};

export function AttendanceCalendar({
  records,
  onDayClick,
  month: initialMonth,
  onMonthChange,
}: AttendanceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(initialMonth || new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of week for the month
  const firstDayOfWeek = monthStart.getDay();
  const emptyDays = Array(firstDayOfWeek).fill(null);

  const handlePreviousMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const getStatusForDate = (date: Date): AttendanceRecord["status"] | null => {
    const record = records.find((r) => isSameDay(new Date(r.date), date));
    return record?.status || null;
  };

  const handleDayClick = (date: Date) => {
    onDayClick?.(date);
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={handlePreviousMonth}
          className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-semibold text-neutral-900">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <button
          onClick={handleNextMonth}
          className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day names */}
        {dayNames.map((day) => (
          <div key={day} className="p-2 text-center text-xs font-semibold text-neutral-600">
            {day}
          </div>
        ))}

        {/* Empty days for alignment */}
        {emptyDays.map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}

        {/* Days */}
        {daysInMonth.map((day) => {
          const status = getStatusForDate(day);
          const isTodayDate = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className={`aspect-square rounded-md border transition-colors ${
                isTodayDate
                  ? "border-indigo-500 bg-indigo-50 font-semibold"
                  : "border-neutral-200 hover:border-indigo-300 hover:bg-indigo-50"
              } ${status ? "relative" : ""}`}
            >
              <span className={`text-sm ${isTodayDate ? "text-indigo-700" : "text-neutral-700"}`}>
                {format(day, "d")}
              </span>
              {status && (
                <div
                  className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${statusColors[status]}`}
                  title={statusLabels[status]}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-neutral-200 pt-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span className="text-xs text-neutral-600">Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span className="text-xs text-neutral-600">Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <span className="text-xs text-neutral-600">Late</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span className="text-xs text-neutral-600">Excused</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full border border-neutral-300 bg-transparent" />
          <span className="text-xs text-neutral-600">No record</span>
        </div>
      </div>
    </div>
  );
}
