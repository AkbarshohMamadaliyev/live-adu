# Live ADU

IP kameralarini login/parolsiz tomosha qilish uchun web ilovasi. Foydalanuvchilar faqat xona tanlaydi — credentials backend tomonida yashirin saqlanadi.

## Imkoniyatlari

- ✅ Login/parolsiz kamera ko'rish (credentials faqat backendda)
- ✅ 10+ kamera bilan ishlash
- ✅ Live HLS stream (low latency, ~2-4 sekund kechikish)
- ✅ Online/offline holatini avtomatik tekshirish
- ✅ Bir vaqtda bir nechta kamerani ko'rish (multi-view)
- ✅ Snapshot olish (JPEG yuklab olish)
- ✅ PostgreSQL + Sequelize ORM
- ✅ Auto-cleanup (idle streamlar to'xtaydi, CPU/disk tejash)

## Texnologiyalar

- **Next.js 15** (App Router) + TypeScript
- **PostgreSQL** + **Sequelize** ORM
- **FFmpeg** — RTSP → HLS konvertatsiya
- **HLS.js** — frontend video player
- **Tailwind CSS** + lucide-react ikonlar

## Talablar

Server da quyidagilar o'rnatilgan bo'lishi kerak:

1. **Node.js 18+** ([nodejs.org](https://nodejs.org))
2. **PostgreSQL 13+** ([postgresql.org](https://postgresql.org))
3. **FFmpeg** — RTSP stream uchun

### FFmpeg o'rnatish

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install ffmpeg -y
ffmpeg -version  # tekshirish
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
[ffmpeg.org/download.html](https://ffmpeg.org/download.html) dan yuklab oling, PATH ga qo'shing.

## O'rnatish

### 1. Loyihani yuklab oling

```bash
cd live-adu
npm install
```

### 2. PostgreSQL bazani sozlash

```bash
# PostgreSQL ga ulanib, baza yarating
sudo -u postgres psql
CREATE DATABASE live_adu;
\q
```

`.env` faylini sozlang (`.env.example` dan nusxa oling):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/live_adu"
HLS_OUTPUT_DIR="./public/hls"
FFMPEG_PATH="ffmpeg"
```

### 3. Database jadvallarini yaratish

```bash
npm run db:sync
```

Bu Sequelize sync orqali `cameras` jadvalini yaratadi.

### 4. Test ma'lumotlar (kameralar)

`src/lib/db/seed.ts` faylini oching va o'z kameralaringiz ma'lumotlarini kiriting:

```ts
{
  name: 'Qabul xona',
  location: '1-qavat, asosiy kirish',
  ipAddress: '110.10.8.15',     // o'z kamerangiz IP si
  port: 80,                      // HTTP port
  rtspPort: 554,                 // RTSP port
  username: 'admin',
  password: 'Test@2026',         // kamera paroli
  channel: 1,
  streamType: 1,                 // 1 = main stream, 2 = sub stream
}
```

Keyin seed ni ishga tushiring:

```bash
npm run db:seed
```

### 5. Ilovani ishga tushirish

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

Brauzeringizdan oching: [http://localhost:3000](http://localhost:3000)

## Foydalanish

1. Sidebar dan kamerani tanlang
2. Live stream avtomatik boshlanadi (3-10 sekund kerak)
3. **Snapshot** tugmasi — JPEG yuklab olish
4. **To'liq ekran** — fullscreen
5. **Ko'p ekran ko'rinishi** — barcha online kameralar gridda

## Loyiha tuzilishi

```
live-adu/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── cameras/      # GET kameralar ro'yxati
│   │   │   ├── stream/[id]/  # POST stream boshlash, GET keepalive
│   │   │   ├── snapshot/[id] # GET JPEG snapshot
│   │   │   └── status/       # GET barcha kameralar holati
│   │   ├── layout.tsx
│   │   ├── page.tsx          # Asosiy sahifa
│   │   └── globals.css
│   ├── components/
│   │   ├── CameraPlayer.tsx  # HLS video player
│   │   ├── CameraList.tsx    # Sidebar
│   │   └── MultiViewGrid.tsx # Multi-view grid
│   └── lib/
│       ├── db/
│       │   ├── connection.ts # Sequelize singleton
│       │   ├── models/
│       │   │   └── Camera.ts # Camera modeli
│       │   ├── index.ts      # Export hub
│       │   ├── sync.ts       # Jadval yaratish skripti
│       │   └── seed.ts       # Test data
│       ├── stream-manager.ts # FFmpeg processlarni boshqarish
│       └── hikvision-client.ts # ISAPI Digest auth
├── public/hls/               # FFmpeg HLS segmentlar (auto-generated)
└── .env
```

## Sequelize haqida

Loyiha **Sequelize ORM** ishlatadi. Asosiy fayllar:

- `src/lib/db/connection.ts` — `Sequelize` instance (singleton)
- `src/lib/db/models/Camera.ts` — Camera modeli (TypeScript types bilan)
- `src/lib/db/index.ts` — barcha modellarni export qiladi

### Yangi modelni qo'shish

1. `src/lib/db/models/` ichida yangi fayl yarating (masalan `User.ts`)
2. `Model.init()` orqali jadval sxemasini bering
3. `src/lib/db/index.ts` ga import va export qiling
4. `npm run db:sync` ishga tushiring

### Migration vs Sync

Hozirda `sequelize.sync({ alter: true })` ishlatiladi — bu **development** uchun yaxshi. Production uchun **umzug** yoki **sequelize-cli** migration tool ishlating:

```bash
npm install -D sequelize-cli
npx sequelize-cli init
```

## Arxitektura

```
[Browser] ──── HTTP ────▶ [Next.js Backend]
    ▲                         │
    │                         ├── POST /api/stream/:id
    │                         │   └─▶ FFmpeg spawn (RTSP → HLS)
    │                         │
    │                         ├── GET /api/snapshot/:id
    │                         │   └─▶ ISAPI Digest auth → JPEG
    │                         │
    │                         └── GET /api/status
    │                             └─▶ Parallel ping all cameras
    │
    └─── HLS (.m3u8 + .ts) ◀── [public/hls/<id>/]
                                       ▲
                                       │ FFmpeg writes
                                       │
                              [Hikvision Camera RTSP]
```

**Muhim**: Frontend hech qachon kamera credentials ni ko'rmaydi. Faqat backend Hikvision bilan to'g'ridan-to'g'ri gaplashadi.

## Hikvision RTSP URL format

Standart Hikvision URL:
```
rtsp://<user>:<pass>@<ip>:554/Streaming/Channels/<channel><stream>
```

- `channel` = 1, 2, 3... (kanal raqami)
- `stream` = 01 (main, yuqori sifat) yoki 02 (sub, kichik)
- Misol: `rtsp://admin:Test@2026@110.10.8.15:554/Streaming/Channels/101`

## Troubleshooting

### "Playlist timeout - kameraga ulana olmadi"
- Kamera IP si to'g'rimi tekshiring
- Ping: `ping 110.10.8.15`
- RTSP test: `ffmpeg -i "rtsp://admin:Test@2026@110.10.8.15:554/Streaming/Channels/101" -t 5 -f null -`
- Kamerada RTSP yoqilganmi (Configuration → Network → Advanced)

### Stream ochilmaydi, lekin ping ishlaydi
- Login/parol xato bo'lishi mumkin
- Hikvision veb interfeysiga kiring va credentials ni tekshiring
- Parolda maxsus belgilar (`@`, `:`) bo'lsa, URL encoding kerak (kod buni avtomatik qiladi)

### "FFmpeg" topilmadi
```bash
which ffmpeg  # Linux/Mac
where ffmpeg  # Windows
```
Agar yo'q bo'lsa, `.env` da to'liq yo'lni ko'rsating:
```env
FFMPEG_PATH="/usr/bin/ffmpeg"
```

### "DATABASE_URL is not set"
`.env` fayl yaratilganmi tekshiring (`.env.example` dan nusxa oling).

### CPU yuqori
- Sub stream ishlatish (`streamType: 2`) — ancha kichikroq
- Yoki FFmpeg da resize qo'shish: `-vf scale=640:360`
- Multi-view 4-9 ta kameradan oshmasin

### Streamlar to'xtamayapti
StreamManager 60 sekund idle bo'lgandan keyin avtomatik to'xtatadi. Tezroq to'xtatish uchun `idleTimeoutMs` ni o'zgartiring (`src/lib/stream-manager.ts`).

## Production deploy uchun maslahat

1. **Kameralar va server bir LAN da bo'lsin** — internet orqali RTSP sekin
2. **PM2 yoki systemd** ishlating: `pm2 start npm --name live-adu -- start`
3. **Nginx** orqali proxy qiling (HTTPS, gzip)
4. **Firewall** — ilovaga faqat ichki tarmoqdan kirish
5. **Backup** — PostgreSQL ni `pg_dump` bilan zaxiralang
6. **Monitoring** — server CPU/disk (HLS segmentlar joy egallaydi)
7. **Migrations** — production da `sync({ alter: true })` o'rniga sequelize-cli migration ishlating

## Litsenziya

MIT

## RTSP kamera qo'shish (universal)

v1.1 dan boshlab tizim **faqat Hikvision emas**, balki **har qanday RTSP kamerasi** bilan ishlaydi (Dahua, Reolink, oddiy RTSP serverlar va h.k.).

Admin panelda yangi kamera qo'shganingizda **3 ta yangi maydon** mavjud:

| Maydon | Tavsif |
| --- | --- |
| **Channel** | Hikvision uchun kanal raqami (default: 1). RTSP Path to'ldirilgan bo'lsa, e'tiborga olinmaydi. |
| **Stream Type** | Main (1 — yuqori sifat) yoki Sub (2 — past sifat, kam CPU). |
| **RTSP Path** | Custom RTSP URL path. Bo'sh qoldirilsa Hikvision shabloni avtomatik ishlatiladi. |

### Misollar

**Hikvision (eski uslub — RTSP Path bo'sh)**:
- IP: `192.168.1.64`, RTSP Port: `554`, Channel: `1`, Stream Type: `Main`
- Natija: `rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101`

**Custom RTSP URL (sizning misol)**:
- IP: `213.230.67.241`, RTSP Port: `556`
- RTSP Path: **(bo'sh qoldiring)**
- Natija: `rtsp://admin:qwerty12345@213.230.67.241:556`

**Dahua**:
- RTSP Path: `/cam/realmonitor?channel=1&subtype=0`
- Natija: `rtsp://user:pass@IP:554/cam/realmonitor?channel=1&subtype=0`

**Reolink**:
- RTSP Path: `/h264Preview_01_main`

### Status tekshiruvi

Hikvision bo'lmagan kameralarda (RTSP Path to'ldirilgan) tizim **HTTP ISAPI o'rniga RTSP port'ga TCP probe** qiladi. Hikvision uchun avval HTTP, agar javob bo'lmasa — RTSP port fallback ishlaydi.

### Snapshot

Hikvision bo'lmagan kameralarda snapshot **FFmpeg orqali RTSP'dan** olinadi (bitta kadr). Hikvision'da avval HTTP ISAPI urinib ko'riladi, ishlamasa FFmpeg fallback.

### Schema yangilash

Mavjud bazada yangi `rtsp_path` ustun qo'shish uchun:

```bash
npm run db:sync
```

Bu `sequelize.sync({ alter: true })` ishlatadi — mavjud kameralarda `rtsp_path` `NULL` bo'ladi (Hikvision rejimida qoladi).
