import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import VoHLogo from '@/components/VoHLogo';

const C = {
  bg:      'var(--voh-bg)',
  surface: 'var(--voh-surface, #12121f)',
  card:    'var(--voh-card)',
  border:  'var(--voh-border)',
  amber:   'var(--voh-amber, #f59e0b)',
  gold:    'var(--voh-gold, #d97706)',
  text:    'var(--voh-text)',
  muted:   'var(--voh-muted)',
};

/* ─── Static data (also fetched from /api/food/* if backend is up) ─── */
const TRAILS_STATIC = [
  { id: 1, region: 'Karnataka', name: 'Mysore Royal Kitchen Trail', description: 'Explore the culinary heritage of the Mysore royal palace — from Mysore Pak to traditional Obbattu and fragrant filter coffee.', duration: '1 Day', stops: 6, cuisine: 'South Indian Royal', difficulty: 'Easy', highlights: ['Mysore Pak', 'Obbattu (Puran Poli)', 'Bisi Bele Bath', 'Ragi Mudde & Saaru', 'Filter Coffee'], emoji: '🏰', price: 1200 },
  { id: 2, region: 'Rajasthan', name: 'Rajputana Desert Flavors', description: 'Journey through the sun-baked kitchens of Rajputana — a heritage of warrior cuisine, dal baati, and ker sangri.', duration: '2 Days', stops: 8, cuisine: 'Rajasthani', difficulty: 'Moderate', highlights: ['Dal Baati Churma', 'Ker Sangri', 'Laal Maas', 'Gatte ki Sabzi', 'Malpua', 'Ghevar'], emoji: '🏜️', price: 1800 },
  { id: 3, region: 'Tamil Nadu', name: 'Chettinad Heritage Spice Route', description: 'Trace the spice trade routes of the Nattukotai Chettiars through fiery curries and fragrant rice dishes.', duration: '2 Days', stops: 7, cuisine: 'Chettinad', difficulty: 'Moderate', highlights: ['Chettinad Chicken Curry', 'Kavuni Arisi Kheer', 'Idiyappam', 'Pongal', 'Kuzhi Paniyaram'], emoji: '🌶️', price: 1600 },
  { id: 4, region: 'Kerala', name: 'Backwater Sadhya Experience', description: 'Experience the grand feast tradition of Kerala — the Onam Sadhya served on banana leaves by the backwaters.', duration: '1 Day', stops: 5, cuisine: 'Kerala Traditional', difficulty: 'Easy', highlights: ['Avial', 'Olan', 'Payasam', 'Thoran', 'Erissery', 'Papad & Pickle'], emoji: '🌴', price: 1100 },
  { id: 5, region: 'Uttar Pradesh', name: 'Awadhi Dum Kitchen Trail', description: 'Discover the art of slow-cooked Awadhi cuisine — dum biryani, kakori kebabs and sheermal in Lucknow.', duration: '1 Day', stops: 6, cuisine: 'Awadhi / Mughlai', difficulty: 'Easy', highlights: ['Lucknowi Biryani', 'Kakori Kebab', 'Sheermal', 'Nihari', 'Korma', 'Zarda'], emoji: '👑', price: 1400 },
  { id: 6, region: 'Gujarat', name: 'Saurashtra Thali Heritage Walk', description: 'Explore the vegetarian abundance of Gujarat — from dhokla to undhiyu, a feast for every occasion.', duration: '1 Day', stops: 5, cuisine: 'Gujarati', difficulty: 'Easy', highlights: ['Dhokla', 'Undhiyu', 'Thepla', 'Fafda-Jalebi', 'Dal Dhokli', 'Shrikhand'], emoji: '🌾', price: 950 },
  { id: 7, region: 'Bengal', name: 'Bengali Riverside Feast Trail', description: 'The rivers and mustard fields of Bengal have gifted a cuisine rich in fish, sweets and poetry.', duration: '1 Day', stops: 6, cuisine: 'Bengali', difficulty: 'Easy', highlights: ['Hilsa Fish Curry', 'Mishti Doi', 'Rasgulla', 'Shorshe Ilish', 'Sandesh', 'Macher Jhol'], emoji: '🐟', price: 1050 },
  { id: 8, region: 'Karnataka', name: 'Udupi Temple Kitchen Trail', description: 'Follow the vegetarian culinary traditions of Udupi temples — the origin of South Indian restaurant culture worldwide.', duration: '1 Day', stops: 4, cuisine: 'Udupi / Brahmin', difficulty: 'Easy', highlights: ['Masala Dosa', 'Sambar', 'Rasam', 'Coconut Chutney', 'Khichdi', 'Tambli'], emoji: '🛕', price: 850 },
  { id: 9, region: 'Rajasthan', name: 'Blue City Sweet Trail', description: 'Jodhpur\'s vibrant bazaars are home to centuries-old sweet-making traditions from the Marwar royal kitchens.', duration: '3 hrs', stops: 4, cuisine: 'Marwari', difficulty: 'Easy', highlights: ['Mawa Kachori', 'Makhaniya Lassi', 'Malpua', 'Balushahi', 'Kheer Puri'], emoji: '🧡', price: 750 },
  { id: 10, region: 'Tamil Nadu', name: 'Brahmin Temple Feast of Madurai', description: 'The ancient temple town of Madurai serves a living tradition of Shaiva brahmin cuisine in age-old dhabbas.', duration: '1 Day', stops: 5, cuisine: 'Tamil Brahmin', difficulty: 'Easy', highlights: ['Kambu Koozh', 'Jigarthanda', 'Paruthi Paal', 'Kari Dosa', 'Kalkandu Pongal'], emoji: '🌸', price: 900 },
];

