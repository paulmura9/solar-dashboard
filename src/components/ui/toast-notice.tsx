"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface ToastNoticeProps {
  message: string;
  durationMs?: number;
  onClose?: () => void;
}

export function ToastNotice({
  message,
  durationMs = 2500,
  onClose,
}: ToastNoticeProps) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setOpen(false), durationMs);
    return () => clearTimeout(id);
  }, [durationMs]);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50">
      <AnimatePresence onExitComplete={onClose}>
        {open && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="pointer-events-auto flex items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3.5 py-2.5 text-xs text-[#1e293b] shadow-md"
          >
            <CheckCircle2 size={14} className="text-green-500 shrink-0" />
            <span>{message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
