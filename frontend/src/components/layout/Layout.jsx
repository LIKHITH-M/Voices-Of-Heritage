import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

/* ============================================================
   HeritageBG — Fixed animated background layer
   Renders a temple silhouette, mandala, sparks, and gold lines
   Positioned fixed so it persists across ALL pages
   ============================================================ */
const SPARKS = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${(i * 5.5 + 3) % 100}%`,
  delay: `${(i * 0.7) % 6}s`,
  duration: `${6 + (i % 5)}s`,
  size: i % 3 === 0 ? 3 : 2,
}));

const HeritageBG = () => (
  <div
    aria-hidden="true"
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 0,
      pointerEvents: "none",
      overflow: "hidden",
    }}
  >
    {/* ── Deep base gradient ── */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(255,178,36,0.06) 0%, transparent 65%), #09090C",
      }}
    />

    {/* ── Gold horizontal accent line (top) ── */}
    <div
      style={{
        position: "absolute",
        top: "32%",
        left: 0,
        right: 0,
        height: "1px",
        background:
          "linear-gradient(90deg, transparent 0%, rgba(255,178,36,0.35) 30%, rgba(255,178,36,0.6) 50%, rgba(255,178,36,0.35) 70%, transparent 100%)",
        animation: "goldPulse 3s ease-in-out infinite",
      }}
    />

    {/* ── Gold horizontal accent line (bottom) ── */}
    <div
      style={{
        position: "absolute",
        top: "68%",
        left: 0,
        right: 0,
        height: "1px",
        background:
          "linear-gradient(90deg, transparent 0%, rgba(255,178,36,0.2) 40%, rgba(255,178,36,0.5) 50%, rgba(255,178,36,0.2) 60%, transparent 100%)",
        animation: "goldPulse 4s ease-in-out infinite 1.5s",
      }}
    />

    {/* ── Mandala / Chakra wheel (centre) ── */}
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: "min(700px, 90vw)",
        height: "min(700px, 90vw)",
        opacity: 0.07,
        animation: "mandalaSpin 90s linear infinite",
        transformOrigin: "50% 50%",
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Outer rings */}
      {[88, 78, 68, 58, 48].map((r, i) => (
        <circle key={i} cx="100" cy="100" r={r} fill="none" stroke="#FFB224" strokeWidth="0.5" strokeDasharray={`${i % 2 === 0 ? "4 3" : "2 4"}`} />
      ))}
      {/* Petal spokes */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i * 360) / 16;
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={i}
            x1="100" y1="100"
            x2={100 + 88 * Math.cos(rad)}
            y2={100 + 88 * Math.sin(rad)}
            stroke="#FFB224"
            strokeWidth="0.4"
            strokeOpacity="0.8"
          />
        );
      })}
      {/* Inner lotus petals */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45 - 90) * (Math.PI / 180);
        const x = 100 + 28 * Math.cos(angle);
        const y = 100 + 28 * Math.sin(angle);
        return (
          <ellipse key={i} cx={x} cy={y} rx="10" ry="4"
            transform={`rotate(${i * 45}, ${x}, ${y})`}
            fill="rgba(255,178,36,0.3)" stroke="#FFB224" strokeWidth="0.3" />
        );
      })}
      {/* Centre dot */}
      <circle cx="100" cy="100" r="4" fill="#FFB224" opacity="0.5" />
    </svg>

    {/* ── Temple / Heritage monument silhouette (bottom-right) ── */}
    <svg
      viewBox="0 0 500 300"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMaxYMax meet"
      style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        width: "min(640px, 70vw)",
        opacity: 0.22,
        animation: "templeGlow 5s ease-in-out infinite alternate",
        filter: "drop-shadow(0 0 14px rgba(255,178,36,0.5))",
      }}
    >
      {/* Ground baseline */}
      <line x1="0" y1="298" x2="500" y2="298" stroke="#FFB224" strokeWidth="1.5" />

      {/* Main Shikhara (spire) */}
      <polygon points="250,20 210,120 290,120" fill="none" stroke="#FFB224" strokeWidth="1" />
      <polygon points="250,40 220,110 280,110" fill="none" stroke="#FFB224" strokeWidth="0.6" />
      <polygon points="250,60 225,105 275,105" fill="none" stroke="#FFB224" strokeWidth="0.4" />

      {/* Amalaka (crown disc) */}
      <ellipse cx="250" cy="120" rx="26" ry="8" fill="none" stroke="#FFB224" strokeWidth="1.2" />
      <ellipse cx="250" cy="120" rx="18" ry="5" fill="none" stroke="#FFB224" strokeWidth="0.5" />

      {/* Main tower body */}
      <rect x="220" y="120" width="60" height="80" fill="none" stroke="#FFB224" strokeWidth="1.2" />
      {/* Tower horizontal bands */}
      {[135, 150, 165, 180].map((y, i) => (
        <line key={i} x1="220" y1={y} x2="280" y2={y} stroke="#FFB224" strokeWidth="0.4" />
      ))}

      {/* Mandapa (hall) */}
      <rect x="190" y="200" width="120" height="50" fill="none" stroke="#FFB224" strokeWidth="1" />
      {/* Mandapa columns */}
      {[205, 220, 235, 265, 280, 295].map((x, i) => (
        <line key={i} x1={x} y1="200" x2={x} y2="250" stroke="#FFB224" strokeWidth="0.6" />
      ))}
      {/* Mandapa roof */}
      <polygon points="185,200 315,200 305,185 195,185" fill="none" stroke="#FFB224" strokeWidth="0.8" />

      {/* Steps / Jagati */}
      <rect x="170" y="250" width="160" height="12" fill="none" stroke="#FFB224" strokeWidth="0.8" />
      <rect x="155" y="262" width="190" height="10" fill="none" stroke="#FFB224" strokeWidth="0.6" />
      <rect x="140" y="272" width="220" height="10" fill="none" stroke="#FFB224" strokeWidth="0.5" />
      <rect x="120" y="282" width="260" height="10" fill="none" stroke="#FFB224" strokeWidth="0.5" />

      {/* Gopuram towers (left & right) */}
      <polygon points="155,100 130,200 180,200" fill="none" stroke="#FFB224" strokeWidth="0.8" />
      <ellipse cx="155" cy="100" rx="14" ry="4" fill="none" stroke="#FFB224" strokeWidth="0.6" />
      <polygon points="345,100 320,200 370,200" fill="none" stroke="#FFB224" strokeWidth="0.8" />
      <ellipse cx="345" cy="100" rx="14" ry="4" fill="none" stroke="#FFB224" strokeWidth="0.6" />

      {/* Corner finials */}
      {[90, 130, 370, 410].map((x, i) => (
        <polygon key={i} points={`${x},210 ${x - 8},250 ${x + 8},250`} fill="none" stroke="#FFB224" strokeWidth="0.5" />
      ))}

      {/* Decorative dots along roof */}
      {[200, 215, 230, 250, 270, 285, 300].map((x, i) => (
        <circle key={i} cx={x} cy="185" r="2" fill="#FFB224" opacity="0.6" />
      ))}

      {/* Left smaller shrine */}
      <rect x="60" y="220" width="70" height="40" fill="none" stroke="#FFB224" strokeWidth="0.8" />
      <polygon points="95,190 70,220 120,220" fill="none" stroke="#FFB224" strokeWidth="0.7" />
      <ellipse cx="95" cy="190" rx="10" ry="3" fill="none" stroke="#FFB224" strokeWidth="0.5" />
      <rect x="60" y="260" width="70" height="10" fill="none" stroke="#FFB224" strokeWidth="0.4" />
      <rect x="55" y="270" width="80" height="10" fill="none" stroke="#FFB224" strokeWidth="0.3" />

      {/* Lantern at tip */}
      <line x1="250" y1="15" x2="250" y2="5" stroke="#FFB224" strokeWidth="1.5" />
      <circle cx="250" cy="5" r="4" fill="#FFB224" opacity="0.8" />
    </svg>

    {/* ── Floating gold sparks ── */}
    {SPARKS.map((s) => (
      <div
        key={s.id}
        style={{
          position: "absolute",
          left: s.left,
          bottom: "-4px",
          width: `${s.size}px`,
          height: `${s.size}px`,
          borderRadius: "50%",
          background: "#FFB224",
          boxShadow: `0 0 ${s.size * 3}px ${s.size}px rgba(255,178,36,0.6)`,
          animation: `spark ${s.duration} linear ${s.delay} infinite`,
        }}
      />
    ))}

    {/* ── Corner glow orbs ── */}
    <div
      style={{
        position: "absolute",
        top: "-100px",
        left: "-100px",
        width: "400px",
        height: "400px",
        background: "radial-gradient(circle, rgba(255,178,36,0.04) 0%, transparent 70%)",
        borderRadius: "50%",
      }}
    />
    <div
      style={{
        position: "absolute",
        bottom: "-80px",
        right: "-80px",
        width: "500px",
        height: "500px",
        background: "radial-gradient(circle, rgba(255,178,36,0.05) 0%, transparent 70%)",
        borderRadius: "50%",
      }}
    />
  </div>
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