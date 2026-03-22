"use client";

import { motion } from "motion/react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export const EmailStatus = ({ status }: { status: "loading" | "available" | "taken" | "invalid" | null }) => {
  if (!status) return null;
  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="w-full flex items-center justify-end px-2 mt-[-4px] mb-2"
    >
      {status === "loading" && (
        <span className="text-[12px] text-white/40 flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Sprawdzanie...
        </span>
      )}
      {status === "available" && (
        <span className="text-[12px] text-emerald-400 flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3" /> Email dostępny
        </span>
      )}
      {status === "taken" && (
        <span className="text-[12px] text-red-400 flex items-center gap-1.5">
          <XCircle className="w-3 h-3" /> Email zajęty
        </span>
      )}
      {status === "invalid" && (
        <span className="text-[12px] text-red-400 flex items-center gap-1.5">
          <XCircle className="w-3 h-3" /> Niepoprawny email
        </span>
      )}
    </motion.div>
  );
};
