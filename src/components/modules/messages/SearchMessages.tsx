"use client";

import { useState, useEffect } from "react";
import { Search, X, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

type SearchResult = {
  _id: string;
  content: string;
  senderId: {
    fullName: string;
  };
  createdAt: Date;
  conversationId: string;
  highlightedContent?: string;
};

type SearchMessagesProps = {
  conversationId: string;
  onResultClick: (messageId: string) => void;
  token: string | null;
  isOpen: boolean;
  onClose: () => void;
};

export function SearchMessages({
  conversationId,
  onResultClick,
  token,
  isOpen,
  onClose,
}: SearchMessagesProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/messages/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: searchQuery,
          conversationId,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setResults(result.results || []);
        setSelectedIndex(-1);
      } else {
        toast.error(result.message || "Search failed");
      }
    } catch (error) {
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch(query);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const handleResultClick = (messageId: string) => {
    onResultClick(messageId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-x-0 top-0 z-50 border-b border-neutral-200 bg-white shadow-lg">
      <div className="p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search in conversation..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Close
          </button>
        </div>

        {/* Search Results */}
        {query && (
          <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-neutral-200 bg-white">
            {loading ? (
              <div className="py-4 text-center text-sm text-neutral-500">Searching...</div>
            ) : results.length === 0 ? (
              <div className="py-4 text-center text-sm text-neutral-500">No results found</div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {results.map((result, index) => (
                  <button
                    key={result._id}
                    onClick={() => handleResultClick(result._id)}
                    className={`w-full p-3 text-left transition-colors hover:bg-neutral-50 ${
                      selectedIndex === index ? "bg-indigo-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-neutral-600">{result.senderId.fullName}</p>
                        <p
                          className="mt-1 text-sm text-neutral-900"
                          dangerouslySetInnerHTML={{
                            __html: result.highlightedContent || result.content,
                          }}
                        />
                      </div>
                      <span className="ml-2 text-xs text-neutral-500">
                        {format(new Date(result.createdAt), "MMM dd, h:mm a")}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
