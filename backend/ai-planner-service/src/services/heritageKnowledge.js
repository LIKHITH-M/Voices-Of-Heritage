/**
 * ai-planner-service/src/services/heritageKnowledge.js
 *
 * Authoritative Indian Heritage Knowledge Base & Geographic Circuit Engine.
 * Provides authentic, verified heritage hubs, distinct sub-sites, real coordinates,
 * opening hours, durations, and diverse evening cultural experiences.
 */

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return 0;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

const HERITAGE_HUBS = {
  hampi: {
    id: 'hampi',
    name: 'Hampi',
    displayName: 'Hampi (Vijayanagara UNESCO Ruins)',
    region: 'Karnataka',
    district: 'Vijayanagara',
    state: 'Karnataka',
    coordinates: { lat: 15.335, lng: 76.462 },
    synonyms: ['hampi', 'vijayanagara', 'hospet', 'hosapete', 'kishkindha', 'tungabhadra'],
    dynasty: 'Vijayanagara Dynasty (1336–1565 CE)',
    archStyle: ['Vijayanagara Dravidian', 'Rock-cut Granite', 'Indo-Islamic Secular'],
    subSites: [
      {
        siteId: 'hampi_virupaksha',
        name: 'Virupaksha Temple & Inverted Pin-Hole Chamber',
        category: 'temple',
        desc: 'Continuous 7th-century living shrine with a 50m eastern gopuram and rare inverted shadow chamber.',
        coordinates: { lat: 15.3353, lng: 76.4599 },
        duration: 2.0,
        entryFeeINR: 40,
        heritage_note: 'Active 7th-century Dravidian temple complex dedicated to Lord Shiva as Virupaksha.',
        preferenceMatchTag: 'Living Temple & Dravidian Architecture',
      },
      {
        siteId: 'hampi_vitthala',
        name: 'Vitthala Temple & Iconic Stone Chariot',
        category: 'monument',
        desc: 'UNESCO monument featuring the world-renowned Garuda Stone Chariot and 56 musical acoustic stone pillars.',
        coordinates: { lat: 15.3436, lng: 76.477 },
        duration: 2.5,
        entryFeeINR: 40,
        heritage_note: 'High-watermark of 16th-century Vijayanagara monolithic sculpture under Emperor Krishnadevaraya.',
        preferenceMatchTag: 'UNESCO World Heritage & Monolithic Art',
      },
      {
        siteId: 'hampi_hemakuta',
        name: 'Hemakuta Hill Monolithic Shrines',
        category: 'monument',
        desc: 'Cluster of 30+ pre-Vijayanagara triple-chambered rock sanctuaries perched on sloping granite boulders.',
        coordinates: { lat: 15.3328, lng: 76.4604 },
        duration: 1.5,
        entryFeeINR: 0,
        heritage_note: 'Early Kadamba and Rashtrakuta-influenced stepped pyramid rock shrines dating back to the 9th century.',
        preferenceMatchTag: 'Rock-cut Sanctuary & Panoramas',
      },
      {
        siteId: 'hampi_lotus_mahal',
        name: 'Lotus Mahal & Royal Elephant Stables',
        category: 'palace',
        desc: 'Two-storey secular pavilion blending Islamic cusped arches with recessed terracotta water conduits.',
        coordinates: { lat: 15.3204, lng: 76.4725 },
        duration: 2.0,
        entryFeeINR: 40,
        heritage_note: 'Fascinating fusion of Bahmani Sultanate vaulted masonry and Hindu stone base elements.',
        preferenceMatchTag: 'Indo-Islamic Royal Architecture',
      },
      {
        siteId: 'hampi_royal_enclosure',
        name: 'Royal Enclosure, Stepped Tank & Mahanavami Dibba',
        category: 'monument',
        desc: 'Administrative heart of the empire featuring a subterranean secret council chamber and Pushkarani stepwell.',
        coordinates: { lat: 15.3175, lng: 76.4718 },
        duration: 2.0,
        entryFeeINR: 0,
        heritage_note: 'Sophisticated 15th-century hydraulic engineering and military review platforms.',
        preferenceMatchTag: 'Ancient Hydraulic Engineering & Royal Ruins',
      },
      {
        siteId: 'hampi_achyutaraya',
        name: 'Achyutaraya Temple & Courtesan Street (Sule Bazaar)',
        category: 'temple',
        desc: 'Hidden valley temple built in 1534 CE, flanked by grand carved colonnades of the ancient gem bazaar.',
        coordinates: { lat: 15.3375, lng: 76.4715 },
        duration: 1.5,
        entryFeeINR: 0,
        heritage_note: 'Tiruvengalanatha shrine built during King Achyuta Deva Raya reign in seclusion below Matanga Hill.',
        preferenceMatchTag: 'Valley Shrines & Ancient Bazaars',
      },
      {
        siteId: 'hampi_krishna',
        name: 'Krishna Temple Complex & Carved Bazaar',
        category: 'temple',
        desc: 'Erected in 1513 CE by Krishnadevaraya after the Udayagiri campaign, carved with the 10 incarnations of Vishnu.',
        coordinates: { lat: 15.3289, lng: 76.4632 },
        duration: 1.5,
        entryFeeINR: 0,
        heritage_note: 'Commemorative victory temple with an ancient market street facing the sacred Pushkarani.',
        preferenceMatchTag: 'Commemorative Temple Sculpture',
      },
      {
        siteId: 'hampi_anegundi',
        name: 'Anegundi Historic Village & Chintamani Temple',
        category: 'craft',
        desc: 'Ancient fortified settlement older than Hampi, featuring traditional water-hyacinth banana-fiber weaving.',
        coordinates: { lat: 15.352, lng: 76.495 },
        duration: 2.0,
        entryFeeINR: 0,
        heritage_note: 'Maternal capital of Kishkindha described in the Ramayana with pre-Vijayanagara stone gateways.',
        preferenceMatchTag: 'Living Rural Heritage & Crafts',
      },
    ],
    eveningExperiences: [
      {
        activity: 'Sunset at Hemakuta Hill with Flute & Boulder Panoramas',
        location: 'Hemakuta Hill Ridge, Hampi',
        coordinates: { lat: 15.3328, lng: 76.4604 },
        desc: 'Watch the sun sink behind the Tungabhadra boulder sea with twilight echoes of local temple bells.',
        type: 'sunset',
        duration: 1.5,
        cost: 0,
      },
      {
        activity: 'Tungabhadra Coracle River Drift & Purandara Dasa Mandapa Walk',
        location: 'Tungabhadra River Ghat, Vitthala Trail',
        coordinates: { lat: 15.341, lng: 76.474 },
        desc: 'Traditional round woven boat journey past riverside monolithic Shiva lingas and carved boulders.',
        type: 'cultural_experience',
        duration: 1.5,
        cost: 300,
      },
      {
        activity: 'Virupaksha Evening Aarti & Sacred Elephant Lakshmi Blessing',
        location: 'Virupaksha Temple Courtyard, Hampi',
        coordinates: { lat: 15.3353, lng: 76.4599 },
        desc: 'Participate in the atmospheric evening camphor aarti and witness centuries-old temple rituals.',
        type: 'cultural_experience',
        duration: 1.5,
        cost: 50,
      },
      {
        activity: 'Anegundi Heritage Guild & Rural Banana Fiber Artisan Workshop',
        location: 'Anegundi Artisan Guild, Kishkindha Trust',
        coordinates: { lat: 15.352, lng: 76.495 },
        desc: 'Meet local women artisans reviving ancient stone-house living traditions and natural-fiber handicrafts.',
        type: 'craft',
        duration: 1.5,
        cost: 200,
      },
    ],
    cuisines: ['North Karnataka Jolada Rotti with Yennegai', 'Hampi Banana Flower Curry', 'Authentic Filter Coffee'],
  },

  mysore: {
    id: 'mysore',
    name: 'Mysore',
    displayName: 'Mysuru (Mysore Royal Heritage)',
    region: 'Karnataka',
    district: 'Mysuru',
    state: 'Karnataka',
    coordinates: { lat: 12.305, lng: 76.655 },
    synonyms: ['mysore', 'mysuru', 'mysore palace', 'mysuru palace', 'chamundi', 'srirangapatna', 'wodeyar'],
    dynasty: 'Wodeyar Dynasty (1399–1950 CE)',
    archStyle: ['Indo-Saracenic', 'Dravidian', 'Hoysala Revival'],
    subSites: [
      {
        siteId: 'mysore_palace_core',
        name: 'Mysore Palace Durbar Halls & Golden Howdah',
        category: 'palace',
        desc: 'Indo-Saracenic masterpiece designed by Henry Irwin, with rose-glass peacock domes and the 750kg gold throne.',
        coordinates: { lat: 12.3052, lng: 76.655 },
        duration: 2.5,
        entryFeeINR: 100,
        heritage_note: 'Royal seat of the Wodeyars featuring cast-iron pillars from Glasgow and glazed Belgian tiles.',
        preferenceMatchTag: 'Royal Indo-Saracenic Palace Architecture',
      },
      {
        siteId: 'mysore_jaganmohan',
        name: 'Jaganmohan Palace & Sri Jayachamarajendra Art Gallery',
        category: 'museum',
        desc: '1861 royal wooden palace housing masterworks by Raja Ravi Varma and antique musical clocks.',
        coordinates: { lat: 12.3082, lng: 76.649 },
        duration: 2.0,
        entryFeeINR: 75,
        heritage_note: 'Former royal residence during palace reconstruction, celebrating 19th-century Mysore school of painting.',
        preferenceMatchTag: 'Classical Indian Art & Royal Museums',
      },
      {
        siteId: 'mysore_chamundi',
        name: 'Chamundeshwari Temple & Monolithic Nandi',
        category: 'temple',
        desc: 'Dravidian temple atop Chamundi Hill (1,000m) with an ancient 1,008-step stone stairway and a 5m monolithic Nandi.',
        coordinates: { lat: 12.275, lng: 76.67 },
        duration: 2.0,
        entryFeeINR: 50,
        heritage_note: 'Patron deity of the Wodeyar kings dedicated to Durga slaying the demon Mahishasura.',
        preferenceMatchTag: 'Hilltop Sacred Shrines & Monolithic Sculptures',
      },
      {
        siteId: 'mysore_srirangapatna',
        name: 'Srirangapatna Island Fortress & Dariya Daulat Bagh',
        category: 'monument',
        desc: 'Historic river island capital of Tipu Sultan with teakwood summer palace murals and French-engineered ramparts.',
        coordinates: { lat: 12.421, lng: 76.685 },
        duration: 2.5,
        entryFeeINR: 40,
        heritage_note: '18th-century defensive island citadel on the Kaveri River documenting Anglo-Mysore military heritage.',
        preferenceMatchTag: 'Fortified River Citadels & Frescoes',
      },
      {
        siteId: 'mysore_somnathpur',
        name: 'Keshava Temple Somanathapura',
        category: 'temple',
        desc: 'Trikuta (triple-shrine) Hoysala star-shaped temple built in 1268 CE carved completely from chloritic schist soapstone.',
        coordinates: { lat: 12.276, lng: 76.882 },
        duration: 2.0,
        entryFeeINR: 40,
        heritage_note: 'UNESCO World Heritage listed summit of mature Hoysala lathe-turned pillars and intricate ceiling rosettes.',
        preferenceMatchTag: 'UNESCO Hoysala Soapstone Filigree',
      },
      {
        siteId: 'mysore_devaraja_market',
        name: 'Century-Old Devaraja Heritage Market',
        category: 'market',
        desc: 'Historic market operating since Tipu Sultan era, famous for fragrant Mysore Mallige jasmine and sandalwood oils.',
        coordinates: { lat: 12.311, lng: 76.652 },
        duration: 1.5,
        entryFeeINR: 0,
        heritage_note: 'Living bazaar heritage showcasing centuries-old community trade in royal perfumes and betel leaves.',
        preferenceMatchTag: 'Living Traditional Bazaar Heritage',
      },
    ],
    eveningExperiences: [
      {
        activity: 'Mysore Palace Twilight Illumination & Royal Courtyard Walk',
        location: 'Mysore Palace Outer Courtyard',
        coordinates: { lat: 12.3052, lng: 76.655 },
        desc: 'Witness 100,000 incandescent bulbs illuminate the grand facade against the twilight sky with classical fanfare.',
        type: 'cultural_experience',
        duration: 1.5,
        cost: 100,
      },
      {
        activity: 'Devaraja Market Heritage Walk: Traditional Perfumers & Jasmine Lanes',
        location: 'Devaraja Market North Entrance',
        coordinates: { lat: 12.311, lng: 76.652 },
        desc: 'Sensory twilight exploration of traditional attar distillation, fresh Mysore Pak tasting, and floral auctions.',
        type: 'food_and_market',
        duration: 1.5,
        cost: 150,
      },
      {
        activity: 'Chamundi Hill Twilight Panoramic Viewpoint & Nandi Trail',
        location: 'Chamundi Viewpoint, Mysuru',
        coordinates: { lat: 12.275, lng: 76.67 },
        desc: 'Overlook the illuminated grid city of Mysuru from the cool hilltop breeze by the sacred monolithic Nandi.',
        type: 'sunset',
        duration: 1.5,
        cost: 0,
      },
      {
        activity: 'Kaveri River Twilight Ghat & Ganjam Heritage Weaver Encounter',
        location: 'Kaveri Sangam & Ganjam Village, Srirangapatna',
        coordinates: { lat: 12.421, lng: 76.685 },
        desc: 'Observe traditional silk weavers operating wooden shuttle looms and evening lamps by the Kaveri confluence.',
        type: 'craft',
        duration: 1.5,
        cost: 200,
      },
    ],
    cuisines: ['Authentic Melt-in-Mouth Mysore Pak', 'Mylari Butter Dosa with Coconut Chutney', 'Traditional Royal Mysore Rasam'],
  },

  belur: {
    id: 'belur',
    name: 'Belur & Halebidu',
    displayName: 'Belur & Halebidu (Sacred Hoysala Ensembles)',
    region: 'Karnataka',
    district: 'Hassan',
    state: 'Karnataka',
    coordinates: { lat: 13.162, lng: 75.864 },
    synonyms: ['belur', 'beluru', 'halebidu', 'halebeedu', 'hassan', 'hoysala', 'chennakeshava'],
    dynasty: 'Hoysala Empire (1026–1343 CE)',
    archStyle: ['Hoysala Architecture', 'Chloritic Schist Filigree', 'Stellate Vimana'],
    subSites: [
      {
        siteId: 'belur_chennakeshava',
        name: 'Chennakeshava Temple Complex Belur',
        category: 'temple',
        desc: 'Commissioned by King Vishnuvardhana in 1117 CE to mark victory over Cholas; features 42 Darpana Sundari bracket figures.',
        coordinates: { lat: 13.1623, lng: 75.8596 },
        duration: 2.5,
        entryFeeINR: 40,
        heritage_note: 'UNESCO World Heritage monument showcasing unsurpassed microscopic soapstone jewelry carving.',
        preferenceMatchTag: 'UNESCO Hoysala Masterpiece & Stone Filigree',
      },
      {
        siteId: 'belur_kappe_chennigaraya',
        name: 'Kappe Chennigaraya & Pushkarani Water Pavilion',
        category: 'temple',
        desc: 'Companion shrine built by Queen Shantala Devi featuring exquisite bracket maidens and stepped stone water tank.',
        coordinates: { lat: 13.1626, lng: 75.8601 },
        duration: 1.5,
        entryFeeINR: 0,
        heritage_note: 'Rare royal patron shrine dedicated by the Hoysala queen celebrating dance and music iconography.',
        preferenceMatchTag: 'Classical Iconography & Sacred Tanks',
      },
      {
        siteId: 'halebidu_hoysaleshwara',
        name: 'Hoysaleshwara Temple Halebidu',
        category: 'temple',
        desc: 'Twin star-shaped Shiva temples with 240+ continuous frieze meters of elephants, lions, cavalry, and celestial epics.',
        coordinates: { lat: 13.2139, lng: 75.9947 },
        duration: 2.5,
        entryFeeINR: 40,
        heritage_note: 'Pinnacle of Hoysala twin-sanctum architecture flanking twin monolithic outdoor Nandi pavilions.',
        preferenceMatchTag: 'Twin Stellate Temples & Epic Narrative Friezes',
      },
      {
        siteId: 'halebidu_jain_basadi',
        name: 'Parshvanatha Basadi & Mirrored Pillar Hall',
        category: 'temple',
        desc: '12th-century Jain sanctuary famous for highly polished black stone pillars that reflect inverted viewer silhouettes.',
        coordinates: { lat: 13.2105, lng: 75.9912 },
        duration: 1.5,
        entryFeeINR: 0,
        heritage_note: 'Exemplary of Hoysala religious pluralism and mastery over precision stone lathe polishing.',
        preferenceMatchTag: 'Jain Heritage & Acoustic Polished Pillars',
      },
      {
        siteId: 'belur_kedareswara',
        name: 'Kedareshwara Temple & Yagachi River Overlook',
        category: 'monument',
        desc: 'Exquisite star-shaped shrine built by King Veera Ballala II on a raised platform near the Yagachi waters.',
        coordinates: { lat: 13.215, lng: 75.998 },
        duration: 1.5,
        entryFeeINR: 0,
        heritage_note: 'Charming jewel of 13th-century soapstone miniature spires and dancing Shiva relief panels.',
        preferenceMatchTag: 'Miniature Stellate Shrines & Riverfronts',
      },
    ],
    eveningExperiences: [
      {
        activity: 'Hoysala Soapstone Sculptor Guild & Modern Artisan Chisel Demo',
        location: 'Belur Master Sculptor Guild, Car Street',
        coordinates: { lat: 13.163, lng: 75.861 },
        desc: 'Watch hereditary stone carvers shape local soapstone into Hoysala figurines using centuries-old chisel methods.',
        type: 'craft',
        duration: 1.5,
        cost: 200,
      },
      {
        activity: 'Dwarasamudra Ancient Reservoir Twilight Walk & Bird Watch',
        location: 'Halebidu Ancient Tank Embankment',
        coordinates: { lat: 13.216, lng: 75.997 },
        desc: 'Gentle walk on the medieval earthen dam built by the Hoysala kings to supply the capital citadel.',
        type: 'sunset',
        duration: 1.5,
        cost: 0,
      },
      {
        activity: 'Yagachi Riverfront Sunset Walk & Local Hassan Coffee Tasting',
        location: 'Yagachi Embankment, Belur',
        coordinates: { lat: 13.168, lng: 75.855 },
        desc: 'Relax by the tranquil river waters sampling freshly roasted Western Ghats estate coffee and akki rotti.',
        type: 'food_and_market',
        duration: 1.5,
        cost: 150,
      },
    ],
    cuisines: ['Hassan Style Akki Rotti with Coconut Chutney', 'Traditional Malnad Jackfruit Curry', 'Freshly Brewed Malnad Filter Coffee'],
  },

  badami: {
    id: 'badami',
    name: 'Badami & Pattadakal',
    displayName: 'Badami, Pattadakal & Aihole (Chalukyan Cradle)',
    region: 'Karnataka',
    district: 'Bagalkot',
    state: 'Karnataka',
    coordinates: { lat: 15.918, lng: 75.676 },
    synonyms: ['badami', 'pattadakal', 'aihole', 'bagalkot', 'chalukya', 'vatapi'],
    dynasty: 'Early Chalukya Dynasty (543–753 CE)',
    archStyle: ['Rock-Cut Caves', 'Vesara Hybrid', 'Dravidian & Nagara Fusion'],
    subSites: [
      {
        siteId: 'badami_caves',
        name: 'Badami Rock-Cut Cave Temples (Caves 1–4)',
        category: 'monument',
        desc: 'Four cliff-side sanctuaries carved into red sandstone, featuring the iconic 18-armed dancing Nataraja.',
        coordinates: { lat: 15.9189, lng: 75.6772 },
        duration: 2.5,
        entryFeeINR: 40,
        heritage_note: '6th-century rock-cut engineering celebrating Vedic and Jain iconography overlooking Agastya Lake.',
        preferenceMatchTag: 'Early Chalukyan Rock-Cut Architecture',
      },
      {
        siteId: 'badami_bhutanatha',
        name: 'Bhutanatha Temple Complex by Agastya Lake',
        category: 'temple',
        desc: 'Sandstone temple extending into the sacred waters, mirrored against towering red cliff crags.',
        coordinates: { lat: 15.9208, lng: 75.6861 },
        duration: 1.5,
        entryFeeINR: 0,
        heritage_note: 'Picturesque transition from early rock carving to structural sandstone masonry in 7th century.',
        preferenceMatchTag: 'Waterside Sandstone Shrines',
      },
      {
        siteId: 'pattadakal_complex',
        name: 'Pattadakal UNESCO World Heritage Complex',
        category: 'monument',
        desc: 'Coronation site of Chalukyan kings with 10 monumental temples harmonizing northern Nagara and southern Dravidian styles.',
        coordinates: { lat: 15.9486, lng: 75.8161 },
        duration: 2.5,
        entryFeeINR: 40,
        heritage_note: 'UNESCO World Heritage masterpiece featuring Virupaksha and Mallikarjuna commemorative victory shrines.',
        preferenceMatchTag: 'UNESCO Architectural Fusion & Royal Coronations',
      },
      {
        siteId: 'aihole_durga',
        name: 'Aihole Durga Temple & Archaeological Museum',
        category: 'monument',
        desc: 'Cradle of Indian temple architecture featuring a unique apsidal (Buddhist Chaitya-inspired) pillared colonnade.',
        coordinates: { lat: 16.0211, lng: 75.8819 },
        duration: 2.0,
        entryFeeINR: 40,
        heritage_note: 'Over 120 stone experimental temples dating from the 5th to 12th century CE.',
        preferenceMatchTag: 'Experimental Temple Architecture & Apsidal Sanctuaries',
      },
    ],
    eveningExperiences: [
      {
        activity: 'Agastya Lake Sandstone Sunset & Cliff Reflection Walk',
        location: 'North Fort Trail, Agastya Lake, Badami',
        coordinates: { lat: 15.921, lng: 75.682 },
        desc: 'Watch golden hour turn the sandstone cliffs crimson over the tranquil reservoir waters.',
        type: 'sunset',
        duration: 1.5,
        cost: 0,
      },
      {
        activity: 'Ilkal Handloom Sari Weaver Village Encounter',
        location: 'Ilkal Weavers Quarter, Badami Road',
        coordinates: { lat: 15.95, lng: 75.8 },
        desc: 'Witness traditional weavers craft the famous red-silk Tope Teni pallu saris on hand looms.',
        type: 'craft',
        duration: 1.5,
        cost: 100,
      },
    ],
    cuisines: ['North Karnataka Kadak Jowar Rotti with Shenga Chutney', 'Badami Kardi Chutney', 'Traditional Shenga Holige'],
  },

  jaipur: {
    id: 'jaipur',
    name: 'Jaipur',
    displayName: 'Jaipur (Pink City UNESCO World Heritage)',
    region: 'Rajasthan',
    district: 'Jaipur',
    state: 'Rajasthan',
    coordinates: { lat: 26.912, lng: 75.787 },
    synonyms: ['jaipur', 'pink city', 'amber fort', 'amer', 'hawa mahal', 'jantar mantar'],
    dynasty: 'Kachhwaha Rajput Dynasty (1093–1949 CE)',
    archStyle: ['Rajput Fort Architecture', 'Mughal-Rajput Fusion', 'Astronomical Masonry'],
    subSites: [
      {
        siteId: 'jaipur_amber_fort',
        name: 'Amber Fort & Sheesh Mahal (Mirror Palace)',
        category: 'palace',
        desc: 'Majestic hilltop sandstone and marble citadel overlooking Maota Lake, famous for thousands of concave Belgian mirrors.',
        coordinates: { lat: 26.9855, lng: 75.8513 },
        duration: 3.0,
        entryFeeINR: 100,
        heritage_note: '16th-century capital of Raja Man Singh I combining Rajput military fortifications with Mughal gardens.',
        preferenceMatchTag: 'UNESCO Hill Fort & Royal Sheesh Mahal',
      },
      {
        siteId: 'jaipur_hawa_mahal',
        name: 'Hawa Mahal (Palace of Winds)',
        category: 'palace',
        desc: 'Five-storey pink sandstone facade with 953 honeycomb lattice jharokhas designed for natural air conditioning.',
        coordinates: { lat: 26.9239, lng: 75.8267 },
        duration: 1.5,
        entryFeeINR: 50,
        heritage_note: 'Built in 1799 by Maharaja Sawai Pratap Singh allowing royal women to observe street processions unseen.',
        preferenceMatchTag: 'Iconic Rajput Filigree Architecture',
      },
      {
        siteId: 'jaipur_city_palace',
        name: 'City Palace & Chandra Mahal Courtyards',
        category: 'palace',
        desc: 'Royal residence showcasing peacock mosaic courtyards, giant silver urns (Gangajalis), and royal costume armouries.',
        coordinates: { lat: 26.9258, lng: 75.8236 },
        duration: 2.0,
        entryFeeINR: 200,
        heritage_note: 'Founded in 1727 by Sawai Jai Singh II combining Shilpa Shastra grid planning with Mughal courtyards.',
        preferenceMatchTag: 'Living Royal Palaces & Museums',
      },
      {
        siteId: 'jaipur_jantar_mantar',
        name: 'Jantar Mantar UNESCO Astronomical Observatory',
        category: 'monument',
        desc: 'Collection of 19 monumental stone instruments including the world’s largest stone sundial (Samrat Yantra).',
        coordinates: { lat: 26.9248, lng: 75.8246 },
        duration: 1.5,
        entryFeeINR: 50,
        heritage_note: 'UNESCO World Heritage site demonstrating 18th-century mastery of naked-eye celestial calculation.',
        preferenceMatchTag: 'Scientific Heritage & Stone Observatories',
      },
    ],
    eveningExperiences: [
      {
        activity: 'Nahargarh Fort Sunset Panorama over the Pink City',
        location: 'Nahargarh Fort Ridge, Jaipur',
        coordinates: { lat: 26.938, lng: 75.815 },
        desc: 'Watch the entire pink grid city light up beneath the Aravali hills as the sun sets over the desert plains.',
        type: 'sunset',
        duration: 1.5,
        cost: 50,
      },
      {
        activity: 'Johari Bazaar Traditional Block Printing & Gemstone Alley Walk',
        location: 'Johari Bazaar, Jaipur Old City',
        coordinates: { lat: 26.921, lng: 75.827 },
        desc: 'Explore hereditary blue pottery, tie-dye bandhani textiles, and master silversmith lanes.',
        type: 'craft',
        duration: 1.5,
        cost: 100,
      },
    ],
    cuisines: ['Jaipur Dal Baati Churma with Ghee', 'Pyaz Kachori from Rawat Mishthan Bhandar', 'Cooling Kulhad Lassi'],
  },

  delhi: {
    id: 'delhi',
    name: 'Delhi',
    displayName: 'Delhi (Seven Imperial Cities)',
    region: 'Delhi',
    district: 'Central Delhi',
    state: 'Delhi',
    coordinates: { lat: 28.6139, lng: 77.209 },
    synonyms: ['delhi', 'new delhi', 'qutub minar', 'red fort', 'humayun tomb', 'chandni chowk'],
    dynasty: 'Delhi Sultanate & Mughal Dynasty',
    archStyle: ['Indo-Islamic', 'Mughal Charbagh', 'Sultanate Stone Masonry'],
    subSites: [
      {
        siteId: 'delhi_qutub_minar',
        name: 'Qutub Minar & Iron Pillar Complex',
        category: 'monument',
        desc: '73m fluted brick minaret built in 1192 CE alongside the rust-resistant 4th-century Gupta iron pillar.',
        coordinates: { lat: 28.5245, lng: 77.1855 },
        duration: 2.0,
        entryFeeINR: 40,
        heritage_note: 'UNESCO World Heritage landmark marking the foundation of the Delhi Sultanate.',
        preferenceMatchTag: 'UNESCO Sultanate Architecture & Metallurgy',
      },
      {
        siteId: 'delhi_humayun_tomb',
        name: 'Humayun’s Tomb & Charbagh Water Gardens',
        category: 'monument',
        desc: 'Grand red sandstone garden tomb built in 1570 CE, directly inspiring the design of the Taj Mahal.',
        coordinates: { lat: 28.5933, lng: 77.2507 },
        duration: 2.0,
        entryFeeINR: 40,
        heritage_note: 'First substantial example of Mughal architecture in the Indian subcontinent.',
        preferenceMatchTag: 'Mughal Charbagh Garden Tomb',
      },
      {
        siteId: 'delhi_red_fort',
        name: 'Red Fort (Lal Qila) & Diwan-i-Khas',
        category: 'palace',
        desc: 'Massive red sandstone fortification of Shahjahanabad with the marble Stream of Paradise pavilions.',
        coordinates: { lat: 28.6562, lng: 77.241 },
        duration: 2.5,
        entryFeeINR: 50,
        heritage_note: 'Seat of the Mughal Empire for two centuries, designed by Ustad Ahmad Lahori in 1638 CE.',
        preferenceMatchTag: 'Imperial Mughal Citadel Architecture',
      },
    ],
    eveningExperiences: [
      {
        activity: 'Chandni Chowk Heritage Rickshaw Trail & Historic Paranthe Wali Gali',
        location: 'Chandni Chowk, Old Delhi',
        coordinates: { lat: 28.6506, lng: 77.2303 },
        desc: 'Centuries-old evening culinary and spice exploration through the lanes of 17th-century Shahjahanabad.',
        type: 'food_and_market',
        duration: 1.5,
        cost: 250,
      },
    ],
    cuisines: ['Old Delhi Mughlai Biryani', 'Stuffed Parathas of Paranthe Wali Gali', 'Rich Shahi Tukda with Rabri'],
  },

  agra: {
    id: 'agra',
    name: 'Agra',
    displayName: 'Agra (Mughal Imperial Heart)',
    region: 'Uttar Pradesh',
    district: 'Agra',
    state: 'Uttar Pradesh',
    coordinates: { lat: 27.1751, lng: 78.0421 },
    synonyms: ['agra', 'taj mahal', 'fatehpur sikri', 'agra fort'],
    dynasty: 'Mughal Dynasty (1526–1857 CE)',
    archStyle: ['Mughal High Classical', 'Pietra Dura Marble Inlay', 'Red Sandstone Fortification'],
    subSites: [
      {
        siteId: 'agra_taj_mahal',
        name: 'Taj Mahal & Yamuna River Vista',
        category: 'monument',
        desc: 'White Makrana marble mausoleum built by Shah Jahan with intricate semi-precious stone Pietra Dura inlay.',
        coordinates: { lat: 27.1751, lng: 78.0421 },
        duration: 3.0,
        entryFeeINR: 50,
        heritage_note: 'UNESCO World Heritage wonder of the world representing the pinnacle of Mughal art and symmetry.',
        preferenceMatchTag: 'UNESCO World Wonder & Pietra Dura Marble',
      },
      {
        siteId: 'agra_fort',
        name: 'Agra Fort & Khas Mahal',
        category: 'palace',
        desc: 'Crescent-shaped imperial brick-and-sandstone citadel housing the Jahangiri Mahal and Musamman Burj.',
        coordinates: { lat: 27.1795, lng: 78.0211 },
        duration: 2.5,
        entryFeeINR: 50,
        heritage_note: 'Chief residence of Emperors Akbar, Jahangir, and Shah Jahan.',
        preferenceMatchTag: 'Imperial Mughal Fortification',
      },
      {
        siteId: 'agra_fatehpur_sikri',
        name: 'Fatehpur Sikri & Buland Darwaza',
        category: 'monument',
        desc: 'Emperor Akbar’s preserved 1571 red sandstone capital with the 54m high Victory Gate and Salim Chishti shrine.',
        coordinates: { lat: 27.0945, lng: 77.6675 },
        duration: 2.5,
        entryFeeINR: 50,
        heritage_note: 'Masterpiece of planned Renaissance-era urbanism celebrating religious tolerance.',
        preferenceMatchTag: 'UNESCO Planned Imperial City',
      },
    ],
    eveningExperiences: [
      {
        activity: 'Mehtab Bagh Twilight Taj Reflection Across the Yamuna',
        location: 'Mehtab Bagh Gardens, Agra',
        coordinates: { lat: 27.18, lng: 78.042 },
        desc: 'Watch the sunset cast soft gold and violet hues over the marble domes from across the quiet riverbank.',
        type: 'sunset',
        duration: 1.5,
        cost: 50,
      },
    ],
    cuisines: ['Agra Petha (Kesar & Angoori)', 'Bedmi Puri with Aloo Sabzi', 'Mughlai Shahi Paneer'],
  },
};

