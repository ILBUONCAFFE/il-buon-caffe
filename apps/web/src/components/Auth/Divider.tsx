"use client";

import { motion } from "motion/react";
import { itemVariants } from "./animations";

export const Divider = ({ text }: { text: string }) => (
  <motion.div variants={itemVariants} className="flex items-center gap-4 w-full my-3">
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    <span className="text-[10px] text-white/40 uppercase tracking-[0.25em] font-medium whitespace-nowrap">
      {text}
    </span>
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
  </motion.div>
);
