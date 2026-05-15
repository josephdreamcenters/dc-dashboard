const db = require('../db')

async function syncAthena() {
  try {
    // TODO: implement Athena Health API — pull unique patient count for Women's Clinic
    console.log('[cron:athena] Sync not yet configured')
  } catch (err) {
    console.error('[cron:athena] Sync failed:', err.message)
    await db.query(
      "UPDATE integration_status SET last_error = $1, last_attempted_at = NOW() WHERE source = 'athena'",
      [err.message]
    ).catch(() => {})
  }
}

module.exports = { syncAthena }
