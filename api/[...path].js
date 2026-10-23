export default async function handler(req, res) {
  const TERMUX_URL = req.headers['x-termux-url'];
  const PARENT_KEY = req.headers['x-api-key'];
  if (!TERMUX_URL || !PARENT_KEY) return res.status(401).json({ error: 'Config kosong' });

  // 1. Ambil URL asli, pisahkan dari Query String (tanda ?)
  const urlParts = req.url.split('?');
  let cleanPath = urlParts[0]; // Hasil: /api/devices atau /api/chat
  let queryString = urlParts[1] || ''; // Hasil: id=Infinix...

  // 2. Buang awalan /api/
  let subPath = cleanPath.replace(/^\/api\//, '').replace(/^\/api$/, '');
  try { subPath = decodeURIComponent(subPath); } catch(e) {}

  // 3. Ambil ID dari Query String (?id=...)
  let id = null;
  if (queryString) {
    const params = new URLSearchParams(queryString);
    id = params.get('id');
  }
  let safeId = id ? encodeURIComponent(id) : null;

  // 4. Routing ke Termux
  let targetPath = '';
  if (subPath === 'devices') targetPath = '/api/dashboard/devices';
  else if (subPath === 'pair-code') targetPath = '/api/dashboard/pair-code';
  else if (subPath === 'command') targetPath = '/api/dashboard/command';
  else if (subPath === 'chat' && req.method === 'GET') targetPath = '/api/dashboard/chat/' + safeId;
  else if (subPath === 'chat' && req.method === 'POST') targetPath = '/api/dashboard/chat';
  else if (subPath === 'apps') targetPath = '/api/dashboard/apps/' + safeId;
  else if (subPath === 'blocked') targetPath = '/api/dashboard/blocked';
  else if (subPath === 'device' && req.method === 'DELETE') targetPath = '/api/dashboard/device/' + safeId;
  else return res.status(404).json({ error: 'Proxy Endpoint tidak dikenal: ' + subPath });

  // 5. Tembak ke Termux
  try {
    const fetchOpts = { 
      method: req.method, 
      headers: { 'x-api-key': PARENT_KEY, 'content-type': 'application/json' } 
    };
    if (req.method === 'POST' && req.body) fetchOpts.body = JSON.stringify(req.body);
    
    const upstream = await fetch(TERMUX_URL + targetPath, fetchOpts);
    res.status(upstream.status);
    const data = await upstream.text();
    try { res.json(JSON.parse(data)); } catch { res.send(data); }
  } catch (e) { 
    res.status(502).json({ error: 'Gagal konek ke Termux: ' + e.message }); 
  }
}
