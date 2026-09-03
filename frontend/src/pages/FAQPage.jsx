import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';
import { IconChevronDown, IconArrowRight } from '@tabler/icons-react';
import { LandingLayout } from '../components/layout/LandingLayout';

const ease = [0.16, 1, 0.3, 1];

const faqs = [
 {
 q: 'What is VerbaTask?',
 a: 'VerbaTask is a WhatsApp-first commerce tool for small shopkeepers in Pakistan. You speak a sale in Urdu or English, and it automatically records the order, deducts stock, and triggers any workflows you set up. No separate app needed.',
 },
 {
 q: 'Do I need to download an app?',
 a: 'No. VerbaTask works entirely through WhatsApp. You can also use the web dashboard for charts and detailed views, but the core flow lives in WhatsApp.',
 },
 {
 q: 'What languages are supported?',
 a: 'Urdu and English, both written and spoken. Voice notes are transcribed by Whisper AI, which handles Urdu natively. You can also type commands in Roman Urdu.',
 },
 {
 q: 'How do I link my WhatsApp number?',
 a: 'After signing up with your email, you\'ll be redirected to the link page. Send a message to the VerbaTask bot on WhatsApp, and you\'ll receive a 6-digit code. Enter that code along with your email to link your number.',
 },
 {
 q: 'Is my data secure?',
 a: 'Your password is hashed before storage. WhatsApp webhook messages are verified using HMAC-SHA256 signatures from Meta. All API requests to the dashboard require a valid JWT token.',
 },
 {
 q: 'How does the approval system work?',
 a: 'Any order above Rs. 10,000 is flagged as high-value and requires your approval before it\'s completed. You receive an interactive button message on WhatsApp where you can approve or reject with one tap. You can also review pending approvals in the dashboard.',
 },
 {
 q: 'Can I set up automation workflows?',
 a: 'Yes. You can create workflows that trigger on low stock (e.g., "notify me when rice drops below 5"), on keywords in WhatsApp messages, or on a schedule. Workflows can send you WhatsApp notifications.',
 },
 {
 q: 'What payment methods are tracked?',
 a: 'VerbaTask tracks cash, EasyPaisa, JazzCash, and bank transfers. Every order records its payment method, and the dashboard shows a breakdown by payment type.',
 },
 {
 q: 'Is VerbaTask free?',
 a: 'Yes, VerbaTask is free and open source. The code is available on GitHub for anyone to use or contribute to.',
 },
 {
 q: 'How do I get started?',
 a: 'Click "Get started" on the homepage, create an account with your email and password, then follow the WhatsApp linking flow. Once linked, you can start speaking sales immediately.',
 },
];

function FAQItem({ question, answer, defaultOpen = false }) {
 const [open, setOpen] = useState(defaultOpen);

 return (
 <motion.div
 className="border border-hairline rounded-lg bg-canvas overflow-hidden"
 initial={{ opacity: 0, y: 12 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true, margin: '-40px' }}
 transition={{ duration: 0.4, ease }}
 >
 <button
 type="button"
 onClick={() => setOpen(!open)}
 className="w-full px-5 py-4 flex items-center justify-between text-left cursor-pointer hover:bg-canvas-soft transition-colors"
 >
 <span className="font-heading text-base font-light text-ink pr-4">{question}</span>
 <motion.span
 animate={{ rotate: open ? 180 : 0 }}
 transition={{ duration: 0.2, ease }}
 className="shrink-0 text-ink-mute"
 >
 <IconChevronDown className="w-4 h-4" />
 </motion.span>
 </button>
 <AnimatePresence initial={false}>
 {open && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.3, ease }}
 className="overflow-hidden"
 >
 <p className="px-5 pb-4 font-body text-sm text-ink-mute leading-relaxed">
 {answer}
 </p>
 </motion.div>
 )}
 </AnimatePresence>
 </motion.div>
 );
}

export function FAQPage() {
 return (
 <LandingLayout>
 <div className="py-16 lg:py-24">
 <div className="max-w-3xl mx-auto px-6">
 <motion.div
 className="text-center mb-12"
 initial={{ opacity: 0, y: 16 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.5, ease }}
 >
 <p className="font-heading text-xs font-medium uppercase tracking-wider text-primary mb-3">
 FAQ
 </p>
 <h1 className="font-heading text-3xl sm:text-4xl font-light tracking-[-0.96px] text-ink leading-[1.15]">
 Frequently asked questions
 </h1>
 <p className="font-body text-sm text-ink-mute mt-4 leading-relaxed">
 Everything you need to know about VerbaTask. Can't find what you're looking for?{' '}
 <Link to="/contact" className="text-primary hover:underline">Contact us</Link>.
 </p>
 </motion.div>

 <div className="space-y-3">
 {faqs.map((faq, i) => (
 <FAQItem key={faq.q} question={faq.q} answer={faq.a} defaultOpen={i === 0} />
 ))}
 </div>

 <motion.div
 className="mt-12 text-center"
 initial={{ opacity: 0 }}
 whileInView={{ opacity: 1 }}
 viewport={{ once: true }}
 transition={{ duration: 0.4 }}
 >
 <p className="text-sm text-ink-mute">Still have questions?</p>
 <Link
 to="/contact"
 className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline mt-2"
 >
 Get in touch
 <IconArrowRight className="w-3.5 h-3.5" />
 </Link>
 </motion.div>
 </div>
 </div>
 </LandingLayout>
 );
}
