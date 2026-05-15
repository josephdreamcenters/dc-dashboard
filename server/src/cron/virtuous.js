const db = require('../db')

async function syncVirtuous() {
  try {
    // TODO: implement Virtuous API — pull recurring donor count (Dream Makers) and total revenue
    console.log('[cron:virtuous] Sync not yet configured')
  } catch (err) {
    console.error('[cron:virtuous] Sync failed:', err.message)
    await db.query(
      "UPDATE integration_status SET last_error = $1, last_attempted_at = NOW() WHERE source = 'virtuous'",
      [err.message]
    ).catch(() => {})
  }
}

module.exports = { syncVirtuous }
