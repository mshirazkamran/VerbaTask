import { motion } from 'motion/react';
import { Link } from 'react-router';
import {
 IconBrandGithub,
 IconArrowRight,
 IconCode,
 IconBug,
 IconStar,
 IconGitFork,
} from '@tabler/icons-react';
import { LandingLayout } from '../components/layout/LandingLayout';

const ease = [0.16, 1, 0.3, 1];

const links = [
 {
 icon: IconBrandGithub,
 title: 'Source code',
 desc: 'View the full codebase, report issues, or contribute to VerbaTask.',
 href: 'https://github.com/soban-iftikhar/VerbaTask',
 action: 'View on GitHub',
 },
 {
 icon: IconBug,
 title: 'Report a bug',
 desc: 'Found something broken? Open an issue and we\'ll look into it.',
 href: 'https://github.com/soban-iftikhar/VerbaTask/issues',
 action: 'Open an issue',
 },
 {
 icon: IconStar,
 title: 'Feature request',
 desc: 'Have an idea for VerbaTask? Open a feature request on GitHub.',
 href: 'https://github.com/soban-iftikhar/VerbaTask/issues',
 action: 'Request feature',
 },
 {
 icon: IconGitFork,
 title: 'Contribute',
 desc: 'Fork the repo, make your changes, and submit a pull request.',
 href: 'https://github.com/soban-iftikhar/VerbaTask/fork',
 action: 'Fork repository',
 },
];

export function ContactPage() {
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
 Contact
 </p>
 <h1 className="font-heading text-3xl sm:text-4xl font-light tracking-[-0.96px] text-ink leading-[1.15]">
 Get in touch
 </h1>
 <p className="font-body text-sm text-ink-mute mt-4 leading-relaxed">
 VerbaTask is open source. The best way to reach us is through GitHub.
 </p>
 </motion.div>

 {/* GitHub CTA Card */}
 <motion.div
 className="border border-hairline rounded-lg bg-canvas p-8 text-center mb-8"
 initial={{ opacity: 0, y: 24 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.5, delay: 0.1, ease }}
 >
 <div className="w-14 h-14 rounded-xl bg-ink/5 flex items-center justify-center mx-auto mb-4">
 <IconCode className="w-7 h-7 text-ink" />
 </div>
 <h2 className="font-heading text-xl font-light tracking-[-0.26px] text-ink">
 github.com/soban-iftikhar/VerbaTask
 </h2>
 <p className="font-body text-sm text-ink-mute mt-2 leading-relaxed max-w-md mx-auto">
 The full source code for VerbaTask is available on GitHub. Star the repo if you find it useful, or open an issue to report bugs.
 </p>
 <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
 <a
 href="https://github.com/soban-iftikhar/VerbaTask"
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-2 bg-ink text-canvas px-6 py-2.5 rounded-pill text-sm font-medium hover:bg-ink/90 transition-colors"
 >
 <IconBrandGithub className="w-4 h-4" />
 View repository
 </a>
 <Link
 to="/signup"
 className="inline-flex items-center gap-2 text-ink-secondary px-6 py-2.5 rounded-pill text-sm font-medium border border-hairline hover:bg-canvas-soft transition-colors"
 >
 Try VerbaTask
 <IconArrowRight className="w-4 h-4" />
 </Link>
 </div>
 </motion.div>

 {/* Quick Links */}
 <div className="grid sm:grid-cols-2 gap-4">
 {links.map((link, i) => {
 const Icon = link.icon;
 return (
 <motion.a
 key={link.title}
 href={link.href}
 target="_blank"
 rel="noopener noreferrer"
 className="border border-hairline rounded-lg bg-canvas p-5 hover:shadow-card transition-shadow group"
 initial={{ opacity: 0, y: 16 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.4, delay: 0.15 + i * 0.08, ease }}
 >
 <div className="flex items-start justify-between">
 <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
 <Icon className="w-5 h-5" />
 </div>
 <IconArrowRight className="w-4 h-4 text-ink-mute group-hover:text-primary transition-colors" />
 </div>
 <h3 className="font-heading text-base font-light text-ink">{link.title}</h3>
 <p className="font-body text-sm text-ink-mute mt-1 leading-relaxed">{link.desc}</p>
 </motion.a>
 );
 })}
 </div>

 <motion.div
 className="mt-12 text-center"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ duration: 0.4, delay: 0.5 }}
 >
 <p className="text-sm text-ink-mute">
 Need help? Check the{' '}
 <Link to="/faq" className="text-primary hover:underline">FAQ</Link>{' '}
 or{' '}
 <a
 href="https://github.com/soban-iftikhar/VerbaTask"
 target="_blank"
 rel="noopener noreferrer"
 className="text-primary hover:underline"
 >
 open an issue on GitHub
 </a>.
 </p>
 </motion.div>
 </div>
 </div>
 </LandingLayout>
 );
}
