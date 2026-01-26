"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Clock, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

type CheckInOutButtonProps = {
  onCheckIn: () => Promise<{ checkInTime: Date | string }>;
  onCheckOut: () => Promise<{ checkOutTime: Date | string; hours?: number }>;
  currentStatus?: {
    checkedIn: boolean;
    checkInTime?: Date | string;
    checkOutTime?: Date | string;
    hours?: number;
  };
};

export function CheckInOutButton({
  onCheckIn,
  onCheckOut,
  currentStatus,
}: CheckInOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      await onCheckIn();
      toast.success("Checked in successfully");
    } catch (error) {
      toast.error((error as Error).message || "Failed to check in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setIsLoading(true);
    try {
      const result = await onCheckOut();
      toast.success(
        result.hours
          ? `Checked out successfully. Total hours: ${result.hours.toFixed(1)}h`
          : "Checked out successfully",
      );
    } catch (error) {
      toast.error((error as Error).message || "Failed to check out");
    } finally {
      setIsLoading(false);
    }
  };

  const isCheckedIn = currentStatus?.checkedIn || false;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="mb-4 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <Clock className="h-5 w-5 text-neutral-500" />
          <p className="text-lg font-semibold text-neutral-900">
            {format(currentTime, "h:mm:ss a")}
          </p>
        </div>
        <p className="text-sm text-neutral-500">{format(currentTime, "EEEE, MMMM dd, yyyy")}</p>
      </div>

      {isCheckedIn && currentStatus?.checkInTime && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-green-800">
              Checked in at {format(new Date(currentStatus.checkInTime), "h:mm a")}
            </p>
          </div>
        </div>
      )}

      {!isCheckedIn ? (
        <button
          onClick={handleCheckIn}
          disabled={isLoading}
          className="w-full rounded-lg bg-green-600 px-6 py-4 text-lg font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isLoading ? "Checking In..." : "Check In"}
        </button>
      ) : (
        <div className="space-y-3">
          <button
            onClick={handleCheckOut}
            disabled={isLoading}
            className="w-full rounded-lg bg-red-600 px-6 py-4 text-lg font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? "Checking Out..." : "Check Out"}
          </button>
          {currentStatus?.hours && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
              <p className="text-sm font-medium text-blue-800">
                Today's Total: {currentStatus.hours.toFixed(1)} hours
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
