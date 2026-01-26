"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { User, Mail, Phone, Calendar, Edit } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

export default function StudentProfilePage() {
  const { user, refreshUser } = useAuth();
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.student?._id) {
      fetchStudentData();
    }
  }, [user]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`/api/students/${user?.student?._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudentData(response.data.student || response.data);
    } catch (error) {
      console.error("Failed to fetch student data:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-neutral-500">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">My Profile</h1>
          <p className="mt-1 text-sm text-neutral-600">View and manage your profile information</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
          <Edit className="h-4 w-4" />
          Edit Profile
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">Personal Information</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-neutral-400" />
              <div>
                <p className="text-xs text-neutral-500">Full Name</p>
                <p className="text-sm font-medium text-neutral-900">{user?.fullName || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-neutral-400" />
              <div>
                <p className="text-xs text-neutral-500">Email</p>
                <p className="text-sm font-medium text-neutral-900">{user?.email || "—"}</p>
              </div>
            </div>
            {user?.contactNumber && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-neutral-400" />
                <div>
                  <p className="text-xs text-neutral-500">Contact Number</p>
                  <p className="text-sm font-medium text-neutral-900">{user.contactNumber}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Student Information */}
        {studentData && (
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">Student Information</h2>
            <div className="space-y-4">
              {studentData.programType && (
                <div>
                  <p className="text-xs text-neutral-500">Program Type</p>
                  <p className="text-sm font-medium text-neutral-900">{studentData.programType}</p>
                </div>
              )}
              {studentData.enrollmentDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-neutral-400" />
                  <div>
                    <p className="text-xs text-neutral-500">Enrollment Date</p>
                    <p className="text-sm font-medium text-neutral-900">
                      {new Date(studentData.enrollmentDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-neutral-500">Status</p>
                <p
                  className={`text-sm font-medium ${
                    studentData.status === "active" ? "text-green-600" : "text-yellow-600"
                  }`}
                >
                  {studentData.status?.toUpperCase() || "—"}
                </p>
              </div>
              {studentData.currentSabq && (
                <div>
                  <p className="text-xs text-neutral-500">Current Sabq</p>
                  <p className="text-sm font-medium text-neutral-900">{studentData.currentSabq}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
