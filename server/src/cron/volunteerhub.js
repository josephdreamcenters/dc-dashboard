const db = require('../db')

async function syncVolunteerHub() {
  try {
    // TODO: implement VolunteerHub API — pull active volunteer count
    console.log('[cron:volunteerhub] Sync not yet configured')
  } catch (err) {
    console.error('[cron:volunteerhub] Sync failed:', err.message)
    await db.query(
      "UPDATE integration_status SET last_error = $1, last_attempted_at = NOW() WHERE source = 'volunteerhub'",
      [err.message]
    ).catch(() => {})
  }
}

module.exports = { syncVolunteerHub }
