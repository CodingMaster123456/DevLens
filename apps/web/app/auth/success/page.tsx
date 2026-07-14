'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('devlens_token', token);
      router.push('/dashboard');
    }
  }, [searchParams, router]);

  return (
    <div style={{ padding: '4rem', fontFamily: 'sans-serif' }}>
      <p>Logging you in...</p>
    </div>
  );
}
