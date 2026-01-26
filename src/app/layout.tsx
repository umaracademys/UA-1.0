import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { SystemSettingsProvider } from "@/contexts/SystemSettingsContext";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { Toaster } from "react-hot-toast";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
              <div className="w-full max-w-2xl rounded-lg border border-red-200 bg-white p-8 shadow-lg text-center">
                <h1 className="text-2xl font-bold text-neutral-900 mb-2">Application Error</h1>
                <p className="text-neutral-600 mb-4">An error occurred while loading the application.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Reload Page
                </button>
              </div>
            </div>
          }
        >
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
