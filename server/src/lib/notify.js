const db = require('../db')

/**
 * createNotification — create an in-app notification for a user.
 * @param {number} userId - recipient user ID
 * @param {string} type - e.g. 'todo_assigned', 'review_ready', 'checkin_submitted'
 * @param {string} title - short notification title
 * @param {string} [body] - longer body text
 * @param {string} [link] - frontend route to navigate to
 */
async function createNotification(userId, type, title, body = null, link = null) {
  try {
    await db.query(
      'INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1, $2, $3, $4, $5)',
      [userId, type, title, body, link]
    )
  } catch (err) {
    console.error('[notify] Failed to create notification:', err.message)
  }
}

module.exports = { createNotification }