const RECIPES_STATIC = [
  { id: 1, name: 'Mysore Pak', region: 'Karnataka', category: 'Sweet', dynasty: 'Mysore Wadiyar', time: '30 min', difficulty: 'Medium', ingredients: ['Gram flour (besan) – 1 cup', 'Sugar – 2 cups', 'Ghee – 1 cup (hot)', 'Cardamom powder – ½ tsp', 'Water – ½ cup'], steps: ['Heat ghee in a heavy pan over medium heat', 'Add besan slowly, roasting until golden and fragrant (~10 min)', 'Make sugar syrup (1-string consistency) with water', 'Add roasted besan to syrup while stirring constantly', 'Mix in hot ghee in batches until a dough-like mass forms', 'Pour immediately into a greased tray and cut into squares while warm'], heritage: 'Invented in the royal kitchens of Mysore Palace in the early 20th century for Maharaja Krishna Wadiyar by the palace cook Kakasura Madappa.', emoji: '🍯' },
  { id: 2, name: 'Dal Baati Churma', region: 'Rajasthan', category: 'Main Course', dynasty: 'Rajput', time: '90 min', difficulty: 'Hard', ingredients: ['Wheat flour – 2 cups', 'Ghee – 4 tbsp + extra', 'Mixed lentils (panch dal) – 1 cup', 'Jaggery – 3 tbsp (for churma)', 'Spices – cumin, coriander, red chili, garam masala'], steps: ['Knead firm dough with flour, ghee, salt and water', 'Shape into balls (baati), press thumb indent in center', 'Bake in preheated oven at 180°C for 30 min till golden', 'Prepare panchmel dal with tempering of ghee, cumin, hing', 'Crush 4 baati with jaggery and ghee to make churma', 'Serve – pour hot ghee over baati, serve with dal and churma'], heritage: 'A warrior meal from the Rajput era — energy-dense to sustain soldiers on long desert campaigns. The baati baked on cow-dung cake fire is an ancient tradition.', emoji: '🏺' },
  { id: 3, name: 'Chettinad Chicken Curry', region: 'Tamil Nadu', category: 'Main Course', dynasty: 'Nattukotai Chettiars', time: '60 min', difficulty: 'Hard', ingredients: ['Chicken – 1 kg (curry cut)', 'Kalpasi (stone flower) – 2 pcs', 'Marathi mokku (dried flower) – 4 pcs', 'Fresh coconut – ½ (grated)', 'Chettinad masala: kalpasi, marathi mokku, star anise, kababchini, dried red chilies'], steps: ['Dry roast and grind Chettinad spice blend to fine powder', 'Marinate chicken 30 min with turmeric and salt', 'Sauté onion, ginger-garlic, tomato to thick base', 'Add spice powder, cook 5 min until fragrant', 'Add chicken, cook covered 20 min on medium', 'Stir in ground coconut paste, simmer 10 min till oil surfaces'], heritage: 'The Chettiars were wealthy merchant traders who voyaged to Southeast Asia and brought back rare spices, creating a unique spice vocabulary found nowhere else in India.', emoji: '🌶️' },
  { id: 4, name: 'Kerala Avial', region: 'Kerala', category: 'Vegetable', dynasty: 'Traditional', time: '45 min', difficulty: 'Easy', ingredients: ['Mixed vegetables (drumstick, raw banana, yam, ash gourd, beans)', 'Grated coconut – 1 cup', 'Green chilies – 4', 'Cumin – 1 tsp', 'Coconut oil + curry leaves to finish', 'Yogurt – ½ cup'], steps: ['Cut all vegetables into 3-inch pieces, uniform thickness', 'Cook with minimal water and turmeric until just tender', 'Grind coconut, cumin, green chili to coarse paste', 'Add coconut paste to vegetables and mix gently', 'Stir in yogurt off heat to prevent curdling', 'Finish with generous coconut oil and torn curry leaves'], heritage: 'Legend says Avial was invented by Bhima during the Mahabharata\'s incognito year at King Virata\'s court — a creative use of leftover vegetables when the royal cook was absent.', emoji: '🥥' },
  { id: 5, name: 'Lucknowi Dum Biryani', region: 'Uttar Pradesh', category: 'Rice Dish', dynasty: 'Nawabs of Awadh', time: '2 hrs', difficulty: 'Hard', ingredients: ['Basmati rice – 2 cups (long grain)', 'Lamb/chicken – 500g', 'Saffron – generous pinch (soaked in warm milk)', 'Ittar / rose water – 1 tsp', 'Whole spices: clove, cardamom, star anise, bay leaf'], steps: ['Marinate meat overnight in yogurt, spices, fried onions', 'Parboil rice (70%) with whole spices and salt', 'Layer: meat at bottom, rice on top, drizzle saffron milk', 'Scatter fried onions, mint leaves, ghee', 'Seal pot lid with atta (flour dough) completely', 'Cook on dum: 15 min high heat, 30 min lowest heat possible'], heritage: 'Perfected by the Nawabs of Awadh who elevated cooking to a performing art. The dum technique — sealed pot slow-cooking — was developed in Lucknow\'s royal kitchens in the 18th century.', emoji: '🍚' },
  { id: 6, name: 'Bengali Mishti Doi', region: 'Bengal', category: 'Dessert', dynasty: 'Traditional', time: '8 hrs', difficulty: 'Easy', ingredients: ['Full-fat milk – 1 liter', 'Yogurt culture – 2 tbsp (previous batch)', 'Date palm jaggery (nolen gur) – 4 tbsp', 'Earthen pots (matka) for setting'], steps: ['Simmer milk until reduced to ¾ volume, stirring frequently', 'Add jaggery, stir until fully dissolved (do not boil)', 'Cool to exactly lukewarm (40°C — comfortable to touch)', 'Whisk in yogurt culture gently, pour into earthen pots', 'Cover loosely, keep in warm place overnight', 'Refrigerate 2 hrs before serving for firm texture'], heritage: 'The earthen pot gives Mishti Doi its characteristic gentle tang by absorbing excess whey. This sweet yogurt is a Bengali tradition passed down through generations of shondesh makers.', emoji: '🏺' },
  { id: 7, name: 'Dhokla', region: 'Gujarat', category: 'Snack', dynasty: 'Traditional', time: '45 min', difficulty: 'Easy', ingredients: ['Fermented rice-chana dal batter – 2 cups', 'Fruit salt (eno) – 1 tsp', 'Turmeric – ½ tsp', 'Tempering: mustard seeds, curry leaves, green chili, sesame'], steps: ['Mix fermented batter with turmeric and salt', 'Add eno and 1 tbsp water, fold quickly', 'Immediately pour into greased steaming tray', 'Steam 15-20 min until toothpick comes out clean', 'Cool 5 min before cutting into squares', 'Prepare tempering and pour over, garnish with coriander and coconut'], heritage: 'Dhokla appears in Gujarati literature as far back as the 11th century CE, making it one of India\'s oldest documented snack foods.', emoji: '🟡' },
  { id: 8, name: 'Hilsa Fish Curry', region: 'Bengal', category: 'Main Course', dynasty: 'Traditional', time: '30 min', difficulty: 'Medium', ingredients: ['Hilsa (ilish) fish – 6 pieces (with roe preferably)', 'Mustard seeds – 2 tbsp (ground to paste)', 'Mustard oil – 3 tbsp', 'Green chilies – 6 (slit)', 'Turmeric – 1 tsp'], steps: ['Marinate fish in turmeric and salt 10 min', 'Make mustard paste with water to thin consistency', 'Heat mustard oil to smoking point, cool slightly', 'Lightly fry fish pieces (30 sec per side)', 'Add mustard paste and chili to oil, fry 2 min', 'Add fish, water, cover and cook 8 min on medium'], heritage: 'Ilish maach (Hilsa fish) is the national fish of Bangladesh and the soul of Bengali cuisine. The monsoon-harvested fish from the Padma and Hooghly rivers has inspired Bengali poets for centuries.', emoji: '🐟' },
];

