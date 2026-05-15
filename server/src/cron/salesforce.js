const axios = require('axios')
const db = require('../db')

async function syncSalesforce() {
  try {
    // TODO: implement Salesforce OAuth flow and pull Mary's Home occupancy
    // Endpoint: Salesforce REST API — query occupancy custom object or report
    console.log('[cron:salesforce] Sync not yet configured')
  } catch (err) {
    console.error('[cron:salesforce] Sync failed:', err.message)
    await db.query(
      "UPDATE integration_status SET last_error = $1, last_attempted_at = NOW() WHERE source = 'salesforce'",
      [err.message]
    ).catch(() => {})
  }
}

module.exports = { syncSalesforce }
