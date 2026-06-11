import { Cpu, ExternalLink, Globe, Network, Route, Server, ShieldCheck } from 'lucide-react';

const destinationLabels = {
  'cxx-web': 'C++ RuntimeWeb',
  'docker-or-local': 'Docker / local',
  kubernetes: 'Kubernetes ingress',
  external: 'External upstream',
};

const destinationClasses = {
  'cxx-web': 'border-cyan-200 bg-cyan-50 text-cyan-700',
  'docker-or-local': 'border-slate-200 bg-slate-50 text-slate-700',
  kubernetes: 'border-green-200 bg-green-50 text-green-700',
  external: 'border-amber-200 bg-amber-50 text-amber-700',
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds)) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const StatusDot = ({ ok }) => (
  <span className={`h-2 w-2 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
);

const routeHref = (hostname) => {
  if (!hostname || hostname === 'default' || hostname.includes(':')) return null;
  return `https://${hostname}`;
};

const publicKubernetesHosts = new Set([
  'k8s.mintcocoa.cc',
  'dropapp.mintcocoa.cc',
]);
const hiddenPublicRouteHosts = new Set(['webhook.mintcocoa.cc']);

const isVisibleRoute = (route) => (
  !hiddenPublicRouteHosts.has(route.hostname)
  && (route.destination !== 'kubernetes' || publicKubernetesHosts.has(route.hostname))
);

const MetricCard = ({ label, value, detail, icon: Icon, tone = 'slate' }) => {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    green: 'border-green-200 bg-green-50 text-green-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
        </div>
        <div className={`rounded-md border p-2 ${tones[tone] ?? tones.slate}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-500">{detail}</div>
    </div>
  );
};

export const EdgeRuntimePanel = ({ edgeRuntime }) => {
  if (!edgeRuntime) return null;

  const proxy = edgeRuntime.proxy ?? {};
  const services = edgeRuntime.services ?? [];
  const routes = edgeRuntime.routes ?? [];
  const visibleRoutes = routes.filter(isVisibleRoute);
  const destinationCounts = visibleRoutes.reduce((counts, route) => ({
    ...counts,
    [route.destination]: (counts[route.destination] ?? 0) + 1,
  }), {});
  const proxyService = services.find((service) => service.runtime === 'RuntimeProxy');
  const webServices = services.filter((service) => service.runtime === 'RuntimeWeb');
  const tlsLoaded = proxy.tls?.enabled && proxy.tls?.context_loaded;
  const workerText = `${proxy.running_worker_count ?? '-'} / ${proxy.configured_worker_count ?? '-'}`;

  return (
    <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">C++ edge runtime</p>
          <h3 className="text-xl font-bold text-slate-900">RuntimeProxy and RuntimeWeb in the live backend path</h3>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
          <StatusDot ok={proxyService?.activeState === 'active'} />
          {proxyService?.unit ?? proxy.service ?? 'tcp_reverse_proxy'}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <MetricCard
          label="RuntimeProxy"
          value={proxyService?.activeState ?? 'unknown'}
          detail={`pid ${proxy.pid ?? proxyService?.mainPid ?? '-'} - uptime ${formatDuration(proxy.uptime_seconds)}`}
          icon={Network}
          tone="slate"
        />
        <MetricCard
          label="TLS context"
          value={tlsLoaded ? 'loaded' : 'missing'}
          detail={`${proxy.listen?.host ?? '-'}:${proxy.listen?.port ?? '-'}`}
          icon={ShieldCheck}
          tone={tlsLoaded ? 'green' : 'amber'}
        />
        <MetricCard
          label="io_uring workers"
          value={workerText}
          detail={`${proxy.total_live_sessions ?? 0} live sessions - ${proxy.total_live_connectors ?? 0} connectors`}
          icon={Cpu}
          tone="cyan"
        />
        <MetricCard
          label="Routes"
          value={visibleRoutes.length}
          detail={`default upstream ${proxy.default_upstream ?? '-'}`}
          icon={Route}
          tone="green"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.35fr_0.9fr]">
        <div className="rounded-lg border border-cyan-200 bg-cyan-50/40 p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-cyan-800">
            <Server size={16} />
            RuntimeWeb services
          </div>
          <div className="space-y-2">
            {webServices.map((service) => (
              <div key={service.unit} className="rounded-md border border-cyan-100 bg-white p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">{service.unit}</span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <StatusDot ok={service.activeState === 'active' && service.probe?.ok} />
                    {service.probe?.statusCode ?? service.activeState}
                  </span>
                </div>
                <div className="mt-1 text-slate-500">{service.upstream ?? '-'}</div>
                <div className="mt-1 text-cyan-700">{service.probe?.server ?? service.runtime}</div>
              </div>
            ))}
            {webServices.length === 0 && (
              <div className="rounded-md border border-dashed border-cyan-200 bg-white p-3 text-xs text-slate-500">
                No RuntimeWeb service probes reported.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Globe size={16} />
              Live SNI routes
            </div>
            <div className="text-xs text-slate-500">from proxy metrics</div>
          </div>
          <div className="max-h-72 overflow-auto">
            {visibleRoutes.map((route) => (
              <div key={`${route.hostname}-${route.upstream}`} className="grid grid-cols-[1.15fr_0.9fr_auto] gap-2 border-b border-slate-100 px-3 py-2 text-xs last:border-b-0">
                <div className="min-w-0 font-semibold text-slate-800">
                  {routeHref(route.hostname) ? (
                    <a
                      className="flex min-w-0 items-center gap-1 text-blue-700 hover:text-blue-800 hover:underline"
                      href={routeHref(route.hostname)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="block truncate">{route.hostname}</span>
                      <ExternalLink size={12} className="shrink-0" />
                    </a>
                  ) : (
                    <span className="block truncate">{route.hostname}</span>
                  )}
                </div>
                <div className="truncate text-slate-500">{route.upstream}</div>
                <div className={`rounded-full border px-2 py-0.5 ${destinationClasses[route.destination] ?? destinationClasses.external}`}>
                  {destinationLabels[route.destination] ?? route.destination}
                </div>
              </div>
            ))}
            {visibleRoutes.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-slate-500">
                No public live routes are currently reported.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 text-sm font-bold text-slate-800">Route destinations</div>
          <div className="space-y-2">
            {Object.entries(destinationCounts).map(([destination, count]) => (
              <div key={destination} className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-xs shadow-sm">
                <span className="font-medium text-slate-700">{destinationLabels[destination] ?? destination}</span>
                <span className={`rounded-full border px-2 py-0.5 ${destinationClasses[destination] ?? destinationClasses.external}`}>{count}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-md border border-slate-200 bg-white p-2 text-xs leading-5 text-slate-500">
            Traffic enters the C++ proxy, TLS is terminated, SNI selects a route, and bytes are bridged to Docker, RuntimeWeb, or Kubernetes.
          </div>
        </div>
      </div>
    </section>
  );
};
