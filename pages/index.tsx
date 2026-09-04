import { useEffect, useState } from 'react';
import { getSession, signIn, signOut, useSession } from 'next-auth/react';

export default function Home() {
  const { data: session, status } = useSession();
  const [cv, setCv] = useState('');
  const [message, setMessage] = useState('');
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<Array<{ id: string; title: string; application_url: string; score: number }>>([]);

  useEffect(() => {
    if (session?.user?.email) setMessage('Signed in. Upload your CV to initialize your candidate profile.');
  }, [session]);

  const extract = async () => {
    if (!cv.trim()) return setMessage('Add your CV text first.');
    setMessage('Building your candidate profile…');
    const response = await fetch('/api/candidate/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cv }),
    });
    const data = await response.json();
    setMessage(response.ok ? 'Candidate profile saved to Neon.' : (data.error || 'Could not save the profile.'));
  };

  const discover = async () => {
    setSearching(true);
    setMessage('Searching the web for jobs matched to your profile…');
    try {
      const response = await fetch('/api/jobs/discover', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Job discovery failed.');
      setMatches(data.matches ?? []);
      setMessage(`Discovered ${data.discovered ?? 0} jobs and scored the matches.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Job discovery failed.');
    } finally {
      setSearching(false);
    }
  };

  if (status === 'loading') return <main className="shell"><section className="content"><p>Loading your session…</p></section></main>;

  if (!session) {
    return (
      <main className="landing">
        <div className="landing-inner">
          <span className="eyebrow">AUTONOMOUS JOB OPERATOR</span>
          <h1>Your CV goes in.<br />Your job hunt keeps moving.</h1>
          <p>Connect with Google, upload your CV once, and let the agent discover relevant opportunities, score them against your real experience, prepare applications, and track the entire pipeline.</p>
          <button className="primary google" onClick={() => signIn('google')}>Continue with Google</button>
          <small>Nothing is invented about your background. Secure steps such as CAPTCHA or MFA remain interactive.</small>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">AJ</span><div><strong>AI Job Agent</strong><small>Personal career operator</small></div></div>
        <nav><a className="active">Command Center</a><a>Candidate Profile</a><a>Jobs</a><a>Applications</a><a>Email</a><a>Agent Settings</a></nav>
        <div className="agent-card"><span className="pulse" />Agent online<strong>Discovery ready</strong><small>{session.user.email}</small></div>
        <button className="ghost signout" onClick={() => signOut()}>Sign out</button>
      </aside>
      <section className="content">
        <header className="topbar">
          <div><span className="eyebrow">JOB HUNT / CONTROL ROOM</span><h1>Put your job search on autopilot.</h1><p>Upload once. Discover, match, prepare and track without repeatedly prompting the agent.</p></div>
          <button className="primary" onClick={discover} disabled={searching}>{searching ? 'Searching…' : 'Find matching jobs'}</button>
        </header>

        <section className="stats">
          <div><span>Jobs matched</span><strong>{matches.length}</strong><small>From your latest search</small></div>
          <div><span>Applications</span><strong>0</strong><small>Submission worker next</small></div>
          <div><span>Interviews</span><strong>0</strong><small>Tracked automatically</small></div>
          <div><span>Agent status</span><strong className="live">ONLINE</strong><small>Awaiting your profile</small></div>
        </section>

        <div className="grid">
          <section className="panel cv" id="cv">
            <div className="panel-head"><div><span className="eyebrow">01 / CANDIDATE PROFILE</span><h2>Upload your CV</h2></div><span className="tag">Neon profile</span></div>
            <p className="muted">Paste extracted CV text for now. PDF/DOCX upload parsing is the next ingestion layer; the stored profile is always grounded in the source CV.</p>
            <textarea value={cv} onChange={e => setCv(e.target.value)} placeholder="Paste your CV here…" rows={12} />
            <div className="row"><button className="primary" onClick={extract}>Save candidate profile</button></div>
            {message && <p className="notice">{message}</p>}
          </section>

          <section className="panel">
            <div className="panel-head"><div><span className="eyebrow">02 / MATCH ENGINE</span><h2>Recommended roles</h2></div><span className="tag">Web discovery</span></div>
            {matches.length === 0 ? <div className="empty"><strong>No jobs loaded.</strong><span>Save your CV, then run the job hunter.</span></div> : <div className="jobs">{matches.map(job => <article className="job" key={job.id}><div className="job-score">{job.score}%<small>match</small></div><div><strong>{job.title}</strong><span>Discovered on the web</span></div><a className="ghost" href={job.application_url} target="_blank" rel="noreferrer">Open</a></article>)}</div>}
          </section>
        </div>

        <section className="panel pipeline"><div className="panel-head"><div><span className="eyebrow">03 / APPLICATION PIPELINE</span><h2>Applications</h2></div></div><div className="pipeline-grid"><div><span>Draft</span><strong>0</strong></div><div><span>Ready</span><strong>0</strong></div><div><span>Applied</span><strong>0</strong></div><div><span>Interview</span><strong>0</strong></div><div><span>Offer</span><strong>0</strong></div></div></section>

        <section className="panel email"><div><div><span className="eyebrow">04 / EMAIL OPERATOR</span><h2>Gmail operator</h2><p className="muted">Your Google sign-in is separate from Gmail sending. A dedicated Gmail OAuth permission will be added before the agent can send application or recruiter emails.</p></div><div className="email-state"><span>●</span> Not connected for sending</div></div></section>
      </section>
    </main>
  );
}

export async function getServerSideProps(context: any) {
  const session = await getSession(context);
  return { props: { session: session ?? null } };
}
