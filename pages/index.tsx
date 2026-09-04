'use client';
import { useState } from 'react';

const demoJobs = [
  { id: '1', company: 'Polygon Labs', title: 'Content & Social Lead', location: 'Remote', score: 94 },
  { id: '2', company: 'Consensys', title: 'Community Manager', location: 'Remote', score: 88 },
  { id: '3', company: 'Coinbase', title: 'Content Strategist', location: 'Remote', score: 86 },
];

export default function Home() {
  const [cv, setCv] = useState('');
  const [message, setMessage] = useState('');
  const extract = async () => {
    if (!cv.trim()) { setMessage('Add your CV text first.'); return; }
    setMessage('Extracting profile…');
    try {
      const response = await fetch('/api/candidate/extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: cv }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not extract the CV.');
      setMessage(data.message || 'Profile extracted and saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not extract the CV. Please retry.'); }
  };
  return <main className="shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">AJ</span><div><strong>AI Job Agent</strong><small>Personal career operator</small></div></div><nav><a className="active">Command Center</a><a>Candidate Profile</a><a>Jobs</a><a>Applications</a><a>Email</a><a>Agent Settings</a></nav><div className="agent-card"><span className="pulse"/>Agent ready<strong>Review mode</strong><small>No applications are submitted without approval.</small></div></aside><section className="content"><header className="topbar"><div><span className="eyebrow">JOB HUNT / CONTROL ROOM</span><h1>Put your job search on autopilot.</h1><p>One CV in. Matching, applications and recruiter outreach organized in one place.</p></div><button className="primary" onClick={()=>document.getElementById('cv')?.scrollIntoView({behavior:'smooth'})}>Upload CV</button></header><section className="stats"><div><span>Jobs matched</span><strong>3</strong><small>Demo recommendations</small></div><div><span>Applications</span><strong>0</strong><small>Nothing submitted yet</small></div><div><span>Interviews</span><strong>0</strong><small>Tracked automatically</small></div><div><span>Agent status</span><strong className="live">READY</strong><small>Review mode enabled</small></div></section><div className="grid"><section className="panel cv" id="cv"><div className="panel-head"><div><span className="eyebrow">01 / CANDIDATE PROFILE</span><h2>Start with your CV</h2></div><span className="tag">AI extraction</span></div><p className="muted">Paste your CV text. The AI turns it into a structured candidate profile without inventing facts.</p><textarea value={cv} onChange={e=>setCv(e.target.value)} placeholder="Paste your CV here…" rows={10}/><div className="row"><label className="file"><input type="file" accept=".txt,.md,text/plain" onChange={async e=>{const f=e.target.files?.[0];if(f)setCv(await f.text())}}/>Choose CV file</label><button className="primary" onClick={extract}>Extract profile</button></div>{message&&<p className="notice">{message}</p>}</section><section className="panel"><div className="panel-head"><div><span className="eyebrow">02 / MATCH ENGINE</span><h2>Recommended roles</h2></div><span className="tag">Live scoring</span></div><div className="jobs">{demoJobs.map(j=><article className="job" key={j.id}><div className="job-score">{j.score}%<small>match</small></div><div><strong>{j.title}</strong><span>{j.company} · {j.location}</span></div><button onClick={()=>setMessage('Application workspace opened. Submission is still disabled in review mode.')} className="ghost">Review</button></article>)}</div></section></div><section className="panel pipeline"><div className="panel-head"><div><span className="eyebrow">03 / APPLICATION PIPELINE</span><h2>Applications</h2></div><button className="ghost" onClick={()=>setMessage('Application tracker opened.')}>Open tracker</button></div><div className="pipeline-grid"><div><span>Draft</span><strong>0</strong></div><div><span>Ready for review</span><strong>0</strong></div><div><span>Applied</span><strong>0</strong></div><div><span>Interview</span><strong>0</strong></div><div><span>Offer</span><strong>0</strong></div></div></section><section className="panel email"><div><div><span className="eyebrow">04 / EMAIL OPERATOR</span><h2>Your email, under your control.</h2><p className="muted">Connect a mailbox later to send recruiter outreach and application emails. Sending stays behind explicit approval.</p></div><div className="email-state"><span>●</span> Not connected</div></div><button className="secondary" onClick={()=>setMessage('Email connection setup will be added with OAuth and encrypted secrets.')}>Connect email</button></section></section></main>;
}
