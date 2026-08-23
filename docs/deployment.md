# 🚀 Panduan Deployment (Docker & Server)

Panduan ini mencakup cara menjalankan bot di lingkungan server/VPS menggunakan Docker Compose mandiri atau platform PaaS seperti Dokploy.

> 💡 **Ingin deploy di Dokploy?** Silakan baca panduan khusus Dokploy di [docs/dokploy-deployment.md](file:///root/bot-discord/docs/dokploy-deployment.md).

---

## 📋 Prasyarat Server
- **OS**: Linux (Ubuntu 22.04 / 24.04 LTS direkomendasikan)
- **RAM**: Minimal 1.5 GB - 2 GB (untuk menjalankan Bot + PostgreSQL + Lavalink)
- **Software**: Docker & Docker Compose Plugin (`docker compose`)

---

## 🛠️ Deploy Menggunakan Docker Compose

### 1. Clone Repository & Setup Env
```bash
git clone <URL_REPO_ANDA> bot-discord
cd bot-discord

cp .env.example .env
nano .env
```
Isi nilai `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, dan `GEMINI_API_KEY`.

### 2. Jalankan Container
```bash
# Pastikan external network dokploy-network dibuat jika belum ada
docker network inspect dokploy-network >/dev/null 2>&1 || docker network create dokploy-network

# Jalankan semua service (Bot, Postgres, Lavalink) di background
docker compose up -d --build
```

### 3. Cek Status & Log
```bash
# Cek apakah semua container healthy & running
docker compose ps

# Cek logs bot secara real-time
docker compose logs -f bot
```

---

## 🔄 Pembaruan / Update Versi Baru

```bash
git pull origin main
docker compose build bot
docker compose up -d
```
Migrasi Prisma akan otomatis dijalankan saat container bot boot ulang melalui `docker-entrypoint.sh`.
