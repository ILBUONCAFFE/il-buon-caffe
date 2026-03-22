"use client";

import { motion } from 'motion/react';
import { palette } from './palette';

// CharacteristicBar component
export const CharacteristicBar = ({ label, value, delay = 0 }: { label: string; value: number; delay?: number }) => (
  <motion.div
    className="flex items-center gap-4"
    initial={{ opacity: 0, x: -20 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
  >
    <span className="text-sm w-24 shrink-0" style={{ color: palette.textMuted }}>{label}</span>
    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: palette.bgMuted }}>
      <motion.div
        className="h-full rounded-full"
        style={{
          background: `linear-gradient(90deg, ${palette.accent}, ${palette.accentLight})`,
        }}
        initial={{ width: 0 }}
        whileInView={{ width: `${value}%` }}
        viewport={{ once: true }}
        transition={{ delay: delay + 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
    <span className="text-sm font-medium w-10 text-right" style={{ color: palette.textSecondary }}>{value}%</span>
  </motion.div>
);
