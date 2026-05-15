require('dotenv').config()
const { migrate } = require('./migrate')
const { seed } = require('./seed')
const db = require('./index')

async function setup() {
  try {
    await migrate()
    await seed()
    console.log('\nSetup complete — database is ready.')
  } catch (err) {
    console.error('\nSetup failed:', err.message)
    process.exit(1)
  } finally {
    await db.pool.end()
  }
}

setup()