const STORIES = [
  { title: 'The Ancient Spice Routes of India', icon: '🌍', text: 'India was the world\'s spice hub for over 2,000 years. The Roman Empire depleted its gold reserves importing Indian pepper. Arab traders monopolized the spice routes until Portuguese explorer Vasco da Gama found the sea route to India in 1498 — directly triggering the Age of Exploration. The Chettinad, Malabar, and Coromandel coasts were the original spice empires. Every regional cuisine in India carries the DNA of these ancient trade networks.' },
  { title: 'Royal Kitchen Traditions of India', icon: '👑', text: 'The Mughal emperors brought Persian culinary techniques — dum cooking, kebabs, and biryani — that merged with existing Indian traditions to create Awadhi and Hyderabadi cuisines. The Rajput courts of Rajasthan evolved energy-dense warrior foods. The Mysore Wadiyars maintained elaborate palace kitchens employing hundreds of specialists. The Nizam of Hyderabad famously employed 50 cooks solely for the preparation of Haleem.' },
  { title: 'Sacred Food: The Temple Kitchen Heritage', icon: '🛕', text: 'Indian temples have been centers of food culture for millennia. Puri\'s Jagannath Temple feeds 10,000–20,000 pilgrims daily using sacred recipes unchanged for 800 years. The Tirupati temple prasadam laddu holds a GI tag — one of the world\'s most famous ritual foods. The Udupi temple in Karnataka created a vegetarian cuisine so refined it became the model for South Indian restaurants worldwide. Temple kitchens were the original community kitchens of India.' },
];

