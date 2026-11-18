import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import VoHLogo from '@/components/VoHLogo';

// Fix for default leaflet markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Color tokens directly matching DashboardPage.tsx
const DARK_THEME = {
  bg:      '#050505',
  surface: '#0A0A0B',
  card:    '#0F0F11',
  border:  'rgba(255, 255, 255, 0.08)',
  amber:   '#B4773B',
  gold:    '#D99C53',
  text:    '#EDEDED',
  muted:   '#8A8A8A',
};

const LIGHT_THEME = {
  bg:      '#FDFBF7',
  surface: '#FFFFFF',
  card:    '#F7F3E9',
  border:  'rgba(180, 130, 80, 0.22)',
  amber:   '#A15B17',
  gold:    '#D97706',
  text:    '#2E251E',
  muted:   '#786A5E',
};

type PropertyType = 'Heritage Homestay' | 'Eco-Camp' | 'Premium Hotel' | 'Airbnb';

interface CategoryTab {
  label: string;
  shortLabel: string;
  type: PropertyType | 'All';
  icon: string;
}

const CATEGORY_TABS: CategoryTab[] = [
  { label: 'All Stays', shortLabel: 'All', type: 'All', icon: '✨' },
  { label: 'Heritage Homestays', shortLabel: 'Homestays', type: 'Heritage Homestay', icon: '🏡' },
  { label: 'Eco-Camps', shortLabel: 'Eco-Camps', type: 'Eco-Camp', icon: '⛺' },
  { label: 'Heritage Hotels', shortLabel: 'Hotels', type: 'Premium Hotel', icon: '🏨' },
  { label: 'Private Villas', shortLabel: 'Villas', type: 'Airbnb', icon: '🏖️' },
];

interface StayReview {
  author: string;
  date: string;
  rating: number;
  comment: string;
}

interface GalleryPhoto {
  url: string;
  title: string;
  category: string;
}

interface CategorizedAmenities {
  category: string;
  items: string[];
}

interface StayProperty {
  id: string;
  name: string;
  type: PropertyType;
  location: string;
  lat: number;
  lng: number;
  price: number;
  rating: number;
  reviews: number;
  amenities: string[];
  image: string;
  gallery: GalleryPhoto[];
  distance: string;
  isEco: boolean;
  tagline: string;
  description: string;
  heritageStory: string;
  host: {
    name: string;
    role: string;
    yearsHosted: number;
    avatar: string;
  };
  amenityCategories: CategorizedAmenities[];
  sustainability: string[];
  houseRules: string[];
  checkIn: string;
  checkOut: string;
  reviewsList: StayReview[];
}

