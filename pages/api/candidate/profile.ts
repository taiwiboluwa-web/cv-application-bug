import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { upsertUser, saveCandidateProfile } from '../../../lib/db.mjs';
import { buildCandidateProfile } from '../../../lib/agent-core.mjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getSession({ req });
  if (!session?.user?.email) return res.status(401).json({ error: 'Sign in with Google first.' });

  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) return res.status(400).json({ error: 'CV text is required.' });

  try {
    const user = await upsertUser({
      googleSub: session.user.id,
      email: session.user.email,
      name: session.user.name ?? '',
      imageUrl: session.user.image ?? '',
    });
    const profile = buildCandidateProfile(text);
    const saved = await saveCandidateProfile(user.id, profile);
    return res.status(200).json({ profile: saved });
  } catch (error) {
    console.error('candidate profile save failed', error);
    return res.status(500).json({ error: 'Could not save the candidate profile.' });
  }
}
