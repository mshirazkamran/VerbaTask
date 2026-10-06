import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { Nav } from '../landing/Nav';
import { FinalCta } from '../landing/FinalCta';

// Shared shell for the public content pages (/faq, /contact): same nav and footer as the landing page.
export function LandingLayout({ children }) {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />
      <main>{children}</main>
      <FinalCta />
    </div>
  );
}

export default LandingLayout;
