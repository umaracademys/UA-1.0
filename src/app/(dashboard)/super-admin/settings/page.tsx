"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

const settingsSchema = z.object({
  // General Settings
  systemName: z.string().min(1, "System name is required"),
  notificationEnabled: z.boolean(),
  defaultPermissions: z.string().optional(),
  emailEnabled: z.boolean(),
  emailHost: z.string().optional(),
  emailPort: z.number().optional(),
  emailUser: z.string().optional(),
  emailPassword: z.string().optional(),

  // Security Settings
  passwordMinLength: z.number().min(8).max(32),
  passwordRequireUppercase: z.boolean(),
  passwordRequireLowercase: z.boolean(),
  passwordRequireNumbers: z.boolean(),
  passwordRequireSpecialChars: z.boolean(),
  lockoutThreshold: z.number().min(1).max(10),
  lockoutDuration: z.number().min(1).max(1440), // minutes
  sessionTimeout: z.number().min(5).max(480), // minutes
  twoFactorEnabled: z.boolean(),

  // Module Settings
  modulesEnabled: z.record(z.string(), z.boolean()),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SuperAdminSettingsPage() {
  const { settings, refreshSettings } = useSystemSettings();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "appearance" | "security" | "modules">("general");
  const [colorScheme, setColorScheme] = useState({
    primary: settings?.colorScheme?.primary || "#2E4D32",
    secondary: settings?.colorScheme?.secondary || "#C49636",
    accent: settings?.colorScheme?.accent || "#C49636",
  });
  const [logo, setLogo] = useState<string | null>(settings?.logo || null);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings?.logo || null);
  const [appearanceChanged, setAppearanceChanged] = useState(false);
  const [initialColorScheme, setInitialColorScheme] = useState(colorScheme);
  const [initialLogo, setInitialLogo] = useState<string | null>(logo);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      systemName: "Umar Academy Portal",
      notificationEnabled: true,
      emailEnabled: false,
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumbers: true,
      passwordRequireSpecialChars: true,
      lockoutThreshold: 5,
      lockoutDuration: 30,
      sessionTimeout: 60,
      twoFactorEnabled: false,
      modulesEnabled: {
        assignments: true,
        tickets: true,
        evaluations: true,
        attendance: true,
        messages: true,
        mushaf: true,
      },
    },
  });

  useEffect(() => {
    if (settings) {
      const newColorScheme = settings.colorScheme || {
        primary: "#2E4D32",
        secondary: "#C49636",
        accent: "#C49636",
      };
      setColorScheme(newColorScheme);
      setInitialColorScheme(newColorScheme);
      setLogo(settings.logo);
      setInitialLogo(settings.logo);
      setLogoPreview(settings.logo);
      setAppearanceChanged(false);
    }
  }, [settings]);

  useEffect(() => {
    if (token) {
      loadSettings();
    }
  }, [token]);

  const loadSettings = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.get("/api/settings", {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000, // 10 second timeout
      });
      
      if (response.data.success) {
        const loadedSettings = response.data.settings;
        
        // Load appearance settings
        if (loadedSettings.colorScheme) {
          setColorScheme(loadedSettings.colorScheme);
          setInitialColorScheme(loadedSettings.colorScheme);
        }
        if (loadedSettings.logo !== undefined) {
          setLogo(loadedSettings.logo);
          setLogoPreview(loadedSettings.logo);
          setInitialLogo(loadedSettings.logo);
        }
        
        // Load all other settings into the form
        const formData = {
          systemName: loadedSettings.systemName || "Umar Academy Portal",
          notificationEnabled: loadedSettings.notificationEnabled !== undefined ? loadedSettings.notificationEnabled : true,
          emailEnabled: loadedSettings.emailEnabled !== undefined ? loadedSettings.emailEnabled : false,
          emailHost: loadedSettings.emailHost || "",
          emailPort: loadedSettings.emailPort || 587,
          emailUser: loadedSettings.emailUser || "",
          emailPassword: loadedSettings.emailPassword || "",
          passwordMinLength: loadedSettings.passwordMinLength || 8,
          passwordRequireUppercase: loadedSettings.passwordRequireUppercase !== undefined ? loadedSettings.passwordRequireUppercase : true,
          passwordRequireLowercase: loadedSettings.passwordRequireLowercase !== undefined ? loadedSettings.passwordRequireLowercase : true,
          passwordRequireNumbers: loadedSettings.passwordRequireNumbers !== undefined ? loadedSettings.passwordRequireNumbers : true,
          passwordRequireSpecialChars: loadedSettings.passwordRequireSpecialChars !== undefined ? loadedSettings.passwordRequireSpecialChars : true,
          lockoutThreshold: loadedSettings.lockoutThreshold || 5,
          lockoutDuration: loadedSettings.lockoutDuration || 30,
          sessionTimeout: loadedSettings.sessionTimeout || 60,
          twoFactorEnabled: loadedSettings.twoFactorEnabled !== undefined ? loadedSettings.twoFactorEnabled : false,
          modulesEnabled: loadedSettings.modulesEnabled || {
            assignments: true,
            tickets: true,
            evaluations: true,
            attendance: true,
            messages: true,
            mushaf: true,
          },
        };
        
        reset(formData);
      } else {
        throw new Error(response.data.message || "Failed to load settings");
      }
    } catch (error: any) {
      console.error("Failed to load settings:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to load settings";
      toast.error(errorMessage);
      // Still reset form with defaults so user can see the page
      reset({
        systemName: "Umar Academy Portal",
        notificationEnabled: true,
        emailEnabled: false,
        emailHost: "",
        emailPort: 587,
        emailUser: "",
        emailPassword: "",
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireNumbers: true,
        passwordRequireSpecialChars: true,
        lockoutThreshold: 5,
        lockoutDuration: 30,
        sessionTimeout: 60,
        twoFactorEnabled: false,
        modulesEnabled: {
          assignments: true,
          tickets: true,
          evaluations: true,
          attendance: true,
          messages: true,
          mushaf: true,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: SettingsFormData) => {
    if (!confirm("Are you sure you want to save these settings? Some changes may require system restart.")) {
      return;
    }

    setSaving(true);
    try {
      // Get current form values to ensure we have all fields
      const formValues = data;
      
      const payload: any = {
        // Always include all form data
        systemName: formValues.systemName || "Umar Academy Portal",
        notificationEnabled: formValues.notificationEnabled ?? true,
        emailEnabled: formValues.emailEnabled ?? false,
        emailHost: formValues.emailHost || "",
        emailPort: formValues.emailPort || 587,
        emailUser: formValues.emailUser || "",
        emailPassword: formValues.emailPassword || "",
        passwordMinLength: formValues.passwordMinLength || 8,
        passwordRequireUppercase: formValues.passwordRequireUppercase ?? true,
        passwordRequireLowercase: formValues.passwordRequireLowercase ?? true,
        passwordRequireNumbers: formValues.passwordRequireNumbers ?? true,
        passwordRequireSpecialChars: formValues.passwordRequireSpecialChars ?? true,
        lockoutThreshold: formValues.lockoutThreshold || 5,
        lockoutDuration: formValues.lockoutDuration || 30,
        sessionTimeout: formValues.sessionTimeout || 60,
        twoFactorEnabled: formValues.twoFactorEnabled ?? false,
        modulesEnabled: formValues.modulesEnabled || {
          assignments: true,
          tickets: true,
          evaluations: true,
          attendance: true,
          messages: true,
          mushaf: true,
        },
        // Always include appearance settings
        colorScheme: colorScheme,
        logo: logoPreview || logo || null,
      };

      console.log("Saving settings payload:", JSON.stringify(payload, null, 2)); // Debug log

      const response = await axios.post(
        "/api/settings",
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      
      console.log("Save response:", response.data); // Debug log
      
      if (response.data.success) {
        toast.success("Settings saved successfully");
        // Mark form as not dirty after successful save
        reset(data, { keepValues: true });
        setAppearanceChanged(false);
        setInitialColorScheme(colorScheme);
        setInitialLogo(logoPreview || logo);
        // Refresh settings to apply changes
        await refreshSettings();
      } else {
        throw new Error(response.data.message || "Failed to save settings");
      }
    } catch (error: any) {
      console.error("Save error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to save settings";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Handle appearance-only save
  const handleAppearanceSave = async () => {
    await handleSave({} as SettingsFormData);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Logo file size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        setAppearanceChanged(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Track color scheme changes
  useEffect(() => {
    const colorChanged =
      colorScheme.primary !== initialColorScheme.primary ||
      colorScheme.secondary !== initialColorScheme.secondary ||
      colorScheme.accent !== initialColorScheme.accent;
    const logoChanged = (logoPreview || logo) !== initialLogo;
    setAppearanceChanged(colorChanged || logoChanged);
  }, [colorScheme, logoPreview, logo, initialColorScheme, initialLogo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-neutral-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">System Settings</h1>
          <p className="mt-1 text-sm text-neutral-500">Configure system-wide settings and preferences</p>
        </div>
        {(isDirty || appearanceChanged) && (
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">You have unsaved changes</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex space-x-8">
          {(["general", "appearance", "security", "modules"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-1 py-4 text-sm font-medium capitalize ${
                activeTab === tab
                  ? "text-primary border-primary"
                  : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
              }`}
              style={activeTab === tab ? { borderColor: "var(--color-primary)", color: "var(--color-primary)" } : undefined}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
        {/* Appearance Settings */}
        {activeTab === "appearance" && (
          <div className="space-y-6 rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-neutral-900">Appearance Settings</h2>

            {/* Logo Upload */}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">System Logo</label>
                <div className="flex items-center gap-4">
                  {logoPreview && (
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-white">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="block w-full text-sm text-neutral-500 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      Recommended: PNG or SVG, max 5MB. Logo will appear in sidebar and header.
                    </p>
                  </div>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogoPreview(null);
                        setLogo(null);
                      }}
                      className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Color Scheme */}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Color Scheme</label>
                <p className="mb-4 text-xs text-neutral-500">
                  Customize the primary colors used throughout the system
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-neutral-700">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colorScheme.primary}
                        onChange={(e) => setColorScheme({ ...colorScheme, primary: e.target.value })}
                        className="h-10 w-20 cursor-pointer rounded-lg border border-neutral-300"
                      />
                      <input
                        type="text"
                        value={colorScheme.primary}
                        onChange={(e) => setColorScheme({ ...colorScheme, primary: e.target.value })}
                        className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="#2563eb"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-neutral-700">Secondary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colorScheme.secondary}
                        onChange={(e) => setColorScheme({ ...colorScheme, secondary: e.target.value })}
                        className="h-10 w-20 cursor-pointer rounded-lg border border-neutral-300"
                      />
                      <input
                        type="text"
                        value={colorScheme.secondary}
                        onChange={(e) => setColorScheme({ ...colorScheme, secondary: e.target.value })}
                        className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="#C49636"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-neutral-700">Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colorScheme.accent}
                        onChange={(e) => setColorScheme({ ...colorScheme, accent: e.target.value })}
                        className="h-10 w-20 cursor-pointer rounded-lg border border-neutral-300"
                      />
                      <input
                        type="text"
                        value={colorScheme.accent}
                        onChange={(e) => setColorScheme({ ...colorScheme, accent: e.target.value })}
                        className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="#8b5cf6"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <div
                    className="h-12 w-12 rounded-lg"
                    style={{ backgroundColor: colorScheme.primary }}
                  />
                  <div
                    className="h-12 w-12 rounded-lg"
                    style={{ backgroundColor: colorScheme.secondary }}
                  />
                  <div
                    className="h-12 w-12 rounded-lg"
                    style={{ backgroundColor: colorScheme.accent }}
                  />
                  <p className="text-xs text-neutral-500">Color preview</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* General Settings */}
        {activeTab === "general" && (
          <div className="space-y-6 rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-neutral-900">General Settings</h2>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">System Name</label>
              <input
                type="text"
                {...register("systemName")}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {errors.systemName && (
                <p className="mt-1 text-xs text-red-600">{errors.systemName.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register("notificationEnabled")}
                className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label className="text-sm font-medium text-neutral-700">Enable Notifications</label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register("emailEnabled")}
                className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label className="text-sm font-medium text-neutral-700">Enable Email Notifications</label>
            </div>

            {/* Email Settings (shown if email enabled) */}
            <div className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <h3 className="text-sm font-semibold text-neutral-900">Email Configuration</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-700">SMTP Host</label>
                  <input
                    type="text"
                    {...register("emailHost")}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-700">SMTP Port</label>
                  <input
                    type="number"
                    {...register("emailPort", { valueAsNumber: true })}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-700">SMTP User</label>
                  <input
                    type="text"
                    {...register("emailUser")}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-700">SMTP Password</label>
                  <input
                    type="password"
                    {...register("emailPassword")}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === "security" && (
          <div className="space-y-6 rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-neutral-900">Security Settings</h2>

            {/* Password Policy */}
            <div className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <h3 className="text-sm font-semibold text-neutral-900">Password Policy</h3>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Minimum Length</label>
                <input
                  type="number"
                  {...register("passwordMinLength", { valueAsNumber: true })}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {errors.passwordMinLength && (
                  <p className="mt-1 text-xs text-red-600">{errors.passwordMinLength.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register("passwordRequireUppercase")}
                    className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label className="text-sm font-medium text-neutral-700">Require Uppercase Letters</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register("passwordRequireLowercase")}
                    className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label className="text-sm font-medium text-neutral-700">Require Lowercase Letters</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register("passwordRequireNumbers")}
                    className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label className="text-sm font-medium text-neutral-700">Require Numbers</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register("passwordRequireSpecialChars")}
                    className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label className="text-sm font-medium text-neutral-700">Require Special Characters</label>
                </div>
              </div>
            </div>

            {/* Account Lockout */}
            <div className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <h3 className="text-sm font-semibold text-neutral-900">Account Lockout</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">Lockout Threshold</label>
                  <input
                    type="number"
                    {...register("lockoutThreshold", { valueAsNumber: true })}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="mt-1 text-xs text-neutral-500">Number of failed attempts before lockout</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">Lockout Duration (minutes)</label>
                  <input
                    type="number"
                    {...register("lockoutDuration", { valueAsNumber: true })}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Session Settings */}
            <div className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <h3 className="text-sm font-semibold text-neutral-900">Session Settings</h3>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Session Timeout (minutes)</label>
                <input
                  type="number"
                  {...register("sessionTimeout", { valueAsNumber: true })}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register("twoFactorEnabled")}
                  className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label className="text-sm font-medium text-neutral-700">Enable Two-Factor Authentication</label>
              </div>
            </div>
          </div>
        )}

        {/* Module Settings */}
        {activeTab === "modules" && (
          <div className="space-y-6 rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-neutral-900">Module Settings</h2>
            <div className="space-y-3">
              {Object.entries({
                assignments: "Assignments",
                tickets: "Recitation Tickets",
                evaluations: "Evaluations",
                attendance: "Attendance",
                messages: "Messages",
                mushaf: "Personal Mushaf",
              }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
                  <div>
                    <p className="font-medium text-neutral-900">{label}</p>
                    <p className="text-xs text-neutral-500">Enable or disable this module</p>
                  </div>
                  <input
                    type="checkbox"
                    {...register(`modulesEnabled.${key}`)}
                    className="h-5 w-5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center justify-end border-t border-neutral-200 pt-4">
          {activeTab === "appearance" ? (
            <button
              type="button"
              onClick={handleAppearanceSave}
              disabled={!appearanceChanged || saving}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          ) : (
            <button
              type="submit"
              disabled={!isDirty || saving}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
