import { Activity, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

const StatusBadge = ({ label, status }) => {
  const isOk = status === 'ok' || status === 'up' || status === 'running';
  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm">
      <span className="font-semibold text-slate-700">{label}</span>
      <div className={`h-2.5 w-2.5 rounded-full ${isOk ? 'bg-green-500' : 'bg-red-500'}`} />
    </div>
  );
};

const streamView = (status) => {
  if (status === 'connected') return { label: 'WebSocket live', dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' };
  if (status === 'connecting' || status === 'reconnecting') return { label: status, dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
  if (status === 'stale') return { label: 'stale, polling', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
  return { label: status ?? 'unknown', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' };
};

export const GlobalStatusBar = ({ health, onRefresh, lastUpdated, streamStatus }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const secondsAgo = lastUpdated ? Math.max(0, Math.round((now - lastUpdated.getTime()) / 1000)) : null;
  const stream = streamView(streamStatus);

  return (
    <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="flex items-center gap-2 text-lg font-black text-slate-900">
            <Activity size={20} className="text-teal-700" />
            Ops Dashboard V2
          </h1>
          <div className="hidden h-6 w-px bg-slate-200 sm:block"></div>
          <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold shadow-sm ${stream.border} ${stream.bg} ${stream.text}`}>
            <span className="relative flex h-2.5 w-2.5">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${stream.dot}`} />
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${stream.dot}`} />
            </span>
            {stream.label}
          </div>
          <StatusBadge label="API" status={health?.status || 'loading'} />
          <StatusBadge label="Proxmox" status={health?.details?.proxmox?.status || 'loading'} />
          <StatusBadge label="Prometheus" status={health?.details?.prometheus?.status || 'loading'} />
        </div>
        <div className="flex items-center justify-between gap-4 lg:justify-end">
          <div className="flex flex-col text-right text-xs text-slate-500 sm:flex-row sm:items-center sm:gap-3">
            <span>
              Updated {lastUpdated ? `${lastUpdated.toLocaleTimeString()} (${secondsAgo}s ago)` : '...'}
            </span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
            aria-label="Refresh dashboard"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
