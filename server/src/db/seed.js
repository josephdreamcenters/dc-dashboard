require('dotenv').config()
const bcrypt = require('bcryptjs')
const db = require('./index')

const DEFAULT_PASSWORD = 'DreamCenters2026!'

async function seed() {
  console.log('Seeding database…')
  const client = await db.pool.connect()

  try {
    await client.query('BEGIN')

    // ── 1. Teams ──────────────────────────────────────────────────
    console.log('  Seeding teams…')
    const teamRes = await client.query(`
      INSERT INTO teams (name, slug) VALUES
        ('Mary''s Home',          'marys-home'),
        ('Women''s Clinic',       'womens-clinic'),
        ('Advancement',           'advancement'),
        ('Volunteer Engagement',  'volunteer-engagement'),
        ('Operations',            'operations')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, slug
    `)
    const teams = {}
    for (const row of teamRes.rows) teams[row.slug] = row.id

    // ── 2. Hash default password ──────────────────────────────────
    console.log('  Hashing default password…')
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12)

    // ── 3. Insert users without reports_to first ──────────────────
    console.log('  Seeding users (pass 1)…')

    const usersToInsert = [
      // name, email, role, title, team_slug, part_time
      ['Matthew Ayers',        'matthew@dreamcenters.org',    'ceo',      'CEO, Founder',                             null,                  false],
      ['Joseph Schmidt',       'joseph@dreamcenters.org',     'admin',    'Director of Operations',                   'operations',          false],
      ['Julia Pacheco',        'julia@dreamcenters.org',      'staff',    'Executive Assistant',                      'operations',          false],
      ['Gunnar Johnson',       'gunnar@dreamcenters.org',     'staff',    'Major Gift Officer',                       'advancement',         false],
      ['Jessica Stiffler',     'jessica@dreamcenters.org',    'director', 'Director of Development',                  'advancement',         false],
      ['Kelly Hurtado',        'kelly@dreamcenters.org',      'director', 'Big Dream Early Learning Program Director', null,                 false],
      ['Natalie Johnson',      'natalie@dreamcenters.org',    'director', 'Women\'s Clinic Program Director',          'womens-clinic',       false],
      ['Dominique Knowles',    'dominique@dreamcenters.org',  'director', 'Mary\'s Home Program Director',             'marys-home',          false],
      ['Samara Hubbard',       'samara@dreamcenters.org',     'director', 'Director of Volunteer Engagement',          'volunteer-engagement',false],
      ['Stacy Noble',          'stacy@dreamcenters.org',      'staff',    'First Impressions',                        'womens-clinic',       false],
      ['Michelle Hubbard',     'michelle@dreamcenters.org',   'staff',    'Operations Manager',                       'womens-clinic',       false],
      ['Whitney Magowan',      'whitney@dreamcenters.org',    'staff',    'Medical Coordinator',                      'womens-clinic',       false],
      ['Kaitlyn Nicholas',     'kaitlyn@dreamcenters.org',    'staff',    'Sonographer',                              'womens-clinic',       true ],
      ['Mark Weinerth',        'mark@dreamcenters.org',       'staff',    'Operations Manager',                       'marys-home',          false],
      ['Ashley Robinson',      'ashley@dreamcenters.org',     'staff',    'Admissions Coordinator',                   'marys-home',          true ],
      ['Lisa Bear',            'lisa@dreamcenters.org',       'staff',    'Admissions Specialist',                    'marys-home',          true ],
      ['Bethany Parker',       'bethany@dreamcenters.org',    'staff',    'Lead Family Advocate',                     'marys-home',          false],
      ['Clea Steininger',      'clea@dreamcenters.org',       'staff',    'Office Coordinator',                       'marys-home',          false],
      ['Taylor Byrd',          'taylor@dreamcenters.org',     'staff',    'Child Watch Coordinator',                  'marys-home',          true ],
      ['Dorothea Rush-Baumert','dorothea@dreamcenters.org',   'staff',    'Property Manager',                        'marys-home',          false],
      ['Chanice Bell',         'chanice@dreamcenters.org',    'staff',    'Child Watch Specialist',                   'marys-home',          true ],
      ['Kylie Day',            'kylie@dreamcenters.org',      'staff',    'Family Advocate',                          'marys-home',          false],
      ['Hannah Hendricks',     'hannah@dreamcenters.org',     'staff',    'Community Advocate',                       'marys-home',          false],
      ['Lindsey Caroon',       'lindsey@dreamcenters.org',    'staff',    'Director of Community Engagement',         'advancement',         false],
      ['Grace Briggs',         'grace@dreamcenters.org',      'staff',    'Donor Services Coordinator',               'advancement',         false],
      ['Charleston Tidwell',   'charleston@dreamcenters.org', 'staff',    'Community Outreach Coordinator',           'advancement',         false],
    ]

    const userIds = {}
    for (const [name, email, role, title, teamSlug, partTime] of usersToInsert) {
      const teamId = teamSlug ? teams[teamSlug] : null
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role, title, team_id, part_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name, role = EXCLUDED.role,
           title = EXCLUDED.title, team_id = EXCLUDED.team_id,
           part_time = EXCLUDED.part_time
         RETURNING id, email`,
        [name, email, hash, role, title, teamId, partTime]
      )
      userIds[email] = res.rows[0].id
    }

    // ── 4. Update reports_to relationships ────────────────────────
    console.log('  Setting reporting relationships…')

    const reportingPairs = [
      // [employee_email, supervisor_email]
      // Reports to Matthew
      ['joseph@dreamcenters.org',     'matthew@dreamcenters.org'],
      ['julia@dreamcenters.org',      'matthew@dreamcenters.org'],
      ['gunnar@dreamcenters.org',     'matthew@dreamcenters.org'],
      ['jessica@dreamcenters.org',    'matthew@dreamcenters.org'],
      ['kelly@dreamcenters.org',      'matthew@dreamcenters.org'],
      // Reports to Joseph
      ['natalie@dreamcenters.org',    'joseph@dreamcenters.org'],
      ['dominique@dreamcenters.org',  'joseph@dreamcenters.org'],
      ['samara@dreamcenters.org',     'joseph@dreamcenters.org'],
      // Women's Clinic — reports to Natalie
      ['stacy@dreamcenters.org',      'natalie@dreamcenters.org'],
      ['michelle@dreamcenters.org',   'natalie@dreamcenters.org'],
      ['whitney@dreamcenters.org',    'natalie@dreamcenters.org'],
      ['kaitlyn@dreamcenters.org',    'natalie@dreamcenters.org'],
      // Mary's Home — reports to Dominique
      ['mark@dreamcenters.org',       'dominique@dreamcenters.org'],
      ['ashley@dreamcenters.org',     'dominique@dreamcenters.org'],
      ['lisa@dreamcenters.org',       'dominique@dreamcenters.org'],
      ['bethany@dreamcenters.org',    'dominique@dreamcenters.org'],
      // Reports to Mark Weinerth
      ['clea@dreamcenters.org',       'mark@dreamcenters.org'],
      ['taylor@dreamcenters.org',     'mark@dreamcenters.org'],
      ['dorothea@dreamcenters.org',   'mark@dreamcenters.org'],
      // Reports to Taylor Byrd
      ['chanice@dreamcenters.org',    'taylor@dreamcenters.org'],
      // Reports to Bethany Parker
      ['kylie@dreamcenters.org',      'bethany@dreamcenters.org'],
      ['hannah@dreamcenters.org',     'bethany@dreamcenters.org'],
      // Advancement — reports to Jessica
      ['lindsey@dreamcenters.org',    'jessica@dreamcenters.org'],
      ['grace@dreamcenters.org',      'jessica@dreamcenters.org'],
      // Reports to Lindsey
      ['charleston@dreamcenters.org', 'lindsey@dreamcenters.org'],
    ]

    for (const [empEmail, supEmail] of reportingPairs) {
      await client.query(
        'UPDATE users SET reports_to = $1 WHERE id = $2',
        [userIds[supEmail], userIds[empEmail]]
      )
    }

    // ── 5. Org BHAG ───────────────────────────────────────────────
    console.log('  Seeding BHAG…')
    await client.query(`
      INSERT INTO bhag (title, description, start_value, target_value, current_value, as_of_date, external_source)
      VALUES (
        'Increase total Dream Makers from 100 to 500 by 12/31/26',
        'Dream Makers are recurring donors who sustain our mission through monthly giving.',
        100, 500, 100,
        CURRENT_DATE,
        'virtuous'
      )
      ON CONFLICT DO NOTHING
    `)

    // ── 6. Team WIGs ──────────────────────────────────────────────
    console.log('  Seeding WIGs…')

    const wigData = [
      // [title, team_slug, wig_type, start_value, target_value, current_value, milestone_status, external_source]
      [
        "Sustain 80% occupancy throughout 2026",
        'marys-home', 'percentage', null, 80, null, null, 'salesforce'
      ],
      [
        "Increase total unique patients from 1200 to 1250 by 12/31/26",
        'womens-clinic', 'numeric', 1200, 1250, 1200, null, 'athena'
      ],
      [
        "Raise at least $3.5M in annual operating budget by 12/31/26",
        'advancement', 'numeric', 0, 3500000, 0, null, 'virtuous'
      ],
      [
        "Secure first lead gifts for Big Dream Campaign",
        'advancement', 'milestone', null, null, null, 'not_started', null
      ],
      [
        "Increase volunteers from 108 to 160 by 12/31/26",
        'volunteer-engagement', 'numeric', 108, 160, 108, null, 'volunteerhub'
      ],
      [
        "Establish Dream Centers' administrative services (Accounting, HR, IT, Office) by 12/31/26",
        'operations', 'milestone', null, null, null, 'not_started', null
      ],
    ]

    const wigIds = {}
    for (const [title, teamSlug, wigType, startVal, targetVal, currentVal, milestoneStatus, source] of wigData) {
      const res = await client.query(
        `INSERT INTO wigs (title, team_id, wig_type, start_value, target_value, current_value, milestone_status, as_of_date, external_source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [title, teams[teamSlug], wigType, startVal, targetVal, currentVal, milestoneStatus, source]
      )
      if (res.rows[0]) wigIds[title] = res.rows[0].id
    }

    // ── 7. Lead Measures ──────────────────────────────────────────
    console.log('  Seeding lead measures…')

    // Find the Operations WIGs
    const volunteersWigRes = await client.query(
      "SELECT id FROM wigs WHERE title LIKE 'Increase volunteers%' LIMIT 1"
    )
    const adminServicesWigRes = await client.query(
      "SELECT id FROM wigs WHERE title LIKE 'Establish Dream Centers%' LIMIT 1"
    )

    const volunteersWigId = volunteersWigRes.rows[0]?.id
    const adminServicesWigId = adminServicesWigRes.rows[0]?.id

    if (volunteersWigId && userIds['samara@dreamcenters.org']) {
      await client.query(
        `INSERT INTO lead_measures (title, description, assigned_to, wig_id, team_id, frequency, status_type, created_by)
         VALUES (
           'Launch volunteer LMS',
           'Research, select, and launch a volunteer Learning Management System to support training and onboarding.',
           $1, $2, $3, 'weekly', 'text', $4
         ) ON CONFLICT DO NOTHING`,
        [
          userIds['samara@dreamcenters.org'],
          volunteersWigId,
          teams['volunteer-engagement'],
          userIds['joseph@dreamcenters.org'],
        ]
      )
    }

    if (adminServicesWigId && userIds['joseph@dreamcenters.org']) {
      await client.query(
        `INSERT INTO lead_measures (title, description, assigned_to, wig_id, team_id, frequency, status_type, created_by)
         VALUES (
           'Get proposals from at least 3 providers from each service area',
           'Accounting, HR, IT, and Office services each need 3 vendor proposals before final selection.',
           $1, $2, $3, 'weekly', 'text', $4
         ) ON CONFLICT DO NOTHING`,
        [
          userIds['joseph@dreamcenters.org'],
          adminServicesWigId,
          teams['operations'],
          userIds['joseph@dreamcenters.org'],
        ]
      )
    }

    // ── 8. Integration status rows ────────────────────────────────
    console.log('  Seeding integration status…')
    await client.query(`
      INSERT INTO integration_status (source) VALUES
        ('salesforce'),
        ('athena'),
        ('virtuous'),
        ('volunteerhub')
      ON CONFLICT (source) DO NOTHING
    `)

    // ── 9. Seed initial Vision document ──────────────────────────
    console.log('  Seeding vision document…')
    const visionCount = await client.query('SELECT COUNT(*) FROM vision')
    if (parseInt(visionCount.rows[0].count) === 0) {
      await client.query(
        `INSERT INTO vision (core_values, core_focus, bhag_text, version, created_by)
         VALUES (
           'Faith-Centered\nCompassion\nExcellence\nStewardship\nCollaboration',
           'To provide life-affirming resources and holistic support to women, families, and children in Colorado Springs.',
           'Increase total Dream Makers from 100 to 500 by 12/31/26',
           1,
           $1
         )`,
        [userIds['matthew@dreamcenters.org']]
      )
    }

    await client.query('COMMIT')
    console.log('Seed complete.')
    console.log('')
    console.log('Default login for all users:')
    console.log('  Password: ' + DEFAULT_PASSWORD)
    console.log('')
    console.log('Key logins:')
    console.log('  Admin:    joseph@dreamcenters.org')
    console.log('  CEO:      matthew@dreamcenters.org')
    console.log('  Director: natalie@dreamcenters.org')
    console.log('  Staff:    michelle@dreamcenters.org')

  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

module.exports = { seed }

if (require.main === module) {
  seed().then(() => process.exit(0)).catch((err) => { console.error('Seed failed:', err); process.exit(1) })
}
