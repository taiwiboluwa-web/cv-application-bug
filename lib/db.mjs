import postgres from 'postgres';

let client;

export function db() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }
  client ??= postgres(process.env.DATABASE_URL, {
    ssl: 'require',
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return client;
}

export async function upsertUser({ googleSub, email, name = '', imageUrl = '' }) {
  const sql = db();
  const rows = await sql`
    INSERT INTO users (google_sub, email, name, image_url)
    VALUES (${googleSub}, ${email}, ${name}, ${imageUrl})
    ON CONFLICT (email) DO UPDATE SET
      google_sub = EXCLUDED.google_sub,
      name = EXCLUDED.name,
      image_url = EXCLUDED.image_url,
      updated_at = now()
    RETURNING id, email, name, image_url
  `;
  return rows[0];
}

export async function saveCandidateProfile(userId, profile) {
  const sql = db();
  const rows = await sql`
    INSERT INTO candidate_profiles
      (user_id, full_name, email, phone, headline, summary, skills, experience, education, portfolio, preferences, raw_cv_text)
    VALUES
      (${userId}, ${profile.full_name ?? ''}, ${profile.email ?? ''}, ${profile.phone ?? ''},
       ${profile.headline ?? ''}, ${profile.summary ?? ''}, ${JSON.stringify(profile.skills ?? [])},
       ${JSON.stringify(profile.experience ?? [])}, ${JSON.stringify(profile.education ?? [])},
       ${JSON.stringify(profile.portfolio ?? [])}, ${JSON.stringify(profile.preferences ?? {})},
       ${profile.raw_cv_text ?? ''})
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      headline = EXCLUDED.headline,
      summary = EXCLUDED.summary,
      skills = EXCLUDED.skills,
      experience = EXCLUDED.experience,
      education = EXCLUDED.education,
      portfolio = EXCLUDED.portfolio,
      preferences = EXCLUDED.preferences,
      raw_cv_text = EXCLUDED.raw_cv_text,
      updated_at = now()
    RETURNING *
  `;
  return rows[0];
}
