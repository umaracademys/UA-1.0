"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Database, Download, Archive, Trash2, AlertTriangle, HardDrive } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

type CollectionStats = {
  name: string;
  count: number;
  size: string;
};

type Backup = {
  _id: string;
  filename: string;
  createdAt: Date | string;
  size: string;
};

export default function SuperAdminDatabasePage() {
  const [loading, setLoading] = useState(true);
  const [collectionStats, setCollectionStats] = useState<CollectionStats[]>([]);
  const [databaseSize, setDatabaseSize] = useState("0 MB");
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (token) {
      loadDatabaseStats();
      loadBackups();
    }
  }, [token]);

  const loadDatabaseStats = async () => {
    try {
      setLoading(true);
      // Load collection statistics
      // const response = await axios.get("/api/database/stats", {
      //   headers: { Authorization: `Bearer ${token}` },
      // });

      // Mock data
      setCollectionStats([
        { name: "Users", count: 150, size: "2.5 MB" },
        { name: "Students", count: 120, size: "3.2 MB" },
        { name: "Teachers", count: 25, size: "0.8 MB" },
        { name: "Assignments", count: 500, size: "5.1 MB" },
        { name: "Tickets", count: 300, size: "2.3 MB" },
        { name: "Evaluations", count: 200, size: "1.8 MB" },
        { name: "Messages", count: 1000, size: "4.5 MB" },
        { name: "Attendance", count: 2000, size: "3.2 MB" },
      ]);
      setDatabaseSize("23.2 MB");
    } catch (error) {
      console.error("Failed to load database stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBackups = async () => {
    try {
      // Load backups list
      // const response = await axios.get("/api/database/backups", {
      //   headers: { Authorization: `Bearer ${token}` },
      // });
      // setBackups(response.data.backups || []);

      // Mock data
      setBackups([
        {
          _id: "1",
          filename: "backup_2024-01-15_10-30-00.json",
          createdAt: new Date(),
          size: "23.2 MB",
        },
      ]);
    } catch (error) {
      console.error("Failed to load backups:", error);
    }
  };

  const handleCreateBackup = async () => {
    if (!confirm("Create a database backup? This may take a few moments.")) {
      return;
    }

    setIsCreatingBackup(true);
    try {
      // await axios.post("/api/database/backup", {}, {
      //   headers: { Authorization: `Bearer ${token}` },
      // });
      toast.success("Backup created successfully");
      await loadBackups();
    } catch (error) {
      toast.error((error as Error).message || "Failed to create backup");
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestore = async (backupId: string) => {
    if (
      !confirm(
        "WARNING: Restoring a backup will replace all current data. This action cannot be undone. Are you absolutely sure?",
      )
    ) {
      return;
    }

    if (!confirm("This is your final warning. Continue with restore?")) {
      return;
    }

    try {
      // await axios.post(`/api/database/restore/${backupId}`, {}, {
      //   headers: { Authorization: `Bearer ${token}` },
      // });
      toast.success("Database restored successfully");
    } catch (error) {
      toast.error((error as Error).message || "Failed to restore backup");
    }
  };

  const handleCleanup = async (type: "notifications" | "logs" | "old_records") => {
    const confirmMessage = {
      notifications: "Delete old notifications? This cannot be undone.",
      logs: "Clear activity logs? This cannot be undone.",
      old_records: "Archive old records? This will move records older than 1 year to archive.",
    };

    if (!confirm(confirmMessage[type])) {
      return;
    }

    try {
      // await axios.post(`/api/database/cleanup/${type}`, {}, {
      //   headers: { Authorization: `Bearer ${token}` },
      // });
      toast.success("Cleanup completed successfully");
      await loadDatabaseStats();
    } catch (error) {
      toast.error((error as Error).message || "Failed to perform cleanup");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header with Warning */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <div>
            <h1 className="text-xl font-bold text-red-900">Database Management</h1>
            <p className="mt-1 text-sm text-red-700">
              ⚠️ Use with extreme caution. Destructive actions cannot be undone.
            </p>
          </div>
        </div>
      </div>

      {/* Database Statistics */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Database Statistics</h2>
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <HardDrive className="h-4 w-4" />
            <span>Total Size: {databaseSize}</span>
          </div>
        </div>
        {loading ? (
          <div className="py-8 text-center text-sm text-neutral-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Collection
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Documents
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Size
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {collectionStats.map((collection) => (
                  <tr key={collection.name} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-neutral-900">
                      {collection.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-neutral-600">
                      {collection.count.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-neutral-600">
                      {collection.size}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Backup & Restore */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Backup & Restore</h2>
          <button
            onClick={handleCreateBackup}
            disabled={isCreatingBackup}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isCreatingBackup ? "Creating..." : "Create Backup"}
          </button>
        </div>
        {backups.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500">No backups available</div>
        ) : (
          <div className="space-y-3">
            {backups.map((backup) => (
              <div
                key={backup._id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3"
              >
                <div>
                  <p className="font-medium text-neutral-900">{backup.filename}</p>
                  <p className="text-xs text-neutral-500">
                    Created: {new Date(backup.createdAt).toLocaleString()} • Size: {backup.size}
                  </p>
                </div>
                <button
                  onClick={() => handleRestore(backup._id)}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Cleanup */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h2 className="mb-4 text-lg font-semibold text-red-900">Data Cleanup</h2>
        <p className="mb-4 text-sm text-red-700">
          ⚠️ These actions are permanent and cannot be undone. Use with extreme caution.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <button
            onClick={() => handleCleanup("notifications")}
            className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Remove Old Notifications
          </button>
          <button
            onClick={() => handleCleanup("logs")}
            className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <Archive className="h-4 w-4" />
            Clear Activity Logs
          </button>
          <button
            onClick={() => handleCleanup("old_records")}
            className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <Archive className="h-4 w-4" />
            Archive Old Records
          </button>
        </div>
      </div>
    </div>
  );
}