const verifiedProperties: StayProperty[] = [
  {
    id: 'hampi-1',
    name: 'Vijayanagara Heritage Home',
    type: 'Heritage Homestay',
    location: 'Hampi, Karnataka',
    lat: 15.3350,
    lng: 76.4600,
    price: 3200,
    rating: 4.9,
    reviews: 142,
    amenities: ['Free WiFi', 'AC', 'Breakfast Included', 'Heritage Walk Guide', 'Open Courtyard', 'Ayurvedic Bath'],
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=900&auto=format&fit=crop&q=80',
    gallery: [
      { url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=900&auto=format&fit=crop&q=80', title: 'Stone Pillared Central Courtyard', category: 'Courtyard & Architecture' },
      { url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=900&auto=format&fit=crop&q=80', title: 'Royal Heritage Master Bedroom', category: 'Bedroom Suite' },
      { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=900&auto=format&fit=crop&q=80', title: 'Surrounding Hampi Boulders & River View', category: 'Surroundings & Views' },
      { url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=900&auto=format&fit=crop&q=80', title: 'Traditional Stone Ensuite Bathroom', category: 'Bathroom' },
      { url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=900&auto=format&fit=crop&q=80', title: 'Carved Teak Heritage Living Hall', category: 'Living Space' }
    ],
    distance: '0.5 km from Virupaksha Temple',
    isEco: true,
    tagline: 'Living 16th-century stone courtyard architecture with heirloom hospitality.',
    description: 'Constructed using traditional granite pillar masonry, this restored Vijayanagara homestay has been preserved across five generations. Wake up to distant temple bells and authentic regional millet breakfasts served on fresh banana leaves.',
    heritageStory: 'Originally serving as an official scholar residence in the Virupaksha complex during Sri Krishnadevaraya’s reign, the property features hand-carved stone beams, antique rosewood doors, and heirloom brassware passed down since the empire.',
    host: {
      name: 'Anand & Radhika Rao',
      role: 'Heritage Historian & Culinary Preserver',
      yearsHosted: 9,
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80'
    },
    amenityCategories: [
      { category: 'Bedroom & Comfort', items: ['Handcrafted Teak King Bed', 'Climate-Controlled Inverter AC', 'Organic Cotton Linens', 'Heritage Mosquito Canopy'] },
      { category: 'Bathroom & Care', items: ['24/7 Solar Hot Water', 'Ayurvedic Herbal Soaps', 'Fresh Cotton Towels', 'Copper Water Vessels'] },
      { category: 'Dining & Flavors', items: ['Complimentary Traditional Breakfast', 'Pure Filtered Well Drinking Water', 'Authentic Clay-Pot Cooking', 'Afternoon Filter Coffee'] },
      { category: 'Surroundings & Experiences', items: ['Walking Trail directly to Virupaksha', 'Sunrise Rooftop Yoga Mats', 'Certified ASI Guide Tours', 'Bicycle Rentals'] }
    ],
    sustainability: ['100% Solar Hot Water', 'Rainwater Harvesting Basins', 'Zero Single-Use Plastics', 'Farm-to-Table Organic Meals'],
    houseRules: ['Check-in: 1:00 PM | Check-out: 11:00 AM', 'Footwear removed at the threshold', 'Quiet hours after 10:00 PM', 'Vegetarian kitchen premises'],
    checkIn: '1:00 PM',
    checkOut: '11:00 AM',
    reviewsList: [
      { author: 'Meera Deshmukh', date: 'March 2026', rating: 5, comment: 'An unforgettable experience! Anand gave us a private sunset walk behind Virupaksha with historical stories you will not find in guidebooks.' },
      { author: 'Liam Patterson', date: 'February 2026', rating: 5, comment: 'The stone courtyard keeps the rooms naturally cool despite the heat. The traditional breakfast served on banana leaves was exquisite.' }
    ]
  },
  {
    id: 'hampi-2',
    name: 'Boulders Luxury Eco-Camp',
    type: 'Eco-Camp',
    location: 'Hampi, Karnataka',
    lat: 15.3400,
    lng: 76.4550,
    price: 2400,
    rating: 4.7,
    reviews: 98,
    amenities: ['Safari Tents', 'Campfire & Star-Gazing', 'Organic Meals', 'Riverfront', 'Coracle Ferry', 'Pet Friendly'],
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=900&auto=format&fit=crop&q=80',
    gallery: [
      { url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=900&auto=format&fit=crop&q=80', title: 'Luxury Weatherproof Glamping Tent', category: 'Safari Tent Exterior' },
      { url: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=900&auto=format&fit=crop&q=80', title: 'Tent Bedroom with Sunset Deck', category: 'Bedroom Interior' },
      { url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&auto=format&fit=crop&q=80', title: 'Ancient Granite Boulder Surroundings', category: 'Surroundings & Views' },
      { url: 'https://images.unsplash.com/photo-1517824806704-9040b037703b?w=900&auto=format&fit=crop&q=80', title: 'Evening Campfire & Acoustic Sessions', category: 'Campfire Area' },
      { url: 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=900&auto=format&fit=crop&q=80', title: 'Open-Air Riverbank Dining Setup', category: 'Dining Area' }
    ],
    distance: '1.2 km from Vittala Temple',
    isEco: true,
    tagline: 'Off-grid starry nights nestled inside Hampi’s ancient granite boulder landscape.',
    description: 'Immerse yourself directly into Hampi’s geological marvels. Luxury insulated safari tents perched beside natural boulder lookouts offer front-row seats to sunsets over the Tungabhadra river valley.',
    heritageStory: 'The camp sits directly on historic pilgrim trails linking Vijayanagara to the sacred Anjanadri hill, documented in Persian travelogues of Abdur Razzaq from 1443.',
    host: {
      name: 'Vikram Joshi',
      role: 'Geologist & Certified Trek Leader',
      yearsHosted: 6,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
    },
    amenityCategories: [
      { category: 'Camp Comfort', items: ['Plush Queen Mattress', 'Private Viewing Veranda', 'Solar Fans & Lighting', 'Bug-Proof Mesh Windows'] },
      { category: 'Eco Sanitation', items: ['Private Eco-Ensuite Washroom', 'Solar Heated Showers', 'Biodegradable Toiletries'] },
      { category: 'Outdoor Dining', items: ['Campfire BBQ & Local Curries', 'Breakfast with River Panorama', 'Fresh Spring Water Jars'] },
      { category: 'Adventures', items: ['Guided Sunrise Boulder Scramble', 'Night Astronomy Telescope', 'Tungabhadra Coracle Rides'] }
    ],
    sustainability: ['Off-grid Solar Energy', 'Dry Composting Sanitation', 'Native Tree Afforestation', 'Coracle Boat Transport'],
    houseRules: ['Check-in: 2:00 PM | Check-out: 11:00 AM', 'Strictly no loud speakers to protect wildlife', 'Flashlights provided for nighttime paths'],
    checkIn: '2:00 PM',
    checkOut: '11:00 AM',
    reviewsList: [
      { author: 'Rahul & Priya', date: 'January 2026', rating: 5, comment: 'Watching the stars while listening to the river from your tent patio is magical. Vikram’s morning rock scramble was the trip highlight.' }
    ]
  },
  {
    id: 'gokarna-1',
    name: 'Om Beach Heritage Retreat',
    type: 'Premium Hotel',
    location: 'Gokarna, Karnataka',
    lat: 14.5200,
    lng: 74.3180,
    price: 4800,
    rating: 4.9,
    reviews: 230,
    amenities: ['Infinity Pool', 'Ayurvedic Spa', 'Sea View Deck', 'Seafood Bistro', 'Private Beach Access', 'Valet'],
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=900&auto=format&fit=crop&q=80',
    gallery: [
      { url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=900&auto=format&fit=crop&q=80', title: 'Cliffside Infinity Pool over Om Beach', category: 'Pool & Ocean' },
      { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&auto=format&fit=crop&q=80', title: 'Luxury Ocean-Facing Master Suite', category: 'Bedroom Suite' },
      { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&auto=format&fit=crop&q=80', title: 'Panoramic Om Beach Shoreline View', category: 'Surroundings & Views' },
      { url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=900&auto=format&fit=crop&q=80', title: 'Ayurvedic Wellness Spa Pavilion', category: 'Wellness Spa' },
      { url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=900&auto=format&fit=crop&q=80', title: 'Outdoor Sunset Dining Deck', category: 'Dining Area' }
    ],
    distance: 'Direct Om Beach access',
    isEco: false,
    tagline: 'Luxury seaside sanctuary with traditional Konkan architecture and Arabian Sea views.',
    description: 'Perched on the red laterite cliffs of Om Beach, this boutique retreat combines Konkan heritage rooflines with 5-star comfort and authentic coastal wellness treatments.',
    heritageStory: 'Built in harmony with coastal temple sanctuaries, the property features laterite stone blocks carved on-site and antique carved timber doors recovered from heritage Karwar villas.',
    host: {
      name: 'Sunita Shetty',
      role: 'General Manager & Wellness Director',
      yearsHosted: 12,
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80'
    },
    amenityCategories: [
      { category: 'Suite Luxury', items: ['King Coastal Teak Bed', 'Private Ocean Balcony', 'High-Speed Starlink WiFi', 'Smart Climate Control'] },
      { category: 'Wellness & Spa', items: ['Panchakarma Ayurvedic Treatments', 'Herbal Steam Room', 'Yoga Sessions at Dawn'] },
      { category: 'Coastal Dining', items: ['Fresh Catch Seafood Grill', 'Sunset Cocktail Lounge', '24-Hour Room Service'] }
    ],
    sustainability: ['Coastal Eco-Barrier Protection', 'Solar Heated Water Systems', 'Local Fishermen Sourcing'],
    houseRules: ['Check-in: 2:00 PM | Check-out: 12:00 PM', 'Pool hours 7:00 AM – 9:00 PM', 'Spa reservations required 24 hours prior'],
    checkIn: '2:00 PM',
    checkOut: '12:00 PM',
    reviewsList: [
      { author: 'Elena Rostova', date: 'March 2026', rating: 5, comment: 'The Ayurvedic massages with the sound of breaking waves below were pure heaven. Best spot in Gokarna.' }
    ]
  },
  {
    id: 'gokarna-2',
    name: 'Kudle Horizon Eco Sanctuary',
    type: 'Eco-Camp',
    location: 'Gokarna, Karnataka',
    lat: 14.5300,
    lng: 74.3150,
    price: 1600,
    rating: 4.6,
    reviews: 84,
    amenities: ['Yoga Deck', 'Vegan Kitchen', 'Bamboo Cottages', 'Solar Powered', 'Sound Healing', 'Sea Breeze'],
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=900&auto=format&fit=crop&q=80',
    gallery: [
      { url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=900&auto=format&fit=crop&q=80', title: 'Sustainable Handwoven Bamboo Cottage', category: 'Cottage Exterior' },
      { url: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=900&auto=format&fit=crop&q=80', title: 'Cozy Natural Fiber Bedroom', category: 'Bedroom Interior' },
      { url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=900&auto=format&fit=crop&q=80', title: 'Open-Air Wooden Sunrise Yoga Deck', category: 'Yoga Shala' },
      { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&auto=format&fit=crop&q=80', title: 'Coastal Trail Overlooking Kudle Beach', category: 'Surroundings & Views' },
      { url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&auto=format&fit=crop&q=80', title: 'Farm-to-Table Vegan Community Kitchen', category: 'Dining Area' }
    ],
    distance: '8 min walk to Kudle Beach',
    isEco: true,
    tagline: 'Sustainable bamboo wellness stay overlooking the Kudle ocean breeze.',
    description: 'Designed for mindful travelers, Kudle Horizon offers natural bamboo and palm thatch cottages shaded by coconut groves. Features daily sunrise Hatha yoga and vegan community dinners.',
    heritageStory: 'Maintains ancient coastal permaculture techniques practiced by local Halakki Vokkalu tribes, keeping the fragile hillside soil enriched and pesticide-free.',
    host: {
      name: 'Naveen & Maya',
      role: 'Permaculturists & Yoga Instructors',
      yearsHosted: 5,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
    },
    amenityCategories: [
      { category: 'Bamboo Living', items: ['Handwoven Cotton Bedding', 'Natural Sea-Breeze Ventilation', 'Mosquito Netting Canopy'] },
      { category: 'Holistic Wellness', items: ['Daily Sunrise Yoga Classes', 'Tibetan Sound Bowl Meditations', 'Ayurvedic Herbal Teas'] },
      { category: 'Mindful Dining', items: ['100% Plant-Based Kitchen', 'Fresh Cold-Pressed Coconut Water', 'Zero Processed Sugar'] }
    ],
    sustainability: ['100% Bamboo & Thatch Architecture', 'Greywater Banana Circle Irrigation', 'Zero Processed Food Waste'],
    houseRules: ['Check-in: 1:00 PM | Check-out: 10:00 AM', 'Alcohol and smoking free premises', 'Morning silence until 8:00 AM'],
    checkIn: '1:00 PM',
    checkOut: '10:00 AM',
    reviewsList: [
      { author: 'Tanvi Nair', date: 'February 2026', rating: 5, comment: 'Recharged my soul! The sunrise yoga and coconut water fresh from the trees made this an unforgettable stay.' }
    ]
  },
  {
    id: 'mysore-1',
    name: 'Grand Mysore Heritage Suites',
    type: 'Premium Hotel',
    location: 'Mysore, Karnataka',
    lat: 12.3050,
    lng: 76.6550,
    price: 5200,
    rating: 4.8,
    reviews: 310,
    amenities: ['Royal Suite Decor', 'Pillared Courtyard', 'Valet Parking', 'Fine Dining', 'High Tea', 'Heritage Library'],
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&auto=format&fit=crop&q=80',
    gallery: [
      { url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&auto=format&fit=crop&q=80', title: 'Grand Wadiyar Royal Reception Hall', category: 'Palatial Lobby' },
      { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&auto=format&fit=crop&q=80', title: 'Canopy Teakwood Heritage Suite', category: 'Bedroom Suite' },
      { url: 'https://images.unsplash.com/photo-1541971875076-8f970d573be6?w=900&auto=format&fit=crop&q=80', title: 'View of Mysore Palace Heritage Grounds', category: 'Surroundings & Views' },
      { url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=900&auto=format&fit=crop&q=80', title: 'Italian Marble Royal Ensuite Bath', category: 'Bathroom' },
      { url: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=900&auto=format&fit=crop&q=80', title: 'Pillared Courtyard for High Tea', category: 'Courtyard & Dining' }
    ],
    distance: '1.5 km from Mysore Palace',
    isEco: false,
    tagline: 'Experience the regal splendor and teakwood opulence of royal Mysore.',
    description: 'Step into an authentic 1920s royal estate featuring Indo-Saracenic archways, Belgian cut-glass chandeliers, and fragrant jasmine courtyards in the cultural heart of Mysore.',
    heritageStory: 'Originally commissioned by a minister of the Maharaja Krishnaraja Wadiyar IV, this heritage mansion hosted touring artists, musicians, and ambassadors during the historic Dasara festivals.',
    host: {
      name: 'Raghavendra Urs',
      role: 'Heritage Custodian',
      yearsHosted: 15,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80'
    },
    amenityCategories: [
      { category: 'Regal Comfort', items: ['Authentic Four-Poster Rosewood Bed', 'High Ceilings with Belgian Chandeliers', 'Silk Dressing Robes'] },
      { category: 'Royal Services', items: ['Chauffeur Valet & Vintage Car Rides', 'Personal Butler Service', 'Curated Mysore Silk Shopping Tour'] },
      { category: 'Dining & Heritage', items: ['Royal Silver-Plated Dining Service', 'Authentic Mysore Pak High Tea', 'Carnatic Classical Music Evenings'] }
    ],
    sustainability: ['Heritage Restoration Preservation', 'Organic Mysore Silk Linens', 'Heritage Crafts Patronage'],
    houseRules: ['Check-in: 2:00 PM | Check-out: 12:00 PM', 'Formal attire in the Royal Dining Hall', 'No flash photography in heritage library'],
    checkIn: '2:00 PM',
    checkOut: '12:00 PM',
    reviewsList: [
      { author: 'Sanjay Banerji', date: 'March 2026', rating: 5, comment: 'Felt like stepping into a living museum! The high tea with fresh Mysore Pak and the evening violin concert were majestic.' }
    ]
  },
  {
    id: 'gokarna-airbnb',
    name: 'Cliffside Coastal Villa (Airbnb)',
    type: 'Airbnb',
    location: 'Gokarna, Karnataka',
    lat: 14.5350,
    lng: 74.3200,
    price: 3600,
    rating: 4.9,
    reviews: 175,
    amenities: ['Private Pool', 'Full Kitchen', 'Sunset Terrace', 'Self Check-in', 'Starlink WiFi', 'Pet Friendly'],
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&auto=format&fit=crop&q=80',
    gallery: [
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&auto=format&fit=crop&q=80', title: 'Private Clifftop Villa & Infinity Plunge Pool', category: 'Pool & Villa' },
      { url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=900&auto=format&fit=crop&q=80', title: 'Master Bedroom with Floor-to-Ceiling Sea Glass', category: 'Bedroom Suite' },
      { url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=900&auto=format&fit=crop&q=80', title: 'Panoramic Ocean Sunset Viewing Terrace', category: 'Surroundings & Views' },
      { url: 'https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=900&auto=format&fit=crop&q=80', title: 'Gourmet Chef Kitchen & Open Dining Area', category: 'Kitchen & Dining' },
      { url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=900&auto=format&fit=crop&q=80', title: 'Sunlit Natural Stone Bathroom with Rain Shower', category: 'Bathroom' }
    ],
    distance: 'Hilltop panoramic sea view',
    isEco: true,
    tagline: 'Private architectural modern villa with infinity plunge pool over the sea.',
    description: 'Enjoy total seclusion high above the coastline. Floor-to-ceiling glass doors open onto a wooden deck with an infinity plunge pool framing daily golden hour Arabian Sea sunsets.',
    heritageStory: 'Designed by renowned sustainable architects to minimize ground disruption, blending sleek minimalist concrete with locally sourced Gokarna laterite blocks.',
    host: {
      name: 'Kavita Chawla',
      role: 'Airbnb Superhost',
      yearsHosted: 4,
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80'
    },
    amenityCategories: [
      { category: 'Villa Living', items: ['Plunge Pool Overlooking Coast', 'King Plush Bedding with Sea View', 'High-Speed Starlink WiFi', 'Smart 4K Entertainment'] },
      { category: 'Full Kitchen', items: ['Nespresso Espresso Bar', 'Induction Stovetop & Oven', 'Full Cookware & Tableware', 'Wine Refrigerator'] },
      { category: 'Privacy & Security', items: ['Smart Lock Keyless Check-in', 'Private Hilltop Driveway', 'Outdoor Hot Shower'] }
    ],
    sustainability: ['Rooftop Solar Array', 'Eco Thermal Insulation Glass', 'Electric Vehicle Charger'],
    houseRules: ['Check-in: 3:00 PM | Check-out: 11:00 AM', 'Self check-in with keypad code', 'No parties or unregistered guests'],
    checkIn: '3:00 PM',
    checkOut: '11:00 AM',
    reviewsList: [
      { author: 'Arjun Verma', date: 'February 2026', rating: 5, comment: 'The best Airbnb experience we have ever had in India. The sunset from the pool with Starlink wifi made it the dream workation.' }
    ]
  }
];

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&auto=format&fit=crop&q=80';

// Map pan controller
function MapFlyTo({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    try {
      map.invalidateSize();
      if (center && typeof center[0] === 'number' && typeof center[1] === 'number') {
        map.flyTo(center, 12, { duration: 1.2 });
      }
    } catch (e) {
      console.warn('Leaflet flyTo warning:', e);
    }
  }, [map, center[0], center[1]]);
  return null;
}

export default function SmartStayPage() {
  const { theme } = useTheme();
  const C = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

  const [filterType, setFilterType] = useState<PropertyType | 'All'>('All');
  const [ecoFriendlyOnly, setEcoFriendlyOnly] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<string>('All');
  const [activeProperty, setActiveProperty] = useState<StayProperty | null>(null);
  const [detailModal, setDetailModal] = useState<StayProperty | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [bookingModal, setBookingModal] = useState<StayProperty | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [mainTab, setMainTab] = useState<'stays' | 'mybookings'>('stays');

  // Booking form state
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [roomType, setRoomType] = useState('Standard');
  const [numRooms, setNumRooms] = useState(1);
  const [numGuests, setNumGuests] = useState(2);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pay at Hotel');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingConfirmed, setBookingConfirmed] = useState<any>(null);

  // My Bookings state
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [myBookingsLoading, setMyBookingsLoading] = useState(false);
  const [myBookingsError, setMyBookingsError] = useState('');

  // Filter only items that have valid pictures
  const filtered = verifiedProperties.filter(p => {
    if (!p.image) return false;
    if (ecoFriendlyOnly && !p.isEco) return false;
    if (filterType !== 'All' && p.type !== filterType) return false;
    if (selectedDestination !== 'All' && !p.location.toLowerCase().includes(selectedDestination.toLowerCase())) return false;
    return true;
  });

  const mapCenterLat = activeProperty ? activeProperty.lat : (filtered.length > 0 ? filtered[0].lat : 15.3350);
  const mapCenterLng = activeProperty ? activeProperty.lng : (filtered.length > 0 ? filtered[0].lng : 76.4600);

  const handleOpenDetails = (p: StayProperty) => {
    setSelectedPhotoIndex(0);
    setDetailModal(p);
    setActiveProperty(p);
  };

  const handleBook = (p: StayProperty) => {
    setBookingModal(p);
    setBookingConfirmed(null);
    setBookingError('');
    setCheckIn('');
    setCheckOut('');
    setRoomType('Standard');
    setNumRooms(1);
    setNumGuests(2);
    setGuestName('');
    setGuestEmail('');
    setGuestPhone('');
    setSpecialRequests('');
    setPaymentMethod('Pay at Hotel');
  };

  const getNights = () => {
    if (!checkIn || !checkOut) return 0;
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  const handleConfirmReservation = async () => {
    if (!bookingModal) return;
    if (!checkIn || !checkOut) { setBookingError('Please select check-in and check-out dates.'); return; }
    if (!guestName.trim()) { setBookingError('Please enter guest name.'); return; }
    if (!guestEmail.trim()) { setBookingError('Please enter guest email.'); return; }
    const nights = getNights();
    if (nights <= 0) { setBookingError('Check-out must be after check-in.'); return; }
    const totalAmount = bookingModal.price * numRooms * nights;
    setBookingLoading(true);
    setBookingError('');
    try {
      const response = await axios.post('/api/stays/book', {
        userId: localStorage.getItem('voh_user_id') || 'guest',
        hotelId: bookingModal.id,
        hotelName: bookingModal.name,
        hotelCity: bookingModal.location,
        checkIn, checkOut, roomType, numRooms, numGuests,
        totalAmount,
        guestName, guestEmail, guestPhone,
        specialRequests,
        paymentMethod,
      });
      setBookingConfirmed(response.data.booking || response.data);
    } catch (err: any) {
      setBookingError(err?.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const fetchMyBookings = async () => {
    setMyBookingsLoading(true);
    setMyBookingsError('');
    try {
      const userId = localStorage.getItem('voh_user_id') || 'guest';
      const res = await axios.get(`/api/stays/user/${userId}`);
      setMyBookings(res.data.bookings || res.data || []);
    } catch (err: any) {
      setMyBookingsError('Could not fetch bookings. Please try again.');
    } finally {
      setMyBookingsLoading(false);
    }
  };

  useEffect(() => {
    if (mainTab === 'mybookings') {
      fetchMyBookings();
    }
  }, [mainTab]);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    .stay-wrapper {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: ${theme === 'dark' ? 'radial-gradient(circle at 50% -20%, #151515, #050505)' : 'radial-gradient(circle at 80% 20%, rgba(247,243,233,0.4) 0%, rgba(253,251,247,0.8) 100%), ' + C.bg};
      color: ${C.text};
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    }

    /* Top Navbar - Clean Brand & Theme Toggle Only */
    .stay-navbar {
      height: 64px;
      padding: 0 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: ${C.surface};
      border-bottom: 1px solid ${C.border};
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, ${theme === 'dark' ? '0.35' : '0.04'});
    }

    .stay-brand-group {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      text-decoration: none;
    }

    .stay-brand-title {
      font-family: 'Cinzel', serif;
      font-size: 1.2rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: ${C.text};
      text-transform: uppercase;
      line-height: 1.1;
    }
    .stay-brand-tag {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${C.gold};
      margin-top: 2px;
    }

    .stay-nav-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    /* Sub-header Controls Bar */
    .stay-controls-bar {
      padding: 0.65rem 2rem;
      background: ${C.surface};
      border-bottom: 1px solid ${C.border};
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      position: sticky;
      top: 64px;
      z-index: 90;
      backdrop-filter: blur(12px);
    }

    .stay-controls-left {
      display: flex;
      align-items: center;
      min-width: 0;
      flex: 1;
    }

    .stay-category-scroll {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
      padding: 2px 0;
    }
    .stay-category-scroll::-webkit-scrollbar {
      display: none;
    }

    .category-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 6px 14px;
      border-radius: 9999px;
      border: 1px solid ${C.border};
      background: ${C.card};
      color: ${C.text};
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }
    .category-pill:hover {
      border-color: ${C.gold};
      color: ${C.gold};
    }
    .category-pill.active {
      background: linear-gradient(135deg, ${C.amber}, ${C.gold});
      color: #FFFFFF;
      border-color: ${C.gold};
      font-weight: 700;
      box-shadow: 0 4px 14px rgba(217, 156, 83, 0.35);
    }

    .pill-icon {
      font-size: 0.95rem;
    }
    .pill-text-mobile {
      display: none;
    }

    .stay-controls-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .eco-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid ${ecoFriendlyOnly ? '#22c55e' : C.border};
      background: ${ecoFriendlyOnly ? 'rgba(34, 197, 94, 0.15)' : C.card};
      color: ${ecoFriendlyOnly ? '#22c55e' : C.muted};
      white-space: nowrap;
      transition: all 0.2s ease;
    }
    .eco-toggle-btn:hover {
      border-color: #22c55e;
      color: #22c55e;
    }
    .eco-label-mobile {
      display: none;
    }

    .dest-select-wrapper {
      position: relative;
      display: inline-flex;
      align-items: center;
    }
    .dest-icon {
      position: absolute;
      left: 10px;
      font-size: 0.8rem;
      pointer-events: none;
      z-index: 1;
    }
    .dest-select {
      padding: 6px 14px 6px 28px;
      border-radius: 9999px;
      border: 1px solid ${C.border};
      background: ${C.card};
      color: ${C.text};
      font-size: 0.82rem;
      font-weight: 600;
      outline: none;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .dest-select:hover {
      border-color: ${C.gold};
    }
    .dest-select option {
      background: ${C.surface};
      color: ${C.text};
    }

    /* Main Container (Split Desktop) */
    .stay-main-container {
      display: flex;
      flex: 1;
      height: calc(100vh - 134px);
      position: relative;
      overflow: hidden;
    }

    /* Left Side: Stays List */
    .stay-list-section {
      width: 55%;
      padding: 1.5rem 2rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      border-right: 1px solid ${C.border};
    }

    .stay-header-meta {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding-bottom: 0.25rem;
    }
    .stay-count-heading {
      font-family: 'Cinzel', serif;
      font-size: 1.35rem;
      font-weight: 700;
      color: ${C.text};
      margin: 0;
    }
    .stay-count-sub {
      font-size: 0.85rem;
      color: ${C.muted};
      margin: 2px 0 0;
    }

    /* Premium Property Card - Clickable to Open Full Details Modal */
    .stay-card-item {
      display: flex;
      background: ${C.card};
      border: 1px solid ${C.border};
      border-radius: 16px;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      position: relative;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,${theme === 'dark' ? '0.3' : '0.04'});
    }
    .stay-card-item:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 36px rgba(0,0,0,${theme === 'dark' ? '0.5' : '0.1'});
      border-color: ${C.gold};
    }
    .stay-card-item.is-active {
      border-color: ${C.gold};
      box-shadow: 0 0 0 2px rgba(217, 156, 83, 0.35);
    }

    .stay-img-container {
      width: 260px;
      min-height: 220px;
      position: relative;
      flex-shrink: 0;
      overflow: hidden;
    }
    .stay-img-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }
    .stay-card-item:hover .stay-img-container img {
      transform: scale(1.05);
    }

    .stay-chip-type {
      position: absolute;
      top: 12px;
      left: 12px;
      padding: 4px 10px;
      border-radius: 6px;
      background: rgba(5, 5, 5, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(8px);
      color: #fff;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.03em;
    }

    .stay-chip-eco {
      position: absolute;
      top: 12px;
      right: 12px;
      padding: 4px 8px;
      border-radius: 6px;
      background: rgba(34, 197, 94, 0.9);
      color: #050505;
      font-size: 0.7rem;
      font-weight: 800;
      backdrop-filter: blur(4px);
    }

    .stay-info-container {
      padding: 1.25rem 1.5rem;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .stay-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .stay-prop-title {
      font-family: 'Cinzel', serif;
      font-size: 1.15rem;
      font-weight: 700;
      color: ${C.text};
      line-height: 1.25;
      margin: 0 0 4px;
    }
    .stay-prop-loc {
      font-size: 0.82rem;
      color: ${C.muted};
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .stay-rating-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(217, 156, 83, 0.12);
      border: 1px solid rgba(217, 156, 83, 0.3);
      padding: 4px 8px;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 700;
      color: ${C.gold};
      flex-shrink: 0;
    }

    .stay-amenities-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 0.75rem 0;
    }
    .stay-amenity-tag {
      font-size: 0.72rem;
      font-weight: 500;
      background: ${C.surface};
      border: 1px solid ${C.border};
      color: ${C.text};
      padding: 3px 8px;
      border-radius: 6px;
    }

    .stay-bottom-row {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-top: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px dashed ${C.border};
    }
    .stay-price-val {
      font-family: 'Cinzel', serif;
      font-size: 1.45rem;
      font-weight: 800;
      color: ${C.gold};
      line-height: 1;
    }
    .stay-price-note {
      font-size: 0.7rem;
      color: ${C.muted};
      margin-top: 2px;
    }

    .stay-actions-group {
      display: flex;
      gap: 8px;
    }

    .stay-details-btn {
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid ${C.border};
      background: ${C.surface};
      color: ${C.text};
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .stay-details-btn:hover {
      border-color: ${C.gold};
      color: ${C.gold};
      background: rgba(217, 156, 83, 0.08);
    }

    .stay-primary-book-btn {
      padding: 8px 20px;
      border-radius: 8px;
      border: none;
      background: linear-gradient(135deg, ${C.amber}, ${C.gold});
      color: #FFFFFF;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 14px rgba(217, 156, 83, 0.25);
    }
    .stay-primary-book-btn:hover {
      transform: scale(1.02);
      box-shadow: 0 6px 20px rgba(217, 156, 83, 0.4);
    }

    /* Right Side: Interactive Map */
    .stay-map-section {
      width: 45%;
      position: relative;
      background: ${C.card};
      height: 100%;
    }

    /* Seamless Leaflet Map Dark / Light Mode Adaptation */
    html:not(.light-theme) .stay-map-section .leaflet-tile-pane {
      filter: brightness(0.65) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
    }
    html.light-theme .stay-map-section .leaflet-tile-pane {
      filter: none;
    }

    /* Leaflet Popup Theme Consistency */
    html:not(.light-theme) .leaflet-popup-content-wrapper,
    html:not(.light-theme) .leaflet-popup-tip {
      background: #0F0F11 !important;
      color: #EDEDED !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      box-shadow: 0 12px 32px rgba(0,0,0,0.8) !important;
    }
    html.light-theme .leaflet-popup-content-wrapper,
    html.light-theme .leaflet-popup-tip {
      background: #FFFFFF !important;
      color: #2E251E !important;
      border: 1px solid rgba(180, 130, 80, 0.25) !important;
      box-shadow: 0 12px 32px rgba(180, 130, 80, 0.15) !important;
    }

    /* Mobile Segment Switcher */
    .mobile-view-tabs {
      display: none;
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999;
      background: ${theme === 'dark' ? 'rgba(10, 10, 11, 0.92)' : 'rgba(255, 255, 255, 0.95)'};
      border: 1px solid ${C.border};
      border-radius: 9999px;
      padding: 4px;
      box-shadow: 0 10px 30px rgba(0,0,0,${theme === 'dark' ? '0.6' : '0.15'});
      backdrop-filter: blur(16px);
    }
    .mobile-tab-btn {
      padding: 8px 20px;
      border-radius: 9999px;
      border: none;
      background: transparent;
      color: ${C.muted};
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .mobile-tab-btn.active {
      background: linear-gradient(135deg, ${C.amber}, ${C.gold});
      color: #FFFFFF;
    }

    /* Comprehensive Full Details Modal */
    .stay-details-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.82);
      backdrop-filter: blur(10px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .stay-details-card {
      background: ${C.surface};
      border: 1px solid ${C.border};
      border-radius: 20px;
      width: 100%;
      max-width: 860px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 30px 80px rgba(0,0,0,0.7);
      position: relative;
      animation: modalFadeIn 0.25s ease-out;
    }

    .gallery-thumb-btn {
      height: 70px;
      flex: 1;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid transparent;
      cursor: pointer;
      padding: 0;
      background: #000;
      transition: all 0.2s;
      position: relative;
    }
    .gallery-thumb-btn.is-active {
      border-color: ${C.gold};
      transform: scale(1.03);
      box-shadow: 0 4px 12px rgba(217, 156, 83, 0.4);
    }
    .gallery-thumb-btn img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Booking Modal */
    .booking-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .booking-modal-card {
      background: ${C.surface};
      border: 1px solid ${C.border};
      border-radius: 20px;
      width: 100%;
      max-width: 520px;
      padding: 1.75rem;
      box-shadow: 0 25px 60px rgba(0,0,0,0.5);
      position: relative;
      animation: modalFadeIn 0.25s ease-out;
    }
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    /* Mobile Responsive Breakpoints */
    @media (max-width: 960px) {
      .stay-navbar {
        padding: 0 1rem;
        height: 58px;
      }
      .stay-brand-title {
        font-size: 1.05rem !important;
      }
      .stay-brand-tag {
        font-size: 0.6rem !important;
      }

      /* Streamlined Mobile Controls Bar (2 Clean Compact Tiers) */
      .stay-controls-bar {
        padding: 0.5rem 0.85rem;
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
        top: 58px;
      }
      .stay-controls-left {
        width: 100%;
      }
      .stay-category-scroll {
        width: 100%;
        padding-bottom: 2px;
      }
      .category-pill {
        padding: 6px 12px;
        font-size: 0.78rem;
      }
      .pill-text-desktop {
        display: none;
      }
      .pill-text-mobile {
        display: inline;
      }

      .stay-controls-right {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
      }
      .eco-toggle-btn {
        padding: 5px 12px;
        font-size: 0.76rem;
      }
      .eco-label-desktop {
        display: none;
      }
      .eco-label-mobile {
        display: inline;
      }
      .dest-select-wrapper {
        flex: 1;
        display: flex;
        justify-content: flex-end;
      }
      .dest-select {
        width: 100%;
        max-width: 160px;
        padding: 5px 10px 5px 26px;
        font-size: 0.78rem;
      }

      /* Compact mobile header */
      .stay-header-meta {
        padding-bottom: 0.2rem;
      }
      .stay-count-heading {
        font-size: 1.15rem !important;
      }
      .stay-count-sub {
        font-size: 0.75rem !important;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Stays list */
      .stay-main-container {
        flex-direction: column;
        height: auto;
        min-height: calc(100vh - 120px);
        overflow: visible;
      }
      .stay-list-section {
        width: 100%;
        padding: 0.85rem 0.85rem 5.5rem !important;
        border-right: none;
        display: ${mobileView === 'list' ? 'flex' : 'none'};
        gap: 1rem;
      }
      .stay-map-section {
        width: 100%;
        height: calc(100vh - 160px);
        display: ${mobileView === 'map' ? 'block' : 'none'};
      }

      /* Card styling on mobile */
      .stay-card-item {
        flex-direction: column;
        border-radius: 14px;
      }
      .stay-img-container {
        width: 100%;
        height: 185px;
      }
      .stay-info-container {
        padding: 1rem;
      }
      .stay-prop-title {
        font-size: 1.05rem;
      }
      .stay-prop-loc {
        font-size: 0.78rem;
      }

      .stay-bottom-row {
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
        margin-top: 0.65rem;
        padding-top: 0.65rem;
      }
      .stay-actions-group {
        width: 100%;
        display: flex;
        gap: 8px;
      }
      .stay-details-btn {
        flex: 1;
        padding: 9px 10px;
        font-size: 0.8rem;
        text-align: center;
        justify-content: center;
        white-space: nowrap;
      }
      .stay-primary-book-btn {
        flex: 1;
        padding: 9px 10px;
        font-size: 0.8rem;
        text-align: center;
        justify-content: center;
        white-space: nowrap;
      }

      .mobile-view-tabs {
        display: flex;
        gap: 4px;
        bottom: 20px;
      }
    }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="stay-wrapper">
        
        {/* Top Navbar - Clean Brand Header */}
        <header className="stay-navbar">
          <Link to="/dashboard" className="stay-brand-group">
            <VoHLogo size={36} />
            <div>
              <div className="stay-brand-title">Smart Stay</div>
              <div className="stay-brand-tag">Phase 9 • Cultural Lodgings & Eco-Camps</div>
            </div>
          </Link>

          <div className="stay-nav-right">
            <ThemeToggle />
          </div>
        </header>

        {/* Streamlined, Non-Clumsy Control Bar */}
        <div className="stay-controls-bar">
          <div className="stay-controls-left">
            <div className="stay-category-scroll">
              {/* Main page tabs */}
              <button
                type="button"
                className={`category-pill ${mainTab === 'stays' ? 'active' : ''}`}
                onClick={() => setMainTab('stays')}
              >
                <span className="pill-icon">🏨</span>
                <span className="pill-text-desktop">Browse Stays</span>
                <span className="pill-text-mobile">Stays</span>
              </button>
              <button
                type="button"
                className={`category-pill ${mainTab === 'mybookings' ? 'active' : ''}`}
                onClick={() => setMainTab('mybookings')}
              >
                <span className="pill-icon">📋</span>
                <span className="pill-text-desktop">My Bookings</span>
                <span className="pill-text-mobile">My Bookings</span>
              </button>
              {mainTab === 'stays' && (<>
              {CATEGORY_TABS.map(tab => (
                <button
                  key={tab.type}
                  type="button"
                  className={`category-pill ${filterType === tab.type ? 'active' : ''}`}
                  onClick={() => setFilterType(tab.type)}
                >
                  <span className="pill-icon">{tab.icon}</span>
                  <span className="pill-text-desktop">{tab.label}</span>
                  <span className="pill-text-mobile">{tab.shortLabel}</span>
                </button>
              ))}
              </>)}
            </div>
          </div>

          <div className="stay-controls-right">
            <button 
              type="button"
              className="eco-toggle-btn"
              onClick={() => setEcoFriendlyOnly(!ecoFriendlyOnly)}
              title="Show only eco-certified stays"
            >
              <span>{ecoFriendlyOnly ? '🌱' : '🍃'}</span>
              <span className="eco-label-desktop">Smart / Eco Only</span>
              <span className="eco-label-mobile">Eco Only</span>
            </button>

            <div className="dest-select-wrapper">
              <span className="dest-icon">📍</span>
              <select 
                className="dest-select"
                value={selectedDestination}
                onChange={e => setSelectedDestination(e.target.value)}
              >
                <option value="All">All Regions</option>
                <option value="Hampi">Hampi</option>
                <option value="Gokarna">Gokarna</option>
                <option value="Mysore">Mysore</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="stay-main-container">

          {/* Left Panel: Verified Stays List */}
          <div className="stay-list-section">
            <div className="stay-header-meta">
              <div>
                <h1 className="stay-count-heading">{filtered.length} Stays Available</h1>
                <p className="stay-count-sub">Curated verified heritage homestays, eco-camps & villas with real photos.</p>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: C.muted }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏡</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: C.text }}>No stays match your filters</div>
                <p style={{ fontSize: '0.85rem' }}>Try resetting the eco-stay filter or selecting "All Regions".</p>
                <button 
                  onClick={() => { setFilterType('All'); setEcoFriendlyOnly(false); setSelectedDestination('All'); }}
                  className="stay-primary-book-btn"
                  style={{ marginTop: '1rem' }}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filtered.map(prop => {
                const isSelected = activeProperty?.id === prop.id;
                return (
                  <div 
                    key={prop.id} 
                    className={`stay-card-item ${isSelected ? 'is-active' : ''}`}
                    onClick={() => handleOpenDetails(prop)}
                  >
                    <div className="stay-img-container">
                      <img 
                        src={prop.image} 
                        alt={prop.name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
                        }}
                      />
                      <div className="stay-chip-type">{prop.type}</div>
                      {prop.isEco && <div className="stay-chip-eco">🌱 Eco Certified</div>}
                    </div>

                    <div className="stay-info-container">
                      <div>
                        <div className="stay-title-row">
                          <div>
                            <h3 className="stay-prop-title">{prop.name}</h3>
                            <div className="stay-prop-loc">
                              <span>📍</span>
                              <span>{prop.location} • {prop.distance}</span>
                            </div>
                          </div>

                          <div className="stay-rating-pill">
                            <span>⭐</span>
                            <span>{prop.rating}</span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>({prop.reviews})</span>
                          </div>
                        </div>

                        <p style={{ fontSize: '0.82rem', color: C.muted, margin: '6px 0 8px', lineHeight: 1.4 }}>
                          {prop.tagline}
                        </p>

                        <div className="stay-amenities-row">
                          {prop.amenities.slice(0, 4).map(a => (
                            <span key={a} className="stay-amenity-tag">{a}</span>
                          ))}
                          {prop.amenities.length > 4 && (
                            <span className="stay-amenity-tag" style={{ color: C.gold, fontWeight: 700 }}>
                              +{prop.amenities.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="stay-bottom-row">
                        <div>
                          <div className="stay-price-val">₹{prop.price.toLocaleString()}</div>
                          <div className="stay-price-note">per night • taxes & eco-fee incl.</div>
                        </div>

                        <div className="stay-actions-group">
                          <button 
                            type="button" 
                            className="stay-details-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetails(prop);
                            }}
                          >
                            <span>🔍</span> Photos & Info
                          </button>
                          <button 
                            type="button" 
                            className="stay-primary-book-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBook(prop);
                            }}
                          >
                            Book Stay →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Panel: OpenStreetMap View */}
          <div className="stay-map-section">
            <MapContainer 
              center={[mapCenterLat, mapCenterLng]} 
              zoom={8} 
              style={{ width: '100%', height: '100%', minHeight: '400px' }}
              zoomControl={true}
            >
              <MapFlyTo center={[mapCenterLat, mapCenterLng]} />
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              {filtered.map(prop => (
                <Marker 
                  key={prop.id} 
                  position={[prop.lat, prop.lng]}
                  eventHandlers={{
                    click: () => {
                      setActiveProperty(prop);
                    }
                  }}
                >
                  <Popup>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', width: '220px', padding: '4px' }}>
                      <img 
                        src={prop.image} 
                        alt={prop.name} 
                        style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '10px', marginBottom: '8px' }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }}
                      />
                      <strong style={{ fontSize: '0.95rem', display: 'block', color: C.text }}>{prop.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: C.muted, margin: '3px 0' }}>📍 {prop.location}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                        <span style={{ color: C.gold, fontWeight: 800, fontSize: '1rem' }}>₹{prop.price.toLocaleString()}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button 
                            onClick={() => handleOpenDetails(prop)}
                            style={{
                              background: C.surface,
                              border: `1px solid ${C.border}`,
                              color: C.text,
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Details
                          </button>
                          <button 
                            onClick={() => handleBook(prop)}
                            className="stay-primary-book-btn"
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                            }}
                          >
                            Book
                          </button>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Mobile View Floating Switcher */}
        <div className="mobile-view-tabs">
          <button 
            className={`mobile-tab-btn ${mobileView === 'list' ? 'active' : ''}`}
            onClick={() => setMobileView('list')}
          >
            📋 Stays List ({filtered.length})
          </button>
          <button 
            className={`mobile-tab-btn ${mobileView === 'map' ? 'active' : ''}`}
            onClick={() => setMobileView('map')}
          >
            🗺️ Map View
          </button>
        </div>

        {/* Comprehensive Full Details Modal with Multi-Photo Gallery */}
        {detailModal && (
          <div className="stay-details-modal-overlay" onClick={() => setDetailModal(null)}>
            <div className="stay-details-card" onClick={e => e.stopPropagation()}>
              
              {/* Photo Gallery: Main Featured View */}
              <div style={{ position: 'relative', height: '320px', width: '100%', overflow: 'hidden', background: '#000' }}>
                <img 
                  src={detailModal.gallery[selectedPhotoIndex]?.url || detailModal.image} 
                  alt={detailModal.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }}
                />
                <button 
                  onClick={() => setDetailModal(null)}
                  style={{ position: 'absolute', top: 16, right: 16, width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: '1.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
                  aria-label="Close"
                >
                  ×
                </button>
                
                {/* Photo Category Tag Overlay */}
                <div style={{ position: 'absolute', bottom: 16, left: 20, display: 'flex', gap: '8px', zIndex: 10 }}>
                  <span style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(5,5,5,0.85)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: '0.8rem', fontWeight: 700 }}>
                    📷 {detailModal.gallery[selectedPhotoIndex]?.category || detailModal.type}
                  </span>
                  {detailModal.isEco && (
                    <span style={{ padding: '6px 12px', borderRadius: '8px', background: '#22c55e', color: '#050505', fontSize: '0.8rem', fontWeight: 800 }}>
                      🌱 Eco Certified
                    </span>
                  )}
                </div>

                <div style={{ position: 'absolute', bottom: 16, right: 20, padding: '4px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.75rem', fontWeight: 700, zIndex: 10 }}>
                  {selectedPhotoIndex + 1} / {detailModal.gallery.length} Photos
                </div>
              </div>

              {/* Photo Gallery Thumbnails Selector */}
              <div style={{ padding: '0.75rem 1.5rem', background: C.card, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: '10px', overflowX: 'auto' }}>
                {detailModal.gallery.map((photo, pIdx) => (
                  <button
                    key={pIdx}
                    className={`gallery-thumb-btn ${selectedPhotoIndex === pIdx ? 'is-active' : ''}`}
                    onClick={() => setSelectedPhotoIndex(pIdx)}
                    title={photo.title}
                  >
                    <img src={photo.url} alt={photo.title} onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }} />
                  </button>
                ))}
              </div>

              {/* Main Detailed Content Body */}
              <div style={{ padding: '2rem' }}>
                
                {/* Title and Rating Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', paddingBottom: '1.25rem', borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.6rem', color: C.text, margin: '0 0 4px' }}>
                      {detailModal.name}
                    </h2>
                    <div style={{ fontSize: '0.9rem', color: C.muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📍</span>
                      <span>{detailModal.location} • {detailModal.distance}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(217, 156, 83, 0.15)', padding: '6px 12px', borderRadius: '10px', color: C.gold, fontWeight: 800 }}>
                      <span>⭐</span>
                      <span>{detailModal.rating}</span>
                      <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>({detailModal.reviews} verified reviews)</span>
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '0.78rem', color: C.muted }}>Superhost Hospitality</div>
                  </div>
                </div>

                {/* Heritage Story & Cultural Significance */}
                <div style={{ margin: '1.5rem 0', padding: '1.25rem', background: C.card, borderRadius: '14px', border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🏛️</span>
                    <h3 style={{ margin: 0, fontFamily: 'Cinzel, serif', fontSize: '1.1rem', color: C.gold }}>
                      Heritage Story & Architecture
                    </h3>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, color: C.text }}>
                    {detailModal.heritageStory}
                  </p>
                </div>

                {/* About the Stay */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', color: C.text, marginBottom: '8px' }}>
                    About This Stay
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, color: C.muted }}>
                    {detailModal.description}
                  </p>
                </div>

                {/* Host Profile */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: C.card, padding: '1rem', borderRadius: '14px', border: `1px solid ${C.border}`, marginBottom: '1.5rem' }}>
                  <img 
                    src={detailModal.host.avatar} 
                    alt={detailModal.host.name} 
                    style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${C.gold}` }}
                  />
                  <div>
                    <div style={{ fontSize: '0.8rem', color: C.gold, fontWeight: 700, textTransform: 'uppercase' }}>Hosted by</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: C.text }}>{detailModal.host.name}</div>
                    <div style={{ fontSize: '0.8rem', color: C.muted }}>{detailModal.host.role} • {detailModal.host.yearsHosted} years welcoming heritage travelers</div>
                  </div>
                </div>

                {/* Categorized Amenities */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', color: C.text, marginBottom: '12px' }}>
                    Amenities & Services
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {detailModal.amenityCategories.map(cat => (
                      <div key={cat.category} style={{ background: C.card, padding: '12px 16px', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: C.gold, marginBottom: '8px' }}>
                          {cat.category}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                          {cat.items.map(item => (
                            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: C.text }}>
                              <span style={{ color: C.gold }}>✓</span>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Eco & Sustainability */}
                {detailModal.isEco && (
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.08)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#22c55e', fontWeight: 800, fontSize: '0.95rem', marginBottom: '6px' }}>
                      <span>🌱</span>
                      <span>Verified Sustainability Highlights</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {detailModal.sustainability.map(s => (
                        <span key={s} style={{ fontSize: '0.78rem', background: C.surface, border: '1px solid rgba(34, 197, 94, 0.3)', color: C.text, padding: '4px 10px', borderRadius: '6px' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* House Rules & Timings */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: C.card, padding: '1rem', borderRadius: '12px', border: `1px solid ${C.border}` }}>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: C.text, marginBottom: '6px' }}>🕒 Check-In / Out</div>
                    <div style={{ fontSize: '0.82rem', color: C.muted }}>Check-in: {detailModal.checkIn}</div>
                    <div style={{ fontSize: '0.82rem', color: C.muted }}>Check-out: {detailModal.checkOut}</div>
                  </div>
                  <div style={{ background: C.card, padding: '1rem', borderRadius: '12px', border: `1px solid ${C.border}` }}>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: C.text, marginBottom: '6px' }}>📜 House Rules</div>
                    {detailModal.houseRules.slice(0, 2).map((r, i) => (
                      <div key={i} style={{ fontSize: '0.8rem', color: C.muted, lineHeight: 1.3 }}>• {r}</div>
                    ))}
                  </div>
                </div>

                {/* Verified Guest Reviews */}
                <div>
                  <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', color: C.text, marginBottom: '10px' }}>
                    Guest Experiences ({detailModal.reviewsList.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {detailModal.reviewsList.map((rev, idx) => (
                      <div key={idx} style={{ background: C.card, padding: '1rem', borderRadius: '12px', border: `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: C.text }}>{rev.author}</span>
                          <span style={{ fontSize: '0.75rem', color: C.gold }}>{'⭐'.repeat(rev.rating)}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: C.muted, marginBottom: '6px' }}>{rev.date}</div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: C.muted, lineHeight: 1.4 }}>"{rev.comment}"</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1.5rem', borderTop: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.7rem', fontWeight: 800, color: C.gold }}>
                      ₹{detailModal.price.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: C.muted }}>total per night • all taxes & heritage cess included</div>
                  </div>

                  <button 
                    onClick={() => {
                      const p = detailModal;
                      setDetailModal(null);
                      handleBook(p);
                    }}
                    className="stay-primary-book-btn"
                    style={{ padding: '12px 32px', fontSize: '1rem' }}
                  >
                    Reserve This Stay
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Reservation Modal */}
        {bookingModal && (
          <div className="booking-modal-backdrop" onClick={() => setBookingModal(null)}>
            <div className="booking-modal-card" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ margin: 0, fontFamily: 'Cinzel, serif', fontSize: '1.35rem', color: C.text }}>
                  Reserve Your Stay
                </h2>
                <button 
                  onClick={() => setBookingModal(null)}
                  style={{ background: 'transparent', border: 'none', color: C.muted, fontSize: '1.5rem', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>

              {bookingConfirmed ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                  <h3 style={{ fontFamily: 'Cinzel, serif', color: C.gold, margin: '0 0 0.5rem' }}>Booking Confirmed!</h3>
                  <p style={{ color: C.muted, fontSize: '0.9rem' }}>
                    Your stay at <strong>{bookingModal.name}</strong> is reserved. A confirmation SMS and ticket have been dispatched.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: C.card, padding: '1rem', borderRadius: '14px', border: `1px solid ${C.border}`, marginBottom: '1.25rem' }}>
                    <img 
                      src={bookingModal.image} 
                      alt={bookingModal.name}
                      style={{ width: 80, height: 70, borderRadius: '10px', objectFit: 'cover' }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }}
                    />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: C.text }}>{bookingModal.name}</div>
                      <div style={{ fontSize: '0.8rem', color: C.muted }}>📍 {bookingModal.location}</div>
                      <div style={{ fontSize: '0.8rem', color: C.gold, fontWeight: 700, marginTop: '2px' }}>
                        ⭐ {bookingModal.rating} ({bookingModal.reviews} reviews)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: C.muted, marginBottom: '4px' }}>
                        DURATION (NIGHTS)
                      </label>
                      <input 
                        type="number" 
                        min={1} 
                        max={14}
                        value={numRooms}
                        onChange={e => setNumRooms(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: C.card, border: `1px solid ${C.border}`, color: C.text, fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: C.muted, marginBottom: '4px' }}>
                        GUESTS
                      </label>
                      <input 
                        type="number" 
                        min={1} 
                        max={8}
                        value={numGuests}
                        onChange={e => setNumGuests(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: C.card, border: `1px solid ${C.border}`, color: C.text, fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  <div style={{ background: C.card, padding: '1rem', borderRadius: '12px', border: `1px solid ${C.border}`, marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: C.muted }}>₹{bookingModal.price.toLocaleString()} × {numRooms} night(s)</span>
                      <span>₹{(bookingModal.price * numRooms).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: C.muted }}>Cultural Preservation Levy (2%)</span>
                      <span>₹{Math.round(bookingModal.price * numRooms * 0.02).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: `1px solid ${C.border}`, fontWeight: 800, fontSize: '1rem' }}>
                      <span>Total Amount</span>
                      <span style={{ color: C.gold }}>
                        ₹{Math.round(bookingModal.price * numRooms * 1.02).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                      onClick={() => setBookingModal(null)}
                      style={{ flex: 1, padding: '12px', borderRadius: '8px', background: C.card, border: `1px solid ${C.border}`, color: C.text, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleConfirmReservation}
                      className="stay-primary-book-btn"
                      style={{ flex: 2, padding: '12px', fontSize: '0.95rem' }}
                    >
                      Confirm Reservation
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  );
}

