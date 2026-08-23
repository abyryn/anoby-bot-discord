PRD — Discord AI Music & Quiz Bot

1. Project Overview

Buat sebuah Discord Bot modern berbasis Node.js + TypeScript yang memiliki 3 fitur utama:

1. Music Player
2. AI Chatbot
3. AI Generated Quiz / Tebak-Tebakan

Bot harus modular, scalable, mudah dikembangkan, memiliki konfigurasi melalui ".env", logging yang jelas, error handling yang baik, dan dapat dijalankan melalui CLI.

Nama sementara project:

Anoby Store Discord AI Bot

Prefix command:

"A!"

Contoh:

A!play lagu
A!pause
A!resume
A!skip
A!queue
A!stop

A!ai pertanyaan
A!chat pertanyaan

A!quiz
A!quiz start
A!quiz stop
A!quiz leaderboard

---

2. Technology Stack

Gunakan:

- Node.js
- TypeScript
- Discord.js
- Gemini API / Google AI Studio
- Lavalink untuk music player
- PostgreSQL sebagai database production
- SQLite sebagai opsi development
- Prisma ORM
- Zod untuk validation
- dotenv untuk environment configuration
- Pino atau Winston untuk logging
- Vitest/Jest untuk testing

Struktur harus dibuat modular.

---

3. Environment Variables

Buat ".env.example":

DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=

GEMINI_API_KEY=

DATABASE_URL=

LAVALINK_HOST=
LAVALINK_PORT=
LAVALINK_PASSWORD=
LAVALINK_SECURE=false

BOT_PREFIX=A!
BOT_OWNER_ID=

Jangan pernah hardcode token/API key.

Tambahkan ".env" ke ".gitignore".

---

4. Architecture

Gunakan struktur seperti:

src/
├── index.ts
│
├── bot/
│   ├── client.ts
│   ├── events/
│   └── handlers/
│
├── commands/
│   ├── music/
│   │   ├── play.ts
│   │   ├── pause.ts
│   │   ├── resume.ts
│   │   ├── skip.ts
│   │   ├── stop.ts
│   │   ├── queue.ts
│   │   ├── nowplaying.ts
│   │   └── volume.ts
│   │
│   ├── ai/
│   │   ├── ai.ts
│   │   └── chat.ts
│   │
│   └── quiz/
│       ├── quiz.ts
│       ├── quizstart.ts
│       ├── quizstop.ts
│       └── leaderboard.ts
│
├── services/
│   ├── ai/
│   │   ├── gemini.service.ts
│   │   ├── prompt.service.ts
│   │   └── quiz-generator.service.ts
│   │
│   ├── music/
│   │   ├── lavalink.service.ts
│   │   ├── search.service.ts
│   │   └── queue.service.ts
│   │
│   └── quiz/
│       ├── quiz.service.ts
│       └── leaderboard.service.ts
│
├── database/
│   ├── prisma.ts
│   └── repositories/
│
├── config/
│   └── env.ts
│
├── utils/
│   ├── logger.ts
│   ├── embeds.ts
│   └── permissions.ts
│
└── types/

---

5. MUSIC SYSTEM

5.1 Goal

User dapat memutar musik di voice channel Discord.

Contoh:

A!play Judika - Aku Yang Tersakiti

Bot harus:

1. Mengecek user berada di voice channel.
2. Join voice channel.
3. Mencari lagu.
4. Memasukkan lagu ke queue.
5. Memutar lagu.
6. Menampilkan informasi lagu.
7. Jika lagu selesai, otomatis memainkan lagu berikutnya.

---

6. Music Search

Prioritaskan pencarian musik Indonesia.

Contoh:

A!play Sial Mahalini
A!play Nadhif Basalamah - Penjaga Hati
A!play Hindia - Secukupnya
A!play Bernadya - Untungnya Hidup Harus Tetap Berjalan

Sistem pencarian harus:

1. Exact match terlebih dahulu.
2. Artist + title.
3. Trending/popular result.
4. Jika tidak ditemukan, tampilkan hasil pencarian.

Jangan otomatis memilih hasil yang tidak relevan.

Jika terdapat beberapa hasil, tampilkan maksimal 5 pilihan.

Contoh:

🎵 Search Result

1. Mahalini - Sial
2. Mahalini - Melawan Restu
3. Mahalini - Bohongi Hati

Reply:
1
2
3

Gunakan timeout sekitar 20–30 detik.

---

7. YouTube / Spotify

Support input:

