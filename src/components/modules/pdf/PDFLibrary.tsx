"use client";

import { useState, useEffect } from "react";
import { FileText, Download, Eye, Trash2, Grid, List, Search, Filter, Upload } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { format } from "date-fns";
import Link from "next/link";

type PDF = {
  _id: string;
  title: string;
  category: string;
  pages: number;
  fileSize: number;
  createdAt: Date | string;
  uploadedBy: {
    fullName: string;
  };
  views: number;
  downloads: number;
};

type PDFLibraryProps = {
  onUploadClick?: () => void;
  canUpload?: boolean;
};

export function PDFLibrary({ onUploadClick, canUpload = false }: PDFLibraryProps) {
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"recent" | "title" | "size">("recent");
  const [categories, setCategories] = useState<string[]>([]);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    loadPDFs();
    loadCategories();
  }, [categoryFilter, sortBy]);

  const loadPDFs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (categoryFilter) params.category = categoryFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await axios.get("/api/pdfs", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setPdfs(response.data.pdfs || []);
    } catch (error) {
      toast.error("Failed to load PDFs");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await axios.get("/api/pdfs/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const handleDelete = async (pdfId: string) => {
    if (!confirm("Are you sure you want to delete this PDF?")) {
      return;
    }

    try {
      await axios.delete(`/api/pdfs/${pdfId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("PDF deleted successfully");
      loadPDFs();
    } catch (error) {
      toast.error("Failed to delete PDF");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const sortedPdfs = [...pdfs].sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    } else {
      return b.fileSize - a.fileSize;
    }
  });

  const filteredPdfs = sortedPdfs.filter((pdf) => {
    if (searchQuery) {
      return pdf.title.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-neutral-500">Loading PDFs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-neutral-900">PDF Library</h2>
        <div className="flex items-center gap-2">
          {canUpload && onUploadClick && (
            <button
              onClick={onUploadClick}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Upload className="h-4 w-4" />
              Upload PDF
            </button>
          )}
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 ${viewMode === "grid" ? "bg-indigo-50 text-indigo-600" : "text-neutral-600"}`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 ${viewMode === "list" ? "bg-indigo-50 text-indigo-600" : "text-neutral-600"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search PDFs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white pl-10 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="recent">Most Recent</option>
          <option value="title">Title</option>
          <option value="size">Size</option>
        </select>
      </div>

      {/* PDF List/Grid */}
      {filteredPdfs.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-neutral-400" />
          <p className="mt-4 text-neutral-600">No PDFs found</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPdfs.map((pdf) => (
            <div
              key={pdf._id}
              className="group rounded-lg border border-neutral-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="mb-3 flex h-32 items-center justify-center rounded-lg bg-neutral-100">
                <FileText className="h-12 w-12 text-neutral-400" />
              </div>
              <h3 className="mb-1 font-semibold text-neutral-900 line-clamp-2">{pdf.title}</h3>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {pdf.category}
                </span>
              </div>
              <div className="mb-3 text-xs text-neutral-500">
                {pdf.pages} pages • {formatFileSize(pdf.fileSize)}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/pdfs/${pdf._id}`}
                  className="flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-indigo-700"
                >
                  <Eye className="mx-auto h-4 w-4" />
                </Link>
                <button
                  onClick={() => handleDelete(pdf._id)}
                  className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Pages
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Size
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Uploaded
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredPdfs.map((pdf) => (
                <tr key={pdf._id} className="hover:bg-neutral-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="font-medium text-neutral-900">{pdf.title}</div>
                    <div className="text-xs text-neutral-500">by {pdf.uploadedBy.fullName}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      {pdf.category}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">{pdf.pages}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                    {formatFileSize(pdf.fileSize)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                    {format(new Date(pdf.createdAt), "MMM dd, yyyy")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/pdfs/${pdf._id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(pdf._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
