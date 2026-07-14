export default function Home() {
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'sans-serif',
      gap: '1.5rem',
    }}>
      <h1 style={{ fontSize: '2.5rem' }}>DevLens</h1>
      <p style={{ color: '#666' }}>Repository intelligence, powered by static analysis.</p>
      <a href="http://localhost:3001/auth/github" style={{ background: '#24292f', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
        Login with GitHub
      </a>
    </main>
  );
}
