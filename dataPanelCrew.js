/*
// Crew panel is optional; many public endpoints are HTTP-only and will be blocked on HTTPS pages.
// If you have an HTTPS crew API, you can enable and include this file after dataPanel.js in index.html.

(async function () {
  const panel = document.getElementById('iss-data-panel');
  if (!panel) return;

  // Replace with a secure (HTTPS) crew API endpoint:
  const CREW_API = 'https://example.com/peopleinspace.json';

  try {
    const res = await axios.get(CREW_API, { timeout: 8000 });
    const { number, people } = res.data || {};
    const items = (people || [])
      .map(p => `<li style="margin:0;">${p.name} — ${p.craft}</li>`)
      .join('');

    panel.insertAdjacentHTML('beforeend', `
      <div style="margin-top:10px;">
        <h3 style="margin:0 0 6px 0;font-size:14px;color:#60a5fa;">People in Space: ${number || 0}</h3>
        <ul style="padding-left:16px;margin:0;font-size:12px;">${items}</ul>
      </div>
    `);
  } catch (e) {
    // Silent fail
  }
})();
*/
