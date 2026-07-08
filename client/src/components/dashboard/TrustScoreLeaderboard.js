import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import api from '../../utils/api';
import { Card, CardHeader, Badge, Button, Spinner } from './UI';

const getTrendIcon = (history = []) => {
  if (history.length < 2) return <Minus size={16} />;
  const prev = history[history.length - 2]?.score ?? history[history.length - 1]?.score;
  const current = history[history.length - 1]?.score;
  if (current === undefined || prev === undefined) return <Minus size={16} />;
  if (current > prev) return <TrendingUp size={16} color="var(--color-success)" />;
  if (current < prev) return <TrendingDown size={16} color="var(--color-danger)" />;
  return <Minus size={16} />;
};

export default function TrustScoreLeaderboard() {
  const navigate = useNavigate();
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const { data } = await api.get('/trust-scores');
        setScores(data.slice(0, 8));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, []);

  const rows = useMemo(() => scores.filter((item) => item?.worker), [scores]);

  if (loading) return <Spinner size="md" label="Loading trust scores" />;

  return (
    <Card className="dashboard-card">
      <CardHeader
        title="Trust Score Leaderboard"
        subtitle="Lowest scores first"
        action={
          <Button variant="secondary" size="sm" onClick={() => navigate('/workers')}>
            View all workers
          </Button>
        }
      />

      <div style={{ display: 'grid', gap: '0.6rem' }}>
        {rows.length === 0 ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No trust score data available yet.</div>
        ) : rows.map((item, index) => {
          const worker = item.worker || {};
          const initials = (worker.name || 'W').split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase();
          const badgeVariant = item.overallScore >= 80 ? 'success' : item.overallScore >= 60 ? 'warning' : 'danger';
          return (
            <button
              key={item._id}
              onClick={() => navigate(`/workers/${worker._id}`)}
              style={{ border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '0.75rem', background: 'white', textAlign: 'left', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '999px', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{worker.name || 'Unnamed worker'}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{worker.position || 'Worker'} • {worker.department || 'Farm'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {getTrendIcon(item.history)}
                  <Badge variant={badgeVariant} size="sm">{item.overallScore}%</Badge>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
