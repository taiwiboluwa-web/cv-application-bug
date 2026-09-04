import type { NextApiRequest, NextApiResponse } from 'next';
import postgres from 'postgres';

type Profile = { full_name: string; email?: string; phone?: string; headline?: string; summary?: string; skills: string[]; experience: unknown[]; education: unknown[]; portfolio: string[]; preferences: { roles: string[]; locations: string[]; remote: boolean } };

function extractProfile(text: string): Profile {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0];
  const full_name = lines.find((line) => !line.includes('@') && !/resume|curriculum vitae|cv/i.test(line) && line.length < 80) || 'Candidate';
  const skillsLine = lines.find((line) => /^skills?\s*:/i.test(line));
  const skills = skillsLine ? skillsLine.replace(/^skills?\s*:\s*/i, '').split(/[,|•]/).map((s) => s.trim()).filter(Boolean) : [];
  return { full_name, email, phone, headline: '', summary: text.slice(0, 500), skills, experience: [], education: [], portfolio: [], preferences: { roles: [], locations: [], remote: false } };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) return res.status(400).json({ error: 'CV text is required' });
  try {
    const profile = extractProfile(text.slice(0, 30000));
    if (process.env.DATABASE_URL) {
      const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });
      await sql`INSERT INTO candidate_profiles (full_name,email,phone,headline,summary,skills,experience,education,portfolio,preferences,raw_cv_text) VALUES (${profile.full_name},${profile.email ?? ''},${profile.phone ?? ''},${profile.headline ?? ''},${profile.summary ?? ''},${JSON.stringify(profile.skills)},${JSON.stringify(profile.experience)},${JSON.stringify(profile.education)},${JSON.stringify(profile.portfolio)},${JSON.stringify(profile.preferences)},${text.slice(0,30000)})`;
      await sql.end();
    }
    return res.status(200).json({ message: 'Profile extracted and saved.', profile });
  } catch (error) {
    console.error('candidate extraction failed', error);
    return res.status(500).json({ error: 'Could not save the candidate profile.' });
  }
}
