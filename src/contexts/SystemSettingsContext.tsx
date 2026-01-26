"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import axios from "axios";

interface SystemSettings {
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logo: string | null;
  systemName: string;
}

interface SystemSettingsContextType {
  settings: SystemSettings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

const defaultSettings: SystemSettings = {
  colorScheme: {
    primary: "#2E4D32",
    secondary: "#C49636",
    accent: "#C49636",
  },
  logo: "/uploads/logo/logo-1769252899089.png", // Use uploaded logo as default
  systemName: "Umar Academy Portal",
};

export function SystemSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setSettings(defaultSettings);
        setLoading(false);
        return;
      }

      const response = await axios.get("/api/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const loadedSettings = { ...defaultSettings, ...response.data.settings };
        console.log("Loaded settings:", { logo: loadedSettings.logo, colorScheme: loadedSettings.colorScheme });
        setSettings(loadedSettings);
        applySettings(loadedSettings);
      } else {
        setSettings(defaultSettings);
        applySettings(defaultSettings);
      }
    } catch (error) {
      console.error("Failed to load system settings:", error);
      setSettings(defaultSettings);
      applySettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const applySettings = (settingsToApply: SystemSettings) => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    root.style.setProperty("--color-primary", settingsToApply.colorScheme.primary);
    root.style.setProperty("--color-secondary", settingsToApply.colorScheme.secondary);
    root.style.setProperty("--color-accent", settingsToApply.colorScheme.accent);
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  return (
    <SystemSettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SystemSettingsContext.Provider>
  );
}

export function useSystemSettings() {
  const context = useContext(SystemSettingsContext);
  if (context === undefined) {
    throw new Error("useSystemSettings must be used within a SystemSettingsProvider");
  }
  return context;
}
