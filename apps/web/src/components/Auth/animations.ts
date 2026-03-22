// ─── Animation Constants ───
export const EASE = [0.22, 1, 0.36, 1] as const;
export const CONTENT_TRANSITION = { duration: 0.7, ease: EASE };

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3, staggerChildren: 0.04, staggerDirection: -1 },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: CONTENT_TRANSITION,
  },
  exit: { opacity: 0, y: -10, filter: "blur(4px)", transition: { duration: 0.2 } },
};
