import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

/* ============================================================
   HeritageBG — Clean dark background
   ============================================================ */
const HeritageBG = () => (
  <div
    aria-hidden="true"
    className="fixed inset-0 pointer-events-none z-0"
    style={{ background: "#09090C" }}
  />
);

/* ============================================================
   LAYOUT
   ============================================================ */
const Layout = ({
  children,
  showSidebar = false,
  fullScreen = false,
  showNavbarOnly = false,
}) => {
  const isAuthenticated = true;
  const location = useLocation();

  const shouldShowSidebar = showSidebar && isAuthenticated;
  const shouldShowFooter = location.pathname === "/";

  // 1. Full Screen Layout (Auth pages)
  if (fullScreen) {
    return (
      <div className="min-h-screen bg-transparent relative">
        <HeritageBG />
        <div style={{ position: "relative", zIndex: 1 }}>
          {children || <Outlet />}
        </div>
      </div>
    );
  }

  // 2. Navbar Only Layout
  if (showNavbarOnly) {
    return (
      <div className="flex flex-col min-h-screen bg-transparent relative">
        <HeritageBG />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <Navbar />
          <main className="flex-1">
            {children || <Outlet />}
          </main>
        </div>
      </div>
    );
  }

  // 3. MAIN LAYOUT (Sandwich: Nav → Content → Footer)
  return (
    <div className="flex flex-col min-h-screen bg-transparent relative">
      {/* Global animated heritage background */}
      <HeritageBG />

      {/* All content above the background */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

        {/* TOP: Sticky Navbar */}
        <div className="sticky top-0 z-50 w-full">
          <Navbar />
        </div>

        {/* MIDDLE: Sidebar + Content */}
        <div className="flex flex-1 relative">

          {/* Left: Sidebar */}
          {shouldShowSidebar && (
            <aside className="hidden lg:block w-72 flex-shrink-0 sticky top-[64px] h-[calc(100vh-64px)] overflow-y-auto">
              <Sidebar />
            </aside>
          )}

          {/* Right: Main Content */}
          <main className="flex-1 w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children || <Outlet />}
            </motion.div>
          </main>
        </div>

        {/* BOTTOM: Footer — only on home page */}
        {shouldShowFooter && (
          <div className="w-full z-10 border-t" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(9,9,12,0.9)" }}>
            <Footer />
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout;