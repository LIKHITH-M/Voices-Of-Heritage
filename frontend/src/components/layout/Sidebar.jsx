import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import {
  FaChartBar,
  FaPlane,
  FaMapMarkedAlt,
  FaRoute,
  FaUsers,
  FaDatabase,
  FaFileAlt,
  FaUser,
  FaBars,
  FaTimes,
} from "react-icons/fa";

const Sidebar = () => {
  const hasPermission = () => true;
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // --- Navigation Arrays ---
  const userNavigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: FaChartBar,
      description: "Overview & Analytics",
    },
    {
      name: "Trip Planner",
      href: "/trip-planner",
      icon: FaPlane,
      description: "Plan your next adventure",
    },
    {
      name: "My Trips",
      href: "/trips",
      icon: FaRoute,
      description: "View all trips",
    },
    {
      name: "Maps",
      href: "/maps",
      icon: FaMapMarkedAlt,
      description: "Explore destinations",
    },
    {
      name: "Research Evaluation",
      href: "/evaluation",
      icon: FaChartBar,
      description: "PTKG Graph & Metrics",
    },
  ];

  // Determine available links
  const currentNavigation = userNavigation;

  // Helper Component for Navigation Links
  const NavItem = ({ item, isActive, index }) => (
    <motion.div
      key={item.name}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ x: 6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link
        to={item.href}
        onClick={() => setIsMobileOpen(false)}
        className="group relative flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200"
        style={isActive ? {
          background: 'rgba(255,178,36,0.12)',
          border: '1px solid rgba(255,178,36,0.35)',
          color: '#FFB224',
          boxShadow: '0 0 20px rgba(255,178,36,0.12)'
        } : {
          background: 'transparent',
          border: '1px solid transparent',
          color: '#9CA3AF'
        }}
        onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = '#FFB224'; e.currentTarget.style.background = 'rgba(255,178,36,0.06)'; e.currentTarget.style.border = '1px solid rgba(255,178,36,0.2)'; } }}
        onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.border = '1px solid transparent'; } }}
      >
        <item.icon
          className="mr-3 h-5 w-5 transition-transform group-hover:scale-110"
          style={{ color: isActive ? '#FFB224' : 'inherit' }}
        />
        <div className="flex-1">
          <div className="font-semibold">{item.name}</div>
          <div className="text-xs line-clamp-1" style={{ color: isActive ? 'rgba(255,178,36,0.7)' : '#6B7280' }}>
            {item.description}
          </div>
        </div>
      </Link>
    </motion.div>
  );

  return (
    <>
      {/* 1. Mobile Toggle Button (Visible only on small screens) */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-[70px] left-4 z-50 p-2 rounded-md shadow-lg transition-colors"
        style={{ background: '#FFB224', color: '#09090C', border: '1px solid rgba(255,178,36,0.5)' }}
      >
        {isMobileOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* 2. Mobile Overlay (Background dimming) */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* 3. Main Sidebar Container */}
      <div
        className={`fixed lg:relative top-0 left-0 z-40 h-full w-72 flex flex-col shadow-xl transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{
          background: 'rgba(9,9,12,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRight: '1px solid rgba(255,178,36,0.12)'
        }}
      >
        {/* Navigation List */}
        <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
          <div className="space-y-1">
            <h4 className="px-3 text-[10px] font-bold uppercase tracking-widest mb-3 flex justify-between items-center" style={{ color: 'rgba(255,178,36,0.5)' }}>
              <span>Main Menu</span>
              <button onClick={() => setIsMobileOpen(false)} className="lg:hidden text-lg" style={{ color: '#9CA3AF' }}>
                <FaTimes />
              </button>
            </h4>

            {currentNavigation.map((item, index) => {
              const isActive = location.pathname === item.href;
              return (
                <NavItem
                  key={item.name}
                  item={item}
                  isActive={isActive}
                  index={index}
                />
              );
            })}
          </div>
        </nav>

        {/* Bottom Actions Section */}
        <motion.div
          className="p-3 space-y-2"
          style={{ borderTop: '1px solid rgba(255,178,36,0.12)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              to="/trip-planner"
              className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200"
              style={{ background: '#FFB224', color: '#09090C', boxShadow: '0 0 20px rgba(255,178,36,0.35)' }}
            >
              <FaPlane className="mr-2 h-4 w-4" />
              Plan New Trip
            </Link>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              to="/profile"
              className="w-full flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{ background: 'rgba(255,178,36,0.07)', color: '#9CA3AF', border: '1px solid rgba(255,178,36,0.15)' }}
            >
              <FaUser className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
};

export default Sidebar;