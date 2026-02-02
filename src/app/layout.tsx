import type { Metadata } from "next";
import { Inter, Amiri } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { SystemSettingsProvider } from "@/contexts/SystemSettingsContext";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { Toaster } from "react-hot-toast";

export const dynamic = "force-dynamic";

// Use Google Fonts instead of local fonts to avoid file loading issues
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});

// Amiri: bundled Arabic font for Mushaf so text renders offline (no runtime Google Fonts dependency)
const amiri = Amiri({
  weight: "400",
  subsets: ["arabic"],
  variable: "--font-amiri",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Umar Academy Portal",
  description: "Comprehensive learning management system for Umar Academy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${amiri.variable} font-sans antialiased`}
      >
        <ErrorBoundary>
          <ThemeProvider>
            <SystemSettingsProvider>
              <AuthProvider>
                <SocketProvider>
                  <NotificationProvider>
                    <Toaster
                      position="top-right"
                      toastOptions={{
                        duration: 4000,
                        style: {
                          background: "#fff",
                          color: "#1f2937",
                        },
                        success: {
                          duration: 3000,
                          iconTheme: {
                            primary: "#C49636",
                            secondary: "#fff",
                          },
                        },
                        error: {
                          duration: 5000,
                          iconTheme: {
                            primary: "#ef4444",
                            secondary: "#fff",
                          },
                        },
                      }}
                    />
                    {children}
                  </NotificationProvider>
                </SocketProvider>
              </AuthProvider>
            </SystemSettingsProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
