"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import type { UserRole } from "@/types";

interface User {
  _id: string;
  id?: string;
  email: string;
  fullName: string;
  role: UserRole;
  contactNumber?: string;
  isActive?: boolean;
  student?: {
    _id: string;
    programType?: string;
    status?: string;
  };
  teacher?: {
    _id: string;
    specialization?: string;
    status?: string;
  };
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  contactNumber?: string;
  parentName?: string;
  parentContact?: string;
  programType?: string;
  specialization?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load user from token on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) {
        try {
          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          const response = await axios.get("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
            timeout: 10000, // 10 second timeout
          });

          clearTimeout(timeoutId);

          if (response.data.user || response.data) {
            const userData = response.data.user || response.data;
            const profile = response.data.profile;
            // Normalize user ID
            const normalizedUser = {
              ...userData,
              id: userData._id || userData.id,
              _id: userData._id || userData.id,
              // Add profile data to user object for easier access
              student: userData.role === "student" ? profile : undefined,
              teacher: userData.role === "teacher" ? profile : undefined,
            };
            setUser(normalizedUser);
          } else {
            if (typeof window !== "undefined") {
              localStorage.removeItem("token");
            }
          }
        } catch (error: any) {
          console.error("Failed to load user:", error);
          if (typeof window !== "undefined") {
            localStorage.removeItem("token");
          }
          // Set loading to false even on error to prevent infinite loading
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post("/api/auth/login", {
        email,
        password,
      });

      if (response.data.token) {
        if (typeof window !== "undefined") {
          localStorage.setItem("token", response.data.token);
        }

        const userData = response.data.user || response.data;
        const normalizedUser = {
          ...userData,
          id: userData._id || userData.id,
        };
        setUser(normalizedUser);

        // Redirect based on role
        const role = normalizedUser.role;
        switch (role) {
          case "student":
            router.push("/student");
            break;
          case "teacher":
            router.push("/teacher");
            break;
          case "admin":
            router.push("/admin");
            break;
          case "super_admin":
            router.push("/super-admin");
            break;
          default:
            router.push("/");
        }
      } else {
        throw new Error("No token received");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || "Login failed";
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) {
        await axios.post(
          "/api/auth/logout",
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
      setUser(null);
      router.push("/login");
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await axios.post("/api/auth/register", data);

      if (response.data.token) {
        if (typeof window !== "undefined") {
          localStorage.setItem("token", response.data.token);
        }

        const userData = response.data.user || response.data;
        const normalizedUser = {
          ...userData,
          id: userData._id || userData.id,
        };
        setUser(normalizedUser);

        // Redirect based on role
        const role = normalizedUser.role;
        switch (role) {
          case "student":
            router.push("/student");
            break;
          case "teacher":
            router.push("/teacher");
            break;
          case "admin":
            router.push("/admin");
            break;
          case "super_admin":
            router.push("/super-admin");
            break;
          default:
            router.push("/");
        }
      } else {
        throw new Error("No token received");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || "Registration failed";
      throw new Error(errorMessage);
    }
  };

  const updateUser = async (data: Partial<User>) => {
    if (!user) {
      throw new Error("No user logged in");
    }

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const userId = user.id || user._id;

      const response = await axios.patch(
        `/api/users/${userId}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.data.user) {
        const updatedUser = {
          ...response.data.user,
          id: response.data.user._id || response.data.user.id,
        };
        setUser(updatedUser);
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || "Failed to update user";
      throw new Error(errorMessage);
    }
  };

  const refreshUser = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const response = await axios.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.user || response.data) {
        const userData = response.data.user || response.data;
        const normalizedUser = {
          ...userData,
          id: userData._id || userData.id,
        };
        setUser(normalizedUser);
      } else {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
        }
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        register,
        updateUser,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
