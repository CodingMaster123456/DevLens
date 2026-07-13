'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function AuthSuccessPage() {
  const searchParams = useSearchParams();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      // For now: store in memory via localStorage for dev convenience.
      // We'll swap this for a more secure approach later.
      localStorage.setItem('devlens_token', token);
      setSaved(true);
    }
  }, [searchParams]);

  return (
    <div style={{ padding: '4rem', fontFamily: 'sans-serif' }}>
      {saved ? (
        <>
          <h1>You're logged in 🎉</h1>
          <p>Your GitHub account was authorized and a session token was saved.</p>
        </>
      ) : (
        <p>No token found. Try logging in again.</p>
      )}
    </div>
  );
}
