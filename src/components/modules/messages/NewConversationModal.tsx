"use client";

import { useState, useEffect } from "react";
import { X, Search, User } from "lucide-react";
import { Dialog } from "@headlessui/react";
import toast from "react-hot-toast";

type UserOption = {
  _id: string;
  fullName: string;
  email: string;
  role: string;
};

type NewConversationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversationId: string) => void;
  currentUserRole: string;
  currentUserId?: string;
  token: string | null;
};

export function NewConversationModal({
  isOpen,
  onClose,
  onConversationCreated,
  currentUserRole,
  currentUserId,
  token,
}: NewConversationModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [initialMessage, setInitialMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    } else {
      setSearchQuery("");
      setSelectedUsers([]);
      setInitialMessage("");
    }
  }, [isOpen, currentUserRole]);

  const fetchUsers = async () => {
    if (!token) {
      console.error("[NewConversationModal] No token available");
      toast.error("Authentication required. Please log in again.");
      return;
    }

    setFetchingUsers(true);
    try {
      let userList: any[] = [];

      console.log(`[NewConversationModal] Fetching users for role: ${currentUserRole}`);

      if (currentUserRole === "student") {
        // Students can message teachers
        const response = await fetch("/api/teachers", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();
        console.log(`[NewConversationModal] Teachers API response:`, { 
          ok: response.ok, 
          status: response.status,
          success: result.success,
          dataLength: result.data?.length || 0 
        });

        if (response.ok && result.success) {
          userList = result.data || [];
        } else {
          console.error("[NewConversationModal] Failed to fetch teachers:", result.message || "Unknown error");
          toast.error(result.message || "Failed to load teachers");
        }
      } else if (currentUserRole === "teacher") {
        // Teachers can message students and other teachers
        // Fetch students
        const studentsResponse = await fetch("/api/users?role=student", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const studentsResult = await studentsResponse.json();
        console.log(`[NewConversationModal] Students API response:`, { 
          ok: studentsResponse.ok, 
          status: studentsResponse.status,
          success: studentsResult.success,
          dataLength: studentsResult.data?.length || 0 
        });

        if (studentsResponse.ok && studentsResult.success) {
          userList = userList.concat(studentsResult.data || []);
        } else {
          console.error("[NewConversationModal] Failed to fetch students:", studentsResult.message || "Unknown error");
        }

        // Fetch other teachers
        const teachersResponse = await fetch("/api/users?role=teacher", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const teachersResult = await teachersResponse.json();
        console.log(`[NewConversationModal] Teachers (from users API) response:`, { 
          ok: teachersResponse.ok, 
          status: teachersResponse.status,
          success: teachersResult.success,
          dataLength: teachersResult.data?.length || 0 
        });

        if (teachersResponse.ok && teachersResult.success) {
          userList = userList.concat(teachersResult.data || []);
        } else {
          console.error("[NewConversationModal] Failed to fetch teachers:", teachersResult.message || "Unknown error");
        }
      } else {
        // Admin/Super Admin can message anyone
        const response = await fetch("/api/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();
        console.log(`[NewConversationModal] Users API response:`, { 
          ok: response.ok, 
          status: response.status,
          success: result.success,
          dataLength: result.data?.length || 0 
        });

        if (response.ok && result.success) {
          userList = result.data || [];
        } else {
          console.error("[NewConversationModal] Failed to fetch users:", result.message || "Unknown error");
          toast.error(result.message || "Failed to load users");
        }
      }

      console.log(`[NewConversationModal] Raw userList length: ${userList.length}`, userList);

      // Format users based on the response structure
      const formattedUsers: UserOption[] = userList
        .map((u: any) => {
          // Handle different response structures:
          // 1. Direct user object from /api/users
          // 2. Teacher object with populated userId from /api/teachers
          if (u.userId && typeof u.userId === 'object') {
            // Teacher/Student model with populated userId
            const userId = u.userId._id || u.userId.toString();
            const userObj = {
              _id: userId,
              fullName: u.userId.fullName || "Unknown",
              email: u.userId.email || "",
              role: u.userId.role || (currentUserRole === "student" ? "teacher" : "student"),
            };
            console.log(`[NewConversationModal] Formatted teacher/student:`, userObj);
            return userObj;
          } else {
            // Direct user object
            const userObj = {
              _id: u._id?.toString() || u.id?.toString() || "",
              fullName: u.fullName || "Unknown",
              email: u.email || "",
              role: u.role || "student",
            };
            console.log(`[NewConversationModal] Formatted user:`, userObj);
            return userObj;
          }
        })
        .filter((u: UserOption) => {
          // Remove invalid entries and current user
          if (!u._id || u.fullName === "Unknown") {
            console.log(`[NewConversationModal] Filtered out invalid user:`, u);
            return false;
          }
          if (currentUserId && u._id.toString() === currentUserId.toString()) {
            console.log(`[NewConversationModal] Filtered out current user:`, u);
            return false;
          }
          return true;
        });

      console.log(`[NewConversationModal] Final formatted users: ${formattedUsers.length}`, formattedUsers);
      
      if (formattedUsers.length === 0) {
        console.warn(`[NewConversationModal] No users found after formatting. Raw data:`, userList);
        toast.error("No users available to message");
      }
      
      setUsers(formattedUsers);
    } catch (error) {
      console.error("[NewConversationModal] Error loading users:", error);
      toast.error("Failed to load users. Please try again.");
    } finally {
      setFetchingUsers(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleUserToggle = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    setLoading(true);
    try {
      // Determine conversation type
      const selectedUserRoles = selectedUsers
        .map((id) => users.find((u) => u._id === id)?.role)
        .filter(Boolean);

      const conversationType =
        currentUserRole === "teacher" && selectedUserRoles.includes("student")
          ? "teacher-student"
          : "teacher-teacher";

      // Create conversation
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          participantIds: selectedUsers,
          type: conversationType,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        const conversationId = result.conversation._id;

        // Send initial message if provided
        if (initialMessage.trim()) {
          const formData = new FormData();
          formData.append("content", initialMessage.trim());

          await fetch(`/api/conversations/${conversationId}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });
        }

        toast.success("Conversation created successfully");
        onConversationCreated(conversationId);
        onClose();
      } else {
        throw new Error(result.message || "Failed to create conversation");
      }
    } catch (error) {
      toast.error((error as Error).message || "Failed to create conversation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <Dialog.Title className="text-lg font-semibold text-neutral-900">New Conversation</Dialog.Title>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-6">
            <div className="space-y-4">
              {/* Search */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Select Recipients</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((userId) => {
                    const user = users.find((u) => u._id === userId);
                    return (
                      <div
                        key={userId}
                        className="flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-700"
                      >
                        <span>{user?.fullName}</span>
                        <button
                          onClick={() => handleUserToggle(userId)}
                          className="ml-1 rounded-full hover:bg-indigo-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Users List */}
              <div className="max-h-64 overflow-y-auto rounded-lg border border-neutral-200">
                {fetchingUsers ? (
                  <div className="py-8 text-center text-sm text-neutral-500">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-8 text-center text-sm text-neutral-500">No users found</div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUsers.includes(user._id);
                    return (
                      <button
                        key={user._id}
                        onClick={() => handleUserToggle(user._id)}
                        className={`flex w-full items-center gap-3 border-b border-neutral-100 p-3 text-left transition-colors hover:bg-neutral-50 ${
                          isSelected ? "bg-indigo-50" : ""
                        }`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                          {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-neutral-900">{user.fullName}</p>
                          <p className="text-xs text-neutral-500">{user.email}</p>
                        </div>
                        {isSelected && (
                          <div className="rounded-full bg-indigo-600 p-1">
                            <User className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Initial Message */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Initial Message (Optional)
                </label>
                <textarea
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  rows={3}
                  placeholder="Type your first message..."
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-neutral-200 px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || selectedUsers.length === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Conversation"}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
