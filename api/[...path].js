export default async function handler(req, res) {
  const TERMUX_URL = req.headers['x-termux-url'];
  const PARENT_KEY = req.headers['x-api-key'];
  if (!TERMUX_URL || !PARENT_KEY) return res.status(401).json({ error: 'Config kosong' });

  // Vercel nangkep path di req.query.path
  let pathParts = req.query.path || [];
  let subPath = Array.isArray(pathParts) ? pathParts.join('/') : pathParts;
  
  // Nangkep ID dari ?id=
  let id = req.query.id ? encodeURIComponent(req.query.id) : null;
  let targetPath = '';

  if (subPath === 'devices') targetPath = '/api/dashboard/devices';
  else if (subPath === 'pair-code') targetPath = '/api/dashboard/pair-code';
  else if (subPath === 'command') targetPath = '/api/dashboard/command';
  else if (subPath === 'chat' && req.method === 'GET') targetPath = '/api/dashboard/chat/' + id;
  else if (subPath === 'chat' && req.method === 'POST') targetPath = '/api/dashboard/chat';
  else if (subPath === 'apps') targetPath = '/api/dashboard/apps/' + id;
  else if (subPath === 'blocked') targetPath = '/api/dashboard/blocked';
  else if (subPath === 'image') targetPath = '/api/dashboard/image/' + id;
  else if (subPath === 'device' && req.method === 'DELETE') targetPath = '/api/dashboard/device/' + id;
  else return res.status(404).json({ error: 'Proxy: Endpoint tidak dikenal ' + subPath });

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
