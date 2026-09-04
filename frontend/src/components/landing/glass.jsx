import { motion, useInView, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

export const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 90, damping: 18, mass: 0.7 },
  },
};

export function Reveal({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({ children, className = '', gap = 0.09 }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-70px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

export function GlassCard({
  children,
  className = '',
  hover = true,
  strong = false,
}) {
  return (
    <motion.div
      whileHover={
        hover
          ? {
              scale: 1.015,
            }
          : undefined
      }
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className={`rounded-2xl p-6 transition-all duration-300 ${
        strong
          ? 'bg-white dark:bg-[#141722] dark:bg-gradient-to-b dark:from-white/[0.09] dark:to-white/[0.03] border border-zinc-200 dark:border-white/15 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_20px_50px_-15px_rgba(0,0,0,0.7)]'
          : 'bg-white dark:bg-[#12151C] dark:bg-gradient-to-b dark:from-white/[0.06] dark:to-white/[0.02] border border-zinc-200 dark:border-white/10 shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_16px_36px_-12px_rgba(0,0,0,0.55)]'
      } ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function CountUp({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, value, mv]);

  useEffect(() => {
    const unsub = spring.on('change', (v) => setDisplay(v));
    return () => unsub();
  }, [spring]);

  return (
    <span ref={ref} className={`font-mono tabular-nums ${className}`}>
      {prefix}
      {display.toLocaleString('en-PK', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
}) {
  return (
    <div className={`max-w-2xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
      {eyebrow && (
        <span className="inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400 mb-3">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950 dark:text-white font-heading">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}
