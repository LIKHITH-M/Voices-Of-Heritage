import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import { useApi } from "../hooks/useApi";
import { tripAPI, mapsAPI } from "../services/api";
import { Card, Button, LoadingSpinner, Badge } from "../components/ui";
import {
  FaRoute,
  FaCalendar,
  FaMapMarkedAlt,
  FaUsers,
  FaDollarSign,
  FaShare,
  FaEdit,
  FaTrash,
  FaDownload,
  FaClock,
  FaStar,
  FaArrowLeft,
  FaMapMarkerAlt,
  FaTimes,
} from "react-icons/fa";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Safe date parser
const parseDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const formatDate = (val) => {
  const d = parseDate(val);
  if (!d) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatDateRange = (trip) => {
  const s = parseDate(trip?.startDate);
  const e = parseDate(trip?.endDate);
  if (s && e) return `${formatDate(s)} - ${formatDate(e)}`;
  if (s && !e) return `Starts ${formatDate(s)}`;
  if (!s && e) return `Until ${formatDate(e)}`;
  return "Flexible Dates";
};

// Fix default icon paths for Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const Recenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 13);
  }, [center, map]);
  return null;
};

const TripDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview"); // overview, itinerary, details
  const [selectedActivityIndex, setSelectedActivityIndex] = useState(null);
  const markerRefs = useRef({});

  // Auto-open marker popup on map when activity is selected
  useEffect(() => {
    if (selectedActivityIndex !== null && markerRefs.current[selectedActivityIndex]) {
      markerRefs.current[selectedActivityIndex].openPopup();
    }
  }, [selectedActivityIndex]);

  const {
    data: tripData,
    isLoading,
    error,
    refetch
  } = useApi(["trip", id], () =>
    tripAPI.getTripById(id).then((res) => res.data.trip)
  );

  const [trip, setTrip] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [isSearchingNearby, setIsSearchingNearby] = useState(false);
  const [showSearchUI, setShowSearchUI] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (tripData) {
      setTrip(tripData);
      setSelectedActivityIndex(null);
      markerRefs.current = {};
      // Set initial map center to destination or first activity
      if (tripData.destination?.coordinates?.lat) {
        setMapCenter(tripData.destination.coordinates);
      } else if (tripData.itinerary?.days?.[0]?.activities?.[0]?.location?.coordinates?.lat) {
        setMapCenter(tripData.itinerary.days[0].activities[0].location.coordinates);
      }
    }
  }, [tripData]);

  // Auto-search for alternatives when opening edit modal for an activity without coordinates
  useEffect(() => {
    if (editingActivity && !nearbyPlaces.length && !isSearchingNearby) {
      handleSearchNearby(editingActivity);
    }
  }, [editingActivity]);

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this trip?")) {
      try {
        await tripAPI.deleteTrip(id);
        toast.success("Trip deleted successfully");
        navigate("/trips");
      } catch (error) {
        toast.error("Failed to delete trip");
      }
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Trip to ${trip?.destination}`,
        text: `Check out my trip to ${trip?.destination}!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleDownload = () => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Header
      pdf.setFillColor(79, 70, 229);
      pdf.rect(0, 0, pageWidth, 40, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.text(trip.title || "My Trip", margin, 25);

      yPosition = 50;

      // Destination
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Destination:", margin, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      const destination =
        trip.destination?.city && trip.destination?.country
          ? `${trip.destination.city}, ${trip.destination.country}`
          : trip.destination?.city || trip.destination || "Not specified";
      pdf.text(destination, margin + 40, yPosition);
      yPosition += 10;

      // Duration and Budget
      pdf.setFont("helvetica", "bold");
      pdf.text("Duration:", margin, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(getDuration(), margin + 40, yPosition);
      yPosition += 7;

      pdf.setFont("helvetica", "bold");
      pdf.text("Budget:", margin, yPosition);
      pdf.setFont("helvetica", "normal");
      const budget = trip.preferences?.budget?.max
        ? `Rs ${trip.preferences.budget.max}`
        : "Not specified";
      pdf.text(budget, margin + 40, yPosition);
      yPosition += 7;

      pdf.setFont("helvetica", "bold");
      pdf.text("Travelers:", margin, yPosition);
      pdf.setFont("helvetica", "normal");
      const travelers = trip.preferences?.groupSize || trip.groupSize || 1;
      pdf.text(
        `${travelers} traveler${travelers > 1 ? "s" : ""}`,
        margin + 40,
        yPosition
      );
      yPosition += 15;

      // Itinerary
      if (
        trip.itinerary &&
        (trip.itinerary.days || trip.itinerary.dailyPlans)
      ) {
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text("Itinerary:", margin, yPosition);
        yPosition += 10;

        const days = trip.itinerary.days || trip.itinerary.dailyPlans;
        days.forEach((day) => {
          if (yPosition > pageHeight - 40) {
            pdf.addPage();
            yPosition = margin;
          }

          pdf.setFontSize(14);
          pdf.setFont("helvetica", "bold");
          pdf.text(
            `Day ${day.day}: ${day.title || day.theme || "Adventure Day"}`,
            margin,
            yPosition
          );
          yPosition += 8;

          if (day.activities && day.activities.length > 0) {
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");

            day.activities.forEach((activity) => {
              if (yPosition > pageHeight - 30) {
                pdf.addPage();
                yPosition = margin;
              }

              const activityText = `${activity.time || ""} - ${activity.activity || activity.title || activity.name
                }`;
              const splitText = pdf.splitTextToSize(
                activityText,
                pageWidth - 2 * margin - 10
              );
              pdf.text(splitText, margin + 5, yPosition);
              yPosition += splitText.length * 5;

              if (activity.location?.name) {
                pdf.setFont("helvetica", "italic");
                pdf.text(
                  `  @ ${activity.location.name}`,
                  margin + 5,
                  yPosition
                );
                pdf.setFont("helvetica", "normal");
                yPosition += 5;
              }
            });
          }
          yPosition += 5;
        });
      }

      // Save PDF
      const fileName = `${trip.title?.replace(/[^a-z0-9]/gi, "_") || "trip"
        }_itinerary.pdf`;
      pdf.save(fileName);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const handleUpdateActivity = async (dayIndex, activityIndex, updatedActivity) => {
    const newTrip = { ...trip };
    newTrip.itinerary.days[dayIndex].activities[activityIndex] = updatedActivity;

    try {
      setTrip(newTrip); // Optimistic update
      await tripAPI.updateTrip(id, { itinerary: newTrip.itinerary });
      toast.success("Activity updated!");
      setEditingActivity(null);
      setNearbyPlaces([]);
      refetch();
    } catch (error) {
      toast.error("Failed to update activity");
      setTrip(tripData); // Rollback
    }
  };

  const handleSearchNearby = async (activity, query = "") => {
    try {
      setIsSearchingNearby(true);
      setShowSearchUI(true);
      setNearbyPlaces([]);

      const type = activity.type === "accommodation" || activity.activity?.toLowerCase()?.includes("hotel")
        ? "hotel"
        : activity.activity?.toLowerCase()?.includes("restaurant") || activity.activity?.toLowerCase()?.includes("food")
          ? "restaurant"
          : "tourist_attraction";

      // Try activity coordinates, fallback to trip destination, fallback to map center
      let lat = activity.location?.coordinates?.lat;
      let lng = activity.location?.coordinates?.lng;

      if (!lat || !lng) {
        if (trip?.destination?.coordinates?.lat) {
          lat = trip.destination.coordinates.lat;
          lng = trip.destination.coordinates.lng;
        } else if (mapCenter) {
          lat = Array.isArray(mapCenter) ? mapCenter[0] : mapCenter.lat;
          lng = Array.isArray(mapCenter) ? mapCenter[1] : mapCenter.lng;
        }
      }

      if (!lat || !lng) {
        toast.error("Cannot determine location for search");
        setIsSearchingNearby(false);
        return;
      }

      const response = await mapsAPI.getNearbyPlaces({
        lat,
        lng,
        radius: activity.location?.coordinates?.lat ? 3000 : 15000, // Larger radius if using city center
        type: type,
        keyword: query || searchQuery || ""
      });

      if (response.data.success) {
        setNearbyPlaces(response.data.data.places || []);
      }
    } catch (error) {
      console.error("Error searching nearby places:", error);
      toast.error("Failed to find nearby places");
    } finally {
      setIsSearchingNearby(false);
    }
  };

  const getAllPlaces = () => {
    if (!trip || !trip.itinerary?.days) return [];
    const places = [];
    let globalIdx = 0;
    trip.itinerary.days.forEach(day => {
      day.activities.forEach(activity => {
        if (activity.location?.coordinates?.lat) {
          places.push({ ...activity, day: day.day, globalIdx: globalIdx++ });
        }
      });
    });
    return places;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-950/50 dark:to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-950/50 dark:to-gray-900 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-12 text-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
            <FaMapMarkedAlt className="h-20 w-20 mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Trip Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The trip you're looking for doesn't exist or has been removed.
            </p>
            <Link to="/trips">
              <Button className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold px-6 py-3 rounded-xl">
                <FaArrowLeft className="mr-2" />
                Back to Trips
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const getDuration = () => {
    // First try preferences.duration
    if (trip.preferences?.duration) {
      const days = trip.preferences.duration;
      return `${days} day${days > 1 ? "s" : ""}`;
    }

    // Fall back to calculating from dates
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return "Unknown duration";
    }
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return `${days} day${days > 1 ? "s" : ""}`;
  };

  const getStatusVariant = () => {
    const now = new Date();
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);

    if (trip.status === "draft") return "secondary";
    if (endDate < now) return "success";
    if (startDate <= now && endDate >= now) return "warning";
    return "primary";
  };

  const getStatusLabel = () => {
    const now = new Date();
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);

    if (trip.status === "draft") return "Draft";
    if (endDate < now) return "Completed";
    if (startDate <= now && endDate >= now) return "In Progress";
    return "Upcoming";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-950/50 dark:to-gray-900 py-4 md:py-6">
      <div className="max-w-6xl mx-auto px-3 md:px-6 lg:px-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden md:block mb-4"
        >
          <Link to="/trips">
            <Button
              variant="ghost"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white pl-0"
            >
              <FaArrowLeft className="mr-2" />
              Back to Trips
            </Button>
          </Link>
        </motion.div>

        {/* Header with Hero Image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 md:mb-6"
        >
          <Card className="overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl rounded-xl md:rounded-2xl p-2 md:p-0">
            {/* Hero Section */}
            <div className="relative h-48 md:h-80 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-lg md:rounded-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <FaMapMarkedAlt className="h-20 w-20 md:h-32 md:w-32 text-white/20" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-lg md:rounded-none"></div>

              {/* Mobile Badge - Top Right */}
              <div className="absolute top-2 right-2 md:hidden z-10">
                <Badge
                  variant={getStatusVariant()}
                  className="inline-flex items-center rounded-full px-2.5 py-1 font-bold shadow-lg text-xs"
                >
                  {getStatusLabel()}
                </Badge>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-3 md:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Badge
                      variant={getStatusVariant()}
                      className="hidden md:inline-flex mb-2 md:mb-3 font-bold shadow-lg text-xs md:text-sm"
                    >
                      {getStatusLabel()}
                    </Badge>
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2 line-clamp-1">
                      {trip.destination?.city || trip.destination}
                      {trip.destination?.country &&
                        trip.destination.city !== trip.destination.country &&
                        `, ${trip.destination.country}`}
                    </h1>
                    <div className="flex flex-wrap gap-2 md:gap-4 text-white/90 text-[10px] md:text-sm">
                      <div className="flex items-center">
                        <FaCalendar className="mr-1 md:mr-2" />
                        {formatDateRange(trip)}
                      </div>
                      <div className="flex items-center">
                        <FaClock className="mr-1 md:mr-2" />
                        {getDuration()}
                      </div>
                      <div className="flex items-center">
                        <FaUsers className="mr-1 md:mr-2" />
                        {trip.preferences?.groupSize ||
                          trip.groupSize ||
                          trip.travelers ||
                          1}{" "}
                        travelers
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-2 md:p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50">
              <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-3">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="order-1 md:order-none"
                >
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    className="w-full md:w-auto rounded-lg md:rounded-xl border-2 font-semibold text-sm md:text-base py-1.5 px-2"
                  >
                    <FaShare className="mr-1 md:mr-2" />
                    Share
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="order-2 md:order-none"
                >
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    className="w-full md:w-auto rounded-lg md:rounded-xl border-2 font-semibold text-sm md:text-base py-1.5 px-2"
                  >
                    <FaDownload className="mr-1 md:mr-2" />
                    PDF
                  </Button>
                </motion.div>
                <div className="col-span-2 md:ml-auto flex gap-2 md:gap-3 order-3 md:order-none">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 md:flex-none"
                  >
                    <Button
                      onClick={() => navigate(`/trip-planner?edit=${id}`)}
                      className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-lg md:rounded-xl text-sm md:text-base py-1.5"
                    >
                      <FaEdit className="mr-1 md:mr-2" />
                      Edit
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 md:flex-none"
                  >
                    <Button
                      onClick={handleDelete}
                      variant="outline"
                      className="w-full md:w-auto rounded-lg md:rounded-xl border-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 font-semibold text-sm md:text-base py-1.5"
                    >
                      <FaTrash className="mr-1 md:mr-2" />
                      Delete
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4 md:mb-6"
        >
          <Card className="p-1 md:p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg rounded-xl md:rounded-2xl">
            <div className="flex gap-1 md:gap-2">
              {["Overview", "Itinerary", "Details"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={`flex-1 px-2 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl font-semibold text-xs md:text-sm transition-all duration-300 ${activeTab === tab.toLowerCase()
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="px-2 py-3 md:p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg rounded-xl md:rounded-2xl">
                  <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4">
                    About This Trip
                  </h2>
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                    {trip.description ||
                      `Explore the beautiful destination of ${trip.destination?.city || trip.destination
                      }. This ${getDuration()} adventure will take you through amazing experiences and unforgettable moments.`}
                  </p>

                  {/* Mobile Trip Details Integration */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 lg:hidden">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                            Budget
                          </div>
                          <div className="flex items-center text-sm font-bold text-gray-900 dark:text-white">
                            <FaDollarSign className="mr-1 text-green-600 text-xs" />
                            {trip.preferences?.budget?.max
                              ? `₹${trip.preferences.budget.max}`
                              : trip.budget?.max
                                ? `₹${trip.budget.max}`
                                : trip.budget || "Not specified"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                            Travel Style
                          </div>
                          <div className="text-gray-900 dark:text-white font-semibold capitalize text-sm">
                            {trip.travelStyle || "Mid-range"}
                          </div>
                        </div>
                      </div>

                      {trip.accommodation && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                            Accommodation
                          </div>
                          <div className="text-gray-900 dark:text-white font-semibold capitalize text-sm">
                            {trip.accommodation}
                          </div>
                        </div>
                      )}

                      {trip.interests && trip.interests.length > 0 && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                            Interests
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {trip.interests.map((interest, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-[10px] font-semibold"
                              >
                                {interest}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {trip.itinerary &&
                  (trip.itinerary.days || trip.itinerary.dailyPlans) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="px-2 py-3 md:p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg rounded-xl md:rounded-2xl">
                        <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4 flex items-center">
                          <FaRoute className="mr-2 md:mr-3 text-purple-600" />
                          Daily Highlights
                        </h2>
                        <div className="space-y-3 md:max-h-[500px] md:overflow-y-auto md:pr-2">
                          {(trip.itinerary.days || trip.itinerary.dailyPlans).map(
                            (day, index) => (
                              <div
                                key={index}
                                className="flex items-start p-2 md:p-5 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-md transition-shadow group"
                              >
                                <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm md:text-base mr-3">
                                  {day.day}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-sm md:text-base text-gray-900 dark:text-white">
                                      Day {day.day}:{" "}
                                      {day.title || day.theme || "Activities"}
                                    </h4>
                                    <button
                                      onClick={() => setActiveTab("itinerary")}
                                      className="text-xs text-purple-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                  <div className="mt-2 space-y-1">
                                    {day.activities?.map((act, actIdx) => {
                                      const allPlaces = getAllPlaces();
                                      const placeObj = allPlaces.find(
                                        (p) =>
                                          p.day === day.day &&
                                          (p.activity === act.activity || p.title === act.title) &&
                                          p.location?.coordinates?.lat === act.location?.coordinates?.lat
                                      );
                                      const globalIdx = placeObj ? placeObj.globalIdx : null;
                                      const isSelected = selectedActivityIndex === globalIdx;
                                      return (
                                        <button
                                          key={actIdx}
                                          onClick={() => {
                                            if (act.location?.coordinates?.lat) {
                                              setMapCenter(act.location.coordinates);
                                              if (globalIdx !== null) setSelectedActivityIndex(globalIdx);
                                            }
                                          }}
                                          className={`w-full text-left text-xs p-1.5 rounded-lg transition-all flex items-center gap-2 ${isSelected
                                              ? "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 font-bold border-l-2 border-orange-500 pl-1"
                                              : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                            }`}
                                        >
                                          <span
                                            className={`w-1.5 h-1.5 rounded-full transition-all ${isSelected ? "bg-orange-500 scale-125" : "bg-purple-400"
                                              }`}
                                          ></span>
                                          {act.activity || act.title}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )
                          )}

                        </div>
                      </Card>

                      <Card className="p-0 overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg rounded-xl md:rounded-2xl h-[400px] md:h-auto min-h-[400px]">
                        <MapContainer
                          center={mapCenter || [0, 0]}
                          zoom={13}
                          style={{ height: "100%", width: "100%" }}
                        >
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          />
                          {mapCenter && <Recenter center={mapCenter} />}
                          {getAllPlaces().map((place, idx) => {
                            const isSelected = selectedActivityIndex === place.globalIdx;
                            const key = `${place.day}-${idx}-${place.location.coordinates.lat}-${place.location.coordinates.lng}`;
                            return (
                              <Marker
                                key={key}
                                position={[place.location.coordinates.lat, place.location.coordinates.lng]}
                                ref={(el) => {
                                  if (el) markerRefs.current[place.globalIdx] = el;
                                }}
                                eventHandlers={{
                                  click: () => {
                                    setSelectedActivityIndex(place.globalIdx);
                                  },
                                }}
                                icon={L.divIcon({
                                  className: "custom-div-icon",
                                  html: `<div style="background-color: ${isSelected ? "#ea580c" : "#2563eb"
                                    }; color: white; width: ${isSelected ? "28px" : "20px"}; height: ${isSelected ? "28px" : "20px"
                                    }; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: ${isSelected ? "11px" : "9px"
                                    }; border: 2px solid white; box-shadow: 0 4px 12px ${isSelected ? "rgba(234,88,12,0.6)" : "rgba(37,99,235,0.4)"
                                    }; transform: scale(${isSelected ? "1.2" : "1.0"}); transition: all 0.3s ease;">${place.globalIdx + 1
                                    }</div>`,
                                  iconSize: isSelected ? [28, 28] : [20, 20],
                                  iconAnchor: isSelected ? [14, 14] : [10, 10],
                                })}
                              >
                                <Popup>
                                  <div className="p-3 min-w-[200px] bg-white dark:bg-gray-800 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className={`w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center font-bold transition-all bg-blue-600 ${isSelected ? "bg-orange-600" : ""
                                        }`}>
                                        {place.globalIdx + 1}
                                      </span>
                                      <h3 className="font-bold text-gray-900 dark:text-white text-xs">{place.activity || place.title}</h3>
                                    </div>
                                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 transition-all ${isSelected ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400"
                                      }`}>
                                      Day {place.day} • {place.time}
                                    </p>
                                    {place.description && (
                                      <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                                        {place.description}
                                      </p>
                                    )}
                                  </div>
                                </Popup>
                              </Marker>
                            );
                          })}
                          {getAllPlaces().length > 1 && (
                            <Polyline
                              key={getAllPlaces().map(p => p.location.coordinates.lat).join(',')}
                              positions={getAllPlaces().map(p => [p.location.coordinates.lat, p.location.coordinates.lng])}
                              color="#2563eb"
                              weight={3}
                              opacity={0.6}
                              dashArray="5, 10"
                            />
                          )}
                        </MapContainer>
                      </Card>
                    </div>
                  )}

              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                <Card className="hidden lg:block px-2 py-3 md:p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg rounded-xl md:rounded-2xl">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Trip Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Budget
                      </div>
                      <div className="flex items-center text-lg font-bold text-gray-900 dark:text-white">
                        <FaDollarSign className="mr-2 text-green-600" />
                        {trip.preferences?.budget?.max
                          ? `₹${trip.preferences.budget.max}`
                          : trip.budget?.max
                            ? `₹${trip.budget.max}`
                            : trip.budget || "Not specified"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Travel Style
                      </div>
                      <div className="text-gray-900 dark:text-white font-semibold capitalize">
                        {trip.travelStyle || "Mid-range"}
                      </div>
                    </div>
                    {trip.accommodation && (
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          Accommodation
                        </div>
                        <div className="text-gray-900 dark:text-white font-semibold capitalize">
                          {trip.accommodation}
                        </div>
                      </div>
                    )}
                    {trip.interests && trip.interests.length > 0 && (
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          Interests
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {trip.interests.map((interest, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {trip.rating && (
                  <Card className="p-4 md:p-6 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 backdrop-blur-sm border-0 shadow-lg rounded-xl md:rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
                        Your Rating
                      </h3>
                      <div className="flex items-center">
                        <FaStar className="h-6 w-6 text-yellow-400 mr-2" />
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          {trip.rating}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 ml-1">
                          / 5.0
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Share your experience with others!
                    </p>
                  </Card>
                )}
              </div>
            </div>
          )}

          {activeTab === "itinerary" && (
            <Card className="px-2 py-3 md:p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg rounded-xl md:rounded-2xl">
              <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white mb-3 md:mb-6">
                Day-by-Day Itinerary
              </h2>
              {trip.itinerary &&
                (trip.itinerary.days || trip.itinerary.dailyPlans) ? (
                <div className="space-y-4">
                  {(trip.itinerary.days || trip.itinerary.dailyPlans).map(
                    (day, index) => (
                      <div
                        key={index}
                        className="p-2 md:p-5 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border border-gray-200/50 dark:border-gray-700/50"
                      >
                        <div className="flex items-start mb-2 md:mb-3">
                          <div className="flex-shrink-0 w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm md:text-base mr-3 md:mr-4">
                            {day.day}
                          </div>
                          <div className="flex-1">
                            <div className="mb-2 md:mb-3">
                              <h3 className="text-sm md:text-xl font-bold text-gray-900 dark:text-white inline">
                                Day {day.day}:{" "}
                              </h3>
                              <span className="text-sm md:text-lg font-semibold text-gray-700 dark:text-gray-300">
                                {day.title ||
                                  day.theme ||
                                  day.activities?.[0]?.activity ||
                                  "Activities planned"}
                              </span>
                            </div>
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                              <span>
                                {parseDate(day.date)
                                  ? parseDate(day.date).toLocaleDateString(
                                      "en-US",
                                      {
                                        weekday: "long",
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric",
                                      }
                                    )
                                  : `Day ${day.day}`}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                                {day.activities?.length || 0} activities
                              </span>
                            </p>
                            {day.activities && day.activities.length > 0 && (
                              <div className="mt-4 space-y-2">
                                {day.activities.map((activity, actIdx) => (
                                  <div
                                    key={actIdx}
                                    className="group flex items-start text-sm text-gray-700 dark:text-gray-300 pl-2 md:pl-4 border-l-2 border-purple-200 dark:border-purple-800 hover:border-purple-500 transition-colors py-2"
                                  >
                                    <FaMapMarkerAlt className="mr-2 mt-1 text-purple-600 flex-shrink-0" />
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between">
                                        <span>
                                          {activity.time && (
                                            <strong className="text-blue-600 dark:text-blue-400">{activity.time}:</strong>
                                          )}{" "}
                                          <span className="font-semibold">{activity.activity ||
                                            activity.title ||
                                            activity.name}</span>
                                          {activity.location?.name &&
                                            ` at ${activity.location.name}`}
                                        </span>
                                        <button
                                          onClick={() => setEditingActivity({ dayIndex: index, activityIndex: actIdx, ...activity })}
                                          className="opacity-0 group-hover:opacity-100 p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-purple-600 hover:text-purple-700 transition-all"
                                        >
                                          <FaEdit size={12} />
                                        </button>
                                      </div>
                                      {activity.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                          {activity.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="text-center py-6 md:py-12">
                  <FaMapMarkedAlt className="h-12 w-12 md:h-16 md:w-16 mx-auto text-gray-300 mb-3 md:mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No detailed itinerary available for this trip yet.
                  </p>
                </div>
              )}
            </Card>
          )}

          {activeTab === "details" && (
            <div className="space-y-6">
              <Card className="hidden md:block p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Trip Preferences
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {trip.preferences?.travelStyle && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                        Travel Style
                      </h3>
                      <p className="text-lg text-gray-900 dark:text-white capitalize">
                        {trip.preferences.travelStyle}
                      </p>
                    </div>
                  )}
                  {trip.preferences?.accommodation && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                        Accommodation
                      </h3>
                      <p className="text-lg text-gray-900 dark:text-white capitalize">
                        {trip.preferences.accommodation}
                      </p>
                    </div>
                  )}
                  {trip.preferences?.transport &&
                    trip.preferences.transport.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                          Transportation
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {trip.preferences.transport.map((mode, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full text-sm font-medium text-gray-800 dark:text-gray-200 capitalize"
                            >
                              {mode}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  {trip.preferences?.interests &&
                    trip.preferences.interests.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                          Interests
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {trip.preferences.interests.map((interest, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 rounded-full text-sm font-medium text-gray-800 dark:text-gray-200 capitalize"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </Card>

              {(trip.itinerary?.summary || trip.preferences) && (
                <Card className="p-3 md:p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg rounded-xl md:rounded-2xl">
                  {trip.itinerary?.summary && (
                    <>
                      <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4">
                        Trip Summary
                      </h2>
                      <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                        {trip.itinerary.summary}
                      </p>
                    </>
                  )}

                  {/* Mobile Preferences Integration */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 md:hidden">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                      Trip Preferences
                    </h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        {trip.preferences?.travelStyle && (
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                              Travel Style
                            </div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                              {trip.preferences.travelStyle}
                            </div>
                          </div>
                        )}
                        {trip.preferences?.accommodation && (
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                              Accommodation
                            </div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                              {trip.preferences.accommodation}
                            </div>
                          </div>
                        )}
                        {trip.preferences?.transport &&
                          trip.preferences.transport.length > 0 && (
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                                Transportation
                              </div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                                {trip.preferences.transport.join(", ")}
                              </div>
                            </div>
                          )}
                      </div>

                      {trip.preferences?.interests &&
                        trip.preferences.interests.length > 0 && (
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                              Interests
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {trip.preferences.interests.map((interest, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 rounded-full text-[10px] font-semibold text-gray-800 dark:text-gray-200 capitalize"
                                >
                                  {interest}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </Card>
              )}

              {trip.itinerary?.recommendations && (
                <Card className="px-2 py-3 md:p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg rounded-xl md:rounded-2xl">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Recommendations
                  </h2>
                  <div className="space-y-4">
                    {trip.itinerary.recommendations.weather && (
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                          Weather Tips
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300">
                          {trip.itinerary.recommendations.weather}
                        </p>
                      </div>
                    )}
                    {trip.itinerary.recommendations.localTips && (
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                          Local Tips
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300">
                          {trip.itinerary.recommendations.localTips}
                        </p>
                      </div>
                    )}
                    {trip.itinerary.recommendations.budgetTips && (
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                          Budget Tips
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300">
                          {trip.itinerary.recommendations.budgetTips}
                        </p>
                      </div>
                    )}
                    {trip.itinerary.recommendations.safetyTips && (
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                          Safety Tips
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300">
                          {trip.itinerary.recommendations.safetyTips}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {trip.specialRequests && (
                <Card className="px-2 py-3 md:p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg rounded-xl md:rounded-2xl">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Special Requests
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300">
                    {trip.specialRequests}
                  </p>
                </Card>
              )}

              {trip.notes && (
                <Card className="px-2 py-3 md:p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg rounded-xl md:rounded-2xl">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Notes
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {trip.notes}
                  </p>
                </Card>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Edit Activity Modal */}
      <AnimatePresence>
        {editingActivity && (
          <motion.div
            key="edit-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              key="edit-modal-content"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Activity</h3>
                  <button
                    onClick={() => setEditingActivity(null)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                  >
                    <FaTimes />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time</label>
                    <input
                      type="text"
                      value={editingActivity.time || ""}
                      onChange={(e) => setEditingActivity({ ...editingActivity, time: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Activity</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingActivity.activity || editingActivity.title || ""}
                        onChange={(e) => setEditingActivity({ ...editingActivity, activity: e.target.value })}
                        className="flex-1 bg-gray-50 dark:bg-gray-800 border-0 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                        placeholder="Activity name"
                      />
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowSearchUI(true);
                          handleSearchNearby(editingActivity);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition-all"
                        disabled={isSearchingNearby}
                      >
                        {isSearchingNearby ? <LoadingSpinner size="xs" /> : <FaMapMarkerAlt />}
                        Search
                      </Button>
                    </div>
                  </div>

                  {/* Nearby Search UI */}
                  <AnimatePresence>
                    {showSearchUI && (
                      <motion.div
                        key="nearby-search-ui"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[10px] font-bold text-gray-500 uppercase">Nearby Alternatives</h4>
                            <button
                              type="button"
                              onClick={() => {
                                setNearbyPlaces([]);
                                setShowSearchUI(false);
                              }}
                              className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                              Close
                            </button>
                          </div>

                          <div className="mb-3">
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSearchNearby(editingActivity)}
                              placeholder="Search specifically (e.g. 'Hilton')"
                              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                          </div>

                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {isSearchingNearby ? (
                              <div className="py-8 text-center">
                                <LoadingSpinner size="sm" />
                                <p className="text-[10px] text-gray-500 mt-2">Searching nearby places...</p>
                              </div>
                            ) : nearbyPlaces.length > 0 ? (
                              nearbyPlaces.map((place, pIdx) => (
                                <button
                                  key={pIdx}
                                  onClick={() => {
                                    setEditingActivity({
                                      ...editingActivity,
                                      activity: place.name,
                                      location: {
                                        name: place.name,
                                        address: place.vicinity || place.address || "",
                                        coordinates: place.geometry?.location || place.location || {
                                          lat: parseFloat(place.lat),
                                          lng: parseFloat(place.lon)
                                        }
                                      }
                                    });
                                    setNearbyPlaces([]);
                                    setSearchQuery("");
                                  }}
                                  className="w-full text-left p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all border border-transparent hover:border-blue-200 dark:hover:border-blue-900 group"
                                >
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-blue-600 line-clamp-1">{place.name}</p>
                                    <span className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                                  </div>
                                  <p className="text-[10px] text-gray-500 line-clamp-1">{place.vicinity || place.address}</p>
                                </button>
                              ))
                            ) : (
                              <p className="py-4 text-center text-xs text-gray-500">No places found. Try a different search.</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>


                    <textarea
                      value={editingActivity.description || ""}
                      onChange={(e) => setEditingActivity({ ...editingActivity, description: e.target.value })}
                      rows={3}
                      className="w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <Button
                    onClick={() => setEditingActivity(null)}
                    variant="outline"
                    className="flex-1 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      const { dayIndex, activityIndex, ...updatedActivity } = editingActivity;
                      handleUpdateActivity(dayIndex, activityIndex, updatedActivity);
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


export default TripDetail;
