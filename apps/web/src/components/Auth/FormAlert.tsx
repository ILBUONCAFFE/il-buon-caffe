"use client";

import { motion } from "motion/react";
import { XCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const FormAlert = ({ message, tone = "error" }: { message: string; tone?: "error" | "success" }) => (
  <motion.div
    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
    animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
    role={tone === "error" ? "alert" : "status"}
    aria-live={tone === "error" ? "assertive" : "polite"}
    className={cn(
      "w-full px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 overflow-hidden backdrop-blur-md border",
      tone === "error"
        ? "bg-red-500/10 text-red-300 border-red-500/20"
        : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
    )}
  >
    {tone === "error" ? (
      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" aria-hidden="true" />
    ) : (
      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" aria-hidden="true" />
    )}
    {message}
  </motion.div>
);
