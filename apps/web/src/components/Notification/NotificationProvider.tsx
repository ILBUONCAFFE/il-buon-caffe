"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, AlertCircle, Info, Coffee } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */
type NotificationTone = "success" | "error" | "info";

interface NotificationPayload {
  message: string;
  tone?: NotificationTone;
  icon?: React.ReactNode;
  duration?: number; // ms, 0 = persistent
}

interface Notification extends Required<Omit<NotificationPayload, "icon">> {
  id: string;
  icon: React.ReactNode;
  createdAt: number;
  leaving: boolean;
}

interface NotificationContextValue {
  notify: (payload: NotificationPayload) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

/* ═══════════════════════════════════════════════════════════════
   Hook
   ═══════════════════════════════════════════════════════════════ */
export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within <NotificationProvider>");
  return ctx;
};

/* ═══════════════════════════════════════════════════════════════
   Default Icons per tone
   ═══════════════════════════════════════════════════════════════ */
const defaultIcons: Record<NotificationTone, React.ReactNode> = {
  success: <CheckCircle2 size={20} strokeWidth={2.2} />,
  error: <AlertCircle size={20} strokeWidth={2.2} />,
  info: <Info size={20} strokeWidth={2.2} />,
};

/* ═══════════════════════════════════════════════════════════════
   Tone Configs
   ═══════════════════════════════════════════════════════════════ */
const toneConfig: Record<
  NotificationTone,
  {
    bg: string;
    border: string;
    iconColor: string;
    progressColor: string;
    glow: string;
  }
> = {
  success: {
    bg: "rgba(249, 246, 243, 0.95)",
    border: "rgba(163, 127, 91, 0.35)",
    iconColor: "#6f5038",
    progressColor: "linear-gradient(90deg, #a37f5b 0%, #d1bea8 100%)",
    glow: "0 8px 32px rgba(163, 127, 91, 0.15), 0 2px 8px rgba(163, 127, 91, 0.1)",
  },
  error: {
    bg: "rgba(249, 246, 243, 0.95)",
    border: "rgba(180, 60, 50, 0.3)",
    iconColor: "#b43c32",
    progressColor: "linear-gradient(90deg, #b43c32 0%, #d97a72 100%)",
    glow: "0 8px 32px rgba(180, 60, 50, 0.12), 0 2px 8px rgba(180, 60, 50, 0.08)",
  },
  info: {
    bg: "rgba(249, 246, 243, 0.95)",
    border: "rgba(163, 127, 91, 0.25)",
    iconColor: "#8a6446",
    progressColor: "linear-gradient(90deg, #8a6446 0%, #b89c7d 100%)",
    glow: "0 8px 32px rgba(138, 100, 70, 0.12), 0 2px 8px rgba(138, 100, 70, 0.08)",
  },
};

/* ═══════════════════════════════════════════════════════════════
   Single Toast Card
   ═══════════════════════════════════════════════════════════════ */
const ENTER_DURATION = 500;
const LEAVE_DURATION = 400;

