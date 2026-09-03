import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';


export function DashboardLayout() {
 const [mobileOpen, setMobileOpen] = useState(false);
 const location = useLocation();

 return (
 <div className="min-h-screen min-h-[100dvh] flex bg-canvas-soft text-ink relative">


 {/* Sidebar */}
 <Sidebar
 mobileOpen={mobileOpen}
 onMobileClose={() => setMobileOpen(false)}
 />

 {/* Main Content Area */}
 <div className="flex-1 flex flex-col min-w-0 z-10">
 <TopBar onOpenMobileMenu={() => setMobileOpen(true)} />

 <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
 <AnimatePresence mode="wait">
 <motion.div
 key={location.pathname}
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -8 }}
 transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
 >
 <Outlet />
 </motion.div>
 </AnimatePresence>
 </main>
 </div>
 </div>
 );
}
