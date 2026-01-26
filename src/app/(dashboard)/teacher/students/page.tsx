"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { Users, Search } from "lucide-react";

type Student = {
  _id: string;
  userId: {
    fullName: string;
    email: string;
  };
  programType: string;
  status: string;
  currentSabq?: string;
  currentSabqi?: string;
  currentManzil?: string;
};

export default function TeacherStudentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Please log in to view students.");
          setLoading(false);
          return;
        }

        // Get teacher ID from user object or fetch from API
        let teacherId = user?.teacher?._id;
        
        if (!teacherId) {
          // Fallback: fetch from API
          const userRes = await axios.get("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const profile = userRes.data.profile;
          teacherId = profile?._id;
        }

        if (!teacherId) {
          toast.error("Teacher profile not found.");
          setLoading(false);
          return;
        }

        const response = await axios.get(`/api/teachers/${teacherId}/students`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStudents(response.data.students || response.data.data || []);
      } catch (error: any) {
        console.error("Failed to fetch students:", error);
        const errorMessage = error.response?.data?.message || "Failed to load students";
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    // Wait for user to be loaded, then fetch students
    if (user) {
      fetchStudents();
    } else {
      // If user is not loaded yet, wait a bit and try again
      const timer = setTimeout(() => {
        if (!user) {
          fetchStudents();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const filteredStudents = students.filter((student) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      student.userId.fullName.toLowerCase().includes(searchLower) ||
      student.userId.email.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-neutral-500">Loading students...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">My Students</h1>
        <p className="mt-1 text-sm text-neutral-600">View and manage your assigned students</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Students List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredStudents.map((student) => (
          <div
            key={student._id}
            className="cursor-pointer rounded-lg border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md"
            onClick={() => router.push(`/teacher/students/${student._id}`)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900">
                  {student.userId.fullName}
                </h3>
                <p className="mt-1 text-sm text-neutral-500">{student.userId.email}</p>
                <div className="mt-3 space-y-1">
                  <div className="text-xs text-neutral-600">
                    <span className="font-medium">Program:</span> {student.programType}
                  </div>
                  <div className="text-xs text-neutral-600">
                    <span className="font-medium">Status:</span>{" "}
                    <span
                      className={`capitalize ${
                        student.status === "active" ? "text-green-600" : "text-yellow-600"
                      }`}
                    >
                      {student.status}
                    </span>
                  </div>
                  {student.currentSabq && (
                    <div className="text-xs text-neutral-600">
                      <span className="font-medium">Current Sabq:</span> {student.currentSabq}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-neutral-400" />
          <p className="mt-4 text-sm font-medium text-neutral-900">No students found</p>
          <p className="mt-1 text-sm text-neutral-500">
            {search ? "Try a different search term" : "You don't have any assigned students yet"}
          </p>
        </div>
      )}
    </div>
  );
}
