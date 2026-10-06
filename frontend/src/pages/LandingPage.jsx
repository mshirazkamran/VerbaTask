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

export function LandingPage() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) requestAnimationFrame(() => scrollToHash(hash));
  }, [hash]);

  return (
    <div className="min-h-screen bg-paper text-ink">
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
