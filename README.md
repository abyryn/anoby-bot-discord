# 🤖 Anobystore Discord AI Bot

Discord Bot modern berbasis **Node.js (v22)** & **TypeScript** dengan 3 pilar fitur utama:
1. 🎵 **Music Player** — Didukung oleh Lavalink v4 (YouTube, Spotify, SoundCloud, button controller, queue, loop, shuffle).
2. 🤖 **AI Chatbot** — Didukung oleh Google Gemini API (AnobyStore AI persona, memory per user/channel, rate limiting).
3. 🎮 **AI Generated Quiz** — Kuis trivia interaktif dibuat dinamis oleh Gemini dengan validasi skema Zod, scoring kecepatan, & global leaderboard.

---

## ⚡ Fitur Utama

- **Prefix Bot**: `A!` (contoh: `A!play`, `A!ai`, `A!quiz`, `A!help`, `A!stats`)
- **Modern Stack**: Node.js 22, TypeScript (Strict Mode), Discord.js v14, Prisma ORM, PostgreSQL / SQLite, Zod, Pino Logger, Shoukaku (Lavalink v4).
- **Production Ready**: Multi-stage Dockerfile, Docker Compose, integrasi Dokploy, auto-migration, graceful shutdown (`SIGINT`/`SIGTERM`).

---

## 🚀 Panduan Deployment

Pilih metode deployment yang Anda inginkan:

- 🐳 **[Panduan Deploy di Dokploy (Sangat Direkomendasikan)](docs/dokploy-deployment.md)**: Deploy 1-klik menggunakan Docker Compose di Dokploy.
- 📦 **[Panduan Deploy Docker Compose Mandiri (VPS / Server)](docs/deployment.md)**
- 💻 **[Panduan Local Development](docs/development.md)**

---

## 📚 Dokumentasi Lengkap

- 📖 **[Daftar Perintah (Commands Reference)](docs/commands.md)**
- 🏛️ **[Arsitektur Sistem](docs/architecture.md)**
- 🐳 **[Deploy di Dokploy](docs/dokploy-deployment.md)**
- 🛠️ **[Panduan Development](docs/development.md)**

---

## ⚙️ Variabel Lingkungan (.env)

Buat file `.env` berdasarkan `.env.example`:

```env
DISCORD_TOKEN=your_discord_token_here
DISCORD_CLIENT_ID=your_client_id_here
GEMINI_API_KEY=your_gemini_api_key_here

BOT_PREFIX=A!
BOT_OWNER_ID=your_discord_id

MAX_AI_CONTEXT=10
AI_COOLDOWN=5

QUIZ_DURATION=20
QUIZ_POINTS=100
```

---

## 🧑‍💻 Menjalankan Secara Lokal (Dev Mode)

```bash
# 1. Install dependencies
npm install

# 2. Setup database Prisma
npm run db:generate
npm run db:migrate

# 3. Jalankan bot
npm run dev
```

---

## 🛡️ Lisensi & Kontributor

Dibuat untuk **Anoby Store**.  
Author: `@abiriann.ab`
