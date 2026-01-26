"use client";

import { Dialog } from "@headlessui/react";
import { X, Keyboard } from "lucide-react";

type ShortcutsHelpModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type ShortcutRowProps = {
  keys: string[];
  description: string;
};

function ShortcutRow({ keys, description }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-neutral-200 last:border-b-0">
      <div className="flex items-center gap-1.5">
        {keys.map((key, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <kbd className="px-2.5 py-1 bg-neutral-100 border border-neutral-300 rounded-md font-mono text-xs font-semibold text-neutral-700 shadow-sm">
              {key}
            </kbd>
            {index < keys.length - 1 && (
              <span className="text-neutral-400 text-xs">+</span>
            )}
          </div>
        ))}
      </div>
      <span className="text-sm text-neutral-600 ml-4">{description}</span>
    </div>
  );
}

export function ShortcutsHelpModal({ isOpen, onClose }: ShortcutsHelpModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <Keyboard className="h-5 w-5 text-indigo-600" />
              <Dialog.Title className="text-lg font-semibold text-neutral-900">
                Keyboard Shortcuts & Gestures
              </Dialog.Title>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-6">
            {/* Keyboard Shortcuts */}
            <div className="mb-6">
              <h3 className="text-base font-semibold text-neutral-900 mb-4">Keyboard Shortcuts</h3>
              <div className="space-y-1">
                <ShortcutRow keys={["←"]} description="Previous page" />
                <ShortcutRow keys={["→"]} description="Next page" />
                <ShortcutRow keys={["Ctrl", "+"]} description="Zoom in" />
                <ShortcutRow keys={["Ctrl", "-"]} description="Zoom out" />
                <ShortcutRow keys={["Ctrl", "0"]} description="Reset zoom" />
                <ShortcutRow keys={["F"]} description="Toggle focus mode" />
                <ShortcutRow keys={["Ctrl", "S"]} description="Toggle Surah index" />
                <ShortcutRow keys={["Ctrl", "J"]} description="Toggle Juz index" />
                <ShortcutRow keys={["H"]} description="Toggle historical mistakes" />
                <ShortcutRow keys={["T"]} description="Toggle tools visibility" />
                <ShortcutRow keys={["Esc"]} description="Exit focus mode" />
              </div>
            </div>

            {/* Mobile Gestures */}
            <div>
              <h3 className="text-base font-semibold text-neutral-900 mb-4">Mobile Gestures</h3>
              <div className="space-y-3 text-sm text-neutral-600">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <span className="text-xs font-semibold">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">Swipe Left/Right</p>
                    <p className="text-neutral-600">Navigate between pages</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <span className="text-xs font-semibold">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">Double Tap</p>
                    <p className="text-neutral-600">Toggle focus mode</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <span className="text-xs font-semibold">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">Pinch to Zoom</p>
                    <p className="text-neutral-600">Zoom in/out on the Mushaf page</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <span className="text-xs font-semibold">4</span>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">Long Press</p>
                    <p className="text-neutral-600">Open context menu (if available)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> Keyboard shortcuts are disabled when typing in input fields or text areas.
              </p>
            </div>
          </div>

          <div className="flex justify-end border-t border-neutral-200 px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Got it
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
