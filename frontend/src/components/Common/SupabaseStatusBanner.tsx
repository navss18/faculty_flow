import React, { useState } from 'react';
import { Database, CheckCircle2, ShieldCheck, X, Terminal, Cpu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const SupabaseStatusBanner: React.FC = () => {
  const { isConfigured, profile } = useAuth();
  const [showDetails, setShowDetails] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <>
      <div className="bg-[#09090b]/80 border-b border-zinc-800/80 px-4 py-1.5 text-xs font-mono flex items-center justify-between text-zinc-400 select-none">
        <div className="flex items-center gap-3">
          {isConfigured ? (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              POSTGRESQL SYNC: ACTIVE (SUPABASE RLS)
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              STANDALONE RUNTIME: READY FOR SUPABASE .ENV
            </div>
          )}
          <span className="text-zinc-600 hidden sm:inline">•</span>
          <span className="text-[11px] text-zinc-400 hidden sm:inline font-sans">
            {isConfigured ? 'Direct PostgreSQL transaction pool' : 'Live interactive memory engine • Zero setup blocker'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <button
            onClick={() => setShowDetails(true)}
            className="text-[#5B8DEF] hover:text-[#7C5CFC] underline underline-offset-2 transition-colors"
          >
            {isConfigured ? 'Database Specs' : 'Link Cloud Database (₹0 Tier)'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-zinc-600 hover:text-zinc-300 p-0.5"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-[#0c0c10] border border-zinc-800 rounded-xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 font-sans">
            <button
              onClick={() => setShowDetails(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-200 p-1 rounded"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-[#5B8DEF]/10 border border-[#5B8DEF]/30 text-[#5B8DEF]">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Supabase PostgreSQL Schema Specs</span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                    ₹0 FREE TIER
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  All 11 relational tables configured with Row Level Security (RLS)
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed my-4">
              <div className="p-3 bg-[#050508] border border-zinc-800/80 rounded-lg font-mono text-[11px] space-y-1">
                <div className="text-zinc-500">// Configure frontend/.env:</div>
                <div className="text-[#5B8DEF]">VITE_SUPABASE_URL=https://your-project.supabase.co</div>
                <div className="text-[#5B8DEF]">VITE_SUPABASE_ANON_KEY=eyJhbGciOi...</div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-white block">PostgreSQL RLS Enforced:</span>
                  <span className="text-zinc-400">
                    Faculty access scoped to owned & assigned tasks. Self-promotion to Admin role strictly blocked by database policies in <code>supabase/migrations/20261018000000_schema_reference.sql</code>.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60">
                <Cpu className="w-4 h-4 text-[#7C5CFC] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-white block">Strict ₹0 Operating Cost:</span>
                  <span className="text-zinc-400">
                    Runs permanently on Supabase free tier (500MB database, 50,000 monthly active users, no mandatory credit card).
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 bg-white text-black font-semibold rounded-lg text-xs hover:bg-zinc-200 transition-colors"
              >
                Close Specification
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
