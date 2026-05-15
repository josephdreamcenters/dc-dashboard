const cron = require('node-cron')
const { syncSalesforce } = require('./salesforce')
const { syncAthena } = require('./athena')
const { syncVirtuous } = require('./virtuous')
const { syncVolunteerHub } = require('./volunteerhub')

// Daily at 2:00 AM Mountain Time (UTC-7 = 09:00 UTC)
cron.schedule('0 9 * * *', async () => {
  console.log('[cron] Starting daily external data sync…')
  await Promise.allSettled([
    syncSalesforce(),
    syncAthena(),
    syncVirtuous(),
    syncVolunteerHub(),
  ])
  console.log('[cron] Daily sync complete')
})

console.log('[cron] Scheduled daily sync at 2:00 AM MT')
