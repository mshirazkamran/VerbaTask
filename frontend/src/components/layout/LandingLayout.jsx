import { useUiStore } from '../../lib/store';
import { motion } from 'motion/react';
import { Link, useLocation } from 'react-router';
import { IconBrandGithub, IconSun, IconMoon } from '@tabler/icons-react';
import { useEffect } from 'react';

export function LandingLayout({ children }) {
 const { theme, setTheme } = useUiStore();
 const isDark =
 theme === 'dark' ||
 (theme === 'system' &&
 typeof window !== 'undefined' &&
 window.matchMedia?.('(prefers-color-scheme: dark)').matches);

 const toggleLandingTheme = () => {
 setTheme(isDark ? 'light' : 'dark');
 };

 const location = useLocation();

 useEffect(() => {
 if (location.hash) {
 setTimeout(() => {
 const id = location.hash.replace('#', '');
 const element = document.getElementById(id);
 if (element) {
 element.scrollIntoView({ behavior: 'smooth', block: 'start' });
 }
 }, 100);
 } else {
 window.scrollTo({ top: 0, behavior: 'smooth' });
 }
 }, [location]);

 const handleNavClick = (e, hash) => {
 if (location.pathname === '/') {
 const element = document.getElementById(hash.replace('#', ''));
 if (element) {
 e.preventDefault();
 element.scrollIntoView({ behavior: 'smooth', block: 'start' });
 // Update URL without triggering reload
 window.history.pushState(null, '', `/${hash}`);
 }
 }
 };

 return (
 <div className="min-h-screen min-h-[100dvh] bg-canvas text-ink transition-colors duration-200">
 <nav className="sticky top-0 z-50 glass-nav">
 <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
 <Link to="/" className="flex items-center gap-2.5">
 <img src="/favicon-32x32.png" alt="VerbaTask" className="w-8 h-8 rounded-lg" />
 <span className="font-heading text-lg font-medium tracking-tight text-ink">VerbaTask</span>
 </Link>
 <div className="hidden md:flex items-center gap-8">
 <Link to="/#features" onClick={(e) => handleNavClick(e, '#features')} className="text-sm text-ink-mute hover:text-ink transition-colors">Features</Link>
 <Link to="/#how-it-works" onClick={(e) => handleNavClick(e, '#how-it-works')} className="text-sm text-ink-mute hover:text-ink transition-colors">How It Works</Link>
 <Link to="/faq" className="text-sm text-ink-mute hover:text-ink transition-colors">FAQ</Link>
 <Link to="/contact" className="text-sm text-ink-mute hover:text-ink transition-colors">Contact</Link>
 </div>
 <div className="flex items-center gap-3">
 <button
 type="button"
 onClick={toggleLandingTheme}
 className="p-2 text-ink-secondary hover:text-ink bg-canvas border border-hairline rounded-pill hover:bg-canvas-soft transition-colors cursor-pointer"
 aria-label="Toggle theme"
 >
 {isDark ? (
 <IconSun className="w-4 h-4 text-lemon" />
 ) : (
 <IconMoon className="w-4 h-4 text-ink-secondary" />
 )}
 </button>
 <Link to="/login" className="text-sm text-ink-mute hover:text-ink transition-colors">Sign in</Link>
 <Link
 to="/signup"
 className="bg-primary text-on-primary text-sm font-medium px-4 py-2 rounded-pill hover:bg-primary-deep transition-colors"
 >
 Get started
 </Link>
 </div>
 </div>
 </nav>

 <main>{children}</main>

 <footer className="border-t border-hairline">
 <div className="max-w-7xl mx-auto px-6 py-16">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
 <div>
 <div className="flex items-center gap-2 mb-3">
 <img src="/favicon-32x32.png" alt="" className="w-6 h-6 rounded" />
 <span className="font-heading text-sm font-medium text-ink">VerbaTask</span>
 </div>
 <p className="text-xs text-ink-mute leading-relaxed">
 Voice-first commerce for Pakistani shopkeepers.
 </p>
 </div>
 <div>
 <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-ink-mute mb-3">Product</h4>
 <ul className="space-y-2">
 <li><Link to="/#features" onClick={(e) => handleNavClick(e, '#features')} className="text-sm text-ink-secondary hover:text-primary transition-colors">Features</Link></li>
 <li><Link to="/#how-it-works" onClick={(e) => handleNavClick(e, '#how-it-works')} className="text-sm text-ink-secondary hover:text-primary transition-colors">How it works</Link></li>
 <li><Link to="/signup" className="text-sm text-ink-secondary hover:text-primary transition-colors">Get started</Link></li>
 </ul>
 </div>
 <div>
 <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-ink-mute mb-3">Company</h4>
 <ul className="space-y-2">
 <li><Link to="/faq" className="text-sm text-ink-secondary hover:text-primary transition-colors">FAQ</Link></li>
 <li><Link to="/contact" className="text-sm text-ink-secondary hover:text-primary transition-colors">Contact</Link></li>
 </ul>
 </div>
 <div>
 <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-ink-mute mb-3">Connect</h4>
 <ul className="space-y-2">
 <li>
 <a
 href="https://github.com/soban-iftikhar/VerbaTask"
 target="_blank"
 rel="noopener noreferrer"
 className="text-sm text-ink-secondary hover:text-primary transition-colors inline-flex items-center gap-1.5"
 >
 <IconBrandGithub className="w-4 h-4" />
 GitHub
 </a>
 </li>
 </ul>
 </div>
 </div>
 <div className="mt-12 pt-6 border-t border-hairline flex flex-col sm:flex-row items-center justify-between gap-4">
 <p className="text-xs text-ink-mute">&copy; {new Date().getFullYear()} VerbaTask. All rights reserved.</p>
 <a
 href="https://github.com/soban-iftikhar/VerbaTask"
 target="_blank"
 rel="noopener noreferrer"
 className="text-xs text-ink-mute hover:text-primary transition-colors inline-flex items-center gap-1.5"
 >
 <IconBrandGithub className="w-3.5 h-3.5" />
 Open source on GitHub
 </a>
 </div>
 </div>
 </footer>
 </div>
 );
}
