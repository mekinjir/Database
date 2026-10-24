export default async function handler(req, res) {
  // 1. Tentukan URL tujuan (Cloudflare Tunnel ke Termux)
  // Jika di Vercel kamu sudah set Environment Variable TERMUX_URL, itu yang dipakai.
  // Jika belum, fallback ke URL di bawah ini:
  const TARGET_HOST = process.env.TERMUX_URL || "https://server.mekinjirserver.dpdns.org";

  // 2. Ambil path (contoh: dashboard/devices, auth/login)
  const { path } = req.query;
  const subPath = Array.isArray(path) ? path.join('/') : (path || '');
  
  // 3. Susun URL tujuan lengkap
  const targetUrl = `${TARGET_HOST}/api/${subPath}`;

  // 4. Teruskan Header
  const headers = {
    'Content-Type': 'application/json',
  };

  // Teruskan token otorisasi (Bearer token) dari frontend ke Termux
  if (req.headers.authorization) {
    headers['authorization'] = req.headers.authorization;
  }

  // Teruskan custom headers jika ada
  if (req.headers['x-api-key']) {
    headers['x-api-key'] = req.headers['x-api-key'];
  }
  if (req.headers['x-device-token']) {
    headers['x-device-token'] = req.headers['x-device-token'];
  }

  // 5. Siapkan Body (jika bukan GET/HEAD)
  let bodyData = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    // Vercel biasanya sudah mem-parsing body ke req.body (object)
    // Kita ubah kembali ke string JSON
    bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  // 6. Tembak ke Termux
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: bodyData,
    });

    // 7. Baca response dari Termux
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Jika response bukan JSON (misal error HTML dari Cloudflare)
      const text = await response.text();
      data = { error: text || 'Response bukan JSON' };
    }

    // 8. Kembalikan response ke frontend beserta status code aslinya (200, 401, 404, dll)
    res.status(response.status).json(data);
    
  } catch (error) {
    // Jika Cloudflare mati / URL salah
    res.status(502).json({ 
      error: 'Proxy Error: Gagal terhubung ke server Termux.', 
      details: error.message,
      target: targetUrl
    });
  }
}
