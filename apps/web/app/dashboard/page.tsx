'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Repo {
  id: number;
  name: string;
  fullName: string;
  cloneUrl: string;
  private: boolean;
  updatedAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    const token = localStorage.getItem('devlens_token');
    if (!token) {
      router.push('/');
      return;
    }

    fetch('http://localhost:3001/repos', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setRepos(data);
        setLoading(false);
      });
  }, [router]);

  const pollJob = (jobId: string, token: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        const res = await fetch(`http://localhost:3001/analysis/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.status === 'completed') {
          clearInterval(interval);
          resolve(data.graph);
        } else if (data.status === 'failed' || data.status === 'not_found') {
          clearInterval(interval);
          reject(data);
        } else {
          setProgress(data.progress || 0);
        }
      }, 1500);
    });
  };

  const analyzeRepo = async (repo: Repo) => {
    const token = localStorage.getItem('devlens_token');
    if (!token) return;

    setAnalyzing(repo.name);
    setProgress(0);

    // Clone first (no-op if already cloned)
    await fetch('http://localhost:3001/repos/clone', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cloneUrl: repo.cloneUrl, name: repo.name }),
    });

    // Submit background analysis job
    const jobRes = await fetch('http://localhost:3001/analysis/jobs', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: repo.name }),
    });
    const { jobId } = await jobRes.json();

    try {
      const graph = await pollJob(jobId, token);
      sessionStorage.setItem('devlens_graph', JSON.stringify(graph));
      sessionStorage.setItem('devlens_graph_repo', repo.name);
      router.push('/dashboard/graph');
    } catch (err) {
      alert('Analysis failed. Check the backend logs.');
    } finally {
      setAnalyzing(null);
      setProgress(0);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Loading repositories...</div>;
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 700, margin: '0 auto' }}>
      <h1>Your Repositories</h1>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {repos.map((repo) => (
          <li
            key={repo.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              borderBottom: '1px solid #eee',
            }}
          >
            <span>
              {repo.fullName} {repo.private && <em style={{ color: '#999' }}>(private)</em>}
            </span>
            <button
              onClick={() => analyzeRepo(repo)}
              disabled={analyzing === repo.name}
              style={{
                background: '#24292f',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                minWidth: 140,
              }}
            >
              {analyzing === repo.name ? `Analyzing... ${progress}%` : 'Analyze'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
