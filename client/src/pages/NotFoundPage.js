import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { Button } from '../components/dashboard/UI';

export default function NotFoundPage() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', textAlign: 'center', gap: '1rem', padding: '2rem'
    }}>
      <Leaf size={48} color="var(--color-primary)" />
      <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>404</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>The page you're looking for doesn't exist.</p>
      <Link to="/dashboard"><Button>Back to Dashboard</Button></Link>
    </div>
  );
}
