"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { PDFLibrary } from "@/components/modules/pdf/PDFLibrary";
import { UploadPDFModal } from "@/components/modules/pdf/UploadPDFModal";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import axios from "axios";
import { usePermissions } from "@/hooks/usePermissions";

export default function PDFsPage() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const { hasPermission } = usePermissions();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const loadStudents = async () => {
    try {
      const response = await axios.get("/api/students", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudents(response.data.students || []);
    } catch (error) {
      console.error("Failed to load students:", error);
    }
  };

  const handleUploadClick = () => {
    loadStudents();
    setUploadModalOpen(true);
  };

  return (
    <PermissionGuard permission="pdf.access">
      <div className="space-y-6 p-6">
        <PDFLibrary
          onUploadClick={hasPermission("pdf.upload") ? handleUploadClick : undefined}
          canUpload={hasPermission("pdf.upload")}
        />
        {hasPermission("pdf.upload") && (
          <UploadPDFModal
            isOpen={uploadModalOpen}
            onClose={() => setUploadModalOpen(false)}
            onSuccess={() => {
              // Refresh PDF list
              window.location.reload();
            }}
            students={students}
          />
        )}
      </div>
    </PermissionGuard>
  );
}
