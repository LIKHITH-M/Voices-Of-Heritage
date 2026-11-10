/**
 * research-service/src/rag/chunker.js
 *
 * Semantic chunker for Heritage Sites knowledge base.
 * Decomposes site documents into semantically coherent ~150-250 token passages
 * suitable for vector retrieval and grounded generation.
 */

/**
 * chunkHeritageSite(site)
 *
 * @param {object} site - HeritageSite document
 * @returns {Array<object>} Array of chunk definitions
 */
function chunkHeritageSite(site) {
  const chunks = [];
  const siteId = site.siteId;
  const siteName = site.name;
  const region = site.region || site.state || '';

  // 1. Overview & Cultural Significance Chunk
  const overviewText = [
    `${siteName} (${site.subtitle || ''}) located in ${site.district || ''}, ${region}.`,
    site.desc || '',
    site.siteCategory ? `Category: ${site.siteCategory}.` : '',
    site.unescoStatus && site.unescoStatus !== 'none' ? `Status: UNESCO World Heritage Site.` : '',
    site.bestTimeToVisit ? `Best time to visit: ${site.bestTimeToVisit}.` : '',
    site.timings ? `Timings: ${site.timings}.` : '',
  ].filter(Boolean).join(' ');

  chunks.push({
    chunkId: `${siteId}::overview`,
    siteId,
    siteName,
    region,
    section: 'overview',
    text: overviewText,
    metadata: {
      tags: site.tags || [],
      entryFeeINR: site.entryFeeINR,
      rating: site.rating,
    },
  });

  // 2. History & Dynasty Chunk
  if (site.longDesc || (site.dynasty && site.dynasty.length > 0) || (site.period && site.period.length > 0)) {
    const historyText = [
      `Historical Context of ${siteName}:`,
      site.dynasty && site.dynasty.length ? `Dynasty: ${site.dynasty.join(', ')}.` : '',
      site.period && site.period.length ? `Established / Period: ${site.period.join(', ')}.` : '',
      site.longDesc || site.desc || '',
    ].filter(Boolean).join(' ');

    chunks.push({
      chunkId: `${siteId}::history`,
      siteId,
      siteName,
      region,
      section: 'history',
      text: historyText,
      metadata: {
        dynasty: site.dynasty || [],
        period: site.period || [],
      },
    });
  }

  // 3. Architecture & Key Highlights Chunk
  if (site.highlights && site.highlights.length > 0) {
    const archText = [
      `Architectural Highlights of ${siteName}:`,
      site.archStyle && site.archStyle.length ? `Architectural Style: ${site.archStyle.join(', ')}.` : '',
      ...site.highlights.map(h => `• ${h}`),
    ].join('\n');

    chunks.push({
      chunkId: `${siteId}::architecture`,
      siteId,
      siteName,
      region,
      section: 'architecture',
      text: archText,
      metadata: {
        archStyle: site.archStyle || [],
      },
    });
  }

  // 4. Local Cuisine & Practical Travel Experiences Chunk
  if ((site.commonActivities && site.commonActivities.length > 0) || (site.localCuisine && site.localCuisine.length > 0)) {
    const expText = [
      `Experiences and Local Culture at ${siteName}:`,
      site.commonActivities && site.commonActivities.length ? `Key Activities: ${site.commonActivities.join(', ')}.` : '',
      site.localCuisine && site.localCuisine.length ? `Local Heritage Cuisine: ${site.localCuisine.join(', ')}.` : '',
    ].filter(Boolean).join(' ');

    chunks.push({
      chunkId: `${siteId}::experiences`,
      siteId,
      siteName,
      region,
      section: 'experiences',
      text: expText,
      metadata: {
        activities: site.commonActivities || [],
        cuisine: site.localCuisine || [],
      },
    });
  }

  return chunks;
}

module.exports = {
  chunkHeritageSite,
};

