import { Variants } from 'framer-motion';

// Standard Easings
export const EASE = [0.25, 0.1, 0.25, 1.0]; // Cubic Bezier (Similar to iOS ease-out)

// Transitions
export const TRANSITION = {
  ease: EASE,
  duration: 0.3,
};

export const SPRING_TRANSITION = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

// Variants
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const scaleIn: Variants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
};

export const slideUpSheet: Variants = {
  hidden: { y: '100%' },
  visible: { y: 0 },
  exit: { y: '100%' },
};

export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};
