import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { useNotifications } from "../../contexts/NotificationContext";
import { Button } from "../ui";
import {
  FaBars,
  FaTimes,
  FaMapMarkedAlt,
  FaPlane,
  FaRoute,
  FaBell,
  FaChartBar,
} from "react-icons/fa";

const navbarStyle = {
  background: "rgba(9, 9, 12, 0.85)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderBottom: "1px solid rgba(255, 178, 36, 0.15)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const currentNavigation = [
    { name: "Dashboard",    href: "/dashboard",    icon: FaChartBar },
    { name: "Trip Planner", href: "/trip-planner", icon: FaPlane },
    { name: "My Trips",     href: "/trips",         icon: FaRoute },
    { name: "Maps",         href: "/maps",          icon: FaMapMarkedAlt },
    { name: "Evaluation",   href: "/evaluation",    icon: FaChartBar },
  ];

  return (
    <nav style={navbarStyle} className="sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* ── Logo ── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center"
          >
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                {/* Gold glow halo */}
                <div
                  className="absolute inset-0 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "linear-gradient(135deg,#FFB224,#E59F1C)", filter: "blur(8px)" }}
                />
                {/* Icon box */}
                <div
                  className="relative p-1.5 md:p-2 rounded-lg"
                  style={{ background: "rgba(255,178,36,0.1)", border: "1px solid rgba(255,178,36,0.3)" }}
                >
                  <FaRoute className="h-5 w-5 md:h-6 md:w-6" style={{ color: "#FFB224" }} />
                </div>
                {/* Live dot */}
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                  style={{ background: "#FFB224", boxShadow: "0 0 8px rgba(255,178,36,0.8)" }}
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              </div>

              <div className="flex flex-col">
                <span
                  className="text-lg md:text-xl font-bold"
                  style={{
                    background: "linear-gradient(135deg, #FFB224, #ffd24d)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  AI Trip Planner
                </span>
                <span className="text-xs -mt-1" style={{ color: "#9CA3AF" }}>
                  Smart Travel Planning
                </span>
              </div>
            </Link>
          </motion.div>

          {/* ── Desktop Navigation ── */}
          <div className="hidden md:flex items-center space-x-1">
            {currentNavigation.map((item, index) => {
              const isActive = location.pathname === item.href;
              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={item.href}
                    className="group flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden"
                    style={{
                      background: isActive
                        ? "rgba(255,178,36,0.15)"
                        : "transparent",
                      border: isActive
                        ? "1px solid rgba(255,178,36,0.4)"
                        : "1px solid transparent",
                      color: isActive ? "#FFB224" : "#9CA3AF",
                      boxShadow: isActive
                        ? "0 0 16px rgba(255,178,36,0.2)"
                        : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = "#FFB224";
                        e.currentTarget.style.background = "rgba(255,178,36,0.07)";
                        e.currentTarget.style.border = "1px solid rgba(255,178,36,0.2)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = "#9CA3AF";
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.border = "1px solid transparent";
                      }
                    }}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* ── Right side (reserved for future actions) ── */}
          <div className="hidden md:flex items-center space-x-4" />

          {/* ── Mobile menu button ── */}
          <div className="md:hidden flex items-center space-x-2">
            {location.pathname !== "/" && (
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg transition-colors"
                style={{ color: "#9CA3AF" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FFB224")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
              >
                {isOpen ? <FaTimes className="h-6 w-6" /> : <FaBars className="h-6 w-6" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile Navigation Drawer ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: "rgba(9,9,12,0.97)",
              borderTop: "1px solid rgba(255,178,36,0.15)",
            }}
            className="md:hidden"
          >
            <div className="px-4 pt-2 pb-3 space-y-1">
              {currentNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="flex items-center px-3 py-2.5 text-base font-medium rounded-lg transition-all duration-200"
                    style={{
                      background: isActive ? "rgba(255,178,36,0.12)" : "transparent",
                      color: isActive ? "#FFB224" : "#9CA3AF",
                      border: isActive
                        ? "1px solid rgba(255,178,36,0.3)"
                        : "1px solid transparent",
                    }}
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