/**
 * Normalizes query string and resolves matching destination hubs.
 * If query contains multiple places (e.g. "mysuru palace,hampi, beluru"),
 * returns ALL matching hubs strictly without injecting unwanted locations.
 */
function parseDestinationScope(destinationQuery) {
  if (!destinationQuery || typeof destinationQuery !== 'string') {
    return [];
  }

  const queryLower = destinationQuery.toLowerCase();
  const tokens = destinationQuery
    .split(/[,;&+]+|\band\b/i)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const matchedHubs = [];
  const addedIds = new Set();

  for (const token of tokens) {
    for (const [hubId, hub] of Object.entries(HERITAGE_HUBS)) {
      if (addedIds.has(hubId)) continue;
      const isMatch =
        hub.synonyms.some((syn) => token.includes(syn) || syn.includes(token)) ||
        hub.name.toLowerCase().includes(token) ||
        token.includes(hub.id);

      if (isMatch) {
        matchedHubs.push(hub);
        addedIds.add(hubId);
      }
    }
  }

  // If no token matched, search whole query string
  if (matchedHubs.length === 0) {
    for (const [hubId, hub] of Object.entries(HERITAGE_HUBS)) {
      if (addedIds.has(hubId)) continue;
      const isMatch = hub.synonyms.some((syn) => queryLower.includes(syn));
      if (isMatch) {
        matchedHubs.push(hub);
        addedIds.add(hubId);
      }
    }
  }

  return matchedHubs;
}

