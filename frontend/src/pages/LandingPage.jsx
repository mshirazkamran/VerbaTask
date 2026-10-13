import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { Nav } from '../components/landing/Nav';
import { scrollToHash } from '../lib/scroll';
import { Hero } from '../components/landing/Hero';
import { Problem } from '../components/landing/Problem';
import { HowItWorks } from '../components/landing/HowItWorks';
import { Features } from '../components/landing/Features';
import { WhyWhatsApp } from '../components/landing/WhyWhatsApp';
import { Pricing } from '../components/landing/Pricing';
import { Faq } from '../components/landing/Faq';
import { FinalCta } from '../components/landing/FinalCta';

import { useUiStore } from '../lib/store';

export function LandingPage() {
  const { hash } = useLocation();
  const language = useUiStore((s) => s.language);
  const isUrdu = language === 'ur';

  useEffect(() => {
    if (hash) requestAnimationFrame(() => scrollToHash(hash));
  }, [hash]);

  useEffect(() => {
    document.documentElement.dir = isUrdu ? 'rtl' : 'ltr';
    document.documentElement.lang = isUrdu ? 'ur' : 'en';
  }, [isUrdu]);

  return (
    <div
      className={`min-h-screen bg-paper text-ink ${isUrdu ? 'font-urdu' : ''}`}
      dir={isUrdu ? 'rtl' : 'ltr'}
    >
      <Nav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <WhyWhatsApp />
        <Pricing />
        <Faq />
      </main>
      <FinalCta />
    </div>
  );
}

export default LandingPage;