A!play judul lagu
A!play URL YouTube
A!play URL Spotify
YouTube playlist
Spotify playlist

Untuk Spotify, gunakan metadata playlist/track untuk mencari sumber audio yang tersedia melalui music backend.

Jangan mengandalkan Spotify sebagai sumber audio secara langsung jika API/platform tidak menyediakan stream audio.

Jika Spotify memberikan:

Artist
Title
Album

gunakan metadata tersebut untuk mencari sumber audio yang sesuai.

---

8. Music Commands

Implementasikan:

A!play <song>
A!pause
A!resume
A!skip
A!stop
A!queue
A!nowplaying
A!volume <0-100>
A!shuffle
A!remove <position>
A!clear
A!loop

Loop mode:

off
track
queue

---

9. Music Embed

Gunakan Discord Embed.

Contoh:

🎵 NOW PLAYING

Mahalini - Sial

━━━━━━━━━━━━━━━━━━

Duration:
03:38

Requested by:
@username

🔊 Volume: 80%

━━━━━━━━━━━━━━━━━━

▶️ Playing

Gunakan button interaction:

⏮️ Previous
⏯️ Pause
⏭️ Skip
🔀 Shuffle
🔁 Loop
⏹️ Stop

---

10. AI CHATBOT

Integrasikan Gemini melalui Google AI Studio API.

Command:

A!ai <question>

atau:

A!chat <question>

Contoh:

A!ai jelaskan apa itu ECU motor

Bot menjawab menggunakan Gemini.

---

11. AI Persona

Buat persona AI yang santai dan cocok untuk komunitas Discord.

Contoh:

Nama:
AnobyStore AI

Personality:
- ramah
- santai
- tidak terlalu formal
- bisa menggunakan bahasa Indonesia
- dapat memahami bahasa gaul
- tidak spam emoji
- jawaban ringkas secara default
- dapat memberikan jawaban detail jika diminta

AI harus dapat memahami:

bahasa Indonesia
bahasa Inggris
bahasa gaul
campuran Indonesia + English

---

12. Conversation Memory

Tambahkan memory per user/channel.

Contoh:

User:
A!ai siapa presiden Indonesia?

Bot:
...

User:
A!ai terus wakilnya siapa?

Bot:
...

AI memahami konteks pertanyaan sebelumnya.

Namun memory harus dibatasi agar tidak menghabiskan token.

Gunakan:

MAX_CONTEXT_MESSAGES=10

Tambahkan command:

A!ai-clear

untuk menghapus memory conversation user.

---

13. AI RATE LIMIT

Tambahkan rate limit.

Contoh:

1 request / 5 detik / user

Jika terlalu cepat:

⏳ Tunggu beberapa detik sebelum bertanya lagi.

Tambahkan juga batas maksimal panjang prompt.

---

14. AI QUIZ SYSTEM

Fitur utama:

A!quiz

Bot akan membuat quiz menggunakan Gemini.

Contoh:

🎮 QUIZ DIMULAI!

Kategori:
Pengetahuan Umum

Pertanyaan:

Apa ibu kota Indonesia?

A. Bandung
B. Jakarta
C. Surabaya
D. Medan

⏱️ Waktu: 20 detik

Member menjawab:

B

atau:

Jakarta

Bot mengecek jawaban.

---

15. AI Generated Questions

Quiz harus dibuat oleh Gemini secara dynamic.

Kategori:

Pengetahuan Umum
Indonesia
Musik
Film
Game
Minecraft
Teknologi
Otomotif
Anime
Sejarah
Geografi
Sains
Random

Command:

A!quiz
A!quiz musik
A!quiz otomotif
A!quiz minecraft
A!quiz anime

---

16. Quiz JSON Format

Gemini harus dipaksa memberikan JSON terstruktur:

{
  "category": "Otomotif",
  "question": "Apa fungsi utama ECU pada kendaraan modern?",
  "options": [
    "Mengatur sistem audio",
    "Mengontrol sistem elektronik mesin",
    "Mengatur tekanan ban",
    "Mengisi baterai"
  ],
  "correctAnswer": 1,
  "explanation": "ECU mengontrol berbagai parameter kerja mesin."
}

Jangan parsing response AI secara manual jika bisa menggunakan structured output.

Validasi JSON menggunakan Zod.

---

17. Quiz Scoring

Sistem poin:

Jawaban benar:

+100 poin

Bonus berdasarkan kecepatan:

jawab < 5 detik = +50
jawab < 10 detik = +30
jawab < 15 detik = +10

Jawaban salah:

+0

