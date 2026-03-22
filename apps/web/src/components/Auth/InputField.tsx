"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { itemVariants } from "./animations";

export interface InputFieldProps {
  id: string;
  type: string;
  placeholder: string;
  icon: any;
  name?: string;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  maxLength?: number;
}

export const InputField = ({
  id,
  type,
  placeholder,
  icon: Icon,
  name,
  value,
  onChange,
  autoComplete,
  required,
  disabled,
  error,
  maxLength,
}: InputFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="w-full mb-3 last:mb-0">
      <motion.div variants={itemVariants} className="relative w-full group">
        <div
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 z-10",
            error ? "text-red-400" : "text-white/30 group-focus-within:text-brand-400"
          )}
        >
          <Icon className="w-[17px] h-[17px]" strokeWidth={1.5} />
        </div>
        <input
          id={id}
          name={name}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          aria-label={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          style={{
            WebkitBoxShadow: '0 0 0 1000px rgba(12,10,9,0.92) inset',
            WebkitTextFillColor: '#ffffff',
          }}
          className={cn(
            "auth-input",
            "w-full rounded-xl py-3.5 pl-12 pr-12 text-[15px] outline-none transition-all duration-300 text-white disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-sm placeholder:text-white/30",
            error
              ? "bg-red-500/[0.05] border border-red-500/30 focus:border-red-500/50 focus:bg-red-500/[0.08]"
              : "bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.08] border border-white/[0.1] focus:border-brand-400/50 focus:shadow-[0_0_20px_-5px_rgba(184,156,125,0.15)]"
          )}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors duration-200 z-10"
            aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
          >
            {showPassword ? (
              <EyeOff className="w-[17px] h-[17px]" strokeWidth={1.5} />
            ) : (
              <Eye className="w-[17px] h-[17px]" strokeWidth={1.5} />
            )}
          </button>
        )}
      </motion.div>
      <AnimatePresence>
        {error && (
          <motion.div
            id={`${id}-error`}
            role="alert"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 4 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="flex items-center gap-1.5 px-1 truncate"
          >
            <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" aria-hidden="true" />
            <span className="text-[12px] text-red-400 truncate">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
