/**
 * research-service/scripts/seedHeritageSites.js
 *
 * Seeds the MongoDB `heritagesites` collection from frontend/src/data/heritageSites.ts.
 * Idempotent: uses upsert based on `siteId`.
 * Also calculates nearby sites based on Haversine distance (< 150 km).
 *
 * Usage:
 *   node scripts/seedHeritageSites.js
 */

require('dotenv').config({ path: '../../.env' });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/voices_heritage';
const HeritageSite = require('../src/models/heritageSite.model');

// ─── Haversine Distance Helper ────────────────────────────────────────────────

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// ─── Attribute Extractors ─────────────────────────────────────────────────────

const KNOWN_ARCH_STYLES = [
  'Dravidian', 'Nagara', 'Vesara', 'Indo-Islamic', 'Mughal', 'Rajput',
  'Rock-cut', 'Chola', 'Hoysala', 'Vijayanagara', 'Kalinga', 'Cave Architecture',
  'Colonial', 'Buddhist', 'Jain', 'Gothic', 'Islamic', 'Granite Monolithic',
];

const KNOWN_DYNASTIES = [
  'Vijayanagara', 'Mughal', 'Chola', 'Pallava', 'Hoysala', 'Chalukya',
  'Rashtrakuta', 'Maurya', 'Gupta', 'Rajput', 'Maratha', 'Kalachuri',
  'Eastern Ganga', 'Chandela', 'Sultanate', 'Pandya', 'Kakatiya', 'Bahmani',
];

function extractArchStyles(site) {
  const text = `${site.type} ${(site.tags || []).join(' ')} ${(site.category || []).join(' ')} ${site.desc || ''} ${site.subtitle || ''}`;
  const matched = [];
  for (const style of KNOWN_ARCH_STYLES) {
    if (new RegExp(`\\b${style}\\b`, 'i').test(text)) {
      matched.push(style);
    }
  }
  return matched.length ? matched : ['Classical Indian'];
}

function extractDynasties(site) {
  const text = `${site.established || ''} ${site.desc || ''} ${site.longDesc || ''} ${site.subtitle || ''}`;
  const matched = [];
  for (const dyn of KNOWN_DYNASTIES) {
    if (new RegExp(`\\b${dyn}\\b`, 'i').test(text)) {
      matched.push(dyn);
    }
  }
  return matched;
}

function parseEntryFee(feeStr) {
  if (!feeStr || /free/i.test(feeStr)) return 0;
  const match = feeStr.match(/₹\s*(\d+)/);
  return match ? parseInt(match[1], 10) : 40;
}

function parseDurationHours(durationStr) {
  if (!durationStr) return 2.5;
  if (/half/i.test(durationStr)) return 3.5;
  if (/day/i.test(durationStr)) return 6.0;
  const match = durationStr.match(/(\d+)\s*(?:–|-)?\s*(\d+)?\s*hr/i);
  if (match) {
    const min = parseFloat(match[1]);
    const max = match[2] ? parseFloat(match[2]) : min;
    return (min + max) / 2;
  }
  return 2.5;
}

// ─── Extract Sites from frontend/src/data/heritageSites.ts ────────────────────

function loadRawSites() {
  const filePath = path.resolve(__dirname, '../../../frontend/src/data/heritageSites.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  const startIdx = content.indexOf('export const INITIAL_SITES: HeritageSite[] = [');
  if (startIdx === -1) {
    throw new Error('Could not find INITIAL_SITES in heritageSites.ts');
  }
  const endIdx = content.indexOf('];', startIdx) + 1;
  const arrayStr = content.slice(content.indexOf('[', startIdx), endIdx);
  // eslint-disable-next-line no-eval
  return eval(arrayStr);
}

// ─── Main Seed Execution ──────────────────────────────────────────────────────

async function seed() {
  console.log('[seed] Reading sites from frontend/src/data/heritageSites.ts...');
  const rawSites = loadRawSites();
  console.log(`[seed] Loaded ${rawSites.length} raw heritage sites.`);

  const transformedSites = rawSites.map(s => {
    return {
      siteId: s.id,
      name: s.name,
      subtitle: s.subtitle || '',
      region: s.state, // Map state to region for contextPack compatibility
      state: s.state,
      district: s.district || '',
      archStyle: extractArchStyles(s),
      dynasty: extractDynasties(s),
      period: s.established ? [s.established] : [],
      siteCategory: (s.category && s.category[0]) || s.type || 'Monuments',
      knownFor: s.tags || [],
      tags: s.tags || [],
      unescoStatus: /unesco/i.test(s.type || '') ? 'world_heritage' : 'none',
      entryFeeINR: parseEntryFee(s.entryFee),
      avgVisitDurationHours: parseDurationHours(s.duration),
      bestTimeToVisit: s.bestTime || 'Oct – Mar',
      timings: s.timings || '9:00 AM – 5:00 PM',
      commonActivities: (s.experiences || []).map(e => e.title),
      localCuisine: (s.food || []).map(f => f.name),
      coordinates: {
        lat: s.lat,
        lng: s.lng,
      },
      nearbySites: [], // computed below
      isActive: true,
      rating: s.rating || 4.5,
      reviews: s.reviews || 100,
      highlights: s.highlights || [],
      desc: s.desc || '',
      longDesc: s.longDesc || '',
    };
  });

  // Calculate nearby sites (< 150 km)
  for (let i = 0; i < transformedSites.length; i++) {
    const siteA = transformedSites[i];
    for (let j = 0; j < transformedSites.length; j++) {
      if (i === j) continue;
      const siteB = transformedSites[j];
      const dist = haversineDistanceKm(
        siteA.coordinates.lat, siteA.coordinates.lng,
        siteB.coordinates.lat, siteB.coordinates.lng
      );
      if (dist <= 150) {
        siteA.nearbySites.push(siteB.siteId);
      }
    }
  }

  // Connect to MongoDB
  console.log('[seed] Connecting to MongoDB at', MONGO_URI);
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 4000 });
    console.log('[seed] Connected to MongoDB. Seeding sites...');

    let inserted = 0;
    let updated = 0;

    for (const siteData of transformedSites) {
      const res = await HeritageSite.findOneAndUpdate(
        { siteId: siteData.siteId },
        { $set: siteData },
        { upsert: true, new: false }
      );
      if (!res) inserted++;
      else updated++;
    }

    console.log(`[seed] Done! Total sites processed: ${transformedSites.length} (Inserted: ${inserted}, Updated: ${updated})`);
  } catch (err) {
    console.warn(`[seed] MongoDB unavailable (${err.message}). Prepared ${transformedSites.length} validated site definitions.`);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }

  return transformedSites;
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[seed] Error:', err);
      process.exit(1);
    });
}

module.exports = { seed, loadRawSites };

