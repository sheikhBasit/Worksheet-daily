import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS entries (
      id         BIGINT PRIMARY KEY,
      type       TEXT NOT NULL,
      name       TEXT NOT NULL,
      date       TEXT,
      lang       TEXT,
      goals      JSONB,
      entries    JSONB,
      remarks    TEXT,
      saved_at   TIMESTAMPTZ,
      edited_at  TIMESTAMPTZ
    )
  `;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    await ensureTable();

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT * FROM entries ORDER BY id DESC
      `;
      const records = rows.map(r => ({
        id:       Number(r.id),
        type:     r.type,
        name:     r.name,
        date:     r.date,
        lang:     r.lang,
        goals:    r.goals,
        entries:  r.entries,
        remarks:  r.remarks,
        savedAt:  r.saved_at,
        editedAt: r.edited_at ?? undefined,
      }));
      return res.status(200).json(records);
    }

    if (req.method === 'POST') {
      const { id, type, name, date, lang, goals, entries, remarks, savedAt } = req.body;
      await sql`
        INSERT INTO entries (id, type, name, date, lang, goals, entries, remarks, saved_at)
        VALUES (
          ${id}, ${type}, ${name}, ${date ?? null}, ${lang ?? null},
          ${goals ? JSON.stringify(goals) : null},
          ${entries ? JSON.stringify(entries) : null},
          ${remarks ?? null},
          ${savedAt ?? null}
        )
      `;
      return res.status(201).json({ ok: true });
    }

    if (req.method === 'PUT') {
      const { id, type, name, date, lang, goals, entries, remarks, editedAt } = req.body;
      await sql`
        UPDATE entries SET
          type      = ${type},
          name      = ${name},
          date      = ${date ?? null},
          lang      = ${lang ?? null},
          goals     = ${goals ? JSON.stringify(goals) : null},
          entries   = ${entries ? JSON.stringify(entries) : null},
          remarks   = ${remarks ?? null},
          edited_at = ${editedAt ?? null}
        WHERE id = ${id}
      `;
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      await sql`DELETE FROM entries WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('DB error:', err);
    return res.status(500).json({ error: err.message });
  }
}
