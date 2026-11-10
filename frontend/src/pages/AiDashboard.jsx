import React from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

import { useApi } from "../hooks/useApi";
import { userAPI, tripAPI, aiAPI } from "../services/api";
import { Button, LoadingSpinner } from "../components/ui";
import {
  FaPlane,
  FaMapMarkedAlt,
  FaRoute,
  FaCalendarAlt,
  FaRocket,
  FaGlobe,
  FaArrowRight,
  FaPlus,
  FaStar,
  FaUsers,
} from "react-icons/fa";

const Dashboard = () => {
  const navigate = useNavigate();
  const user = { name: "Explorer", planType: "standard" };
  const { data: recentTrips, isLoading: tripsLoading } = useApi(
    ["userTrips"],
    () => tripAPI.getTrips().then((res) => res.data.trips || res.data)
  );
  const {
    data: recommendations,
    isLoading: recommendationsLoading,
    error: recommendationsError,
    refetch: refetchRecommendations
  } = useApi(
    ["aiRecommendations"],
    () => aiAPI.getRecommendations().then((res) => res.data.data || res.data)
  );

  const remainingAiRequests = "∞";

  // Function to refresh recommendations
  const handleRefreshRecommendations = async () => {
    try {
      // Call refresh endpoint (clears cache and generates new recommendations)
      await aiAPI.refreshRecommendations();
      // Refetch to update UI
      await refetchRecommendations();
      toast.success("New trip recommendations generated!");
    } catch (error) {
      console.error("Error refreshing recommendations:", error);
      toast.error("Failed to generate new recommendations");
    }
  };

  // Filter out draft trips (status === "draft") from dashboard
  const nonDraftTrips =
    recentTrips?.filter((trip) => trip.status !== "draft") || [];

  const quickActions = [
    {
      title: "Plan New Trip",
      description: "Create AI-powered itinerary",
      icon: FaPlane,
      href: "/trip-planner",
    },
    {
      title: "Explore Maps",
      description: "Discover destinations",
      icon: FaMapMarkedAlt,
      href: "/maps",
    },
  ];

  // Calculate upcoming and completed trips (excluding drafts)
  const upcomingTrips =
    nonDraftTrips?.filter((trip) => {
      const startDate = new Date(trip.startDate);
      const now = new Date();
      return startDate > now;
    }).length || 0;

  const completedTrips =
    nonDraftTrips?.filter((trip) => {
      const endDate = new Date(trip.endDate);
      const now = new Date();
      // Show trips where end date has passed
      return endDate < now;
    }).length || 0;

  const statsCards = [
    {
      title: "Total Trips Generated",
      value: nonDraftTrips?.length || 0,
      icon: FaRoute,
      trend: "All Time",
    },
    {
      title: "Upcoming Trips",
      value: upcomingTrips,
      icon: FaCalendarAlt,
      trend: "Planned",
    },
    {
      title: "Past Trips",
      value: completedTrips,
      icon: FaStar,
      trend: "Completed",
    },
    {
      title: "AI Requests Left",
      value: "∞",
      icon: FaRocket,
      trend: "Monthly",
    },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 lg:px-8 md:py-6">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 md:mb-6"
        >
          <div className="rounded-xl md:rounded-2xl p-3 md:p-6" style={{background:'linear-gradient(135deg,rgba(255,178,36,0.12),rgba(255,178,36,0.04))',border:'1px solid rgba(255,178,36,0.25)',boxShadow:'0 0 60px rgba(255,178,36,0.08)'}}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
              <div>
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl md:text-3xl font-bold"
                >
                  Welcome back, Explorer! 👋
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-0.5 md:mt-2 text-xs md:text-base" style={{color:'#9CA3AF'}}
                >
                  Ready to plan your next adventure? Let's make it amazing.
                </motion.p>
              </div>

              <span
                className="capitalize text-xs md:text-sm px-2 md:px-3 py-1 self-start md:self-auto rounded-full font-semibold"
                style={{background:'rgba(34,197,94,0.12)',color:'#4ade80',border:'1px solid rgba(34,197,94,0.3)'}}
              >
                Standard Plan
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-4 md:mb-6"
        >
          {statsCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={{ y: -2, boxShadow: '0 0 30px rgba(255,178,36,0.15)' }}
            >
              <div
                className="p-3 md:p-6 rounded-xl transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg,rgba(255,178,36,0.08),rgba(255,178,36,0.03))',
                  border: '1px solid rgba(255,178,36,0.2)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1 md:mb-2 truncate" style={{color:'rgba(255,178,36,0.6)'}}>
                      {stat.title}
                    </p>
                    <div className="flex items-baseline flex-wrap gap-2">
                      <div className="text-xl md:text-3xl font-bold" style={{color:'#ffffff'}}>
                        {tripsLoading ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          stat.value
                        )}
                      </div>
                      <span
                        className="text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full"
                        style={{background:'rgba(255,178,36,0.12)',color:'#FFB224',border:'1px solid rgba(255,178,36,0.25)'}}
                      >
                        {stat.trend}
                      </span>
                    </div>
                  </div>
                  <div
                    className="p-2 md:p-4 rounded-lg md:rounded-xl hidden xs:block"
                    style={{background:'rgba(255,178,36,0.1)',border:'1px solid rgba(255,178,36,0.2)'}}
                  >
                    <stat.icon className="h-4 w-4 md:h-7 md:w-7" style={{color:'#FFB224'}} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div
              className="p-4 md:p-6 rounded-xl"
              style={{
                background: 'linear-gradient(135deg,rgba(255,178,36,0.08),rgba(255,178,36,0.03))',
                border: '1px solid rgba(255,178,36,0.2)',
              }}
            >
              <div className="flex items-center mb-4 md:mb-6">
                <h2 className="text-lg md:text-2xl font-bold flex items-center" style={{color:'#ffffff'}}>
                  <FaRocket className="mr-2 md:mr-3" style={{color:'#FFB224'}} />
                  Quick Actions
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {quickActions.map((action, index) => (
                  <motion.div
                    key={action.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      to={action.href}
                      className="block p-4 md:p-6 rounded-xl md:rounded-2xl transition-all duration-300"
                      style={{
                        background: 'linear-gradient(135deg,rgba(255,178,36,0.14),rgba(255,178,36,0.05))',
                        border: '1px solid rgba(255,178,36,0.3)',
                        boxShadow: '0 0 0 0 rgba(255,178,36,0)'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow='0 0 24px rgba(255,178,36,0.2)'; e.currentTarget.style.borderColor='rgba(255,178,36,0.5)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor='rgba(255,178,36,0.3)'; }}
                    >
                      <div className="flex items-center space-x-3 md:space-x-4">
                        <div className="p-2 md:p-3 rounded-lg md:rounded-xl" style={{background:'rgba(255,178,36,0.12)',border:'1px solid rgba(255,178,36,0.25)'}}>
                          <action.icon className="h-5 w-5 md:h-7 md:w-7" style={{color:'#FFB224'}} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-base md:text-lg" style={{color:'#ffffff'}}>{action.title}</h3>
                          <p className="text-xs md:text-sm mt-0.5 md:mt-1" style={{color:'#9CA3AF'}}>
                            {action.description}
                          </p>
                        </div>
                        <FaArrowRight className="h-4 w-4 md:h-5 md:w-5" style={{color:'#FFB224'}} />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* AI Recommendations */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div
              className="p-4 md:p-6 rounded-xl"
              style={{
                background: 'linear-gradient(135deg,rgba(255,178,36,0.08),rgba(255,178,36,0.03))',
                border: '1px solid rgba(255,178,36,0.2)',
              }}
            >
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-lg md:text-xl font-bold flex items-center" style={{color:'#ffffff'}}>
                  AI Recommended
                </h2>
                <div className="p-1.5 md:p-2 rounded-lg" style={{background:'rgba(255,178,36,0.12)',border:'1px solid rgba(255,178,36,0.3)'}}>
                  <FaRocket className="h-4 w-4 md:h-5 md:w-5" style={{color:'#FFB224'}} />
                </div>
              </div>

              <div className="space-y-3">
                {recommendationsError ? (
                  <div className="text-center py-6 md:py-8 text-gray-500 dark:text-gray-400">
                    <FaRocket className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs md:text-sm">
                      {recommendationsError.message?.includes("401") || recommendationsError.message?.includes("Unauthorized")
                        ? "Log in to see recommendations"
                        : "Unable to load recommendations"}
                    </p>
                  </div>
                ) : recommendationsLoading ? (
                  <div className="text-center py-6 md:py-8 text-gray-500 dark:text-gray-400">
                    <FaRocket className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 opacity-50 animate-pulse" />
                    <p className="text-xs md:text-sm">Generating recommendations...</p>
                  </div>
                ) : recommendations && recommendations.length > 0 ? (
                  recommendations.slice(0, 3).map((rec, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="flex items-start space-x-3 p-3 md:p-4 rounded-xl"
                      style={{background:'rgba(255,178,36,0.06)',border:'1px solid rgba(255,178,36,0.15)'}}
                    >
                      <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center" style={{background:'rgba(255,178,36,0.15)',border:'1px solid rgba(255,178,36,0.3)'}}>
                        <FaGlobe className="h-5 w-5 md:h-6 md:w-6" style={{color:'#FFB224'}} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold truncate" style={{color:'#ffffff'}}>
                          {rec.destination}
                        </h4>
                        <p className="text-[10px] md:text-xs mt-1 leading-relaxed line-clamp-2" style={{color:'#9CA3AF'}}>
                          {rec.highlights}
                        </p>
                        <div className="flex items-center mt-2 space-x-2 flex-wrap gap-y-1">
                          <span
                            className="text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{background:'rgba(255,178,36,0.12)',color:'#FFB224',border:'1px solid rgba(255,178,36,0.25)'}}
                          >
                            ₹{rec.estimatedCost?.min?.toLocaleString()}
                          </span>
                          <span
                            className="text-[10px] md:text-xs px-2 py-0.5 rounded-full"
                            style={{background:'rgba(255,255,255,0.05)',color:'#9CA3AF',border:'1px solid rgba(255,255,255,0.1)'}}
                          >
                            {rec.duration} days
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-6 md:py-8 text-gray-500 dark:text-gray-400">
                    <FaRocket className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs md:text-sm">No recommendations yet</p>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4 min-h-[44px]"
                onClick={handleRefreshRecommendations}
                disabled={recommendationsLoading}
              >
                {recommendationsLoading ? (
                  <>
                    <FaRocket className="animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FaRocket className="mr-2" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Recent Trips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 md:mt-6"
        >
          <div
            className="p-4 md:p-6 rounded-xl"
            style={{
              background: 'linear-gradient(135deg,rgba(255,178,36,0.08),rgba(255,178,36,0.03))',
              border: '1px solid rgba(255,178,36,0.2)',
            }}
          >
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-lg md:text-2xl font-bold flex items-center" style={{color:'#ffffff'}}>
                <FaRoute className="mr-2 md:mr-3" style={{color:'#FFB224'}} />
                My Trips
              </h2>
              <Link
                to="/trips"
                className="text-xs md:text-sm font-semibold flex items-center transition-colors px-2 py-1"
                style={{color:'#FFB224'}}
                onMouseEnter={(e)=>e.currentTarget.style.color='#ffd24d'}
                onMouseLeave={(e)=>e.currentTarget.style.color='#FFB224'}
              >
                View All
                <FaArrowRight className="ml-1 md:ml-2 h-3 w-3" />
              </Link>
            </div>

            {tripsLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : nonDraftTrips?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {nonDraftTrips.slice(0, 3).map((trip, index) => (
                  <motion.div
                    key={trip._id || trip.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="rounded-xl md:rounded-2xl p-4 md:p-5 transition-all duration-300 cursor-pointer"
                    style={{
                      background: 'linear-gradient(135deg,rgba(255,178,36,0.08),rgba(255,178,36,0.03))',
                      border: '1px solid rgba(255,178,36,0.18)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor='rgba(255,178,36,0.4)'; e.currentTarget.style.boxShadow='0 0 24px rgba(255,178,36,0.12)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor='rgba(255,178,36,0.18)'; e.currentTarget.style.boxShadow='none'; }}
                    onClick={() =>
                      (window.location.href = `/trips/${trip._id || trip.id}`)
                    }
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold capitalize text-base md:text-lg pr-2" style={{color:'#ffffff'}}>
                        {trip.destination?.city || trip.title || "Unknown"}
                      </h3>
                      <span
                        className="text-xs shrink-0 px-2 py-0.5 rounded-full font-semibold"
                        style={
                          new Date(trip.endDate) < new Date()
                            ? {background:'rgba(34,197,94,0.12)',color:'#4ade80',border:'1px solid rgba(34,197,94,0.3)'}
                            : {background:'rgba(255,178,36,0.12)',color:'#FFB224',border:'1px solid rgba(255,178,36,0.3)'}
                        }
                      >
                        {new Date(trip.endDate) < new Date() ? "Completed" : "Upcoming"}
                      </span>
                    </div>

                    <p className="text-xs md:text-sm mb-3 block w-full" style={{color:'#9CA3AF'}}>
                      {new Date(trip.startDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      -{" "}
                      {new Date(trip.endDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>

                    <div className="hidden md:flex items-center justify-between text-xs md:text-sm mb-2 pt-2" style={{borderTop:'1px solid rgba(255,178,36,0.12)'}}>
                      <div className="flex items-center">
                        <span className="font-medium mr-1" style={{color:'#ffffff'}}>{trip.preferences?.duration || 0}</span>
                        <span className="text-xs" style={{color:'#9CA3AF'}}>Days</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium mr-1" style={{color:'#ffffff'}}>{trip.preferences?.groupSize || 1}</span>
                        <span className="text-xs" style={{color:'#9CA3AF'}}>Travelers</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs md:text-sm mb-0 md:mb-1">
                      <div className="flex items-center">
                        <span className="font-medium mr-1" style={{color:'#FFB224'}}>
                          ₹{(
                            trip.preferences?.budget?.max ||
                            trip.itinerary?.totalCost?.amount ||
                            trip.totalCost ||
                            0
                          ).toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs hidden md:inline" style={{color:'#9CA3AF'}}>Budget</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium mr-1" style={{color:'#ffffff'}}>
                          {trip.itinerary?.days?.reduce(
                            (total, day) => total + (day.activities?.length || 0),
                            0
                          ) || 0}
                        </span>
                        <span className="text-xs" style={{color:'#9CA3AF'}}>Activities</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 md:py-16 rounded-2xl p-4" style={{background:'rgba(255,178,36,0.04)',border:'1px solid rgba(255,178,36,0.12)'}}>
                <div className="relative inline-block">
                  <div className="absolute inset-0 rounded-full blur-2xl animate-pulse" style={{background:'rgba(255,178,36,0.15)'}}></div>
                  <FaPlane className="relative h-12 w-12 md:h-20 md:w-20 mx-auto mb-4" style={{color:'#FFB224'}} />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2" style={{color:'#ffffff'}}>
                  No trips yet
                </h3>
                <p className="text-sm md:text-base mb-6 max-w-md mx-auto" style={{color:'#9CA3AF'}}>
                  Start planning your first adventure with AI assistance
                </p>
                <Link to="/trip-planner">
                  <Button variant="primary" className="px-4 py-2 md:px-6 md:py-3 w-full md:w-auto min-h-[44px]">
                    <FaPlus className="mr-2" />
                    Plan Your First Trip
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
