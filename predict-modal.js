/* predict-modal.js — Predict modal with two flows */
/* global axios, satellite */

(function () {
  const WTIA = 'https://api.wheretheiss.at/v1';     // [WTIA dev]
  const SAT_ID = 25544;                              // ISS
  const NOM_SEARCH = 'https://nominatim.openstreetmap.org/search'; // [Nominatim Search]
  const BDC_REV = 'https://api.bigdatacloud.net/data/reverse-geocode-client'; // [BigDataCloud]
  const FETCH_TIMEOUT = 8000;

  // Wait for DOM to be ready
  function initPredictModal() {
    // Build modal HTML once
    const modal = document.getElementById('predict-modal');
    if (!modal) {
      console.error('Predict modal element not found');
      return;
    }
  modal.innerHTML = `
    <div class="predict-card">
      <div class="predict-head">
        <h2 style="margin:0;font-size:18px">Predict</h2>
        <button id="pm-close" class="btn" aria-label="Close">Close</button>
      </div>

      <div class="tabs">
        <button id="pm-tab-time" class="active">Time → Position</button>
        <button id="pm-tab-loc">Location → Passes</button>
      </div>

      <div id="pm-pane-time">
        <div class="grid2">
          <div>
            <label class="label">Date (UTC)</label>
            <input id="pm-date" type="date" class="input" />
          </div>
          <div>
            <label class="label">Time (UTC)</label>
            <input id="pm-time" type="time" step="1" class="input" />
          </div>
        </div>
        <div style="margin-top:8px">
          <button id="pm-go-time" class="btn">Predict Position</button>
        </div>
        <div id="pm-out-time" style="margin-top:10px"></div>
      </div>

      <div id="pm-pane-loc" style="display:none">
        <div class="grid2">
          <div>
            <label class="label">Country</label>
            <input id="pm-country" list="pm-country-list" class="input" placeholder="Start typing country..." />
            <datalist id="pm-country-list"></datalist>
          </div>
          <div>
            <label class="label">State/Province</label>
            <input id="pm-state" list="pm-state-list" class="input" placeholder="Type state (after country)" />
            <datalist id="pm-state-list"></datalist>
          </div>
        </div>
        <div style="margin-top:8px">
          <label class="label">City</label>
          <input id="pm-city" list="pm-city-list" class="input" placeholder="Type city (after state)" />
          <datalist id="pm-city-list"></datalist>
        </div>
        <div class="grid2" style="margin-top:8px">
          <div>
            <label class="label">Min elevation (°)</label>
            <input id="pm-minel" type="number" min="0" max="30" value="10" class="input" />
          </div>
          <div>
            <label class="label">Window (hours)</label>
            <input id="pm-hours" type="number" min="1" max="240" value="72" class="input" />
          </div>
        </div>
        <div style="margin-top:8px">
          <button id="pm-go-loc" class="btn">Find Passes</button>
        </div>
        <div id="pm-out-loc" style="margin-top:10px"></div>
      </div>
    </div>
  `; // [web:66]

  // Open/close
  const openBtn = document.getElementById('btn-predict');
  const closeBtn = document.getElementById('pm-close');
  
  if (openBtn) {
    openBtn.onclick = () => {
      console.log('Predict button clicked');
      modal.hidden = false;
    };
  } else {
    console.error('Predict button not found');
  }
  
  if (closeBtn) {
    closeBtn.onclick = () => modal.hidden = true;
  }
  
  window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') modal.hidden = true; });

  // Tabs
  const tabTime = document.getElementById('pm-tab-time');
  const tabLoc  = document.getElementById('pm-tab-loc');
  const paneTime= document.getElementById('pm-pane-time');
  const paneLoc = document.getElementById('pm-pane-loc');
  tabTime.onclick = ()=>{ tabTime.classList.add('active'); tabLoc.classList.remove('active'); paneTime.style.display='block'; paneLoc.style.display='none'; };
  tabLoc.onclick  = ()=>{ tabLoc.classList.add('active'); tabTime.classList.remove('active'); paneTime.style.display='none'; paneLoc.style.display='block'; };

  // Helpers
  const fmtLong = new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'long'});
  const fmtShort= new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'});

  function toUnixUTC(d, t) {
    const [h='00', m='00', s='00'] = (t||'00:00:00').split(':');
    return Math.floor(new Date(`${d}T${h.padStart(2,'0')}:${m.padStart(2,'0')}:${(s||'00').padStart(2,'0')}Z`).getTime()/1000);
  }

  async function fetchJSON(u, opt={}) {
    const ctrl = new AbortController();
    const id = setTimeout(()=>ctrl.abort(), FETCH_TIMEOUT);
    try {
      const r = await fetch(u, { ...opt, signal: ctrl.signal });
      if(!r.ok) throw new Error('HTTP '+r.status);
      return await r.json();
    } finally { clearTimeout(id); }
  } // [web:125][web:129]

  // Country list via REST Countries
  const countryInput = document.getElementById('pm-country');
  const countryList  = document.getElementById('pm-country-list');
  let countries = [];
  let isoByName = {};
  (async function loadCountries(){
    const arr = await fetchJSON('https://restcountries.com/v3.1/all');
    countries = arr.map(c => ({ name: c.name?.common, cca2: c.cca2 })).filter(x=>x.name&&x.cca2).sort((a,b)=>a.name.localeCompare(b.name));
    isoByName = Object.fromEntries(countries.map(c=>[c.name, c.cca2.toLowerCase()]));
    countryList.innerHTML = countries.map(c=>`<option value="${c.name}"></option>`).join('');
  })(); // [web:176]

  // Nominatim helpers (debounced)
  let debTimer=null;
  function debounce(fn, delay=400){ return (...args)=>{ clearTimeout(debTimer); debTimer=setTimeout(()=>fn(...args), delay); }; }

  const stateInput = document.getElementById('pm-state');
  const stateList  = document.getElementById('pm-state-list');
  const cityInput  = document.getElementById('pm-city');
  const cityList   = document.getElementById('pm-city-list');

  const suggestStates = debounce(async ()=>{
    stateList.innerHTML = '';
    const country = countryInput.value.trim();
    if(!country || !stateInput.value.trim()) return;
    const cc = isoByName[country] || '';
    const q = encodeURIComponent(stateInput.value.trim());
    const url = `${NOM_SEARCH}?q=${q}&format=jsonv2&limit=5&addressdetails=1${cc?`&countrycodes=${cc}`:''}`;
    const arr = await fetchJSON(url, { headers:{'Accept':'application/json'} });
    stateList.innerHTML = arr.map(x=>`<option value="${x.display_name}"></option>`).join('');
  }, 450); // [web:161]

  const suggestCities = debounce(async ()=>{
    cityList.innerHTML = '';
    const country = countryInput.value.trim();
    if(!country || !cityInput.value.trim()) return;
    const cc = isoByName[country] || '';
    const q = encodeURIComponent(cityInput.value.trim());
    const url = `${NOM_SEARCH}?q=${q}&format=jsonv2&limit=5&addressdetails=1${cc?`&countrycodes=${cc}`:''}`;
    const arr = await fetchJSON(url, { headers:{'Accept':'application/json'} });
    cityList.innerHTML = arr.map(x=>`<option value="${x.display_name}"></option>`).join('');
  }, 450); // [web:161]

  stateInput.addEventListener('input', suggestStates);
  cityInput.addEventListener('input', suggestCities);

  async function geocodeFinal(countryName, stateText, cityText){
    const cc = isoByName[countryName] || '';
    const qParts = [cityText, stateText, countryName].filter(Boolean).join(', ');
    const url = `${NOM_SEARCH}?q=${encodeURIComponent(qParts)}&format=jsonv2&limit=1&addressdetails=1${cc?`&countrycodes=${cc}`:''}`;
    const arr = await fetchJSON(url, { headers:{'Accept':'application/json'} });
    if(!arr.length) throw new Error('No results');
    return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon), label: arr[0].display_name };
  } // [web:161]

  async function prettyPlace(lat, lon){
    try{
      const u = new URL(BDC_REV);
      u.searchParams.set('latitude', lat); u.searchParams.set('longitude', lon); u.searchParams.set('localityLanguage','en');
      const j = await fetchJSON(u.toString());
      const city = j.city || j.locality || '';
      const region = j.principalSubdivision || '';
      const country = j.countryName || '';
      return [city, region, country].filter(Boolean).join(', ') || 'Over ocean';
    }catch{return 'Unknown';}
  } // [web:48]

  // Time → Position (WTIA timestamp)
  async function predictAtTimestamp(ts){
    const { data } = await axios.get(`${WTIA}/satellites/${SAT_ID}?timestamp=${ts}`, { timeout: FETCH_TIMEOUT });
    return data;
  } // [web:13]

  // TLE + satellite.js passes
  async function getTLE(){
    const { data } = await axios.get(`${WTIA}/satellites/${SAT_ID}/tles`, { timeout: FETCH_TIMEOUT });
    return [data.line1, data.line2];
  } // [web:13]

  function rad(d){ return d*Math.PI/180; }
  function deg(r){ return r*180/Math.PI; }

  async function findPasses(lat, lon, minEl=10, hours=72, step=30){
    const [l1, l2] = await getTLE();
    const satrec = window.satellite.twoline2satrec(l1, l2);
    const start = new Date();
    const end = new Date(start.getTime() + hours*3600*1000);
    const obs = { latitude: rad(lat), longitude: rad(lon), height: 0 };

    const passes = [];
    let inPass=false, aos=null, tMax=null, maxEl=-90;

    for(let t=new Date(start); t<=end; t=new Date(t.getTime()+step*1000)){
      const gmst = window.satellite.gstime(t);
      const pv = window.satellite.propagate(satrec, t);
      if(!pv || !pv.position) continue;
      const ecf = window.satellite.eciToEcf(pv.position, gmst);
      const look = window.satellite.ecfToLookAngles(obs, ecf);
      const el = deg(look.elevation);

      if(el>=minEl){
        if(!inPass){ inPass=true; aos=new Date(t); maxEl=el; tMax=new Date(t); }
        if(el>maxEl){ maxEl=el; tMax=new Date(t); }
      }else if(inPass){
        passes.push({ aos, tca:tMax, los:new Date(t), maxEl:Number(maxEl.toFixed(1)) });
        inPass=false; aos=null; tMax=null; maxEl=-90;
      }
    }
    return passes;
  } // [web:145]

  // Wire: Time → Position
  document.getElementById('pm-go-time').onclick = async ()=>{
    const d = document.getElementById('pm-date').value;
    const t = document.getElementById('pm-time').value;
    const out = document.getElementById('pm-out-time');
    if(!d){ out.innerHTML = '<div class="label">Pick a date</div>'; return; }
    out.innerHTML = '<div class="label loading">Predicting…</div>';
    try{
      const ts = toUnixUTC(d,t);
      const pos = await predictAtTimestamp(ts);
      const place = await prettyPlace(pos.latitude, pos.longitude);
      out.innerHTML = `
        <div class="row"><span class="label">Time (UTC):</span><span class="mono">${fmtLong.format(new Date(ts*1000))}</span></div>
        <div class="row"><span class="label">Latitude:</span><span class="mono">${pos.latitude.toFixed(4)}°</span></div>
        <div class="row"><span class="label">Longitude:</span><span class="mono">${pos.longitude.toFixed(4)}°</span></div>
        <div class="row"><span class="label">Altitude:</span><span class="mono">${pos.altitude.toFixed(2)} km</span></div>
        <div class="row"><span class="label">Velocity:</span><span class="mono">${pos.velocity.toFixed(2)} km/h</span></div>
        <div class="row"><span class="label">Location:</span><span class="mono">${place}</span></div>`;
    }catch(e){ out.innerHTML = '<div class="label">Failed. Try again.</div>'; }
  }; // [web:13][web:48][web:118]

  // Wire: Location → Passes
  document.getElementById('pm-go-loc').onclick = async ()=>{
    const country = countryInput.value.trim();
    const state = stateInput.value.trim();
    const city = cityInput.value.trim();
    const minEl = Math.max(0, Math.min(30, parseFloat(document.getElementById('pm-minel').value||'10')));
    const hours = Math.max(1, Math.min(240, parseInt(document.getElementById('pm-hours').value||'72',10)));
    const out = document.getElementById('pm-out-loc');
    if(!country || !city){ out.innerHTML = '<div class="label">Enter country and city</div>'; return; }
    out.innerHTML = '<div class="label loading">Finding passes…</div>';
    try{
      const { lat, lon, label } = await geocodeFinal(country, state, city);
      const passes = await findPasses(lat, lon, minEl, hours, 30);
      if(!passes.length){ out.innerHTML = `<div class="label">No passes in next ${hours}h.</div>`; return; }
      out.innerHTML = passes.slice(0,10).map(p=>`
        <div style="padding:6px 0;border-bottom:1px solid #25314f">
          <div class="row"><span class="label">AOS (rise):</span><span class="mono">${fmtLong.format(p.aos)}</span></div>
          <div class="row"><span class="label">Max elev:</span><span class="mono">${p.maxEl.toFixed(1)}° @ ${fmtShort.format(p.tca)}</span></div>
          <div class="row"><span class="label">LOS (set):</span><span class="mono">${fmtLong.format(p.los)}</span></div>
          <div class="row"><span class="label">Observer:</span><span class="mono">${label}</span></div>
        </div>`).join('');
    }catch(e){ out.innerHTML = '<div class="label">Pass prediction failed. Try a simpler query.</div>'; }
  }; // [web:161][web:145][web:118][web:13]
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPredictModal);
  } else {
    initPredictModal();
  }
})();
