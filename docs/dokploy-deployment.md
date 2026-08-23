# 🚀 Panduan Deploy Anobystore Discord Bot di Dokploy

Dokploy adalah PaaS (Platform as a Service) self-hosted berbasis Docker yang sangat memudahkan pengelolaan container, database, dan aplikasi.

Project ini telah dikonfigurasi secara optimal agar dapat langsung di-deploy di Dokploy menggunakan fitur **Docker Compose**.

---

## 📋 Fitur Dokploy yang Digunakan
1. **Multi-container Orchestration**: Menjalankan 3 container sekaligus (`bot`, `postgres`, `lavalink`).
2. **Auto-Migration Entrypoint**: Script `docker-entrypoint.sh` otomatis menjalankan migrasi database Prisma saat container bot dinyalakan.
3. **Dokploy Network Integration**: Terhubung ke `dokploy-network` dan bridge internal `internal`.
4. **Healthchecks**: Memastikan PostgreSQL dan Lavalink siap sebelum bot mulai berjalan.

---

## 🛠️ Langkah-Langkah Deploy di Dokploy

### Langkah 1: Buat Project Baru di Dokploy
1. Buka Dashboard Dokploy Anda.
2. Klik tombol **Create Project** (atau pilih project yang sudah ada).
3. Beri nama project, misalnya: `Discord-Bot-Anobystore`.

---

### Langkah 2: Tambahkan Service "Docker Compose"
1. Di dalam project, klik **Create Service** dan pilih **Docker Compose**.
2. Beri nama service, misalnya: `anobystore-bot`.
3. Pilih sumber source code:
   - **Git (GitHub/GitLab/Bitbucket)**: Hubungkan repo repository bot Anda.
   - **Raw Compose**: Atau paste isi [docker-compose.yml](file:///root/bot-discord/docker-compose.yml).
4. Jika menggunakan Git:
   - Masukkan URL Repository dan Branch (contoh: `main` / `master`).
   - Compose Path: `docker-compose.yml`

---

### Langkah 3: Konfigurasi Environment Variables (Tab Environment)
Masuk ke tab **Environment** pada service di Dokploy, lalu masukkan variabel berikut:

```env
# Wajib
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
GEMINI_API_KEY=your_google_gemini_api_key_here

# Opsional / Custom
DISCORD_GUILD_ID=
BOT_PREFIX=A!
BOT_OWNER_ID=your_discord_user_id

# AI & Quiz Config
MAX_AI_CONTEXT=10
AI_COOLDOWN=5
QUIZ_DURATION=20
QUIZ_POINTS=100
```

> **Catatan Penting:** 
> - `DATABASE_URL` dan `LAVALINK_HOST` sudah otomatis terkonfigurasi di dalam [docker-compose.yml](file:///root/bot-discord/docker-compose.yml) menggunakan service discovery Docker internal (`postgres:5432` dan `lavalink:2333`). Anda **tidak perlu** mengisinya secara manual kecuali jika ingin menggunakan database luar.

---

### Langkah 4: Deploy Service
1. Klik tombol **Deploy**.
2. Dokploy akan melakukan:
   - Build image Docker untuk Bot menggunakan multi-stage build.
   - Pull image PostgreSQL (`postgres:16-alpine`) dan Lavalink (`ghcr.io/lavalink-devs/lavalink:4`).
   - Membuat volume persistent `pgdata` untuk menyimpan data PostgreSQL.
   - Menjalankan migrasi database Prisma (`prisma migrate deploy`).
   - Memulai bot Discord.
3. Pantau proses melalui tab **Logs** di Dokploy.

---

## 🔍 Verifikasi & Monitoring di Dokploy

1. **Cek Tab Logs:**
   - Log bot akan menampilkan:
     ```text
     Running Prisma migrations...
     Starting bot...
     [INFO] Discord connected
     [INFO] Logged in as AnobystoreBot#1234
     [INFO] Lavalink connected
     ```
2. **Cek Bot di Discord:**
   - Ketik `A!ping` di channel Discord.
   - Ketik `A!stats` untuk melihat status memori, uptime, dan Node.js version.
   - Ketik `A!quiz` untuk mencoba kuis AI.
   - Ketik `A!play <judul lagu>` di voice channel.

---

## 🔄 Cara Update / Redeploy Bot

Setiap kali ada commit baru di repository GitHub Anda:
1. Anda dapat mengaktifkan fitur **Auto Deploy / Webhook** di Dokploy (tab **General / Webhook**).
2. Atau cukup klik **Redeploy** pada dashboard Dokploy.
3. Migrasi database dan rebuild akan berjalan secara otomatis dan zero-downtime!

---

## ❓ Troubleshooting Dokploy

| Masalah | Penyebab & Solusi |
|---|---|
| **Bot gagal koneksi ke DB** | Pastikan service `postgres` berstatus *healthy*. Tunggu beberapa detik saat first deploy karena postgres butuh waktu inisialisasi volume data. |
| **Lavalink Error / Music tidak bunyi** | Pastikan file `application.yml` ikut ter-commit di repository Anda agar Lavalink dapat membaca konfigurasinya. |
| **Network Dokploy Error** | Jika Dokploy menampilkan error `network dokploy-network not found`, pastikan network tersebut sudah dibuat di Dokploy atau buat manual via SSH: `docker network create dokploy-network`. |
