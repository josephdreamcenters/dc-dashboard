const router = require('express').Router()
const db = require('../db')
const requireAuth = require('../middleware/auth')

const MEETING_SELECT = `
  SELECT m.*,
    t.name  AS team_name,
    u.name  AS created_by_name,
    COALESCE(
      json_agg(
        json_build_object('id', mp.user_id, 'name', pu.name)
        ORDER BY pu.name
      ) FILTER (WHERE mp.user_id IS NOT NULL),
      '[]'
    ) AS participants
  FROM meetings m
  LEFT JOIN teams t  ON t.id = m.team_id
  LEFT JOIN users u  ON u.id = m.created_by
  LEFT JOIN meeting_participants mp ON mp.meeting_id = m.id
  LEFT JOIN users pu ON pu.id = mp.user_id
`

// GET /api/meetings
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { team_id, upcoming } = req.query
    const conditions = []
    const values = []
    let i = 1

    if (team_id)  { conditions.push(`m.team_id = $${i++}`); values.push(team_id) }
    if (upcoming === 'true') {
      conditions.push(`m.scheduled_date >= NOW() - INTERVAL '1 hour'`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await db.query(
      `${MEETING_SELECT} ${where} GROUP BY m.id, t.name, u.name ORDER BY m.scheduled_date DESC`,
      values
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// POST /api/meetings — schedule a meeting
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { title, type, scheduled_date, team_id, participant_ids } = req.body
    if (!scheduled_date) return res.status(400).json({ message: 'scheduled_date required' })

    const { rows } = await db.query(`
      INSERT INTO meetings (title, type, scheduled_date, team_id, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [title ?? null, type ?? 'weekly', scheduled_date, team_id ?? null, req.user.id])

    const meetingId = rows[0].id

    // Add creator as participant
    const ids = new Set([req.user.id, ...(participant_ids ?? [])])
    for (const uid of ids) {
      await db.query(
        'INSERT INTO meeting_participants (meeting_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [meetingId, uid]
      )
    }

    const { rows: full } = await db.query(
      `${MEETING_SELECT} WHERE m.id = $1 GROUP BY m.id, t.name, u.name`, [meetingId]
    )
    res.status(201).json(full[0])
  } catch (err) { next(err) }
})

// GET /api/meetings/:id — full detail
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `${MEETING_SELECT} WHERE m.id = $1 GROUP BY m.id, t.name, u.name`, [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ message: 'Meeting not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// PUT /api/meetings/:id — update notes, agenda, title, participants
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { title, notes, agenda, started_at, participant_ids } = req.body

    await db.query(`
      UPDATE meetings SET
        title      = COALESCE($1, title),
        notes      = COALESCE($2, notes),
        agenda     = COALESCE($3, agenda),
        started_at = COALESCE($4, started_at),
        updated_at = NOW()
      WHERE id = $5
    `, [title ?? null, notes ?? null,
        agenda !== undefined ? JSON.stringify(agenda) : null,
        started_at ?? null, req.params.id])

    if (participant_ids !== undefined) {
      await db.query('DELETE FROM meeting_participants WHERE meeting_id = $1', [req.params.id])
      for (const uid of participant_ids) {
        await db.query(
          'INSERT INTO meeting_participants (meeting_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [req.params.id, uid]
        )
      }
    }

    const { rows } = await db.query(
      `${MEETING_SELECT} WHERE m.id = $1 GROUP BY m.id, t.name, u.name`, [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ message: 'Meeting not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// POST /api/meetings/:id/end — wrap up meeting, save recap
router.post('/:id/end', requireAuth, async (req, res, next) => {
  try {
    const { notes, recap } = req.body
    await db.query(`
      UPDATE meetings SET
        ended_at   = NOW(),
        notes      = COALESCE($1, notes),
        recap      = COALESCE($2, recap),
        updated_at = NOW()
      WHERE id = $3
    `, [notes ?? null, recap ? JSON.stringify(recap) : null, req.params.id])

    const { rows } = await db.query(
      `${MEETING_SELECT} WHERE m.id = $1 GROUP BY m.id, t.name, u.name`, [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ message: 'Meeting not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// DELETE /api/meetings/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query('DELETE FROM meetings WHERE id = $1 RETURNING id', [req.params.id])
    if (!rows[0]) return res.status(404).json({ message: 'Meeting not found' })
    res.json({ message: 'Deleted' })
  } catch (err) { next(err) }
})

module.exports = router
