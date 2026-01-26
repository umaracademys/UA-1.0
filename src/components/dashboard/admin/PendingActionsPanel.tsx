"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, Star, UserPlus, AlertCircle } from "lucide-react";
import Link from "next/link";

type PendingItem = {
  _id: string;
  title: string;
  description?: string;
  type: "ticket" | "evaluation" | "registration";
  createdAt: Date | string;
  link: string;
};

type PendingActionsPanelProps = {
  tickets: PendingItem[];
  evaluations: PendingItem[];
  registrations: PendingItem[];
  onReview?: (type: string, id: string) => void;
};

export function PendingActionsPanel({
  tickets,
  evaluations,
  registrations,
  onReview,
}: PendingActionsPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["tickets"]));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const sections = [
    {
      id: "tickets",
      title: "Tickets Pending Review",
      icon: FileText,
      items: tickets,
      color: "yellow",
      link: "/admin/tickets?filter=submitted",
    },
    {
      id: "evaluations",
      title: "Evaluations Pending Review",
      icon: Star,
      items: evaluations,
      color: "blue",
      link: "/admin/evaluations?filter=submitted",
    },
    {
      id: "registrations",
      title: "New Student Registrations",
      icon: UserPlus,
      items: registrations,
      color: "green",
      link: "/admin/students?filter=pending",
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-neutral-900">Pending Actions</h2>
      {sections.map((section) => {
        const Icon = section.icon;
        const isExpanded = expandedSections.has(section.id);
        const displayItems = isExpanded ? section.items.slice(0, 5) : [];

        return (
          <div
            key={section.id}
            className="rounded-lg border border-neutral-200 bg-white shadow-sm"
          >
            {/* Header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${
                    section.color === "yellow" ? "bg-yellow-100 text-yellow-600" :
                    section.color === "blue" ? "bg-blue-100 text-blue-600" :
                    "bg-green-100 text-green-600"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">{section.title}</h3>
                    <p className="text-sm text-neutral-500">
                      {section.items.length} item{section.items.length !== 1 ? "s" : ""} pending
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {section.items.length > 0 && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      section.color === "yellow" ? "bg-yellow-100 text-yellow-700" :
                      section.color === "blue" ? "bg-blue-100 text-blue-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {section.items.length}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-neutral-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-neutral-500" />
                  )}
                </div>
              </div>
            </button>

            {/* Items List */}
            {isExpanded && (
              <div className="border-t border-neutral-200 px-4 py-3">
                {displayItems.length === 0 ? (
                  <p className="py-4 text-center text-sm text-neutral-500">No pending items</p>
                ) : (
                  <div className="space-y-2">
                    {displayItems.map((item) => (
                      <div
                        key={item._id}
                        className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900">{item.title}</p>
                          {item.description && (
                            <p className="mt-0.5 text-xs text-neutral-500 line-clamp-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          {onReview ? (
                            <button
                              onClick={() => onReview(item.type, item._id)}
                              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                            >
                              Review
                            </button>
                          ) : (
                            <Link
                              href={item.link}
                              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                            >
                              Review
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                    {section.items.length > 5 && (
                      <Link
                        href={section.link}
                        className="block text-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        View all {section.items.length} items →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
