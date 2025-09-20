/* dataPanel.js — stable ISS panel with robust reverse geocoding + timeouts */
/* global axios */

(function () {
  // Config
  const REFRESH_MS = 3000;         // ISS refresh
  const GEO_THROTTLE_MS = 15000;   // reverse geocode throttle
  const GEO_MIN_DELTA_DEG = 0.25;  // ~25-30 km
  const FETCH_TIMEOUT_MS = 6000;   // network timeout

  const ISS_URL = 'https://api.wheretheiss.at/v1/satellites/25544'; // ISS data [web]
  const BDC_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client'; // primary [web]
  const NOM_URL = 'https://nominatim.openstreetmap.org/reverse';              // fallback [web]

  // Mount
  let panel = document.getElementById('iss-data-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'iss-data-panel';
    panel.className = 'iss-panel';
    document.body.appendChild(panel);
  }

  // Time formatter (no date-fns needed)
  const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // State
  let lastGeoFetch = 0;
  let lastLat = null;
  let lastLon = null;
  let locationText = 'Locating...';

  function renderLoading() {
    panel.innerHTML = `
      <div>
        <h2>ISS Position</h2>
        <div class="row"><span class="label">Status:</span><span class="mono">Loading...</span></div>
      </div>`;
  }

  function renderData(pos) {
    const lat = Number(pos.latitude).toFixed(4);
    const lon = Number(pos.longitude).toFixed(4);
    const alt = Number(pos.altitude).toFixed(2);
    const vel = Number(pos.velocity).toFixed(2);
    const last = timeFmt.format(new Date(pos.timestamp * 1000));

    panel.innerHTML = `
      <div>
        <h2>ISS Position</h2>
        <div class="row"><span class="label">Latitude:</span><span class="mono">${lat}°</span></div>
        <div class="row"><span class="label">Longitude:</span><span class="mono">${lon}°</span></div>
        <div class="row"><span class="label">Altitude:</span><span class="mono">${alt} km</span></div>
        <div class="row"><span class="label">Velocity:</span><span class="mono">${vel} km/h</span></div>
        <div class="row"><span class="label">Updated:</span><span class="mono">${last}</span></div>
        <div class="row"><span class="label">Location:</span><span class="mono">${locationText}</span></div>
      </div>`;
  }

  async function fetchWithTimeout(url, init = {}) {
    // Use AbortSignal.timeout if available, else manual AbortController
    let signal = init.signal;
    if (!signal) {
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
      } else {
        const c = new AbortController();
        setTimeout(() => c.abort('timeout'), FETCH_TIMEOUT_MS);
        signal = c.signal;
      }
    }
    return fetch(url, { ...init, signal });
  }

  async function fetchISSPosition() {
    // Axios already used in project; keep it
    const res = await axios.get(ISS_URL, { timeout: FETCH_TIMEOUT_MS });
    const d = res.data || {};
    return {
      latitude: d.latitude,
      longitude: d.longitude,
      altitude: d.altitude,
      velocity: d.velocity,
      timestamp: d.timestamp
    };
  }

  function shouldReverse(lat, lon) {
    const now = Date.now();
    const dLat = lastLat == null ? Infinity : Math.abs(lat - lastLat);
    const dLon = lastLon == null ? Infinity : Math.abs(lon - lastLon);
    return dLat > GEO_MIN_DELTA_DEG || dLon > GEO_MIN_DELTA_DEG || (now - lastGeoFetch) > GEO_THROTTLE_MS;
  }

  async function reverseGeocode(lat, lon) {
    // Primary: BigDataCloud (no key, client-side)
    try {
      const u = new URL(BDC_URL);
      u.searchParams.set('latitude', lat);
      u.searchParams.set('longitude', lon);
      u.searchParams.set('localityLanguage', 'en');

      const r = await fetchWithTimeout(u.toString(), { method: 'GET' });
      if (!r.ok) throw new Error('BDC HTTP ' + r.status);
      const j = await r.json();

      const place = j.city || j.locality || (j.localityInfo?.administrative?.[0]?.name) || '';
      const region = j.principalSubdivision || '';
      const country = j.countryName || '';
      if (place || region || country) {
        locationText = [place, region, country].filter(Boolean).join(', ');
      } else if (j.localityInfo?.informative?.length) {
        locationText = j.localityInfo.informative[0].name || 'Over ocean';
      } else {
        locationText = 'Over ocean';
      }
      lastGeoFetch = Date.now();
      lastLat = lat;
      lastLon = lon;
      return;
    } catch (e) {
      // Fallback: Nominatim best-effort
      try {
        const u2 = new URL(NOM_URL);
        u2.searchParams.set('lat', lat);
        u2.searchParams.set('lon', lon);
        u2.searchParams.set('format', 'jsonv2');
        u2.searchParams.set('zoom', '10');

        const r2 = await fetchWithTimeout(u2.toString(), {
          headers: {
            // polite identification helps with rate limits
            'Accept': 'application/json'
          }
        });
        if (!r2.ok) throw new Error('NOM HTTP ' + r2.status);
        const j2 = await r2.json();
        const a = j2.address || {};
        const city = a.city || a.town || a.village || a.hamlet || '';
        const state = a.state || a.region || '';
        const country = a.country || '';
        locationText = [city, state, country].filter(Boolean).join(', ') || (j2.display_name || 'Unknown');
        lastGeoFetch = Date.now();
        lastLat = lat;
        lastLon = lon;
      } catch {
        // Keep last known locationText
      }
    }
  }

  async function tick() {
    try {
      const data = await fetchISSPosition();
      renderData(data);
      if (shouldReverse(data.latitude, data.longitude)) {
        reverseGeocode(data.latitude, data.longitude)
          .then(() => renderData(data))
          .catch(() => {});
      }
    } catch (err) {
      // Silent: keep last good UI; optionally log minimal info
      // console.debug('ISS fetch failed', err);
    }
  }

  function ensureAxiosThenStart() {
    if (typeof window.axios !== 'undefined') {
      tick();
      setInterval(tick, REFRESH_MS);
      return;
    }
    // Load axios from CDN if missing
    const head = document.head || document.getElementsByTagName('head')[0];
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/axios@1.7.7/dist/axios.min.js';
    s.async = true;
    s.onload = () => {
      tick();
      setInterval(tick, REFRESH_MS);
    };
    head.appendChild(s);
  }

  renderLoading();
  ensureAxiosThenStart();
})();