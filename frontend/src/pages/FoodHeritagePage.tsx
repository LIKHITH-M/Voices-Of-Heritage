import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const FALLBACK_FOOD_IMG = 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80';

const TRAILS_FALLBACK = [
  {
    id: 'trail_01',
    region: 'Karnataka',
    city: 'Mysuru',
    name: 'Mysuru Royal Kitchen Trail',
    description: 'Explore the culinary heritage of the Mysore royal palace — from Mysore Pak to traditional Obbattu and fragrant filter coffee.',
    duration: '1 Day (5 hrs)',
    stops: 6,
    cuisine: 'South Indian Royal',
    difficulty: 'Easy',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
    highlights: ['Mysore Pak', 'Obbattu (Puran Poli)', 'Bisi Bele Bath', 'Ragi Mudde & Saaru', 'Filter Coffee'],
    itinerary: ['Mylari Dosa & Filter Coffee', 'Devaraja Market spice walk', 'Guru Sweet Mart Mysore Pak tasting', 'Wadiyar banana-leaf lunch'],
    emoji: '🏰',
    price: 1200,
  },
  {
    id: 'trail_02',
    region: 'Rajasthan',
    city: 'Jaipur',
    name: 'Rajputana Desert Flavors Trail',
    description: 'Journey through the sun-baked kitchens of Rajputana — a heritage of warrior cuisine, dal baati, and ker sangri.',
    duration: '2 Days',
    stops: 8,
    cuisine: 'Rajasthani Royal',
    difficulty: 'Moderate',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&auto=format&fit=crop&q=80',
    highlights: ['Dal Baati Churma', 'Ker Sangri', 'Laal Maas', 'Gatte ki Sabzi', 'Ghevar'],
    itinerary: ['Pyaaz Kachori near Hawa Mahal', 'Johari Bazaar spice walk', 'Heritage Ghevar workshop', 'Haveli Dal Baati feast'],
    emoji: '🏜️',
    price: 1800,
  },
];

const RECIPES_FALLBACK = [
  {
    id: 'rec_01',
    name: 'Mysore Pak',
    region: 'Karnataka',
    category: 'Sweet',
    dynasty: 'Mysore Wadiyar',
    time: '30 min',
    difficulty: 'Medium',
    serves: 8,
    image: 'https://images.unsplash.com/photo-1605197161470-5d2a79a0e4d6?w=700&auto=format&fit=crop&q=80',
    ingredients: ['Gram flour (besan) – 1 cup', 'Sugar – 2 cups', 'Ghee – 1.5 cups', 'Cardamom powder – ½ tsp'],
    steps: ['Roast besan lightly until fragrant', 'Prepare 1-string sugar syrup', 'Whisk besan into syrup and add hot ghee ladle by ladle', 'Pour into greased tray and cut warm'],
    heritage: 'Invented in the royal kitchens of Mysore Palace in 1935 for Maharaja Krishna Raja Wadiyar IV.',
    emoji: '🍯',
  },
];

const STORIES_FALLBACK = [
  { id: 'st_01', title: 'The Ancient Spice Routes of India', icon: '🌍', text: 'India was the world’s spice hub for over 2,000 years. Every regional cuisine carries the DNA of ancient Malabar, Chettinad, and Konkan trade networks.' },
  { id: 'st_02', title: 'Royal Kitchen Traditions of India', icon: '👑', text: 'From Awadhi Dum Pukht slow-cooking to Mysore Wadiyar royal sweets and Rajput desert warrior provisions, royal patronage elevated Indian gastronomy into an enduring art.' },
  { id: 'st_03', title: 'Sacred Food: The Temple Kitchen Heritage', icon: '🛕', text: 'Puri’s Jagannath Temple feeds tens of thousands daily using 800-year-old recipes, while Udupi’s Krishna Matha shaped South Indian vegetarian dining worldwide.' },
];

const REGIONS = ['All', 'Karnataka', 'Rajasthan', 'Tamil Nadu', 'Kerala', 'Uttar Pradesh', 'Gujarat', 'Bengal'];
const CATEGORIES = ['All', 'Sweet', 'Main Course', 'Rice Dish', 'Vegetable', 'Snack', 'Dessert'];

