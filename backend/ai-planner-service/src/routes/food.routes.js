const express = require('express');
const router = express.Router();

const culinaryTrails = [
  {
    id: 'trail_01',
    name: 'Mysuru Royal Feast Trail',
    region: 'Karnataka',
    city: 'Mysuru',
    description: 'Explore the culinary legacy of the Wodeyar dynasty — from palace kitchens to bustling Devaraja Market.',
    highlights: ['Mysuru Pak (sweet)', 'Ragi Mudde with Saaru', 'Nanjangud Rasabale desserts'],
    duration: '3 hours',
    price: 1200,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=800',
    tags: ['royal', 'sweets', 'Karnataka'],
  },
  {
    id: 'trail_02',
    name: 'Rajasthan Spice Caravan',
    region: 'Rajasthan',
    city: 'Jaipur',
    description: 'Journey through the aromatic bazaars of Jaipur to discover Rajputana culinary artistry.',
    highlights: ['Dal Baati Churma', 'Laal Maas', 'Ghevar dessert', 'Ker Sangri'],
    duration: '4 hours',
    price: 1500,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800',
    tags: ['spicy', 'royal', 'Rajasthan'],
  },
  {
    id: 'trail_03',
    name: 'Chettinad Kitchen Odyssey',
    region: 'Tamil Nadu',
    city: 'Karaikudi',
    description: 'Discover the bold and aromatic flavours of Chettinad — one of India\'s most distinctive cuisines.',
    highlights: ['Chettinad Chicken', 'Kavuni Arisi (black rice pudding)', 'Kuzhi Paniyaram'],
    duration: '5 hours',
    price: 1800,
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=800',
    tags: ['spicy', 'heritage', 'Tamil Nadu'],
  },
  {
    id: 'trail_04',
    name: 'Kerala Backwater Food Cruise',
    region: 'Kerala',
    city: 'Alleppey',
    description: 'Savour freshwater fish curries, coconut-rich gravies, and traditional Kerala sadhya on a houseboat.',
    highlights: ['Karimeen Pollichathu', 'Kerala Fish Curry', 'Puttu & Kadala Curry', 'Payasam'],
    duration: '6 hours',
    price: 2500,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800',
    tags: ['seafood', 'backwaters', 'Kerala'],
  },
  {
    id: 'trail_05',
    name: 'Varanasi Chaat & Chai Walk',
    region: 'Uttar Pradesh',
    city: 'Varanasi',
    description: 'Wander the ancient ghats and lanes of Banaras exploring street food culture dating back centuries.',
    highlights: ['Tamatar Chaat', 'Baati Chokha', 'Lassi at Blue Lassi', 'Malaiyyo'],
    duration: '3 hours',
    price: 900,
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=800',
    tags: ['street food', 'ghats', 'UP'],
  },
  {
    id: 'trail_06',
    name: 'Udupi Temple Kitchen Experience',
    region: 'Karnataka',
    city: 'Udupi',
    description: 'Learn the secrets of sattvic vegetarian cooking in the town that gave the world the iconic Udupi restaurant.',
    highlights: ['Masala Dosa', 'Sambar', 'Coconut Chutney', 'Majjige Huli'],
    duration: '4 hours',
    price: 1100,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=800',
    tags: ['vegetarian', 'temple', 'Karnataka'],
  },
  {
    id: 'trail_07',
    name: 'Jodhpur Blue City Food Walk',
    region: 'Rajasthan',
    city: 'Jodhpur',
    description: 'Taste the distinctive flavours of Marwar cuisine amid the indigo-blue lanes of the Sun City.',
    highlights: ['Makhaniya Lassi', 'Pyaaz Kachori', 'Mirchibada', 'Mawa Kachori'],
    duration: '3 hours',
    price: 1000,
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800',
    tags: ['street food', 'Rajasthan', 'heritage city'],
  },
  {
    id: 'trail_08',
    name: 'Ooty Nilgiri Harvest Trail',
    region: 'Tamil Nadu',
    city: 'Ooty',
    description: 'Explore the unique produce of the Nilgiri hills — from fresh chocolates to tribal honey and herbal teas.',
    highlights: ['Nilgiri Tea tasting', 'Toda tribal cuisine', 'Home-made chocolates', 'Carrot Halwa'],
    duration: '5 hours',
    price: 1600,
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=800',
    tags: ['hills', 'tea', 'Tamil Nadu'],
  },
  {
    id: 'trail_09',
    name: 'Thrissur Onam Sadya Experience',
    region: 'Kerala',
    city: 'Thrissur',
    description: 'Experience the grand 26-dish vegetarian feast served on banana leaf — a UNESCO-listed intangible heritage.',
    highlights: ['Avial', 'Olan', 'Erissery', 'Payasam', 'Pickle platter'],
    duration: '2 hours',
    price: 800,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=800',
    tags: ['vegetarian', 'festival', 'Kerala'],
  },
  {
    id: 'trail_10',
    name: 'Agra Mughal Dastarkhwan',
    region: 'Uttar Pradesh',
    city: 'Agra',
    description: 'Relive Mughal culinary grandeur in the shadow of the Taj — dum biryani, kebabs, and shahi desserts.',
    highlights: ['Dum Biryani', 'Galouti Kebab', 'Petha sweet', 'Phirni'],
    duration: '4 hours',
    price: 1700,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800',
    tags: ['Mughal', 'kebabs', 'UP'],
  },
];