/**
 * Orders hubs geographically to minimize travel distance and eliminate backtracking.
 * e.g. Hampi (North) -> Belur (Central) -> Mysore (South)
 */
function orderHubsGeographically(hubs) {
  if (hubs.length <= 1) return hubs;

  // Simple traveling-salesperson nearest neighbor starting from northernmost or westernmost hub
  const remaining = [...hubs];
  remaining.sort((a, b) => b.coordinates.lat - a.coordinates.lat); // Start North

  const route = [remaining.shift()];
  while (remaining.length > 0) {
    const current = route[route.length - 1];
    let nearestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineDistanceKm(
        current.coordinates.lat,
        current.coordinates.lng,
        remaining[i].coordinates.lat,
        remaining[i].coordinates.lng
      );
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }
    route.push(remaining.splice(nearestIdx, 1)[0]);
  }
  return route;
}

/**
 * Allocates trip days across the ordered hubs proportionally.
 * e.g. 5 days across [Hampi, Belur, Mysore] -> [Hampi (2), Belur (1), Mysore (2)]
 */
function allocateDaysToHubs(orderedHubs, totalDays) {
  const n = orderedHubs.length;
  if (n === 0 || totalDays < n) return [];
  const daysPerHub = new Array(n).fill(1);
  let remainingDays = totalDays - n;

  // Distribute remaining days prioritizing hubs with more sub-sites
  let idx = 0;
  while (remainingDays > 0) {
    daysPerHub[idx % n]++;
    remainingDays--;
    idx++;
  }

  const dayAllocation = [];
  for (let i = 0; i < n; i++) {
    for (let d = 0; d < daysPerHub[i]; d++) {
      dayAllocation.push({
        hub: orderedHubs[i],
        dayInHub: d + 1,
        totalDaysInHub: daysPerHub[i],
      });
    }
  }
  return dayAllocation;
}

module.exports = {
  HERITAGE_HUBS,
  parseDestinationScope,
  orderHubsGeographically,
  allocateDaysToHubs,
  haversineDistanceKm,
};

