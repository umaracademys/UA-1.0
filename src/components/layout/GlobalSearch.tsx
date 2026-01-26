"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, FileText, Users, MessageSquare, Ticket, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useDebounce } from "use-debounce";

type SearchResult = {
  type: "student" | "teacher" | "assignment" | "ticket" | "message" | "pdf";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      // Search across multiple endpoints
      const [studentsRes, teachersRes, assignmentsRes, ticketsRes, pdfsRes] = await Promise.allSettled([
        axios.get("/api/students", {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: searchQuery, limit: 5 },
        }),
        axios.get("/api/teachers", {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: searchQuery, limit: 5 },
        }),
        axios.get("/api/assignments", {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: searchQuery, limit: 5 },
        }),
        axios.get("/api/tickets", {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: searchQuery, limit: 5 },
        }),
        axios.get("/api/pdfs", {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: searchQuery, limit: 5 },
        }),
      ]);

      const allResults: SearchResult[] = [];

      if (studentsRes.status === "fulfilled" && studentsRes.value.data.students) {
        studentsRes.value.data.students.forEach((student: any) => {
          allResults.push({
            type: "student",
            id: student._id,
            title: student.userId?.fullName || "Unknown",
            subtitle: student.programType,
            href: `/admin/students/${student._id}`,
          });
        });
      }

      if (teachersRes.status === "fulfilled" && teachersRes.value.data.teachers) {
        teachersRes.value.data.teachers.forEach((teacher: any) => {
          allResults.push({
            type: "teacher",
            id: teacher._id,
            title: teacher.userId?.fullName || "Unknown",
            subtitle: teacher.specialization,
            href: `/admin/teachers/${teacher._id}`,
          });
        });
      }

      if (assignmentsRes.status === "fulfilled" && assignmentsRes.value.data.assignments) {
        assignmentsRes.value.data.assignments.forEach((assignment: any) => {
          allResults.push({
            type: "assignment",
            id: assignment._id,
            title: assignment.title,
            subtitle: assignment.type,
            href: `/admin/assignments/${assignment._id}`,
          });
        });
      }

      if (ticketsRes.status === "fulfilled" && ticketsRes.value.data.tickets) {
        ticketsRes.value.data.tickets.forEach((ticket: any) => {
          allResults.push({
            type: "ticket",
            id: ticket._id,
            title: `Ticket for ${ticket.studentId?.userId?.fullName || "Student"}`,
            subtitle: ticket.workflowStep,
            href: `/admin/tickets/${ticket._id}`,
          });
        });
      }

      if (pdfsRes.status === "fulfilled" && pdfsRes.value.data.pdfs) {
        pdfsRes.value.data.pdfs.forEach((pdf: any) => {
          allResults.push({
            type: "pdf",
            id: pdf._id,
            title: pdf.title,
            subtitle: pdf.category,
            href: `/pdfs/${pdf._id}`,
          });
        });
      }

      setResults(allResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    router.push(result.href);
    setIsOpen(false);
    setQuery("");
    
    // Add to recent searches
    if (query && !recentSearches.includes(query)) {
      const newRecent = [query, ...recentSearches.slice(0, 4)];
      setRecentSearches(newRecent);
      if (typeof window !== "undefined") {
        localStorage.setItem("recentSearches", JSON.stringify(newRecent));
      }
    }
  };

  const getResultIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "student":
      case "teacher":
        return Users;
      case "assignment":
        return FileText;
      case "ticket":
        return Ticket;
      case "message":
        return MessageSquare;
      case "pdf":
        return BookOpen;
      default:
        return Search;
    }
  };

  return (
    <div className="relative" ref={searchRef}>
      {/* Search Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-64 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-500 hover:border-indigo-300 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="hidden rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-xs font-semibold text-neutral-500 md:inline-block">
          ⌘K
        </kbd>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-96 rounded-lg border border-neutral-200 bg-white shadow-xl">
          {/* Search Input */}
          <div className="flex items-center gap-2 border-b border-neutral-200 p-3">
            <Search className="h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students, assignments, tickets..."
              className="flex-1 border-none bg-transparent text-sm focus:outline-none"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="rounded p-1 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-neutral-500">Searching...</div>
            ) : query.length < 2 ? (
              <div className="p-4">
                {recentSearches.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-neutral-500">
                      Recent Searches
                    </p>
                    <div className="space-y-1">
                      {recentSearches.map((search, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setQuery(search);
                            performSearch(search);
                          }}
                          className="w-full rounded px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm text-neutral-500">No results found</div>
            ) : (
              <div className="p-2">
                {results.map((result) => {
                  const Icon = getResultIcon(result.type);
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-neutral-50"
                    >
                      <Icon className="h-5 w-5 text-neutral-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900">{result.title}</p>
                        {result.subtitle && (
                          <p className="text-xs text-neutral-500">{result.subtitle}</p>
                        )}
                      </div>
                      <span className="text-xs text-neutral-400 capitalize">{result.type}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
