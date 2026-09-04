import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db.mjs';
import { deepSearchJobs } from '../../../lib/job-discovery.mjs';
import { scoreJob, shouldAutoApply } from '../../../lib/agent-core.mjs';

function authorized(req: NextApiRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return req.headers.authorization === `Bearer ${expected}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const sql = db();
    const users = await sql`
      SELECT u.id, p.*,
             COALESCE(s.mode, 'review') AS agent_mode,
             COALESCE(s.match_threshold, 85) AS match_threshold
      FROM users u
      JOIN candidate_profiles p ON p.user_id = u.id
      LEFT JOIN agent_settings s ON s.user_id = u.id
      WHERE COALESCE(s.enabled, false) = true
      LIMIT 25
    `;

    const summary = { users: users.length, jobs: 0, matches: 0, autoEligible: 0 };

    for (const profile of users) {
      const jobs = await deepSearchJobs(profile);
      summary.jobs += jobs.length;

      for (const job of jobs) {
        const score = scoreJob(profile, job);
        if (score < Number(profile.match_threshold)) continue;
        summary.matches += 1;

        const saved = await sql`
          INSERT INTO jobs (external_id, source, title, description, location, remote, application_url, raw)
          VALUES (${job.external_id}, ${job.source}, ${job.title}, ${job.description}, ${job.location}, ${job.remote}, ${job.application_url}, ${JSON.stringify(job.raw)})
          ON CONFLICT (source, external_id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            application_url = EXCLUDED.application_url,
            raw = EXCLUDED.raw
          RETURNING id
        `;

        await sql`
          INSERT INTO job_matches (user_id, job_id, score, explanation)
          VALUES (${profile.user_id}, ${saved[0].id}, ${score}, ${`Automated fit score: ${score}/100.`})
          ON CONFLICT (user_id, job_id) DO UPDATE SET score = EXCLUDED.score, explanation = EXCLUDED.explanation
        `;

        if (shouldAutoApply(score, { mode: profile.agent_mode, threshold: Number(profile.match_threshold) })) {
          summary.autoEligible += 1;
          await sql`
            INSERT INTO agent_tasks (user_id, task_type, payload)
            VALUES (${profile.user_id}, 'prepare_application', ${JSON.stringify({ jobId: saved[0].id, score })})
          `;
        }
      }
    }

    return res.status(200).json({ ok: true, summary });
  } catch (error) {
    console.error('agent tick failed', error);
    return res.status(500).json({ error: 'Autonomous agent tick failed.' });
  }
}
