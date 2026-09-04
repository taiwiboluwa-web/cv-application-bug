const DEFAULT_QUERIES = [
  'site:greenhouse.io jobs hiring',
  'site:lever.co jobs hiring',
  'site:workable.com jobs hiring',
  'remote jobs hiring',
];

function clean(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

export async function deepSearchJobs(profile, queries = DEFAULT_QUERIES) {
  if (!process.env.TAVILY_API_KEY) {
    throw new Error('TAVILY_API_KEY is not configured');
  }

  const preferredRoles = profile.preferences?.roles ?? [];
  const skills = profile.skills ?? [];
  const personalized = [
    ...preferredRoles.map((role) => `${role} jobs hiring`),
    skills.length ? `${skills.slice(0, 8).join(' ')} jobs hiring` : '',
    ...queries,
  ].filter(Boolean);

  const uniqueQueries = [...new Set(personalized)].slice(0, 12);
  const results = [];

  for (const query of uniqueQueries) {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: 'advanced',
        topic: 'general',
        max_results: 20,
        include_raw_content: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Job search provider failed: ${response.status}`);
    }

    const data = await response.json();
    for (const item of data.results ?? []) {
      if (!item.url || !item.title) continue;
      results.push({
        source: 'web-search',
        external_id: item.url,
        title: clean(item.title),
        description: clean(item.raw_content || item.content || ''),
        location: '',
        remote: /remote/i.test(`${item.title} ${item.content ?? ''}`),
        application_url: item.url,
        raw: item,
      });
    }
  }

  const seen = new Set();
  return results.filter((job) => {
    if (seen.has(job.application_url)) return false;
    seen.add(job.application_url);
    return true;
  });
}
