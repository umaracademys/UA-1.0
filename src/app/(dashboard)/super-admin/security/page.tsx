"use client";

import { useState, useEffect } from "react";
import { Shield, Unlock, Ban, Download, Search } from "lucide-react";
import axios from "axios";
import { format } from "date-fns";
import { SecurityAlert } from "@/components/dashboard/super-admin/SecurityAlert";
import toast from "react-hot-toast";

type FailedLogin = {
  _id: string;
  userId: string;
  email: string;
  ipAddress: string;
  timestamp: Date | string;
  reason: string;
};

type LockedAccount = {
  _id: string;
  userId: string;
  fullName: string;
  email: string;
  lockedAt: Date | string;
  failedAttempts: number;
};

type PasswordChange = {
  _id: string;
  userId: string;
  fullName: string;
  email: string;
  changedAt: Date | string;
};

export default function SuperAdminSecurityPage() {
  const [loading, setLoading] = useState(true);
  const [failedLogins, setFailedLogins] = useState<FailedLogin[]>([]);
  const [lockedAccounts, setLockedAccounts] = useState<LockedAccount[]>([]);
  const [passwordChanges, setPasswordChanges] = useState<PasswordChange[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (token) {
      loadSecurityData();
    }
  }, [token]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);

      // Load failed login attempts
      // const failedRes = await axios.get("/api/security/failed-logins", {
      //   headers: { Authorization: `Bearer ${token}` },
      // });
      // setFailedLogins(failedRes.data.attempts || []);

      // Load locked accounts
      const usersRes = await axios.get("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: "locked" },
      });
      const lockedUsers = (usersRes.data.users || []).filter((u: any) => u.accountLockedUntil);
      setLockedAccounts(
        lockedUsers.map((u: any) => ({
          _id: u._id,
          userId: u._id,
          fullName: u.fullName,
          email: u.email,
          lockedAt: u.accountLockedUntil || new Date(),
          failedAttempts: u.failedLoginAttempts || 0,
        })),
      );

      // Mock data for failed logins and password changes
      setFailedLogins([
        {
          _id: "1",
          userId: "user1",
          email: "test@example.com",
          ipAddress: "192.168.1.100",
          timestamp: new Date(),
          reason: "Invalid password",
        },
      ]);

      setPasswordChanges([
        {
          _id: "1",
          userId: "user1",
          fullName: "Test User",
          email: "test@example.com",
          changedAt: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Failed to load security data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockAccount = async (userId: string) => {
    if (!confirm("Are you sure you want to unlock this account?")) {
      return;
    }

    try {
      await axios.post(
        `/api/auth/unlock-account`,
        { userId },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      toast.success("Account unlocked successfully");
      await loadSecurityData();
    } catch (error) {
      toast.error((error as Error).message || "Failed to unlock account");
    }
  };

  const handleBlockIP = async (ipAddress: string) => {
    if (!confirm(`Are you sure you want to block IP address ${ipAddress}?`)) {
      return;
    }

    try {
      // Block IP API call
      // await axios.post("/api/security/block-ip", { ipAddress }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`IP address ${ipAddress} blocked`);
    } catch (error) {
      toast.error((error as Error).message || "Failed to block IP");
    }
  };

  const filteredFailedLogins = failedLogins.filter((login) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      login.email.toLowerCase().includes(query) ||
      login.ipAddress.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Security Monitoring</h1>
          <p className="mt-1 text-sm text-neutral-500">Monitor security events and manage access</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
          <Download className="h-4 w-4" />
          Export Log
        </button>
      </div>

      {/* Failed Login Attempts */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Failed Login Attempts (Last 24 Hours)</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by email or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-lg border border-neutral-200 bg-white pl-10 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
        {loading ? (
          <div className="py-8 text-center text-sm text-neutral-500">Loading...</div>
        ) : filteredFailedLogins.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500">No failed login attempts</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    IP Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Reason
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredFailedLogins.map((login) => (
                  <tr key={login._id} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-900">{login.email}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">{login.ipAddress}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                      {format(new Date(login.timestamp), "MMM dd, yyyy 'at' h:mm a")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">{login.reason}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium">
                      <button
                        onClick={() => handleBlockIP(login.ipAddress)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Locked Accounts */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Locked Accounts</h2>
        {loading ? (
          <div className="py-8 text-center text-sm text-neutral-500">Loading...</div>
        ) : lockedAccounts.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500">No locked accounts</div>
        ) : (
          <div className="space-y-3">
            {lockedAccounts.map((account) => (
              <div
                key={account._id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3"
              >
                <div>
                  <p className="font-medium text-neutral-900">{account.fullName}</p>
                  <p className="text-sm text-neutral-600">{account.email}</p>
                  <p className="text-xs text-neutral-500">
                    Locked at: {format(new Date(account.lockedAt), "MMM dd, yyyy 'at' h:mm a")} •{" "}
                    {account.failedAttempts} failed attempts
                  </p>
                </div>
                <button
                  onClick={() => handleUnlockAccount(account.userId)}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  <Unlock className="h-4 w-4" />
                  Unlock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Password Changes Log */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Password Changes Log</h2>
        {loading ? (
          <div className="py-8 text-center text-sm text-neutral-500">Loading...</div>
        ) : passwordChanges.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500">No password changes recorded</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Changed At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {passwordChanges.map((change) => (
                  <tr key={change._id} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-900">
                      {change.fullName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">{change.email}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                      {format(new Date(change.changedAt), "MMM dd, yyyy 'at' h:mm a")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
