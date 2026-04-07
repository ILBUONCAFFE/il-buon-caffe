"use client";

import { motion, useInView, Variants } from "motion/react";
import React, { useRef } from "react";

type AnimatedTextProps = {
  text: string;
  el?: React.ElementType;
  className?: string;
  once?: boolean;
  staggerChildren?: number;
  delayChildren?: number;
};

const defaultAnimations: Variants = {
  hidden: {
    opacity: 0,
    y: "0.72em",
  },
  visible: {
    opacity: 1,
    y: "0em",
    transition: {
      duration: 0.8,
      ease: [0.76, 0, 0.24, 1], // Custom kubiczna krzywa beziera (smooth!)
    },
  },
};

export const AnimatedText = ({
  text,
  el: Wrapper = "p",
  className,
  once = true,
  staggerChildren = 0.05,
  delayChildren = 0,
}: AnimatedTextProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { amount: 0.5, once });

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren,
        delayChildren,
      },
    },
  };

  // Convert text string into an array of words
  const words = text.split(" ");

  return (
    <Wrapper className={className}>
      <span className="sr-only">{text}</span>
      <motion.span
        ref={ref}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={containerVariants}
        aria-hidden
        className="inline-block"
      >
        {words.map((word, wordIndex) => (
          <span
            className="inline-block overflow-hidden pb-[0.18em] -mb-[0.18em] align-bottom"
            key={`${word}-${wordIndex}`}
          >
            <motion.span
              className="inline-block will-change-transform"
              variants={defaultAnimations}
            >
              {word}&nbsp;
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Wrapper>
  );
};
