import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { db } from '../../../lib/db.mjs';
import { deepSearchJobs } from '../../../lib/job-discovery.mjs';
import { scoreJob } from '../../../lib/agent-core.mjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getSession({ req });
  if (!session?.user?.email) return res.status(401).json({ error: 'Sign in with Google first.' });

  try {
    const sql = db();
    const users = await sql`SELECT id FROM users WHERE email = ${session.user.email} LIMIT 1`;
    if (!users[0]) return res.status(404).json({ error: 'Candidate account has not been initialized.' });

    const profiles = await sql`SELECT * FROM candidate_profiles WHERE user_id = ${users[0].id} LIMIT 1`;
    if (!profiles[0]) return res.status(400).json({ error: 'Upload your CV before searching for jobs.' });

    const profile = profiles[0];
    const jobs = await deepSearchJobs(profile);
    const matches = [];

    for (const job of jobs) {
      const score = scoreJob(profile, job);
      const rows = await sql`
        INSERT INTO jobs (external_id, source, title, description, location, remote, application_url, raw)
        VALUES (${job.external_id}, ${job.source}, ${job.title}, ${job.description}, ${job.location}, ${job.remote}, ${job.application_url}, ${JSON.stringify(job.raw)})
        ON CONFLICT (source, external_id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          application_url = EXCLUDED.application_url,
          raw = EXCLUDED.raw
        RETURNING id, title, application_url
      `;
      const saved = rows[0];
      await sql`
        INSERT INTO job_matches (user_id, job_id, score, explanation)
        VALUES (${users[0].id}, ${saved.id}, ${score}, ${`Automated candidate/job fit score: ${score}/100.`})
        ON CONFLICT (user_id, job_id) DO UPDATE SET score = EXCLUDED.score, explanation = EXCLUDED.explanation
      `;
      matches.push({ ...saved, score });
    }

    matches.sort((a, b) => b.score - a.score);
    return res.status(200).json({ discovered: jobs.length, matches });
  } catch (error) {
    console.error('job discovery failed', error);
    return res.status(500).json({ error: 'Job discovery failed. Check the search provider and Neon configuration.' });
  }
}
