'use client';

import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';

interface AnimatedAmountProps {
  value: number;
    currency?: string;
  className?: string;
  fractionDigits?: number;
}

export default function AnimatedAmount({ value, currency = '₹', className, fractionDigits = 0 }: AnimatedAmountProps) {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => 
     `${currency} ${current.toLocaleString(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}`
  );

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span className={className}>{display}</motion.span>;
}
