/**
 * Seed script — test kameralarni qo'shadi
 * Foydalanish: npm run db:seed
 *
 * DIQQAT: Avval `npm run db:sync` ishga tushiring (jadvallarni yaratish uchun)
 */

import { config } from 'dotenv'
config()

import { Camera, sequelize } from './index'

async function main() {
  try {
    await sequelize.authenticate()

    // Eskilarini tozalash
    await Camera.destroy({ where: {}, truncate: true })
    console.log('🧹 Eski ma\'lumotlar tozalandi')

    // Test kameralar (sizning real ma'lumotlaringiz bilan o'zgartiring)
    const cameras = [
      {
        name: 'Qabul xona',
        location: '1-qavat, asosiy kirish',
        ipAddress: '110.10.8.15',
        port: 80,
        rtspPort: 554,
        username: 'admin',
        password: 'Test@2026',
        channel: 1,
        streamType: 2, // 1 = main (yuqori sifat), 2 = sub (yengilroq, real-time uchun)
      },
      // {
      //   name: 'Ofis 1',
      //   location: '2-qavat, sharqiy qism',
      //   ipAddress: '110.10.8.16',
      //   port: 80,
      //   rtspPort: 554,
      //   username: 'admin',
      //   password: 'Test@2026',
      //   channel: 1,
      //   streamType: 2,
      // },
      // {
      //   name: 'Ofis 2',
      //   location: '2-qavat, g\'arbiy qism',
      //   ipAddress: '110.10.8.17',
      //   port: 80,
      //   rtspPort: 554,
      //   username: 'admin',
      //   password: 'Test@2026',
      //   channel: 1,
      //   streamType: 2,
      // },
      // {
      //   name: 'Yig\'ilish xonasi',
      //   location: '3-qavat',
      //   ipAddress: '110.10.8.18',
      //   port: 80,
      //   rtspPort: 554,
      //   username: 'admin',
      //   password: 'Test@2026',
      //   channel: 1,
      //   streamType: 2,
      // },
      // {
      //   name: 'Koridor 1',
      //   location: '1-qavat koridor',
      //   ipAddress: '110.10.8.19',
      //   port: 80,
      //   rtspPort: 554,
      //   username: 'admin',
      //   password: 'Test@2026',
      //   channel: 1,
      //   streamType: 2,
      // },
      // {
      //   name: 'Avtomobil to\'xtash joyi',
      //   location: 'Tashqi hudud',
      //   ipAddress: '110.10.8.20',
      //   port: 80,
      //   rtspPort: 554,
      //   username: 'admin',
      //   password: 'Test@2026',
      //   channel: 1,
      //   streamType: 2,
      // },
    ]

    await Camera.bulkCreate(cameras)

    console.log(`✅ ${cameras.length} ta kamera qo'shildi`)
    process.exit(0)
  } catch (err) {
    console.error('❌ Seed xatosi:', err)
    process.exit(1)
  }
}

main()