const recipes = [
  {
    id: 'rec_01', name: 'Dal Baati Churma', region: 'Rajasthan',
    ingredients: ['wheat flour', 'toor dal', 'ghee', 'spices', 'jaggery'],
    steps: ['Knead dough and shape batis', 'Bake in wood fire or oven', 'Prepare spiced dal', 'Crush batis for churma with jaggery'],
    cookTime: '90 min', difficulty: 'Medium', serves: 4,
  },
  {
    id: 'rec_02', name: 'Ragi Mudde', region: 'Karnataka',
    ingredients: ['ragi flour', 'water', 'salt'],
    steps: ['Boil water', 'Add ragi flour slowly', 'Stir continuously until firm ball forms', 'Serve with saaru or sambar'],
    cookTime: '20 min', difficulty: 'Easy', serves: 2,
  },
  {
    id: 'rec_03', name: 'Karimeen Pollichathu', region: 'Kerala',
    ingredients: ['pearl spot fish', 'coconut oil', 'green chilli', 'ginger', 'tomato', 'banana leaf'],
    steps: ['Marinate fish in spices', 'Sauté onion-tomato masala', 'Wrap fish and masala in banana leaf', 'Roast on tawa until cooked'],
    cookTime: '45 min', difficulty: 'Medium', serves: 2,
  },
  {
    id: 'rec_04', name: 'Chettinad Chicken Curry', region: 'Tamil Nadu',
    ingredients: ['chicken', 'kalpasi', 'marathi mokku', 'coconut', 'shallots', 'tomato'],
    steps: ['Dry roast and grind Chettinad spices', 'Sauté shallots and tomatoes', 'Add chicken and masala', 'Slow cook till oil separates'],
    cookTime: '60 min', difficulty: 'Hard', serves: 4,
  },
  {
    id: 'rec_05', name: 'Tamatar Chaat', region: 'Uttar Pradesh',
    ingredients: ['tomatoes', 'tamarind', 'chilli', 'coriander', 'chaat masala', 'hing'],
    steps: ['Chop tomatoes finely', 'Make tamarind-chilli chutney', 'Mix with chaat masala and hing', 'Top with coriander and serve'],
    cookTime: '15 min', difficulty: 'Easy', serves: 2,
  },
  {
    id: 'rec_06', name: 'Mysuru Pak', region: 'Karnataka',
    ingredients: ['besan', 'ghee', 'sugar', 'cardamom'],
    steps: ['Make sugar syrup to one-string consistency', 'Add besan slowly to hot ghee', 'Pour into sugar syrup and mix', 'Set in greased tray and cut when warm'],
    cookTime: '30 min', difficulty: 'Hard', serves: 8,
  },
  {
    id: 'rec_07', name: 'Kerala Fish Curry', region: 'Kerala',
    ingredients: ['fish', 'coconut milk', 'kodampuli', 'green chilli', 'turmeric', 'curry leaves'],
    steps: ['Soak kodampuli in water', 'Combine fish with coconut milk and spices', 'Add kodampuli water for sourness', 'Simmer till fish is cooked'],
    cookTime: '35 min', difficulty: 'Easy', serves: 3,
  },
  {
    id: 'rec_08', name: 'Galouti Kebab', region: 'Uttar Pradesh',
    ingredients: ['minced mutton', 'raw papaya paste', 'over 25 spices', 'ghee', 'rose water'],
    steps: ['Marinate mince with papaya and spices overnight', 'Shape into small patties', 'Shallow fry in ghee on low heat', 'Serve with ulte tawe ki roti'],
    cookTime: '45 min (+ overnight)', difficulty: 'Hard', serves: 4,
  },
];

const regions = [
  { id: 'r_01', name: 'Karnataka', specialties: ['Udupi cuisine', 'Kodagu pork curries', 'Mysuru sweets'], famousDishes: ['Bisi Bele Bath', 'Ragi Mudde', 'Mysuru Pak'] },
  { id: 'r_02', name: 'Rajasthan', specialties: ['Desert cuisine', 'Marwari vegetarian', 'Royal Rajputana'], famousDishes: ['Dal Baati Churma', 'Laal Maas', 'Ghevar'] },
  { id: 'r_03', name: 'Tamil Nadu', specialties: ['Chettinad', 'Kongu Nadu', 'Madurai street food'], famousDishes: ['Idli Sambar', 'Chettinad Chicken', 'Filter Coffee'] },
  { id: 'r_04', name: 'Kerala', specialties: ['Malabar seafood', 'Syrian Christian cuisine', 'Onam Sadya'], famousDishes: ['Appam & Stew', 'Karimeen Pollichathu', 'Prawn Moilee'] },
  { id: 'r_05', name: 'Uttar Pradesh', specialties: ['Lucknowi Awadhi', 'Banarasi street food', 'Mughal cuisine'], famousDishes: ['Dum Biryani', 'Galouti Kebab', 'Petha'] },
];

// GET /api/food/trails
router.get('/trails', (req, res) => {
  const { region } = req.query;
  if (region) {
    return res.json(culinaryTrails.filter(t => t.region.toLowerCase() === region.toLowerCase()));
  }
  return res.json(culinaryTrails);
});

// GET /api/food/recipes
router.get('/recipes', (req, res) => {
  const { region } = req.query;
  if (region) {
    return res.json(recipes.filter(r => r.region.toLowerCase() === region.toLowerCase()));
  }
  return res.json(recipes);
});

// GET /api/food/regions
router.get('/regions', (req, res) => {
  return res.json(regions);
});

module.exports = router;
