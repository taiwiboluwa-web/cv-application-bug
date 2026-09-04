const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/;

function cleanList(value) {
  return value.split(/[,|•]/).map((s) => s.trim()).filter(Boolean);
}

export function buildCandidateProfile(text) {
  const raw = text.slice(0, 30000).trim();
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const email = raw.match(EMAIL_RE)?.[0] ?? '';
  const phone = raw.match(PHONE_RE)?.[0] ?? '';
  const full_name = lines.find((line) => !line.includes('@') && !/resume|curriculum vitae|cv/i.test(line) && line.length < 80) ?? 'Candidate';
  const skillsLine = lines.find((line) => /^skills?\s*:/i.test(line));
  const skills = skillsLine ? cleanList(skillsLine.replace(/^skills?\s*:\s*/i, '')) : [];
  const portfolio = [...raw.matchAll(/https?:\/\/[^\s)]+/gi)].map((m) => m[0]).slice(0, 20);
  return { full_name, email, phone, headline: '', summary: raw.slice(0, 500), skills, experience: [], education: [], portfolio, preferences: { roles: [], locations: [], remote: false }, raw_cv_text: raw };
}

export function scoreJob(profile, job) {
  const haystack = `${job.title ?? ''} ${job.description ?? ''} ${job.skills ?? ''}`.toLowerCase();
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const matched = skills.filter((skill) => skill && haystack.includes(String(skill).toLowerCase()));
  const skillScore = skills.length ? Math.min(70, Math.round((matched.length / skills.length) * 70)) : 0;
  const role = String(job.title ?? '').toLowerCase();
  const rolePreference = (profile.preferences?.roles ?? []).some((r) => role.includes(String(r).toLowerCase())) ? 20 : 0;
  const remotePreference = profile.preferences?.remote && /remote/i.test(String(job.location ?? '') + ' ' + haystack) ? 10 : 0;
  return Math.max(0, Math.min(100, skillScore + rolePreference + remotePreference));
}

export function shouldAutoApply(score, settings = {}) {
  if (settings.mode !== 'auto') return false;
  const threshold = Number.isFinite(settings.threshold) ? settings.threshold : 85;
  return score >= threshold;
}