Tambahkan leaderboard.

Command:

A!quiz leaderboard

Contoh:

🏆 QUIZ LEADERBOARD

1. Abi       1,250 pts
2. Budi        980 pts
3. Andi        760 pts
4. Rizky       520 pts
5. Dika        410 pts

---

18. Anti Spam Quiz

Hanya satu quiz aktif per channel.

Jika ada quiz aktif:

⚠️ Quiz sedang berlangsung.

Tunggu quiz selesai terlebih dahulu.

Tambahkan:

A!quiz stop

untuk admin/moderator.

---

19. DATABASE

Gunakan Prisma.

Minimal schema:

User
- id
- discordId
- username
- createdAt
- updatedAt

QuizScore
- id
- userId
- points
- correctAnswers
- totalAnswers
- createdAt

Conversation
- id
- userId
- channelId
- role
- content
- createdAt

Tambahkan index pada:

discordId
channelId
userId

---

20. Discord Permissions

Music:

User harus berada di voice channel.

Quiz:

Member biasa dapat menjalankan:

A!quiz

Moderator:

A!quiz stop

Owner:

A!reload
A!shutdown
A!stats

Gunakan Discord permission system.

---

21. Error Handling

Bot tidak boleh crash hanya karena satu command error.

Semua command harus memiliki:

try/catch

Global error handler.

Contoh:

❌ Terjadi kesalahan saat menjalankan command.

Error ID:
ERR-82F91

Detail error hanya masuk ke console/log.

Jangan menampilkan API key, token, stack trace, atau credential ke Discord.

---

22. Logging

Gunakan structured logging.

Contoh:

[INFO] Discord connected
[INFO] Logged in as 


AnobystoreBot#1234
[INFO] Lavalink connected
[INFO] Gemini API initialized
[INFO] Command registered
[INFO] User 123456 executed A!play
[ERROR] Music player failed

---

23. Configuration

Semua konfigurasi harus melalui ".env".

Contoh:

DISCORD_TOKEN=
DISCORD_CLIENT_ID=

GEMINI_API_KEY=

DATABASE_URL=

LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass

BOT_PREFIX=A!

MAX_AI_CONTEXT=10
AI_COOLDOWN=5

QUIZ_DURATION=20
QUIZ_POINTS=100

---

24. CLI Development Commands

Tambahkan script:

{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint .",
    "test": "vitest",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  }
}

---

25. Docker

Buat:

Dockerfile
docker-compose.yml

Docker Compose minimal:

bot
postgres
lavalink

Bot harus dapat dijalankan:

docker compose up -d

---

26. Security

Wajib:

- Jangan hardcode token.
- Jangan commit ".env".
- Validasi semua user input.
- Rate limit AI.
- Rate limit command.
- Jangan menampilkan stack trace ke user.
- Jangan menyimpan API key di database.
- Gunakan least privilege Discord permissions.
- Validasi URL music.
- Batasi panjang input.
- Sanitasi user-generated content.

---

27. Slash Command

Walaupun prefix utama:

A!

buat architecture agar nantinya mudah mendukung Discord Slash Command.

Contoh:

/play
/ai
/quiz

Jangan membuat logic command bergantung langsung pada prefix.

Pisahkan:

Command Handler
        ↓
Command Service
        ↓
Business Logic

---

28. Help Command

Buat:

A!help

Output:

🤖 Anobystore  BOT

🎵 MUSIC

A!play <lagu>
A!pause
A!resume
A!skip
A!queue
A!nowplaying
A!stop

🤖 AI

A!ai <pertanyaan>
A!chat <pertanyaan>
A!ai-clear

🎮 QUIZ

A!quiz
A!quiz <kategori>
A!quiz leaderboard
A!quiz stop

⚙️ SYSTEM

A!help
A!ping
A!stats

---

29. Ping / Stats

Implementasikan:

A!ping

Output:

🏓 Pong!

Latency:
45ms

API:
32ms

Dan:

A!stats

Output:

🤖 anobystore BOT

Servers: 12
Users: 8,421
Channels: 183

Uptime:
3d 12h 42m

Memory:
184 MB

Node:
v22.x

by @abiriann.ab

---

30. Testing

Buat unit test untuk:

Music Queue
Quiz scoring
Quiz answer validation
AI prompt generation
Rate limiter
Database repository
Command parsing

Test minimal:

A!play lagu
A!quiz
A!ai pertanyaan

---

31. Documentation

Buat:

README.md
.env.example
docs/architecture.md
docs/commands.md
docs/deployment.md
docs/development.md

