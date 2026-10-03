import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import Button from '../components/common/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
        <HelpCircle className="w-7 h-7" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-100">404 — Page Not Found</h1>
      <p className="text-sm text-slate-400 max-w-sm">
        The workspace route you are trying to access does not exist or has been relocated.
      </p>
      <Link to="/dashboard">
        <Button variant="primary" size="md" icon={ArrowLeft}>
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
}
