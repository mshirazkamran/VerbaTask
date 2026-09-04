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
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#0B0D11] text-zinc-900 dark:text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-800 dark:selection:text-emerald-200 transition-colors duration-200">
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