const NotificationCard = ({
  notification,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: (id: string) => void;
}) => {
  const { id, message, tone, icon, duration, leaving } = notification;
  const config = toneConfig[tone];
  const progressRef = useRef<HTMLDivElement>(null);
  const isError = tone === "error";

  /* auto-dismiss timer */
  useEffect(() => {
    if (duration <= 0) return;
    const timeout = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timeout);
  }, [duration, id, onDismiss]);

  /* progress bar animation */
  useEffect(() => {
    if (duration <= 0 || !progressRef.current) return;
    const el = progressRef.current;
    // Reset and start
    el.style.transition = "none";
    el.style.transform = "scaleX(1)";
    // Force reflow
    void el.offsetWidth;
    el.style.transition = `transform ${duration}ms linear`;
    el.style.transform = "scaleX(0)";
  }, [duration]);

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
      style={{
        background: config.bg,
        borderColor: config.border,
        boxShadow: config.glow,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        animation: leaving
          ? `notifLeave ${LEAVE_DURATION}ms cubic-bezier(0.4, 0, 1, 1) forwards`
          : `notifEnter ${ENTER_DURATION}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
      }}
      className="relative overflow-hidden border rounded-2xl pointer-events-auto w-[clamp(300px,90vw,400px)]"
    >
      {/* ─── Content Row ─── */}
      <div className="flex items-start gap-3 px-5 py-4">
        {/* Icon */}
        <div
          className="shrink-0 mt-0.5"
          style={{ color: config.iconColor }}
        >
          {icon}
        </div>

        {/* Text */}
        <p className="flex-1 text-sm font-medium leading-snug text-[#1c1917] font-sans">
          {message}
        </p>

        {/* Close */}
        <button
          onClick={() => onDismiss(id)}
          className="shrink-0 -mr-1 -mt-0.5 p-1 rounded-lg text-[#b89c7d] hover:text-[#6f5038] hover:bg-[#f3eee8] transition-all duration-200"
          aria-label="Zamknij"
        >
          <X size={15} strokeWidth={2.5} />
        </button>
      </div>

      {/* ─── Progress Bar ─── */}
      {duration > 0 && (
        <div className="h-[3px] w-full bg-[#e6dcd3]/40">
          <div
            ref={progressRef}
            className="h-full origin-left"
            style={{
              background: config.progressColor,
            }}
          />
        </div>
      )}

      {/* ─── Decorative accent line (top) ─── */}
      <div
        className="absolute top-0 left-5 right-5 h-[1px]"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${config.iconColor}33 50%, transparent 100%)`,
        }}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Provider Component
   ═══════════════════════════════════════════════════════════════ */
export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mounted, setMounted] = useState(false);
  const counterRef = useRef(0);

  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: string) => {
    // mark as leaving first
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leaving: true } : n))
    );
    // then remove after animation
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, LEAVE_DURATION);
  }, []);

  const notify = useCallback(
    (payload: NotificationPayload) => {
      const tone = payload.tone ?? "success";
      const id = `notif-${++counterRef.current}-${Date.now()}`;

      const newNotif: Notification = {
        id,
        message: payload.message,
        tone,
        icon: payload.icon ?? defaultIcons[tone],
        duration: payload.duration ?? 3500,
        createdAt: Date.now(),
        leaving: false,
      };

      setNotifications((prev) => {
        // Keep max 5 notifications
        const limited = prev.length >= 5 ? prev.slice(1) : prev;
        return [...limited, newNotif];
      });
    },
    []
  );

  const success = useCallback(
    (message: string) => notify({ message, tone: "success" }),
    [notify]
  );

  const error = useCallback(
    (message: string) => notify({ message, tone: "error" }),
    [notify]
  );

  const info = useCallback(
    (message: string) => notify({ message, tone: "info" }),
    [notify]
  );

  return (
    <NotificationContext.Provider value={{ notify, success, error, info }}>
      {children}
      {mounted &&
        createPortal(
          <>
            {/* ─── Global animation styles ─── */}
            <style>{`
              @keyframes notifEnter {
                0% {
                  opacity: 0;
                  transform: translateX(40px) scale(0.95);
                  filter: blur(4px);
                }
                100% {
                  opacity: 1;
                  transform: translateX(0) scale(1);
                  filter: blur(0px);
                }
              }
              @keyframes notifLeave {
                0% {
                  opacity: 1;
                  transform: translateX(0) scale(1);
                  filter: blur(0px);
                }
                100% {
                  opacity: 0;
                  transform: translateX(60px) scale(0.92);
                  filter: blur(4px);
                }
              }
            `}</style>

            {/* ─── Container ─── */}
            <div
              aria-label="Powiadomienia"
              className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-3 pointer-events-none"
              style={{ maxHeight: "calc(100vh - 48px)" }}
            >
              {notifications.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onDismiss={dismiss}
                />
              ))}
            </div>
          </>,
          document.body
        )}
    </NotificationContext.Provider>
  );
};
