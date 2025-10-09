// youtube.js - thin client-side API layer for YouTube Data API v3
// IMPORTANT: For production, move the API key to a server-side proxy.
const youtube = (function () {
  const API_KEY = 'AIzaSyC0yxeIutKP6aKh2wpj6WIxtJ9x3wXhleo'; // <<-- local testing only
  const BASE = 'https://www.googleapis.com/youtube/v3';
  const REGIONS = ['US', 'GB', 'IN', 'CA', 'AU', 'NG', 'DE', 'FR', 'JP', 'KR'];
  const MAX_RESULTS = 12;

  // per-region state
  const regionState = {};
  REGIONS.forEach((r) => (regionState[r] = { nextPageToken: null, finished: false }));

  // dedupe store: Map<id, videoObj>
  const fetched = new Map();

  function normalize(item) {
    const id = item.id?.videoId || item.id;
    const sn = item.snippet || {};
    const st = item.statistics || {};
    const cd = item.contentDetails || {};
    return {
      id,
      title: sn.title || 'Untitled',
      channelId: sn.channelId || '',
      channelTitle: sn.channelTitle || '',
      thumb:
        (sn.thumbnails &&
          (sn.thumbnails.high || sn.thumbnails.medium || sn.thumbnails.default))?.url ||
        '',
      viewCount: Number(st.viewCount || 0),
      publishedAt: sn.publishedAt || '',
      description: sn.description || '',
      duration: cd.duration || '',
    };
  }

  async function fetchRegionMostPopular(region) {
    const url = new URL(`${BASE}/videos`);
    url.searchParams.set('part', 'snippet,statistics,contentDetails');
    url.searchParams.set('chart', 'mostPopular');
    url.searchParams.set('regionCode', region);
    url.searchParams.set('maxResults', String(MAX_RESULTS));
    url.searchParams.set('key', API_KEY);
    const token = regionState[region].nextPageToken;
    if (token) url.searchParams.set('pageToken', token);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`YouTube API ${res.status}: ${res.statusText}`);
    return res.json();
  }

  function merge(items) {
    let added = 0;
    if (!items) return 0;
    items.forEach((it) => {
      const vid = normalize(it);
      if (!fetched.has(vid.id)) {
        fetched.set(vid.id, vid);
        added++;
      }
    });
    return added;
  }

  async function bootstrapInitial() {
    const initial = REGIONS.slice(0, 3);
    for (const r of initial) {
      try {
        const res = await fetchRegionMostPopular(r);
        merge(res.items);
        regionState[r].nextPageToken = res.nextPageToken || null;
        if (!res.nextPageToken) regionState[r].finished = true;
        await new Promise((s) => setTimeout(s, 250));
      } catch (e) {
        console.error('bootstrap error', e);
      }
    }
  }

  function pickRegion() {
    const available = REGIONS.filter((r) => !regionState[r].finished);
    if (!available.length) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  async function loadMoreGlobal() {
    const region = pickRegion();
    if (!region) return { added: 0, finished: true };
    const res = await fetchRegionMostPopular(region);
    const added = merge(res.items);
    regionState[region].nextPageToken = res.nextPageToken || null;
    if (!res.nextPageToken) regionState[region].finished = true;
    return { added, region };
  }

  function getFetchedArray() {
    return Array.from(fetched.values()).sort((a, b) => b.viewCount - a.viewCount);
  }

  async function search(q, maxResults = 20) {
    const url = new URL(`${BASE}/search`);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', q);
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', String(maxResults));
    url.searchParams.set('key', API_KEY);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('YouTube search error');
    const json = await res.json();
    return json.items.map((it) => ({
      id: it.id.videoId,
      title: it.snippet.title,
      channelId: it.snippet.channelId,
      channelTitle: it.snippet.channelTitle,
      thumb: it.snippet.thumbnails.medium.url,
      publishedAt: it.snippet.publishedAt,
    }));
  }

  async function getVideoById(id) {
    const url = new URL(`${BASE}/videos`);
    url.searchParams.set('part', 'snippet,statistics,contentDetails');
    url.searchParams.set('id', id);
    url.searchParams.set('key', API_KEY);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('YouTube getVideoById error');
    const json = await res.json();
    return json.items && json.items[0] ? normalize(json.items[0]) : null;
  }

  async function getChannelVideos(channelId, maxResults = 20) {
    const url = new URL(`${BASE}/search`);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('channelId', channelId);
    url.searchParams.set('order', 'date');
    url.searchParams.set('maxResults', String(maxResults));
    url.searchParams.set('type', 'video');
    url.searchParams.set('key', API_KEY);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('YouTube channel videos error');
    const json = await res.json();
    return json.items.map((it) => ({
      id: it.id.videoId,
      title: it.snippet.title,
      channelTitle: it.snippet.channelTitle,
      thumb: it.snippet.thumbnails.medium.url,
      publishedAt: it.snippet.publishedAt,
    }));
  }

  return {
    bootstrapInitial,
    loadMoreGlobal,
    getFetched: () => getFetchedArray(),
    getVideoById,
    search,
    getChannelVideos,
    _state: { regionState, REGIONS },
  };
})();