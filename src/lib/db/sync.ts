/**
 * Database sync — jadvallarni yaratadi/yangilaydi
 * Foydalanish: npm run db:sync
 *
 * DIQQAT: Bu Prisma migration o'rniga Sequelize sync ishlatadi.
 * Production uchun migration tool ishlatish tavsiya etiladi (umzug yoki sequelize-cli).
 */

// .env ni yuklash
import { config } from 'dotenv'
config()

import { sequelize } from './index'

async function main() {
  try {
    console.log('🔌 PostgreSQL ga ulanish tekshirilmoqda...')
    await sequelize.authenticate()
    console.log('✅ Ulanish muvaffaqiyatli')

    console.log('📋 Jadvallarni yaratish/yangilash...')
    // alter: true — schema o'zgargan bo'lsa avtomatik yangilaydi
    // force: true — JADVALLARNI O'CHIRIB QAYTA YARATADI (production da ishlatmang!)
    await sequelize.sync({ alter: true })
    console.log('✅ Jadvallar tayyor')

    process.exit(0)
  } catch (err) {
    console.error('❌ Sync xatosi:', err)
    process.exit(1)
  }
}

main()
