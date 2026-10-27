export default async function handler(req, res) {
  const TERMUX_URL = req.headers['x-termux-url'];
  const PARENT_KEY = req.headers['x-api-key'];
  
  if (!TERMUX_URL || !PARENT_KEY) {
    return res.status(401).json({ error: 'Config Vercel kosong (URL/ApiKey tidak terkirim)' });
  }

  const urlParts = req.url.split('?');
  let cleanPath = urlParts[0];
  let queryString = urlParts[1] || '';
  let subPath = cleanPath.replace(/^\/api\//, '').replace(/^\/api$/, '');
  try { subPath = decodeURIComponent(subPath); } catch(e) {}

  let id = null;
  if (queryString) { const params = new URLSearchParams(queryString); id = params.get('id'); }
  let safeId = id ? encodeURIComponent(id) : null;

  let targetPath = '';
  if (subPath === 'devices') targetPath = '/api/dashboard/devices';
  else if (subPath === 'pair-code') targetPath = '/api/dashboard/pair-code';
  else if (subPath === 'command') targetPath = '/api/dashboard/command';
  else if (subPath === 'chat' && req.method === 'GET') targetPath = '/api/dashboard/chat/' + safeId;
  else if (subPath === 'chat' && req.method === 'POST') targetPath = '/api/dashboard/chat';
  else if (subPath === 'apps') targetPath = '/api/dashboard/apps/' + safeId;
  else if (subPath === 'blocked') targetPath = '/api/dashboard/blocked';
  else if (subPath === 'image') targetPath = '/api/dashboard/image/' + safeId;
  else if (subPath === 'device' && req.method === 'DELETE') targetPath = '/api/dashboard/device/' + safeId;
  else if (subPath === 'auth/login') targetPath = '/api/auth/login';
  else if (subPath === 'admin/users') targetPath = '/api/admin/users';
  else if (subPath === 'admin/create-user') targetPath = '/api/admin/create-user';
  else if (subPath.startsWith('admin/user/')) targetPath = '/api/admin/' + subPath;
  else return res.status(404).json({ error: 'Proxy: Endpoint tidak dikenal -> ' + subPath });

  try {
    const fetchOpts = { 
      method: req.method, 
      headers: { 
        'x-api-key': PARENT_KEY, 
        'content-type': 'application/json',
        'authorization': req.headers['authorization'] || '' 
      } 
    };
    if (req.method === 'POST' && req.body) fetchOpts.body = JSON.stringify(req.body);
    
    // Nembak ke Termux
    const upstream = await fetch(TERMUX_URL + targetPath, fetchOpts);
    
    // Baca respon sebagai text dulu (buat nangkep kalo Cloudflare ngeblokir)
    const textData = await upstream.text();
    
    try {
      // Coba jadiin JSON
      const jsonData = JSON.parse(textData);
      res.status(upstream.status).json(jsonData);
    } catch (e) {
      // Kalo gagal, berarti Cloudflare ngirim HTML (Error 403 / 502)
      res.status(500).json({ 
        error: "Cloudflare blokir Vercel! Respon asli: " + textData.substring(0, 50) + "..." 
      });
    }
  } catch (e) {
    res.status(502).json({ error: 'Gagal konek ke Termux: ' + e.message });
  }
}
