import { Sequelize } from 'sequelize'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Next.js dev modeda hot-reload bo'lsa ham bitta instance qoladi
const globalForSequelize = globalThis as unknown as {
  sequelize: Sequelize | undefined
}

export const sequelize =
  globalForSequelize.sequelize ??
  new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? false : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      // snake_case column names (created_at, updated_at)
      underscored: true,
    },
  })

if (process.env.NODE_ENV !== 'production') {
  globalForSequelize.sequelize = sequelize
}