export default function FoodHeritagePage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'trails' | 'recipes' | 'regions' | 'stories'>('trails');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [selectedTrail, setSelectedTrail] = useState<any | null>(null);
  const [trails, setTrails] = useState<any[]>(TRAILS_FALLBACK);
  const [recipes, setRecipes] = useState<any[]>(RECIPES_FALLBACK);
  const [regionList, setRegionList] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>(STORIES_FALLBACK);

  // Fetch live culinary data from backend APIs
  useEffect(() => {
    fetch('/api/food/trails').then(r => r.ok ? r.json() : null).then(d => { if (Array.isArray(d) && d.length) setTrails(d); }).catch(() => {});
    fetch('/api/food/recipes').then(r => r.ok ? r.json() : null).then(d => { if (Array.isArray(d) && d.length) setRecipes(d); }).catch(() => {});
    fetch('/api/food/regions').then(r => r.ok ? r.json() : null).then(d => { if (Array.isArray(d) && d.length) setRegionList(d); }).catch(() => {});
    fetch('/api/food/stories').then(r => r.ok ? r.json() : null).then(d => { if (Array.isArray(d) && d.length) setStories(d); }).catch(() => {});
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

    .fh-hero { padding:3.5rem 2rem 2.75rem; text-align:center; background:linear-gradient(180deg,rgba(245,158,11,0.08) 0%,transparent 100%); border-bottom:1px solid ${C.border}; }
    .fh-hero-emoji { font-size:3.5rem; margin-bottom:0.75rem; }
    .fh-hero-title { font-size:2.6rem; font-weight:900; margin-bottom:0.65rem; background:linear-gradient(135deg,${C.amber},${C.gold}); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .fh-hero-sub { font-size:1.05rem; color:${C.muted}; max-width:620px; margin:0 auto; line-height:1.6; }

    .fh-nav { display:flex; border-bottom:1px solid ${C.border}; background:${C.surface}; overflow-x:auto; }
    .fh-nav-btn { flex:1; min-width:130px; padding:1rem; font-weight:700; font-size:0.9rem; border:none; background:none; color:${C.muted}; cursor:pointer; border-bottom:3px solid transparent; transition:all 0.2s; }
    .fh-nav-btn.active { color:${C.amber}; border-bottom-color:${C.amber}; }

    .fh-filters { display:flex; gap:0.5rem; flex-wrap:wrap; padding:1.25rem 2rem; border-bottom:1px solid ${C.border}; align-items:center; }
    .fh-filter-label { font-size:0.78rem; font-weight:700; color:${C.muted}; text-transform:uppercase; margin-right:0.4rem; }
    .fh-chip { padding:0.38rem 0.9rem; border-radius:20px; border:1px solid ${C.border}; background:transparent; color:${C.muted}; font-size:0.82rem; cursor:pointer; transition:all 0.2s; white-space:nowrap; }
    .fh-chip.active { background:${C.amber}; color:#000; border-color:${C.amber}; font-weight:700; }
    .fh-chip:hover:not(.active) { border-color:${C.amber}; color:${C.amber}; }

    .fh-content { padding:2rem; max-width:1400px; margin:0 auto; width:100%; }

    .fh-trail-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:1.5rem; }
    .fh-trail-card { background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; overflow:hidden; display:flex; flex-direction:column; transition:transform 0.2s,border-color 0.2s; }
    .fh-trail-card:hover { transform:translateY(-4px); border-color:${C.amber}; }
    .fh-card-img-wrap { position:relative; height:180px; width:100%; overflow:hidden; background:rgba(245,158,11,0.08); }
    .fh-card-img-wrap img { width:100%; height:100%; object-fit:cover; }
    .fh-img-badge { position:absolute; top:12px; left:12px; padding:4px 10px; border-radius:20px; background:rgba(0,0,0,0.72); color:${C.amber}; font-size:0.74rem; font-weight:700; backdrop-filter:blur(6px); }
    .fh-img-rating { position:absolute; top:12px; right:12px; padding:4px 10px; border-radius:20px; background:rgba(0,0,0,0.72); color:#fff; font-size:0.74rem; font-weight:700; }
    .fh-trail-body { padding:1.35rem; display:flex; flex-direction:column; flex:1; }
    .fh-trail-name { font-size:1.12rem; font-weight:800; margin-bottom:0.4rem; color:${C.text}; }
    .fh-trail-desc { font-size:0.86rem; color:${C.muted}; line-height:1.55; margin-bottom:0.9rem; flex:1; }
    .fh-trail-meta { display:flex; gap:0.45rem; flex-wrap:wrap; margin-bottom:0.9rem; }
    .fh-trail-meta span { font-size:0.74rem; padding:3px 8px; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid ${C.border}; color:${C.muted}; }
    .fh-trail-highlights { list-style:none; padding:0; margin:0 0 1rem; display:flex; flex-direction:column; gap:0.25rem; }
    .fh-trail-highlights li { font-size:0.82rem; color:${C.muted}; display:flex; align-items:center; gap:0.45rem; }
    .fh-trail-highlights li::before { content:'🍽️'; font-size:0.72rem; }
    .fh-trail-btn { padding:0.65rem 1.2rem; border-radius:10px; border:none; background:${C.amber}; color:#000; font-weight:700; cursor:pointer; font-size:0.88rem; transition:filter 0.2s; }
    .fh-trail-btn:hover { filter:brightness(1.08); }

    .fh-recipe-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:1.5rem; }
    .fh-recipe-card { background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; overflow:hidden; transition:border-color 0.2s; }
    .fh-recipe-card:hover { border-color:rgba(245,158,11,0.4); }
    .fh-recipe-header { padding:1.25rem 1.5rem 0.75rem; display:flex; gap:0.9rem; align-items:flex-start; }
    .fh-recipe-name { font-size:1.1rem; font-weight:800; margin-bottom:0.35rem; }
    .fh-recipe-badges { display:flex; gap:0.4rem; flex-wrap:wrap; }
    .fh-badge { font-size:0.72rem; padding:2px 8px; border-radius:10px; font-weight:700; }
    .fh-badge-region { background:rgba(245,158,11,0.12); color:${C.amber}; }
    .fh-badge-cat { background:rgba(99,102,241,0.12); color:#818cf8; }
    .fh-badge-dynasty { background:rgba(16,185,129,0.12); color:#34d399; }
    .fh-recipe-heritage { margin:0 1.5rem 1rem; padding:0.75rem 1rem; background:rgba(245,158,11,0.06); border-left:3px solid ${C.amber}; border-radius:0 8px 8px 0; font-size:0.83rem; color:${C.muted}; font-style:italic; line-height:1.5; }
    .fh-recipe-meta { display:flex; gap:1rem; padding:0 1.5rem 0.9rem; font-size:0.78rem; color:${C.muted}; }
    .fh-recipe-toggle { width:100%; padding:0.75rem 1.5rem; background:rgba(245,158,11,0.06); border:none; border-top:1px solid ${C.border}; color:${C.amber}; font-weight:700; font-size:0.85rem; cursor:pointer; text-align:left; display:flex; justify-content:space-between; align-items:center; }
    .fh-recipe-body { padding:0 1.5rem 1.5rem; }
    .fh-recipe-section { margin-top:1rem; }
    .fh-recipe-section h4 { font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:${C.amber}; margin-bottom:0.45rem; }
    .fh-recipe-section ul, .fh-recipe-section ol { padding-left:1.2rem; margin:0; display:flex; flex-direction:column; gap:0.35rem; font-size:0.85rem; color:${C.muted}; line-height:1.5; }

    .fh-story-grid { display:flex; flex-direction:column; gap:1.25rem; max-width:860px; margin:0 auto; }
    .fh-story-card { background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; padding:1.75rem; }
    .fh-modal-backdrop { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:1.25rem; }
    .fh-modal { width:100%; max-width:640px; max-height:90vh; overflow-y:auto; background:${C.surface}; border:1px solid ${C.border}; border-radius:18px; }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="fh-root">
        <header className="fh-topbar">
          <Link to="/dashboard" className="fh-brand">
            <VoHLogo size={36} />
            <div>
              <div className="fh-title">Food Heritage &amp; Cuisine</div>
              <div className="fh-subtitle">India’s living gastronomic traditions</div>
            </div>
          </Link>
          <ThemeToggle />
        </header>

        <div className="fh-hero">
          <div className="fh-hero-emoji">🍛</div>
          <h1 className="fh-hero-title">Culinary Heritage of India</h1>
          <p className="fh-hero-sub">
            Discover regional culinary trails, royal &amp; temple recipes, and centuries-old spice stories woven into India’s heritage circuits.
          </p>
        </div>

        <nav className="fh-nav">
          <button className={`fh-nav-btn ${activeSection === 'trails' ? 'active' : ''}`} onClick={() => setActiveSection('trails')}>🗺️ Culinary Trails ({trails.length})</button>
          <button className={`fh-nav-btn ${activeSection === 'recipes' ? 'active' : ''}`} onClick={() => setActiveSection('recipes')}>📖 Heritage Recipes ({recipes.length})</button>
          <button className={`fh-nav-btn ${activeSection === 'regions' ? 'active' : ''}`} onClick={() => setActiveSection('regions')}>🌍 Regional Cuisines</button>
          <button className={`fh-nav-btn ${activeSection === 'stories' ? 'active' : ''}`} onClick={() => setActiveSection('stories')}>📜 Food Stories</button>
        </nav>

        {(activeSection === 'trails' || activeSection === 'recipes') && (
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
        )}

        <main className="fh-content">
          {/* ── TRAILS ── */}
          {activeSection === 'trails' && (
            filteredTrails.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', color: C.muted }}>🗺️ No culinary trails found for {selectedRegion}.</div>
            ) : (
              <div className="fh-trail-grid">
                {filteredTrails.map(trail => (
                  <div key={trail.id} className="fh-trail-card">
                    <div className="fh-card-img-wrap">
                      <img src={trail.image || FALLBACK_FOOD_IMG} alt={trail.name} onError={e => { (e.currentTarget as HTMLImageElement).src = FALLBACK_FOOD_IMG; }} />
                      <span className="fh-img-badge">{trail.emoji || '🍛'} {trail.city ? `${trail.city}, ` : ''}{trail.region}</span>
                      {trail.rating && <span className="fh-img-rating">⭐ {trail.rating}</span>}
                    </div>
                    <div className="fh-trail-body">
                      <div className="fh-trail-name">{trail.name}</div>
                      <p className="fh-trail-desc">{trail.description}</p>
                      <div className="fh-trail-meta">
                        <span>⏱️ {trail.duration}</span>
                        {trail.stops && <span>🏛️ {trail.stops} stops</span>}
                        {trail.cuisine && <span>🍽️ {trail.cuisine}</span>}
                        {trail.difficulty && <span>🥾 {trail.difficulty}</span>}
                      </div>
                      <ul className="fh-trail-highlights">
                        {(trail.highlights || []).slice(0, 4).map((h: string) => <li key={h}>{h}</li>)}
                      </ul>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                        <div style={{ fontWeight: 800, color: C.gold }}>₹{Number(trail.price || 1000).toLocaleString('en-IN')} / person</div>
                        <button className="fh-trail-btn" onClick={() => setSelectedTrail(trail)}>Explore Trail →</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── RECIPES ── */}
          {activeSection === 'recipes' && (
            filteredRecipes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', color: C.muted }}>📖 No heritage recipes found for this filter.</div>
            ) : (
              <div className="fh-recipe-grid">
                {filteredRecipes.map(recipe => {
                  const isOpen = expandedRecipe === String(recipe.id);
                  return (
                    <div key={recipe.id} className="fh-recipe-card">
                      {recipe.image && (
                        <div className="fh-card-img-wrap" style={{ height: '165px' }}>
                          <img src={recipe.image} alt={recipe.name} onError={e => { (e.currentTarget as HTMLImageElement).src = FALLBACK_FOOD_IMG; }} />
                          <span className="fh-img-badge">{recipe.emoji || '🍲'} {recipe.region}</span>
                        </div>
                      )}
                      <div className="fh-recipe-header">
                        <div style={{ flex: 1 }}>
                          <div className="fh-recipe-name">{recipe.name}</div>
                          <div className="fh-recipe-badges">
                            <span className="fh-badge fh-badge-region">{recipe.region}</span>
                            {recipe.category && <span className="fh-badge fh-badge-cat">{recipe.category}</span>}
                            {recipe.dynasty && <span className="fh-badge fh-badge-dynasty">{recipe.dynasty}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="fh-recipe-meta">
                        <span>⏱️ {recipe.time || recipe.cookTime || '45 min'}</span>
                        <span>📊 {recipe.difficulty || 'Medium'}</span>
                        {recipe.serves && <span>🍽️ Serves {recipe.serves}</span>}
                      </div>
                      {recipe.heritage && <div className="fh-recipe-heritage">{recipe.heritage}</div>}
                      <button className="fh-recipe-toggle" onClick={() => setExpandedRecipe(isOpen ? null : String(recipe.id))}>
                        <span>{isOpen ? '▲ Hide Recipe' : '▼ View Full Ingredients & Method'}</span>
                      </button>
                      {isOpen && (
                        <div className="fh-recipe-body">
                          <div className="fh-recipe-section">
                            <h4>Ingredients</h4>
                            <ul>{(recipe.ingredients || []).map((ing: string) => <li key={ing}>{ing}</li>)}</ul>
                          </div>
                          <div className="fh-recipe-section">
                            <h4>Traditional Method</h4>
                            <ol>{(recipe.steps || []).map((step: string, i: number) => <li key={i}>{step}</li>)}</ol>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ── REGIONAL CUISINES ── */}
          {activeSection === 'regions' && (
            <div className="fh-trail-grid">
              {(regionList.length > 0 ? regionList : REGIONS.slice(1).map((name, i) => ({ id: i, name, specialties: ['Regional Heritage'], famousDishes: [] }))).map((reg: any) => (
                <div key={reg.id || reg.name} className="fh-trail-card" style={{ padding: '1.5rem' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: C.amber, marginBottom: '0.6rem' }}>📍 {reg.name}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: '0.4rem' }}>Culinary Traditions</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                    {(reg.specialties || []).map((s: string) => (
                      <span key={s} className="fh-badge fh-badge-region">{s}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: '0.4rem' }}>Signature Dishes</div>
                  <ul className="fh-trail-highlights">
                    {(reg.famousDishes || []).map((d: string) => <li key={d}>{d}</li>)}
                  </ul>
                  <button
                    className="fh-trail-btn"
                    style={{ marginTop: 'auto' }}
                    onClick={() => { setSelectedRegion(reg.name); setActiveSection('trails'); }}
                  >
                    Explore {reg.name} Trails →
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── STORIES ── */}
          {activeSection === 'stories' && (
            <div className="fh-story-grid">
              {stories.map(story => (
                <div key={story.id || story.title} className="fh-story-card">
                  <div style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>{story.icon}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.65rem' }}>{story.title}</div>
                  <p style={{ fontSize: '0.94rem', color: C.muted, lineHeight: 1.75, margin: 0 }}>{story.text}</p>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* ── TRAIL DETAIL MODAL ── */}
        {selectedTrail && (
          <div className="fh-modal-backdrop" onClick={() => setSelectedTrail(null)}>
            <div className="fh-modal" onClick={e => e.stopPropagation()}>
              <div className="fh-card-img-wrap" style={{ height: '220px' }}>
                <img src={selectedTrail.image || FALLBACK_FOOD_IMG} alt={selectedTrail.name} onError={e => { (e.currentTarget as HTMLImageElement).src = FALLBACK_FOOD_IMG; }} />
                <button
                  onClick={() => setSelectedTrail(null)}
                  style={{ position: 'absolute', top: 14, right: 14, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
                >
                  ×
                </button>
                <span className="fh-img-badge">{selectedTrail.emoji || '🍛'} {selectedTrail.city ? `${selectedTrail.city}, ` : ''}{selectedTrail.region}</span>
              </div>
              <div style={{ padding: '1.65rem' }}>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 0.5rem' }}>{selectedTrail.name}</h2>
                <div className="fh-trail-meta">
                  <span>⏱️ {selectedTrail.duration}</span>
                  {selectedTrail.stops && <span>🏛️ {selectedTrail.stops} culinary stops</span>}
                  {selectedTrail.cuisine && <span>🍽️ {selectedTrail.cuisine}</span>}
                  <span>💰 ₹{Number(selectedTrail.price || 1000).toLocaleString('en-IN')} / person</span>
                </div>
                <p style={{ fontSize: '0.92rem', color: C.muted, lineHeight: 1.65, marginBottom: '1.25rem' }}>{selectedTrail.description}</p>

                {selectedTrail.itinerary && selectedTrail.itinerary.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: C.amber, marginBottom: '0.6rem' }}>Stop-by-Stop Tasting Itinerary</h4>
                    <ol style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.88rem', color: C.text }}>
                      {selectedTrail.itinerary.map((stop: string, i: number) => <li key={i}>{stop}</li>)}
                    </ol>
                  </div>
                )}

                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: C.amber, marginBottom: '0.6rem' }}>Featured Heritage Tastings</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                    {(selectedTrail.highlights || []).map((h: string) => (
                      <span key={h} className="fh-badge fh-badge-region">🍽️ {h}</span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    className="fh-chip"
                    onClick={() => { setSelectedRegion(selectedTrail.region); setSelectedTrail(null); setActiveSection('recipes'); }}
                  >
                    📖 View {selectedTrail.region} Recipes
                  </button>
                  <button
                    className="fh-trail-btn"
                    onClick={() => { setSelectedTrail(null); navigate(`/trip-planner`); }}
                  >
                    ✈️ Add to AI Trip Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