README harus menjelaskan:

1. Requirements
2. Installation
3. Discord Bot setup
4. Gemini API setup
5. Lavalink setup
6. Database setup
7. Environment variables
8. Development
9. Production deployment
10. Troubleshooting

---

32. DEVELOPMENT PHASE

Jangan langsung membuat semua fitur sekaligus.

Kerjakan bertahap.

Phase 1 — Core Bot

Implementasikan:

- TypeScript
- Discord.js
- Environment configuration
- Logger
- Command handler
- Error handler
- "A!ping"
- "A!help"

Pastikan berjalan terlebih dahulu.

---

Phase 2 — AI

Implementasikan:

- Gemini service
- "A!ai"
- "A!chat"
- conversation memory
- rate limit
- "A!ai-clear"

Testing:

A!ai halo
A!ai jelaskan ECU

---

Phase 3 — Quiz

Implementasikan:

- Gemini quiz generator
- structured JSON output
- Zod validation
- quiz session
- answer detection
- timer
- scoring
- leaderboard
- database

Testing:

A!quiz
A!quiz otomotif
A!quiz leaderboard

---

Phase 4 — Music

Implementasikan:

- Lavalink connection
- voice connection
- search
- queue
- play
- pause
- resume
- skip
- stop
- volume
- shuffle
- loop
- now playing
- playlist

Testing:

A!play Mahalini Sial
A!pause
A!resume
A!skip
A!queue
A!stop

---

Phase 5 — UI / UX

Tambahkan:

- Discord embeds
- Buttons
- Select menus
- Progress bar
- Better error messages
- Loading state
- Music player controls

---

Phase 6 — Production

Tambahkan:

- Docker
- PostgreSQL
- Lavalink container
- Health check
- Graceful shutdown
- Automatic reconnect
- Persistent database
- Logging
- Monitoring

---

33. Important Development Rules

Saat mengembangkan project:

1. Jangan membuat seluruh kode dalam satu file.
2. Gunakan TypeScript strict mode.
3. Gunakan dependency injection jika diperlukan.
4. Pisahkan Discord layer dengan business logic.
5. Jangan hardcode credentials.
6. Semua external API harus memiliki timeout.
7. Semua API harus memiliki error handling.
8. Jangan crash ketika Lavalink disconnect.
9. Jangan crash ketika Gemini API gagal.
10. Jangan membuat quiz jika Gemini menghasilkan JSON invalid.
11. Jangan membuat command dapat digunakan tanpa permission yang sesuai.
12. Gunakan async/await.
13. Hindari "any" kecuali benar-benar diperlukan.
14. Gunakan type-safe interfaces.
15. Semua feature harus memiliki service layer.

---

34. Expected Final Architecture

                    Discord
                       │
                       ▼
                Discord.js Bot
                       │
              ┌────────┼─────────┐
              │        │         │
              ▼        ▼         ▼
            Music      AI       Quiz
              │        │         │
              ▼        ▼         ▼
          Lavalink   Gemini    Gemini
              │                  │
              │                  ▼
              │               Quiz Engine
              │                  │
              └────────┬─────────┘
                       ▼
                    Prisma
                       │
                       ▼
                   PostgreSQL

---

35. Final CLI Instructions

Anda bertindak sebagai senior TypeScript/Discord.js developer.

Jangan hanya membuat mockup.

Buat project yang benar-benar runnable.

Sebelum coding:

1. Analisis requirement.
2. Buat architecture.
3. Buat folder structure.
4. Buat dependency list.
5. Buat ".env.example".
6. Buat database schema.
7. Buat implementation plan.

Kemudian implementasikan project secara bertahap berdasarkan Phase 1 → Phase 6.

Setelah setiap phase:

1. Jalankan type checking.
2. Jalankan lint.
3. Jalankan test.
4. Perbaiki error.
5. Pastikan tidak ada TypeScript error.
6. Update README jika diperlukan.

Jangan menghapus fitur yang sudah bekerja.

Jika menemukan masalah dependency/API yang berubah, gunakan dokumentasi resmi terbaru sebelum menentukan implementasi.

Prioritaskan kode yang production-ready daripada sekadar contoh.

Pada akhir implementasi tampilkan:

PROJECT STATUS

Core Bot:       ✅
AI Chat:        ✅
Quiz:           ✅
Music:          ✅
Database:       ✅
Lavalink:       ✅
Docker:         ✅
Tests:          ✅

Run development:

npm install
npm run db:generate
npm run db:migrate
npm run dev
