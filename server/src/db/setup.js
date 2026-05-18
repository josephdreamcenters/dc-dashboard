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
    console.error('\nSetup warning (non-fatal):', err.message)
  } finally {
    await db.pool.end()
  }
}

setup()
