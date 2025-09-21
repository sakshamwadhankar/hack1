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
        <div class="iss-panel-header">
          <h2>ISS Position</h2>
          <button id="iss-close-btn" class="iss-close-btn" title="Close Panel">
            <span class="fas fa-times"></span>
          </button>
        </div>
        <div class="data-item">
          <div class="data-icon">⏳</div>
          <div class="data-content">
            <div class="data-label">Status</div>
            <div class="data-value">Loading...</div>
          </div>
        </div>
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
        <div class="iss-panel-header">
          <h2>ISS Position</h2>
          <button id="iss-close-btn" class="iss-close-btn" title="Close Panel">
            <span class="fas fa-times"></span>
          </button>
        </div>
        <div class="data-item">
          <div class="data-icon">🌍</div>
          <div class="data-content">
            <div class="data-label">Latitude</div>
            <div class="data-value">${lat}°</div>
          </div>
        </div>
        <div class="data-item">
          <div class="data-icon">🌐</div>
          <div class="data-content">
            <div class="data-label">Longitude</div>
            <div class="data-value">${lon}°</div>
          </div>
        </div>
        <div class="data-item">
          <div class="data-icon">⬆️</div>
          <div class="data-content">
            <div class="data-label">Altitude</div>
            <div class="data-value">${alt} km</div>
          </div>
        </div>
        <div class="data-item">
          <div class="data-icon">⚡</div>
          <div class="data-content">
            <div class="data-label">Velocity</div>
            <div class="data-value">${vel} km/h</div>
          </div>
        </div>
        <div class="data-item">
          <div class="data-icon">🕐</div>
          <div class="data-content">
            <div class="data-label">Updated</div>
            <div class="data-value">${last}</div>
          </div>
        </div>
        <div class="data-item">
          <div class="data-icon">📍</div>
          <div class="data-content">
            <div class="data-label">Location</div>
            <div class="data-value">${locationText}</div>
          </div>
        </div>
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

  // ISS Panel Toggle Functionality
  function initISSToggle() {
    const toggleBtn = document.getElementById('btn-iss-toggle');
    const issPanel = document.getElementById('iss-data-panel');
    
    if (toggleBtn && issPanel) {
      // Set initial state - panel hidden by default
      issPanel.classList.remove('visible');
      toggleBtn.classList.remove('active');
      
      // Toggle functionality
      toggleBtn.addEventListener('click', () => {
        const isVisible = issPanel.classList.contains('visible');
        const layersCard = document.getElementById('layers');
        const settingsCard = document.getElementById('settings');
        
        if (isVisible) {
          issPanel.classList.remove('visible');
          toggleBtn.classList.remove('active');
          // Remove adjustment classes from cards
          if (layersCard) layersCard.classList.remove('cards-adjusted');
          if (settingsCard) settingsCard.classList.remove('cards-adjusted');
        } else {
          issPanel.classList.add('visible');
          toggleBtn.classList.add('active');
          // Add adjustment classes to cards
          if (layersCard) layersCard.classList.add('cards-adjusted');
          if (settingsCard) settingsCard.classList.add('cards-adjusted');
        }
      });
      
      // Close button functionality (delegated event listener)
      document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'iss-close-btn') {
          issPanel.classList.remove('visible');
          toggleBtn.classList.remove('active');
          // Remove adjustment classes from cards
          const layersCard = document.getElementById('layers');
          const settingsCard = document.getElementById('settings');
          if (layersCard) layersCard.classList.remove('cards-adjusted');
          if (settingsCard) settingsCard.classList.remove('cards-adjusted');
        }
      });
      
      console.log('ISS toggle functionality initialized');
    } else {
      console.error('ISS toggle button or panel not found');
    }
  }

  // Initialize toggle when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initISSToggle);
  } else {
    initISSToggle();
  }

  renderLoading();
  ensureAxiosThenStart();
})();