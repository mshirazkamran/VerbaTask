import { Nav } from '../components/landing/Nav';
import { Hero } from '../components/landing/Hero';
import { Problem } from '../components/landing/Problem';
import { Features } from '../components/landing/Features';
import { HowItWorks } from '../components/landing/HowItWorks';
import { WhyWhatsApp } from '../components/landing/WhyWhatsApp';
import { Pricing } from '../components/landing/Pricing';
import { Faq } from '../components/landing/Faq';
import { FinalCta } from '../components/landing/FinalCta';

export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[var(--bg-canvas)] text-[var(--text-ink)] selection:bg-[#287A74]/25 selection:text-[#174845] dark:selection:bg-[#AEEED3]/30 dark:selection:text-[#AEEED3] transition-colors duration-200">
      {/* Solid Navbar */}
      <Nav />

      {/* Main Content Sections */}
      <main className="relative z-10">
        <Hero />
        <Problem />
        <Features />
        <HowItWorks />
        <WhyWhatsApp />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
    </div>
  );
}

export default LandingPage;
