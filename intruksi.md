Aplikasi: Node.js + Express backend + static frontend (public/).
Fungsi: Generate short links ke Short.io (Single / Bulk), mendukung custom slug dan Basic Auth opsional.
Backend wajib menyimpan SHORTIO_API_KEY di environment variable (tidak boleh di-frontend).
Prasyarat

Server/hosting dengan Node.js (rekomendasi: Node.js 16 LTS atau lebih baru).
npm (Node package manager).
Akses untuk set environment variables (panel hosting atau systemd/PM2/docker).
Short.io API key (dapatkan dari dashboard Short.io).
(Opsional) Domain/hostname terdaftar di Short.io (domain yang dipakai harus ada di akun Short.io).
Struktur file (dalam satu folder project)

package.json
server.js
public/
index.html
(assets bila ada)
Environment variables (HARUS diset)

SHORTIO_API_KEY (wajib)
Contoh: SHORTIO_API_KEY=your_shortio_api_key_here
DOMAIN (opsional) — default: govidey.site
Contoh: DOMAIN=govidey.site
PORT (opsional) — default: 3000
Contoh: PORT=3000
WEB_USER (opsional) — username Basic Auth; jika diset, endpoint API memerlukan auth
Contoh: WEB_USER=admin
WEB_PASS (opsional) — password Basic Auth
Contoh: WEB_PASS=secretpassword
Instalasi & Menjalankan (lokal / VPS)

Clone project atau upload file project pada server:

git clone <repo-url> shortio-web-generator
cd shortio-web-generator
Install dependency:

npm install
Set environment variables:

Linux/macOS (sesuaikan nilai): export SHORTIO_API_KEY="your_shortio_api_key" export DOMAIN="govidey.site" export PORT=3000 export WEB_USER="admin" # opsional export WEB_PASS="secretpass" # opsional
Di hosting panel: gunakan fitur Environment Variables / Config Vars.
Jalankan aplikasi:

npm start
Kunjungi: http://localhost:3000 (atau http://server-ip:PORT)
Menjalankan sebagai service (opsional)

Menggunakan PM2:
npm install -g pm2
pm2 start server.js --name shortio-gen
pm2 save
Menggunakan systemd (contoh):
Buat file /etc/systemd/system/shortio-gen.service:
[Unit]
Description=Shortio Web Generator
After=network.target

[Service]
Environment=SHORTIO_API_KEY=your_shortio_api_key
Environment=DOMAIN=govidey.site
Environment=PORT=3000
User=www-data
WorkingDirectory=/path/to/project
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
systemctl daemon-reload
systemctl enable --now shortio-gen
Docker (opsional)

Contoh Dockerfile minimal:
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
Build & run:
docker build -t shortio-gen .
docker run -d -p 3000:3000 -e SHORTIO_API_KEY="your_key" -e DOMAIN="govidey.site" --name shortio-gen shortio-gen
API Endpoints (backend)

POST /api/create-single

Payload JSON: { "originalURL": "https://target.example/page", "idLength": 8, // optional "customSlug": "abc123", // optional — jika ada, akan dipakai (server menambahkan prefix v7id= jika perlu) "allowFallback": true // optional (default true) }
Response sukses: { originalURL, slug, shortURL, raw }
POST /api/create-bulk

Payload JSON: { "originals": ["https://a", "https://b", ...], "idLength": 8, // optional "customSlugs": ["s1", "", "s3"], // optional (satu per baris / per URL) "allowFallback": true }
Response sukses: { domain, results: [ { originalURL, slug, shortURL } , ... ] }
Contoh curl (tanpa auth)

Single: curl -X POST http://localhost:3000/api/create-single
-H "Content-Type: application/json"
-d '{"originalURL":"https://example.com/page","idLength":8}'

Bulk: curl -X POST http://localhost:3000/api/create-bulk
-H "Content-Type: application/json"
-d '{"originals":["https://a","https://b"],"idLength":8}'

Contoh curl (dengan Basic Auth)

Jika WEB_USER/WEB_PASS diset, gunakan header Authorization atau -u: curl -u admin:secretpass -X POST http://localhost:3000/api/create-single
-H "Content-Type: application/json"
-d '{"originalURL":"https://example.com/page"}'
Catatan penggunaan Custom Slug & Fallback

Jika user memasukkan customSlug:
Jika customSlug tidak mengandung = atau / atau %3D, server otomatis menambahkan prefix v7id= → v7id=custom.
Jika customSlug berisi v7id=abc atau v7id/abc atau something%3Dabc, server akan mencoba seperti yang diberikan.
allowFallback menentukan apakah server akan otomatis mencoba alternatif (percent-encoded %3D atau subpath v7id/<id>) jika percobaan pertama gagal.
Jika allowFallback = false dan custom gagal, server mengembalikan error.
UI (frontend)

Halaman utama: index.html
Single Link: masukkan URL, (opsional) custom slug, klik Generate.
Bulk Link: masukkan daftar URL (satu per baris), (opsional) daftar custom slugs sejajar (satu per baris), klik Generate.
Jika server mengaktifkan Basic Auth, user harus "login" di bagian kanan atas sebelum menekan Generate — frontend menyertakan header Authorization Basic ke setiap request.
Keamanan & Best Practices

Jangan pernah menaruh SHORTIO_API_KEY di frontend atau repo publik.
Aktifkan HTTPS di hosting / CDN.
Jika publik digunakan, aktifkan Basic Auth (WEB_USER/WEB_PASS) atau implementasikan otentikasi yang lebih kuat (API key per user, JWT, dsb).
Pertimbangkan rate limiting agar tidak disalahgunakan.
Pastikan DOMAIN sesuai dengan domain yang dikonfigurasikan pada akun Short.io Anda.
Troubleshooting umum

Error: "Set SHORTIO_API_KEY environment variable"
→ Pastikan env var sudah diset sebelum menjalankan node server.js.
Error 401 pada API calls
→ Jika WEB_USER/WEB_PASS diset, sertakan Basic Auth di request.
Error 400/422 pada pembuatan link (invalid slug)
→ Karakter tertentu (mis. =) mungkin ditolak; server akan mencoba fallback. Anda bisa menggunakan custom slug tanpa = dan biarkan server menambahkan prefix v7id=.
Rate limit dari Short.io
→ Jika membuat banyak link, tambahkan delay/throttling; periksa dokumentasi Short.io untuk limit.
CORS issue di frontend
→ server.js sudah memakai CORS untuk header Content-Type & Authorization. Pastikan frontend diakses dari origin yang sama atau CORS diatur sesuai kebutuhan.
Logging
