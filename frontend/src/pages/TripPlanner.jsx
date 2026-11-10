import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

import { useNotifications } from "../contexts/NotificationContext";
import { useApiMutation, useApi } from "../hooks/useApi";
import { useFormValidation } from "../hooks/useFormValidation";
import { Button, Input, LoadingSpinner } from "../components/ui";
import { aiAPI, tripAPI } from "../services/api";
import TripResultCard from "../components/trip/TripResultCard";
import TripDetailView from "../components/trip/TripDetailView";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  FaPlane,
  FaMapMarkedAlt,
  FaCalendarAlt,
  FaUsers,
  FaDollarSign,
  FaRocket,
  FaHeart,
  FaMountain,
  FaCity,
  FaUmbrellaBeach,
  FaTree,
  FaUtensils,
  FaMusic,
  FaCamera,
  FaMagic,
  FaCheckCircle,
  FaArrowRight,
  FaArrowLeft,
  FaSpinner,
  FaSave,
} from "react-icons/fa";

const TripPlanner = () => {

  const notifications = useNotifications();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editTripId = searchParams.get("edit");

  const [currentStep, setCurrentStep] = useState(1);
  const [generatedItinerary, setGeneratedItinerary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [plannerMode, setPlannerMode] = useState(() => localStorage.getItem("voh_planner_mode") || "research");

  useEffect(() => {
    localStorage.setItem("voh_planner_mode", plannerMode);
  }, [plannerMode]);

  const { values, errors, handleChange, handleBlur, isValid, setValues } =
    useFormValidation(
      {
        destination: "",
        startDate: "",
        endDate: "",
        travelers: 2,
        budget: "",
        interests: [],
        travelStyle: "",
        accommodationType: "",
        transportation: "",
        specialRequests: "",
      },
      {
        destination: { required: true, minLength: 3 },
        startDate: { required: true },
        endDate: { required: true },
        travelers: { required: true },
        budget: { required: true },
        travelStyle: { required: true },
      }
    );

  // Load trip data for editing
  const { data: editTrip } = useApi(
    ["trip", editTripId],
    () => tripAPI.getTripById(editTripId).then((res) => res.data.trip),
    { enabled: !!editTripId }
  );

  // Autofill form when editing
  useEffect(() => {
    if (editTrip) {
      const destination =
        editTrip.destination?.city || editTrip.destination || "";
      const startDate = editTrip.startDate
        ? new Date(editTrip.startDate).toISOString().split("T")[0]
        : "";
      const endDate = editTrip.endDate
        ? new Date(editTrip.endDate).toISOString().split("T")[0]
        : "";

      setValues({
        destination: destination,
        startDate: startDate,
        endDate: endDate,
        travelers: editTrip.preferences?.groupSize || editTrip.groupSize || 2,
        budget:
          editTrip.preferences?.budget?.max?.toString() ||
          editTrip.budget?.max?.toString() ||
          "",
        interests: editTrip.preferences?.interests || [],
        travelStyle: editTrip.preferences?.travelStyle || "",
        accommodationType: editTrip.preferences?.accommodation || "",
        transportation: Array.isArray(editTrip.preferences?.transport)
          ? editTrip.preferences.transport[0]
          : "",
        specialRequests: editTrip.specialRequests || "",
      });

      toast.success("Trip loaded for editing!");
    }
  }, [editTrip, setValues]);

  const generateItinerary = useApiMutation(aiAPI.generateItinerary, {
    onSuccess: (response) => {
      console.log("API Response:", response);
      console.log("Itinerary Data:", response.data);
      // The actual itinerary is in response.data.data
      const itinerary = response.data.data;
      console.log("Actual Itinerary:", itinerary);
      setGeneratedItinerary(itinerary);
      setCurrentStep(4);
      toast.success("Your AI-powered itinerary is ready!");
    },
    onError: (error) => {
      console.error("Full error:", error);
      toast.error(
        error.response?.data?.message ||
        "Failed to generate itinerary. Please try again."
      );
      console.error("Generation error:", error);
    },
  });

  const remainingRequests = "∞";

  const interestOptions = [
    { id: "culture", label: "Culture & History", icon: FaCity },
    { id: "nature", label: "Nature & Wildlife", icon: FaTree },
    { id: "adventure", label: "Adventure Sports", icon: FaMountain },
    { id: "beach", label: "Beach & Relaxation", icon: FaUmbrellaBeach },
    { id: "food", label: "Food & Cuisine", icon: FaUtensils },
    { id: "nightlife", label: "Nightlife & Music", icon: FaMusic },
    { id: "photography", label: "Photography", icon: FaCamera },
    { id: "wellness", label: "Wellness & Spa", icon: FaHeart },
  ];

  const travelStyles = [
    { id: "luxury", label: "Luxury", description: "High-end experiences" },
    { id: "mid-range", label: "Mid-Range", description: "Comfortable travel" },
    { id: "budget", label: "Budget", description: "Cost-effective options" },
    { id: "adventure", label: "Adventure", description: "Off-the-beaten-path" },
  ];

  const accommodationTypes = [
    { id: "hotel", label: "Hotels" },
    { id: "resort", label: "Resorts" },
    { id: "airbnb", label: "Vacation Rentals" },
    { id: "hostel", label: "Hostels" },
    { id: "boutique", label: "Boutique Hotels" },
  ];

  const transportationOptions = [
    { id: "flight", label: "Flight" },
    { id: "train", label: "Train" },
    { id: "car", label: "Car Rental" },
    { id: "bus", label: "Bus" },
    { id: "mixed", label: "Mixed Options" },
  ];

  const handleInterestChange = (interestId) => {
    const currentInterests = values.interests || [];
    const newInterests = currentInterests.includes(interestId)
      ? currentInterests.filter((id) => id !== interestId)
      : [...currentInterests, interestId];

    setValues((prev) => ({ ...prev, interests: newInterests }));
  };

  const handleGenerateItinerary = async () => {
    if (!isValid) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsGenerating(true);
    try {
      // Calculate duration in days
      const duration = (values.startDate && values.endDate && !isNaN(new Date(values.startDate).getTime()) && !isNaN(new Date(values.endDate).getTime()))
        ? Math.max(1, Math.ceil((new Date(values.endDate) - new Date(values.startDate)) / (1000 * 60 * 60 * 24)) + 1)
        : 3;

      // Map budget to numeric range
      const budgetRanges = {
        budget: { min: 8000, max: 80000 },
        "mid-range": { min: 80000, max: 240000 },
        luxury: { min: 240000, max: 800000 },
      };

      const budgetRange = budgetRanges[values.budget] || {
        min: 40000,
        max: 160000,
      };

      // Prepare data for AI itinerary generation
      const itineraryData = {
        mode: plannerMode,
        userId: localStorage.getItem("voh_user_id") || "voh-traveler",
        destination: values.destination,
        duration,
        startDate: values.startDate,
        endDate: values.endDate,
        budget: {
          min: budgetRange.min,
          max: budgetRange.max,
          currency: "INR",
        },
        travelStyle: values.travelStyle || "mid-range",
        interests: values.interests || [],
        groupSize: parseInt(values.travelers) || 1,
        accommodation: values.accommodationType || "hotel",
        transport: values.transportation
          ? [values.transportation]
          : ["flexible"],
        specialRequests: values.specialRequests || "",
      };

      await generateItinerary.mutateAsync(itineraryData);
    } catch (error) {
      console.error("Error generating itinerary:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!isValid) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSavingDraft(true);
    try {
      // Calculate duration in days
      const duration = (values.startDate && values.endDate && !isNaN(new Date(values.startDate).getTime()) && !isNaN(new Date(values.endDate).getTime()))
        ? Math.max(1, Math.ceil((new Date(values.endDate) - new Date(values.startDate)) / (1000 * 60 * 60 * 24)) + 1)
        : 3;

      // Map budget to numeric range
      const budgetRanges = {
        budget: { min: 8000, max: 80000 },
        "mid-range": { min: 80000, max: 240000 },
        luxury: { min: 240000, max: 800000 },
      };

      const budgetRange = budgetRanges[values.budget] || {
        min: 40000,
        max: 160000,
      };

      // Prepare trip data for saving as draft
      const tripData = {
        title: `Trip to ${values.destination}`,
        destination: {
          city: values.destination.split(",")[0].trim(),
          country:
            values.destination.split(",")[1]?.trim() || values.destination,
        },
        startDate: values.startDate,
        endDate: values.endDate,
        preferences: {
          duration,
          budget: {
            min: budgetRange.min,
            max: budgetRange.max,
            currency: "INR",
          },
          travelStyle: values.travelStyle || "mid-range",
          interests: values.interests || [],
          groupSize: parseInt(values.travelers) || 1,
          accommodation: values.accommodationType || "hotel",
          transport: values.transportation
            ? [values.transportation]
            : ["flexible"],
        },
        notes: values.specialRequests || "",
        status: "draft", // Save as draft status
      };

      // Save trip draft
      const response = await tripAPI.createTrip(tripData);

      if (response.data.success) {
        toast.success(
          "Trip draft saved successfully! You can view it in My Trips."
        );
        // Redirect to trips page after a short delay
        setTimeout(() => {
          navigate("/trips");
        }, 2000);
      }
    } catch (error) {
      console.error("Error saving trip draft:", error);
      toast.error(
        error.response?.data?.message ||
        "Failed to save trip draft. Please try again."
      );
    } finally {
      setIsSavingDraft(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const stepTitles = [
    "Destination & Dates",
    "Travel Preferences",
    "Generate Itinerary",
    "Your Itinerary",
  ];

  return (
    <div className="min-h-screen bg-transparent py-2 md:py-6">
      <div className="max-w-4xl mx-auto px-3 py-2 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 md:mb-6"
        >
          <div className="rounded-xl md:rounded-2xl p-3 md:p-6 mb-4 md:mb-6" style={{background:'linear-gradient(135deg,rgba(255,178,36,0.12),rgba(255,178,36,0.04))',border:'1px solid rgba(255,178,36,0.25)',boxShadow:'0 0 40px rgba(255,178,36,0.1)' }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="flex justify-center mb-2 md:mb-3"
            >
              <div className="p-3 md:p-4 rounded-xl md:rounded-2xl" style={{background:'rgba(255,178,36,0.15)',border:'1px solid rgba(255,178,36,0.3)'}}>
                <FaMagic className="h-6 w-6 md:h-10 md:w-10" style={{color:'#FFB224'}} />
              </div>
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">AI Trip Planner</h1>
            <p className="text-sm md:text-lg" style={{color:'#9CA3AF'}}>
              Let our AI create the perfect itinerary for your next adventure
            </p>
            <div className="mt-2 md:mt-3 flex items-center justify-center gap-2 flex-wrap">
              <div className="inline-flex items-center px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold" style={{background:'rgba(255,178,36,0.12)',border:'1px solid rgba(255,178,36,0.25)',color:'#FFB224'}}>
                <FaRocket className="mr-2" />
                Unlimited AI requests
              </div>
              <button
                type="button"
                onClick={() => setPlannerMode((m) => (m === "research" ? "baseline" : "research"))}
                className="inline-flex items-center px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold cursor-pointer transition-all"
                style={{
                  background: plannerMode === "research" ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.06)",
                  border: plannerMode === "research" ? "1px solid rgba(74,222,128,0.4)" : "1px solid rgba(255,255,255,0.15)",
                  color: plannerMode === "research" ? "#4ADE80" : "#9CA3AF",
                }}
              >
                <span className="mr-1.5">{plannerMode === "research" ? "🔬" : "⚙️"}</span>
                {plannerMode === "research" ? "Research Mode (PTKG Active)" : "Baseline Mode"}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-4 md:mb-6"
        >
          <div className="rounded-xl md:rounded-2xl p-3 md:p-5" style={{background:'linear-gradient(135deg,rgba(255,178,36,0.08),rgba(255,178,36,0.03))',border:'1px solid rgba(255,178,36,0.2)'}}>
            {/* Mobile View: Clean Progress Design */}
            <div className="md:hidden">
              <div className="flex items-end justify-between mb-3">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold" style={{background:'rgba(255,178,36,0.15)',color:'#FFB224'}}>
                      {currentStep}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{color:'#FFB224'}}>
                      Step {currentStep} of 4
                    </span>
                  </div>
                  <h2 className="text-lg font-bold leading-tight" style={{color:'#ffffff'}}>
                    {stepTitles[currentStep - 1]}
                  </h2>
                </div>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentStep / 4) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{background:'linear-gradient(90deg,#FFB224,#ffd24d)'}}
                />
              </div>
            </div>

            {/* Desktop View: Detailed Stepper */}
            <div className="hidden md:block">
              <div className="grid grid-cols-7 items-center gap-0 mb-4">
                {stepTitles.map((title, index) => {
                  const stepNumber = index + 1;
                  const isActive = currentStep === stepNumber;
                  const isCompleted = currentStep > stepNumber;

                  return (
                    <React.Fragment key={stepNumber}>
                      <motion.div
                        className="flex flex-col items-center justify-center px-3 py-3 rounded-2xl transition-all duration-300 text-center col-span-1 min-h-[80px]"
                        style={isActive || isCompleted ? {
                          background:'linear-gradient(135deg,rgba(255,178,36,0.2),rgba(255,178,36,0.08))',
                          border:'1px solid rgba(255,178,36,0.4)',
                          boxShadow:'0 0 20px rgba(255,178,36,0.15)'
                        } : {
                          background:'rgba(255,255,255,0.03)',
                          border:'1px solid rgba(255,255,255,0.08)'
                        }}
                      >
                        <div className="flex items-center justify-center mb-1">
                          {isCompleted ? (
                            <FaCheckCircle className="h-5 w-5" style={{color:'#FFB224'}} />
                          ) : (
                            <span className="text-sm font-bold" style={{color: isActive ? '#FFB224' : '#6B7280'}}>
                              {stepNumber}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold leading-tight" style={{color: isActive || isCompleted ? '#FFB224' : '#6B7280'}}>
                          {title}
                        </span>
                      </motion.div>
                      {index < stepTitles.length - 1 && (
                        <div
                          className="h-1 mx-2 rounded-full transition-all duration-300 col-span-1"
                          style={{background: isCompleted ? 'linear-gradient(90deg,#FFB224,#ffd24d)' : 'rgba(255,255,255,0.08)'}}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold" style={{color:'#ffffff'}}>
                  {stepTitles[currentStep - 1]}
                </h2>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Step Content */}
        {currentStep < 4 && (
          <div className="p-2 md:p-8 rounded-xl md:rounded-2xl" style={{background:'linear-gradient(135deg,rgba(255,178,36,0.08),rgba(255,178,36,0.03))',border:'1px solid rgba(255,178,36,0.2)'}}>
            {/* Step 1: Destination & Dates */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    name="destination"
                    label="Where do you want to go?"
                    placeholder="e.g., Tokyo, Japan"
                    icon={FaMapMarkedAlt}
                    value={values.destination}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.destination}
                    required
                  />

                  <Input
                    name="travelers"
                    type="number"
                    min="1"
                    max="20"
                    label="Number of travelers"
                    icon={FaUsers}
                    value={values.travelers}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.travelers}
                    required
                  />

                  <Input
                    name="startDate"
                    type="date"
                    label="Start date"
                    icon={FaCalendarAlt}
                    value={values.startDate}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.startDate}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />

                  <Input
                    name="endDate"
                    type="date"
                    label="End date"
                    icon={FaCalendarAlt}
                    value={values.endDate}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.endDate}
                    min={values.startDate}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{color:'rgba(255,178,36,0.8)'}}>
                    Budget per person (INR)
                  </label>
                  <select
                    name="budget"
                    value={values.budget}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="w-full px-3 py-2 rounded-lg"
                    style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,178,36,0.2)',color:'#ffffff',outline:'none'}}
                    required
                  >
                    <option value="" className="bg-gray-800">Select your budget</option>
                    <option value="budget" className="bg-gray-800">Under ₹80,000 (Budget)</option>
                    <option value="mid-range" className="bg-gray-800">
                      ₹80,000 - ₹240,000 (Mid-range)
                    </option>
                    <option value="luxury" className="bg-gray-800">₹240,000+ (Luxury)</option>
                  </select>
                  {errors.budget && (
                    <p className="mt-1 text-sm text-red-600">{errors.budget}</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2: Travel Preferences */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4 md:space-y-8"
              >
                {/* Interests */}
                <div>
                  <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-5" style={{color:'#ffffff'}}>
                    What are your interests?
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                    {interestOptions.map((interest) => (
                      <motion.button
                        key={interest.id}
                        type="button"
                        onClick={() => handleInterestChange(interest.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-3 md:p-4 rounded-xl transition-all duration-300 text-center min-h-[44px]"
                        style={values.interests?.includes(interest.id) ? {
                          background:'linear-gradient(135deg,rgba(255,178,36,0.2),rgba(255,178,36,0.08))',
                          border:'1px solid rgba(255,178,36,0.5)',
                          boxShadow:'0 0 16px rgba(255,178,36,0.2)'
                        } : {
                          background:'rgba(255,255,255,0.03)',
                          border:'1px solid rgba(255,255,255,0.1)'
                        }}
                      >
                        <interest.icon
                          className="h-5 w-5 md:h-7 md:w-7 mx-auto mb-1 md:mb-2"
                          style={{color: values.interests?.includes(interest.id) ? '#FFB224' : '#6B7280'}}
                        />
                        <span className="text-[10px] md:text-xs font-semibold" style={{color: values.interests?.includes(interest.id) ? '#FFB224' : '#9CA3AF'}}>
                          {interest.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Travel Style */}
                <div>
                  <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-5" style={{color:'#ffffff'}}>
                    Travel Style
                  </h3>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    {travelStyles.map((style) => (
                      <motion.button
                        key={style.id}
                        type="button"
                        onClick={() =>
                          setValues((prev) => ({
                            ...prev,
                            travelStyle: style.id,
                          }))
                        }
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="p-2 md:p-5 rounded-xl transition-all duration-300 text-left min-h-[44px]"
                        style={values.travelStyle === style.id ? {
                          background:'linear-gradient(135deg,rgba(255,178,36,0.2),rgba(255,178,36,0.08))',
                          border:'1px solid rgba(255,178,36,0.5)',
                          boxShadow:'0 0 16px rgba(255,178,36,0.2)'
                        } : {
                          background:'rgba(255,255,255,0.03)',
                          border:'1px solid rgba(255,255,255,0.1)'
                        }}
                      >
                        <h4 className="font-bold text-base md:text-lg mb-0.5 md:mb-1" style={{color: values.travelStyle === style.id ? '#FFB224' : '#ffffff'}}>
                          {style.label}
                        </h4>
                        <p className="text-xs md:text-sm" style={{color: values.travelStyle === style.id ? 'rgba(255,178,36,0.7)' : '#9CA3AF'}}>
                          {style.description}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Accommodation & Transportation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                     <label className="block text-sm font-medium mb-2" style={{color:'rgba(255,178,36,0.8)'}}>
                      Accommodation Type
                    </label>
                    <select
                      name="accommodationType"
                      value={values.accommodationType}
                      onChange={handleChange}
                      className="w-full px-3 py-3 rounded-lg min-h-[44px]"
                      style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,178,36,0.2)',color:'#ffffff',outline:'none'}}
                    >
                      <option value="" className="bg-gray-800">Any preference</option>
                      {accommodationTypes.map((type) => (
                        <option key={type.id} value={type.id} className="bg-gray-800">
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{color:'rgba(255,178,36,0.8)'}}>
                      Transportation
                    </label>
                    <select
                      name="transportation"
                      value={values.transportation}
                      onChange={handleChange}
                      className="w-full px-3 py-3 rounded-lg min-h-[44px]"
                      style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,178,36,0.2)',color:'#ffffff',outline:'none'}}
                    >
                      <option value="" className="bg-gray-800">Any preference</option>
                      {transportationOptions.map((transport) => (
                        <option key={transport.id} value={transport.id} className="bg-gray-800">
                          {transport.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Special Requests */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color:'rgba(255,178,36,0.8)'}}>
                    Special Requests (Optional)
                  </label>
                  <textarea
                    name="specialRequests"
                    value={values.specialRequests}
                    onChange={handleChange}
                    placeholder="Any special requirements, accessibility needs, or specific preferences..."
                    rows={4}
                    className="w-full px-3 py-3 rounded-lg"
                    style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,178,36,0.2)',color:'#ffffff',outline:'none'}}
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: Generate Itinerary */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center space-y-6 md:space-y-8"
              >
                <div className="p-3 md:p-8 rounded-2xl" style={{background:'rgba(255,178,36,0.05)',border:'1px solid rgba(255,178,36,0.15)'}}>
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{
                      duration: 20,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="inline-block"
                  >
                    <div className="p-3 md:p-5 rounded-2xl" style={{background:'rgba(255,178,36,0.15)',border:'1px solid rgba(255,178,36,0.3)',boxShadow:'0 0 30px rgba(255,178,36,0.2)'}}>
                      <FaRocket className="h-8 w-8 md:h-12 md:w-12" style={{color:'#FFB224'}} />
                    </div>
                  </motion.div>
                  <h3 className="text-lg md:text-2xl font-bold mb-3 md:mb-4" style={{color:'#ffffff'}}>
                    Ready to Create Your Perfect Itinerary?
                  </h3>
                  <p className="text-xs md:text-base max-w-2xl mx-auto mb-4 md:mb-6" style={{color:'#9CA3AF'}}>
                    Our AI will analyze your preferences and create a personalized
                    itinerary with activities, restaurants, and accommodations
                    tailored just for you.
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
                    <div className="text-center">
                      <FaMapMarkedAlt className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1 md:mb-2" style={{color:'#FFB224'}} />
                      <p className="text-xs md:text-sm font-medium" style={{color:'#ffffff'}}>{values.destination}</p>
                    </div>
                    <div className="text-center">
                      <FaCalendarAlt className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1 md:mb-2" style={{color:'#FFB224'}} />
                      <p className="text-xs md:text-sm font-medium" style={{color:'#ffffff'}}>
                        {values.startDate && values.endDate
                          ? `${Math.ceil(
                            (new Date(values.endDate) -
                              new Date(values.startDate)) /
                            (1000 * 60 * 60 * 24)
                          )} days`
                          : "Duration"}
                      </p>
                    </div>
                    <div className="text-center">
                      <FaUsers className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1 md:mb-2" style={{color:'#FFB224'}} />
                      <p className="text-xs md:text-sm font-medium" style={{color:'#ffffff'}}>
                        {values.travelers} travelers
                      </p>
                    </div>
                    <div className="text-center">
                      <FaDollarSign className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1 md:mb-2" style={{color:'#FFB224'}} />
                      <p className="text-xs md:text-sm font-medium capitalize" style={{color:'#ffffff'}}>
                        {values.budget}
                      </p>
                    </div>
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-block w-full md:w-auto"
                  >
                    <Button
                      onClick={handleGenerateItinerary}
                      disabled={isGenerating || !isValid}
                      loading={isGenerating}
                      size="lg"
                      className="w-full md:w-auto font-bold text-base md:text-lg px-4 py-3 md:px-8 md:py-4 rounded-xl transition-all min-h-[56px]"
                      style={{background:'#FFB224',color:'#09090C',boxShadow:'0 0 30px rgba(255,178,36,0.4)'}}
                      icon={isGenerating ? FaSpinner : FaMagic}
                    >
                      {isGenerating
                        ? "AI is crafting..."
                        : "Generate AI Itinerary"}
                    </Button>
                  </motion.div>

                  {isGenerating && (
                    <div className="mt-4 text-center">
                      <div className="flex items-center justify-center space-x-2" style={{color:'#FFB224'}}>
                        <FaSpinner className="animate-spin" />
                        <p className="text-xs md:text-sm">
                          Please wait... AI is analyzing...
                        </p>
                      </div>
                    </div>
                  )}


                </div>
              </motion.div>
            )}


            {/* Navigation Buttons */}
            {currentStep < 4 && (
              <div className="flex justify-between mt-4 md:mt-8 gap-3 md:gap-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1"
                >
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="w-full px-3 md:px-6 py-2.5 md:py-3 rounded-xl font-semibold text-sm md:text-base min-h-[44px] flex items-center justify-center"
                    style={{background:'rgba(255,178,36,0.06)',border:'1px solid rgba(255,178,36,0.25)',color:'#FFB224'}}
                  >
                    <FaArrowLeft className="mr-2 shrink-0" />
                    Previous
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1"
                >
                  <Button
                    onClick={currentStep === 3 ? handleSaveDraft : nextStep}
                    disabled={
                      (currentStep === 1 && !values.destination) ||
                      (currentStep === 3 && (isGenerating || isSavingDraft))
                    }
                    loading={currentStep === 3 && isSavingDraft}
                    className="w-full px-3 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-sm md:text-base min-h-[44px] flex items-center justify-center"
                    style={{background:'#FFB224',color:'#09090C',boxShadow:'0 0 20px rgba(255,178,36,0.35)'}}
                  >
                    <span className="truncate">
                      {currentStep === 3 ? (
                        <>
                          <span className="md:hidden">Save Draft</span>
                          <span className="hidden md:inline">Save as Draft</span>
                        </>
                      ) : (
                        "Next"
                      )}
                    </span>
                    {currentStep === 3 ? (
                      <FaSave className="ml-2 shrink-0" />
                    ) : (
                      <FaArrowRight className="ml-2 shrink-0" />
                    )}
                  </Button>
                </motion.div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Generated Itinerary - Outside Card wrapper */}
        {currentStep === 4 && generatedItinerary && (
          <TripResultCard
            itinerary={generatedItinerary}
            formValues={values}
            onViewDetails={() => setShowDetailView(true)}
          />
        )}
      </div>

      {/* Full Trip Detail Modal */}
      <AnimatePresence>
        {showDetailView && generatedItinerary && (
          <TripDetailView
            itinerary={generatedItinerary}
            formValues={values}
            onClose={() => setShowDetailView(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TripPlanner;