const REGIONS = ['All', 'Karnataka', 'Rajasthan', 'Tamil Nadu', 'Kerala', 'Uttar Pradesh', 'Gujarat', 'Bengal'];
const CATEGORIES = ['All', 'Sweet', 'Main Course', 'Rice Dish', 'Vegetable', 'Snack', 'Dessert'];

export default function FoodHeritagePage() {
  const [activeSection, setActiveSection] = useState<'trails' | 'recipes' | 'stories'>('trails');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);
  const [trails, setTrails] = useState(TRAILS_STATIC);
  const [recipes, setRecipes] = useState(RECIPES_STATIC);

  // Try to fetch from backend, fall back to static
  useEffect(() => {
    fetch('/api/food/trails')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && Array.isArray(d)) setTrails(d); })
      .catch(() => {});
    fetch('/api/food/recipes')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && Array.isArray(d)) setRecipes(d); })
      .catch(() => {});
  }, []);

  const filteredTrails = trails.filter(t => selectedRegion === 'All' || t.region === selectedRegion);
  const filteredRecipes = recipes.filter(r =>
    (selectedRegion === 'All' || r.region === selectedRegion) &&
    (selectedCategory === 'All' || r.category === selectedCategory)
  );

  const css = `
    .fh-root { display:flex; flex-direction:column; min-height:100vh; background:${C.bg}; color:${C.text}; font-family:'Inter',sans-serif; }
    .fh-topbar { padding:1.25rem 2rem; border-bottom:1px solid ${C.border}; background:${C.surface}; display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; z-index:50; }
    .fh-brand { display:flex; align-items:center; gap:1rem; text-decoration:none; }
    .fh-title { font-size:1.4rem; font-weight:800; color:${C.text}; }
    .fh-subtitle { font-size:0.85rem; color:${C.muted}; }

    .fh-hero { padding:4rem 2rem 3rem; text-align:center; background:linear-gradient(180deg,rgba(245,158,11,0.06) 0%,transparent 100%); border-bottom:1px solid ${C.border}; }
    .fh-hero-emoji { font-size:4rem; margin-bottom:1rem; }
    .fh-hero-title { font-size:2.8rem; font-weight:900; margin-bottom:0.75rem; background:linear-gradient(135deg,${C.amber},${C.gold}); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .fh-hero-sub { font-size:1.1rem; color:${C.muted}; max-width:600px; margin:0 auto; line-height:1.6; }

    .fh-nav { display:flex; gap:0; border-bottom:1px solid ${C.border}; background:${C.surface}; overflow-x:auto; }
    .fh-nav-btn { flex:1; min-width:120px; padding:1rem; font-weight:700; font-size:0.9rem; border:none; background:none; color:${C.muted}; cursor:pointer; border-bottom:3px solid transparent; transition:all 0.2s; }
    .fh-nav-btn.active { color:${C.amber}; border-bottom-color:${C.amber}; }

    .fh-filters { display:flex; gap:0.5rem; flex-wrap:wrap; padding:1.5rem 2rem; border-bottom:1px solid ${C.border}; align-items:center; }
    .fh-filter-label { font-size:0.8rem; font-weight:700; color:${C.muted}; text-transform:uppercase; margin-right:0.5rem; }
    .fh-chip { padding:0.4rem 0.9rem; border-radius:20px; border:1px solid ${C.border}; background:transparent; color:${C.muted}; font-size:0.82rem; cursor:pointer; transition:all 0.2s; white-space:nowrap; }
    .fh-chip.active { background:${C.amber}; color:#000; border-color:${C.amber}; font-weight:700; }
    .fh-chip:hover:not(.active) { border-color:${C.amber}; color:${C.amber}; }

    .fh-content { padding:2rem; max-width:1400px; margin:0 auto; width:100%; }

    /* Trails */
    .fh-trail-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:1.5rem; }
    .fh-trail-card { background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; padding:1.5rem; display:flex; flex-direction:column; transition:transform 0.2s,border-color 0.2s; }
    .fh-trail-card:hover { transform:translateY(-4px); border-color:${C.amber}; }
    .fh-trail-emoji-wrap { width:56px; height:56px; border-radius:14px; background:rgba(245,158,11,0.12); display:flex; align-items:center; justify-content:center; font-size:1.8rem; margin-bottom:1rem; }
    .fh-trail-name { font-size:1.1rem; font-weight:800; margin-bottom:0.4rem; color:${C.text}; }
    .fh-trail-region { font-size:0.75rem; padding:3px 10px; background:rgba(245,158,11,0.1); color:${C.amber}; border-radius:12px; display:inline-block; margin-bottom:0.75rem; font-weight:700; }
    .fh-trail-desc { font-size:0.88rem; color:${C.muted}; line-height:1.6; margin-bottom:1rem; flex:1; }
    .fh-trail-meta { display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1rem; }
    .fh-trail-meta span { font-size:0.75rem; padding:3px 8px; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid ${C.border}; color:${C.muted}; }
    .fh-trail-highlights { list-style:none; padding:0; margin:0 0 1.2rem; display:flex; flex-direction:column; gap:0.3rem; }
    .fh-trail-highlights li { font-size:0.83rem; color:${C.muted}; display:flex; align-items:center; gap:0.5rem; }
    .fh-trail-highlights li::before { content:'🍽️'; font-size:0.75rem; }
    .fh-trail-btn { padding:0.65rem 1.2rem; border-radius:10px; border:none; background:${C.amber}; color:#000; font-weight:700; cursor:pointer; font-size:0.88rem; transition:filter 0.2s; }
    .fh-trail-btn:hover { filter:brightness(1.1); }
    .fh-trail-price { font-size:0.85rem; color:${C.gold}; font-weight:700; margin-bottom:0.75rem; }

    /* Recipes */
    .fh-recipe-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:1.5rem; }
    .fh-recipe-card { background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; overflow:hidden; transition:border-color 0.2s; }
    .fh-recipe-card:hover { border-color:rgba(245,158,11,0.3); }
    .fh-recipe-header { padding:1.5rem; display:flex; gap:1rem; align-items:flex-start; }
    .fh-recipe-emoji { font-size:2.5rem; }
    .fh-recipe-info { flex:1; }
    .fh-recipe-name { font-size:1.1rem; font-weight:800; margin-bottom:0.3rem; }
    .fh-recipe-badges { display:flex; gap:0.4rem; flex-wrap:wrap; }
    .fh-badge { font-size:0.72rem; padding:2px 8px; border-radius:10px; font-weight:700; }
    .fh-badge-region { background:rgba(245,158,11,0.12); color:${C.amber}; }
    .fh-badge-cat { background:rgba(99,102,241,0.12); color:#818cf8; }
    .fh-badge-dynasty { background:rgba(16,185,129,0.12); color:#34d399; }
    .fh-recipe-heritage { margin:0 1.5rem 1rem; padding:0.75rem 1rem; background:rgba(245,158,11,0.06); border-left:3px solid ${C.amber}; border-radius:0 8px 8px 0; font-size:0.84rem; color:${C.muted}; font-style:italic; line-height:1.5; }
    .fh-recipe-meta { display:flex; gap:1rem; padding:0 1.5rem 1rem; }
    .fh-recipe-meta span { font-size:0.78rem; color:${C.muted}; display:flex; align-items:center; gap:0.3rem; }
    .fh-recipe-toggle { width:100%; padding:0.75rem 1.5rem; background:rgba(245,158,11,0.06); border:none; border-top:1px solid ${C.border}; color:${C.amber}; font-weight:700; font-size:0.85rem; cursor:pointer; text-align:left; display:flex; justify-content:space-between; align-items:center; }
    .fh-recipe-body { padding:0 1.5rem 1.5rem; }
    .fh-recipe-section { margin-top:1rem; }
    .fh-recipe-section h4 { font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:${C.amber}; margin-bottom:0.5rem; }
    .fh-recipe-section ul { padding-left:1.2rem; margin:0; display:flex; flex-direction:column; gap:0.3rem; }
    .fh-recipe-section ul li { font-size:0.85rem; color:${C.muted}; line-height:1.5; }
    .fh-recipe-section ol { padding-left:1.2rem; margin:0; display:flex; flex-direction:column; gap:0.4rem; }
    .fh-recipe-section ol li { font-size:0.85rem; color:${C.muted}; line-height:1.5; }

    /* Stories */
    .fh-story-grid { display:flex; flex-direction:column; gap:1.5rem; max-width:860px; margin:0 auto; }
    .fh-story-card { background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; padding:2rem; }
    .fh-story-icon { font-size:2.5rem; margin-bottom:1rem; }
    .fh-story-title { font-size:1.3rem; font-weight:800; margin-bottom:0.75rem; color:${C.text}; }
    .fh-story-text { font-size:0.95rem; color:${C.muted}; line-height:1.75; }

    .fh-empty { text-align:center; padding:4rem 2rem; color:${C.muted}; }
    .fh-empty-icon { font-size:3rem; margin-bottom:1rem; }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="fh-root">

        {/* Topbar */}
        <header className="fh-topbar">
          <Link to="/dashboard" className="fh-brand">
            <VoHLogo size={36} />
            <div>
              <div className="fh-title">Food Heritage & Cuisine</div>
              <div className="fh-subtitle">India's gastronomic traditions</div>
            </div>
          </Link>
          <ThemeToggle />
        </header>

        {/* Hero */}
        <div className="fh-hero">
          <div className="fh-hero-emoji">🍛</div>
          <h1 className="fh-hero-title">Culinary Heritage of India</h1>
          <p className="fh-hero-sub">
            Explore regional culinary trails, traditional recipes, and the living food heritage woven into India's ancient civilizations.
          </p>
        </div>

        {/* Section Nav */}
        <nav className="fh-nav">
          {(['trails', 'recipes', 'stories'] as const).map(s => (
            <button key={s} className={`fh-nav-btn ${activeSection === s ? 'active' : ''}`} onClick={() => setActiveSection(s)}>
              {s === 'trails' ? '🗺️ Culinary Trails' : s === 'recipes' ? '📖 Heritage Recipes' : '📜 Food Stories'}
            </button>
          ))}
        </nav>

        {/* Filters */}
        <div className="fh-filters">
          <span className="fh-filter-label">Region:</span>
          {REGIONS.map(r => (
            <button key={r} className={`fh-chip ${selectedRegion === r ? 'active' : ''}`} onClick={() => setSelectedRegion(r)}>{r}</button>
          ))}
          {activeSection === 'recipes' && (
            <>
              <span className="fh-filter-label" style={{ marginLeft: '1rem' }}>Category:</span>
              {CATEGORIES.map(c => (
                <button key={c} className={`fh-chip ${selectedCategory === c ? 'active' : ''}`} onClick={() => setSelectedCategory(c)}>{c}</button>
              ))}
            </>
          )}
        </div>

        {/* Content */}
        <main className="fh-content">

          {/* ── TRAILS ── */}
          {activeSection === 'trails' && (
            filteredTrails.length === 0
              ? <div className="fh-empty"><div className="fh-empty-icon">🗺️</div>No trails found for this region.</div>
              : <div className="fh-trail-grid">
                {filteredTrails.map(trail => (
                  <div key={trail.id} className="fh-trail-card">
                    <div className="fh-trail-emoji-wrap">{trail.emoji}</div>
                    <span className="fh-trail-region">📍 {trail.region}</span>
                    <div className="fh-trail-name">{trail.name}</div>
                    <p className="fh-trail-desc">{trail.description}</p>
                    <div className="fh-trail-meta">
                      <span>⏱️ {trail.duration}</span>
                      <span>🏛️ {trail.stops} stops</span>
                      <span>🍽️ {trail.cuisine}</span>
                      <span>🥾 {trail.difficulty}</span>
                    </div>
                    <ul className="fh-trail-highlights">
                      {trail.highlights.slice(0, 4).map((h: string) => <li key={h}>{h}</li>)}
                    </ul>
                    <div className="fh-trail-price">₹{trail.price?.toLocaleString('en-IN')} / person</div>
                    <button className="fh-trail-btn">Explore Trail →</button>
                  </div>
                ))}
              </div>
          )}

          {/* ── RECIPES ── */}
          {activeSection === 'recipes' && (
            filteredRecipes.length === 0
              ? <div className="fh-empty"><div className="fh-empty-icon">📖</div>No recipes found for this filter.</div>
              : <div className="fh-recipe-grid">
                {filteredRecipes.map(recipe => (
                  <div key={recipe.id} className="fh-recipe-card">
                    <div className="fh-recipe-header">
                      <div className="fh-recipe-emoji">{recipe.emoji}</div>
                      <div className="fh-recipe-info">
                        <div className="fh-recipe-name">{recipe.name}</div>
                        <div className="fh-recipe-badges">
                          <span className="fh-badge fh-badge-region">{recipe.region}</span>
                          <span className="fh-badge fh-badge-cat">{recipe.category}</span>
                          <span className="fh-badge fh-badge-dynasty">{recipe.dynasty}</span>
                        </div>
                      </div>
                    </div>
                    <div className="fh-recipe-meta">
                      <span>⏱️ {recipe.time}</span>
                      <span>📊 {recipe.difficulty}</span>
                    </div>
                    <div className="fh-recipe-heritage">{recipe.heritage}</div>
                    <button className="fh-recipe-toggle" onClick={() => setExpandedRecipe(expandedRecipe === recipe.id ? null : recipe.id)}>
                      {expandedRecipe === recipe.id ? '▲ Hide Recipe' : '▼ View Full Recipe'}
                    </button>
                    {expandedRecipe === recipe.id && (
                      <div className="fh-recipe-body">
                        <div className="fh-recipe-section">
                          <h4>Ingredients</h4>
                          <ul>{recipe.ingredients.map((ing: string) => <li key={ing}>{ing}</li>)}</ul>
                        </div>
                        <div className="fh-recipe-section">
                          <h4>Method</h4>
                          <ol>{recipe.steps.map((step: string, i: number) => <li key={i}>{step}</li>)}</ol>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
          )}

          {/* ── STORIES ── */}
          {activeSection === 'stories' && (
            <div className="fh-story-grid">
              {STORIES.map(story => (
                <div key={story.title} className="fh-story-card">
                  <div className="fh-story-icon">{story.icon}</div>
                  <div className="fh-story-title">{story.title}</div>
                  <p className="fh-story-text">{story.text}</p>
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
    </>
  );
}
