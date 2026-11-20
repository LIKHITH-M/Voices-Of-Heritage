import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useApi } from "../hooks/useApi";
import { tripAPI } from "../services/api";
import { Button, LoadingSpinner } from "../components/ui";
import {
  FaRoute,
  FaCalendarAlt,
  FaMapMarkedAlt,
  FaPlus,
  FaStar,
  FaUsers,
  FaDollarSign,
  FaFilter,
  FaSearch,
  FaTrash,
} from "react-icons/fa";

// Safe date parser — returns null if the value is missing or invalid
const parseDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// Format a date value safely — returns null if missing/invalid
const formatDate = (val) => {
  const d = parseDate(val);
  if (!d) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// Format date range safely or show intelligent fallback
const formatDateRange = (trip) => {
  const s = parseDate(trip.startDate);
  const e = parseDate(trip.endDate);
  if (s && e) {
    return `${formatDate(s)} – ${formatDate(e)}`;
  }
  if (s && !e) {
    return `Starts ${formatDate(s)}`;
  }
  if (!s && e) {
    return `Until ${formatDate(e)}`;
  }
  if (trip.createdAt) {
    const c = parseDate(trip.createdAt);
    if (c) {
      const duration = trip.preferences?.duration || trip.duration || 1;
      const autoEnd = new Date(c.getTime() + duration * 24 * 60 * 60 * 1000);
      return `${formatDate(c)} – ${formatDate(autoEnd)}`;
    }
  }
  return "Flexible Dates";
};

const Trips = () => {
  const [filter, setFilter] = useState("all"); // all, upcoming, past, draft
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const { data: response, isLoading, refetch } = useApi(["trips"], () =>
    tripAPI.getTrips().then((res) => res.data)
  );

  // Automatic one-time cleanup of corrupt/ghost trips from localStorage
  useEffect(() => {
    try {
      ["voh_trips", "voh_saved_trips"].forEach((key) => {
        const raw = localStorage.getItem(key);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            const valid = arr.filter((t) => {
              if (!t || typeof t !== "object") return false;
              const dest = t.destination?.city || (typeof t.destination === "string" ? t.destination : "");
              const title = t.title || "";
              return Boolean((dest && dest.trim().length > 0) || (title && title.trim().length > 0));
            });
            if (valid.length !== arr.length) {
              localStorage.setItem(key, JSON.stringify(valid));
              if (refetch) refetch();
            }
          }
        }
      });
    } catch (e) {}
  }, [refetch]);

  const trips = response?.trips || [];

  const filteredTrips =
    trips
      ?.filter((trip) => {
        if (!trip || typeof trip !== "object") return false;
        // Purge ghost trips with no title and no destination
        const dest = trip.destination?.city || (typeof trip.destination === "string" ? trip.destination : "");
        const title = trip.title || "";
        const hasContent = (dest && dest.trim().length > 0) || (title && title.trim().length > 0);
        if (!hasContent) return false;

        // Apply search filter if there's a query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const destinationStr = trip.destination?.city
            ? `${trip.destination.city} ${trip.destination.country || ""}`.toLowerCase()
            : typeof trip.destination === "string"
              ? trip.destination.toLowerCase()
              : "";
          const matchesSearch =
            destinationStr.includes(query) ||
            trip.description?.toLowerCase().includes(query) ||
            trip.title?.toLowerCase().includes(query);

          if (!matchesSearch) return false;
        }

        // Status/date filters
        if (filter === "draft") {
          return trip.status === "draft";
        }

        if (filter === "all") {
          return true;
        }

        const now = new Date();
        const startDate = parseDate(trip.startDate);
        const endDate = parseDate(trip.endDate);
        const hasNoDates = !startDate && !endDate;

        if (filter === "upcoming") {
          if (hasNoDates) return false;
          return trip.status === "upcoming" || (endDate && endDate >= now);
        }

        if (filter === "past") {
          return trip.status === "completed" || (endDate && endDate < now);
        }

        return true;
      }) || [];

  const getStatusVariant = (trip) => {
    if (trip.status === "draft") return "secondary";

    const now = new Date();
    const startDate = parseDate(trip.startDate);
    const endDate = parseDate(trip.endDate);

    if (!startDate && !endDate) return "secondary";
    if (endDate && endDate < now) return "success";
    if (startDate && endDate && startDate <= now && endDate >= now) return "warning";
    return "primary";
  };

  const getStatusLabel = (trip) => {
    if (trip.status === "draft") return "Draft";

    const now = new Date();
    const startDate = parseDate(trip.startDate);
    const endDate = parseDate(trip.endDate);

    if (!startDate && !endDate) return "Flexible";
    if (endDate && endDate < now) return "Completed";
    if (startDate && endDate && startDate <= now && endDate >= now) return "In Progress";
    return "Upcoming";
  };

  const handleDeleteTrip = async (e, tripId, tripTitle) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm(`Are you sure you want to delete "${tripTitle || "this trip"}"?`)) {
      return;
    }

    try {
      setDeletingId(tripId);
      await tripAPI.deleteTrip(tripId);
      toast.success("Trip removed successfully");
      if (refetch) refetch();
    } catch (err) {
      toast.error("Failed to delete trip");
    } finally {
      setDeletingId(null);
    }
  };

  return (

    <div className="min-h-screen bg-transparent py-4 md:py-6">
      <div className="max-w-7xl mx-auto px-3 md:px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 md:mb-6"
        >
          <div className="rounded-xl md:rounded-2xl p-3 md:p-6" style={{background:'linear-gradient(135deg,rgba(255,178,36,0.12),rgba(255,178,36,0.04))',border:'1px solid rgba(255,178,36,0.25)',boxShadow:'0 0 40px rgba(255,178,36,0.1)'}}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
              <div>
                <h1 className="text-xl md:text-3xl font-bold mb-1 flex items-center">
                  <FaRoute className="mr-2 md:mr-3 h-5 w-5 md:h-8 md:w-8" />
                  My Trips
                </h1>
                <p className="text-blue-100 text-xs md:text-base">
                  Manage and view all your travel plans
                </p>
              </div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                className="w-full md:w-auto"
              >
                <Link to="/trip-planner" className="block w-full">
                  <Button className="w-full md:w-auto font-bold px-4 py-2 md:px-6 md:py-3 rounded-xl flex items-center justify-center text-sm md:text-base" style={{background:'#FFB224',color:'#09090C',boxShadow:'0 0 20px rgba(255,178,36,0.35)'}}>
                    <FaPlus className="mr-2" />
                    Plan New Trip
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4 md:mb-6"
        >
          <div className="p-2 md:p-5 rounded-xl md:rounded-2xl" style={{background:'linear-gradient(135deg,rgba(255,178,36,0.08),rgba(255,178,36,0.03))',border:'1px solid rgba(255,178,36,0.2)'}}>
            <div className="flex flex-col md:flex-row gap-2 md:gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4" style={{color:'#9CA3AF'}} />
                  <input
                    type="text"
                    placeholder="Search trips..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 md:pl-10 pr-3 md:pr-4 py-2 md:py-2.5 text-xs md:text-base rounded-lg md:rounded-xl"
                    style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,178,36,0.2)',color:'#ffffff',outline:'none'}}
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide justify-center md:justify-start">
                {[
                  { id: "all", label: "All" },
                  { id: "upcoming", label: "Upcoming" },
                  { id: "past", label: "Past" },
                  { id: "draft", label: "Drafts" },
                ].map((filterOption) => (
                  <button
                    key={filterOption.id}
                    onClick={() => setFilter(filterOption.id)}
                    className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl font-semibold text-xs md:text-sm whitespace-nowrap transition-all duration-300 flex-shrink-0"
                    style={filter === filterOption.id ? {
                      background:'rgba(255,178,36,0.18)',
                      color:'#FFB224',
                      border:'1px solid rgba(255,178,36,0.4)',
                      boxShadow:'0 0 12px rgba(255,178,36,0.15)'
                    } : {
                      background:'rgba(255,255,255,0.04)',
                      color:'#9CA3AF',
                      border:'1px solid rgba(255,255,255,0.08)'
                    }}
                  >
                    {filterOption.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Trips Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredTrips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            {filteredTrips.map((trip, index) => (
              <motion.div
                key={trip._id || trip.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <Link to={`/trips/${trip._id || trip.id}`}>
                  <div className="h-full p-3 md:p-5 rounded-xl md:rounded-2xl transition-all duration-300" style={{background:'linear-gradient(135deg,rgba(255,178,36,0.08),rgba(255,178,36,0.03))',border:'1px solid rgba(255,178,36,0.18)'}}>
                    {/* Destination Image Placeholder */}
                    <div className="relative h-28 md:h-40 -mx-3 md:-mx-5 -mt-3 md:-mt-5 mb-2 md:mb-4 rounded-t-xl md:rounded-t-2xl overflow-hidden" style={{background:'linear-gradient(135deg,rgba(255,178,36,0.15),rgba(255,178,36,0.05))'}}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FaMapMarkedAlt className="h-12 w-12 md:h-16 md:w-16" style={{color:'rgba(255,178,36,0.2)'}} />
                      </div>
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <span
                          className="font-bold shadow-lg text-xs md:text-sm px-2.5 py-1 rounded-full"
                          style={getStatusVariant(trip) === 'success'
                            ? {background:'rgba(34,197,94,0.15)',color:'#4ade80',border:'1px solid rgba(34,197,94,0.3)'}
                            : getStatusVariant(trip) === 'warning'
                            ? {background:'rgba(255,178,36,0.15)',color:'#FFB224',border:'1px solid rgba(255,178,36,0.35)'}
                            : {background:'rgba(255,255,255,0.08)',color:'#9CA3AF',border:'1px solid rgba(255,255,255,0.12)'}}
                        >
                          {getStatusLabel(trip)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTrip(e, trip._id || trip.id, trip.destination?.city || trip.title)}
                          disabled={deletingId === (trip._id || trip.id)}
                          className="p-1.5 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          style={{border:'1px solid rgba(255,255,255,0.1)', background:'rgba(0,0,0,0.3)'}}
                          title="Delete trip"
                        >
                          <FaTrash className="h-3 w-3 md:h-3.5 md:w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Trip Details */}
                    <div className="space-y-2 md:space-y-3">
                      <div>
                        <h3 className="text-lg md:text-xl font-bold mb-0.5 md:mb-1" style={{color:'#ffffff'}}>
                          {trip.destination?.city ||
                            trip.title ||
                            (typeof trip.destination === 'string' ? trip.destination : null) ||
                            "Untitled Trip"}
                          {trip.destination?.country &&
                            trip.destination.city !==
                            trip.destination.country &&
                            `, ${trip.destination.country}`}
                        </h3>
                        {(trip.description || trip.title) && (
                          <p className="text-xs md:text-sm line-clamp-2" style={{color:'#9CA3AF'}}>
                            {trip.description || trip.title}
                          </p>
                        )}
                        {trip.status === "draft" && (
                          <p className="text-[10px] md:text-xs mt-0.5 md:mt-1 italic" style={{color:'#6B7280'}}>
                            {trip.preferences?.duration || 0}-day trip to{" "}
                            {trip.destination?.city || trip.destination}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center text-xs md:text-sm" style={{color:'#9CA3AF'}}>
                        <FaCalendarAlt className="mr-2" style={{color:'rgba(255,178,36,0.6)'}} />
                        <span>
                          {formatDateRange(trip)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 md:pt-3" style={{borderTop:'1px solid rgba(255,178,36,0.12)'}}>
                        <div className="flex items-center text-xs md:text-sm" style={{color:'#9CA3AF'}}>
                          <FaUsers className="mr-2" style={{color:'rgba(255,178,36,0.6)'}} />
                          <span>
                            {trip.preferences?.groupSize ||
                              trip.travelers ||
                              trip.groupSize ||
                              1}{" "}
                            travelers
                          </span>
                        </div>

                        {(trip.budget || trip.preferences?.budget) && (
                          <div className="flex items-center text-xs md:text-sm font-bold" style={{color:'#FFB224'}}>
                            <FaDollarSign className="mr-1" />
                            <span>
                              {trip.preferences?.budget?.max
                                ? `₹${trip.preferences.budget.max.toLocaleString()}`
                                : trip.budget?.max
                                  ? `₹${trip.budget.max.toLocaleString()}`
                                  : trip.budget}
                            </span>
                          </div>
                        )}
                      </div>

                      {trip.rating && (
                        <div className="flex items-center pt-1 md:pt-2">
                          <FaStar className="h-3 w-3 md:h-4 md:w-4 mr-1" style={{color:'#FFB224'}} />
                          <span className="text-xs md:text-sm font-semibold" style={{color:'#ffffff'}}>
                            {trip.rating}
                          </span>
                          <span className="text-[10px] md:text-xs ml-1" style={{color:'#6B7280'}}>
                            / 5.0
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-10 md:py-20"
          >
            <div className="p-6 md:p-12 rounded-2xl max-w-2xl mx-auto" style={{background:'linear-gradient(135deg,rgba(255,178,36,0.08),rgba(255,178,36,0.03))',border:'1px solid rgba(255,178,36,0.2)'}}>
              <div className="relative inline-block mb-4 md:mb-6">
                <div className="absolute inset-0 rounded-full blur-2xl animate-pulse" style={{background:'rgba(255,178,36,0.15)'}}></div>
                <FaRoute className="relative h-16 w-16 md:h-20 md:w-20" style={{color:'#FFB224'}} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3" style={{color:'#ffffff'}}>
                {searchQuery || filter !== "all"
                  ? "No trips found"
                  : "No trips yet"}
              </h3>
              <p className="text-sm md:text-base mb-6 md:mb-8 max-w-md mx-auto" style={{color:'#9CA3AF'}}>
                {searchQuery || filter !== "all"
                  ? "Try adjusting your filters or search query"
                  : "Start planning your first adventure with AI assistance"}
              </p>
              {!searchQuery && filter === "all" && (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link to="/trip-planner" className="block w-full">
                    <Button className="w-full md:w-auto font-bold px-6 md:px-8 py-3 rounded-xl flex items-center justify-center" style={{background:'#FFB224',color:'#09090C',boxShadow:'0 0 20px rgba(255,178,36,0.35)'}}>
                      <FaPlus className="mr-2" />
                      Plan Your First Trip
                    </Button>
                  </Link>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Trips;
