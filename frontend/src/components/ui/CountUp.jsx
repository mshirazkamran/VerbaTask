import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring, useTransform, motion } from 'motion/react';

export function CountUp({
 to,
 from = 0,
 duration = 1.5,
 separator = ',',
 decimals = 0,
 prefix = '',
 suffix = '',
 className = '',
}) {
 const ref = useRef(null);
 const inView = useInView(ref, { once: true, margin: '-20px' });
 const motionValue = useMotionValue(from);
 
 const springValue = useSpring(motionValue, {
 duration: duration * 1000,
 bounce: 0,
 });

 const display = useTransform(springValue, (latest) => {
 let formatted = latest.toFixed(decimals);
 if (separator) {
 formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
 }
 return `${prefix}${formatted}${suffix}`;
 });

 useEffect(() => {
 if (inView) {
 motionValue.set(to);
 }
 }, [inView, to, motionValue]);

 return <motion.span ref={ref} className={className}>{display}</motion.span>;
}
