import { ArrowLeft, Orbit } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return <div className="not-found-page"><div className="not-found-icon"><Orbit size={31} /></div><div className="eyebrow">404 · ROUTE NOT FOUND</div><h1>This page isn't in orbit.</h1><p>The route may have moved, or the address may be incorrect.</p><Link to="/" className="button button--primary"><ArrowLeft size={16} /> Return to overview</Link></div>;
}
