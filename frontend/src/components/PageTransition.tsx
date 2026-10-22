import { ReactNode } from 'react';
import { motion, Variants } from 'framer-motion';

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
    filter: 'blur(4px)',
  },
  in: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.28,
      ease: [0.16, 1, 0.3, 1] as any,
    },
  },
  out: {
    opacity: 0,
    y: -8,
    filter: 'blur(3px)',
    transition: {
      duration: 0.18,
      ease: [0.16, 1, 0.3, 1] as any,
    },
  },
};

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export default function PageTransition({ children, className = 'w-full' }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}
