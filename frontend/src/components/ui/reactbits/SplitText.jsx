import React from 'react';
import { motion } from 'motion/react';

export function SplitText({
  text = '',
  className = '',
  delay = 0.04,
  initialY = 24,
  tag = 'h1',
}) {
  const words = text.split(' ');

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: delay, delayChildren: 0.05 * i },
    }),
  };

  const child = {
    hidden: {
      opacity: 0,
      y: initialY,
      filter: 'blur(4px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        damping: 18,
        stiffness: 90,
      },
    },
  };

  const Component = motion[tag] || motion.div;

  return (
    <Component
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      className={`inline-flex flex-wrap gap-x-[0.28em] ${className}`}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          variants={child}
          className="inline-block whitespace-nowrap will-change-transform"
        >
          {word}
        </motion.span>
      ))}
    </Component>
  );
}

export default SplitText;
