import {
  ArrowRight,
  Box,
  Cloud,
  Database,
  ExternalLink,
  GitBranch,
  Globe,
  HardDrive,
  Network,
  Route,
  Server,
  Settings,
  Shield,
  ShieldCheck,
} from 'lucide-react';

const ingressRules = [
  { name: 'k8s-status', domain: 'k8s.mintcocoa.cc', service: 'gatus', note: 'Gatus status page' },
  { name: 'dropapp', domain: 'dropapp.mintcocoa.cc', service: 'pairdrop', note: 'PairDrop file transfer' },
  { name: 'argocd', domain: 'argocd.homelab.local', service: 'argocd-server', note: 'private UI' },
];

const publicKubernetesHosts = new Set([
  'k8s.mintcocoa.cc',
  'dropapp.mintcocoa.cc',
]);
const hiddenPublicRouteHosts = new Set(['webhook.mintcocoa.cc']);

const isVisibleEdgeRoute = (route) => (
  !hiddenPublicRouteHosts.has(route.hostname)
  && (route.destination !== 'kubernetes' || publicKubernetesHosts.has(route.hostname))
);

const findIngressTarget = (targetData, rule) => (
  targetData?.activeTargets?.find((target) => {
    const labels = target.discoveredLabels ?? target.labels ?? {};
    return [
      labels.__meta_kubernetes_pod_name,
      labels.__meta_kubernetes_service_name,
      labels.job,
      labels.instance,
    ].some((value) => value?.includes(rule.service) || value?.includes(rule.name));
  })
);

const statusStyles = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  green: 'border-green-200 bg-green-50 text-green-700',
  purple: 'border-purple-200 bg-purple-50 text-purple-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-600',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
};

const StatusPill = ({ tone = 'slate', children }) => (
  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusStyles[tone] ?? statusStyles.slate}`}>
    {children}
  </span>
);

const SectionHeader = ({ eyebrow, title, detail, badge }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{eyebrow}</div>
      <h3 className="mt-1 text-lg font-bold text-slate-900">{title}</h3>
      {detail && <div className="mt-1 text-xs text-slate-500">{detail}</div>}
    </div>
    {badge}
  </div>
);

const Hop = ({ icon: Icon, label, detail, tone = 'slate' }) => (
  <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
    <div className="flex items-center gap-2">
      <div className={`rounded-md border p-1.5 ${statusStyles[tone] ?? statusStyles.slate}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-slate-900">{label}</div>
        <div className="truncate text-[11px] text-slate-500">{detail}</div>
      </div>
    </div>
  </div>
);

const RouteRow = ({ rule, targetData, edgeRoutes }) => {
  const route = edgeRoutes.find((item) => item.hostname === rule.domain);
  const target = findIngressTarget(targetData, rule);
  const isPublicEdge = Boolean(route);
  const isObserved = target?.health === 'up';
  const status = isPublicEdge ? 'Public edge' : isObserved ? 'Observed' : 'Cluster only';
  const tone = isPublicEdge ? 'green' : isObserved ? 'blue' : 'slate';
  const href = isPublicEdge ? `https://${rule.domain}` : null;
  const domain = (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span className="truncate">{rule.domain}</span>
      {href && <ExternalLink size={12} className="shrink-0 text-slate-400" />}
    </span>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1.25fr)_auto_minmax(96px,0.8fr)] items-center gap-3 border-b border-slate-100 py-2 text-xs last:border-b-0">
      <div className="min-w-0">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="block truncate font-bold text-slate-900 hover:text-blue-700 hover:underline"
          >
            {domain}
          </a>
        ) : (
          <div className="truncate font-bold text-slate-900">{domain}</div>
        )}
        <div className="text-[11px] text-slate-500">{rule.note}</div>
      </div>
      <StatusPill tone={tone}>{status}</StatusPill>
      <div className="min-w-0 text-right">
        <div className="truncate font-medium text-slate-700">{route?.upstream ?? 'private'}</div>
        <div className="truncate text-[11px] text-slate-400">{route?.destination ?? target?.health ?? 'not published'}</div>
      </div>
    </div>
  );
};

const UsageBar = ({ label, value, color }) => (
  <div>
    <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-500">
      <span>{label}</span>
      <span>{value.toFixed(label === 'CPU' ? 1 : 0)}%</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const VmCard = ({ vm, type }) => {
  if (!vm) return null;

  const running = vm.status === 'running';
  const tone = type === 'cp' ? 'blue' : type === 'worker' ? 'green' : 'purple';
  const iconClass = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
  }[tone];
  const cpuPercent = Number.isFinite(vm.cpu) ? Math.min(100, Math.max(0, vm.cpu * 100)) : 0;
  const memPercent = vm.maxmem ? Math.min(100, Math.max(0, (vm.mem / vm.maxmem) * 100)) : 0;

  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_86px] gap-3 rounded-lg border bg-white p-3 text-xs shadow-sm ${running ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
      <div className="flex min-w-0 items-center gap-2">
        <Server className={iconClass} size={17} />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-900">
            {vm.name} <span className="text-xs font-normal text-slate-500">({vm.vmid})</span>
          </div>
          <div className="text-slate-500">{vm.status ?? 'unknown'}</div>
        </div>
      </div>
      <div className="space-y-2">
        <UsageBar label="CPU" value={cpuPercent} color="bg-blue-500" />
        <UsageBar label="MEM" value={memPercent} color="bg-purple-500" />
      </div>
    </div>
  );
};

const VmGroup = ({ title, tone, vms, type }) => (
  <div>
    <div className={`mb-2 flex items-center justify-between border-l-2 pl-3 text-xs font-bold ${tone}`}>
      <span>{title}</span>
      <span className="font-semibold text-slate-400">{vms.length}</span>
    </div>
    <div className="space-y-2">
      {vms.length > 0 ? vms.map((vm) => <VmCard key={vm.vmid} vm={vm} type={type} />) : (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">No VMs found</div>
      )}
    </div>
  </div>
);

const SummaryMetric = ({ label, value }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
    <div className="text-[11px] font-semibold uppercase text-slate-400">{label}</div>
    <div className="mt-1 text-lg font-bold text-slate-900">{value}</div>
  </div>
);

const FlowChip = ({ icon: Icon, label, detail, tone = 'slate' }) => {
  const toneClasses = statusStyles[tone] ?? statusStyles.slate;

  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 shadow-sm">
      <div className={`mb-1 inline-flex rounded-md border p-1 ${toneClasses}`}>
        <Icon size={13} />
      </div>
      <div className="truncate text-xs font-bold text-slate-900">{label}</div>
      {detail && <div className="truncate text-[10px] text-slate-500">{detail}</div>}
    </div>
  );
};

const FlowArrow = () => (
  <ArrowRight className="justify-self-center text-slate-300" size={14} />
);

const flowGridClasses = {
  3: 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2',
  4: 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2',
};

export const ArchitectureView = ({ vms = [], targets = {}, argocdMetrics = [], edgeRuntime = null, className = '' }) => {
  const cpVms = vms.filter((vm) => vm.name?.includes('cp')).sort((a, b) => a.name.localeCompare(b.name));
  const workerVms = vms.filter((vm) => vm.name?.includes('worker')).sort((a, b) => a.name.localeCompare(b.name));
  const storageVms = vms.filter((vm) => vm.name?.toLowerCase().includes('omv') || vm.name?.toLowerCase().includes('nas'));
  const runningVms = vms.filter((vm) => vm.status === 'running').length;
  const isAllSynced = argocdMetrics.length > 0 && argocdMetrics.every((metric) => metric.metric?.sync_status === 'Synced');
  const edgeRoutes = edgeRuntime?.routes ?? [];
  const visibleEdgeRoutes = edgeRoutes.filter(isVisibleEdgeRoute);
  const proxy = edgeRuntime?.proxy ?? {};
  const kubernetesRoutes = visibleEdgeRoutes.filter((route) => route.destination === 'kubernetes').length;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.8fr_1.05fr]">
        <section className="rounded-lg border border-orange-200 bg-white p-4 shadow-sm">
          <SectionHeader
            eyebrow="Edge Plane"
            title="Public traffic and ingress path"
            detail="The C++ proxy terminates TLS and forwards SNI routes to Docker, RuntimeWeb, or Kubernetes."
            badge={<StatusPill tone={proxy.tls?.context_loaded ? 'green' : 'amber'}>{proxy.tls?.context_loaded ? 'TLS loaded' : 'TLS pending'}</StatusPill>}
          />

          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
            <Hop icon={Globe} label="Internet" detail="80/443 forwarded" tone="blue" />
            <ArrowRight className="hidden justify-self-center text-slate-300 md:block" size={18} />
            <Hop icon={HardDrive} label="Home router" detail="port-forward" tone="slate" />
            <ArrowRight className="hidden justify-self-center text-slate-300 md:block" size={18} />
            <Hop icon={Network} label="RuntimeProxy" detail={`${proxy.listen?.host ?? '0.0.0.0'}:${proxy.listen?.port ?? 443}`} tone="amber" />
          </div>

          <div className="mt-4 rounded-lg border border-green-200 bg-green-50/40 p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <Hop icon={Route} label="MetalLB VIP" detail="172.30.1.240" tone="green" />
              <ArrowRight className="hidden justify-self-center text-green-400 md:block" size={18} />
              <Hop icon={ShieldCheck} label="ingress-nginx" detail="172.30.1.240:80/443" tone="green" />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-slate-900">Kubernetes ingress exposure</div>
              <StatusPill tone="green">{kubernetesRoutes} edge routes</StatusPill>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3">
              {ingressRules.map((rule) => (
                <RouteRow key={rule.domain} rule={rule} targetData={targets} edgeRoutes={visibleEdgeRoutes} />
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-blue-200 bg-white p-4 shadow-sm">
          <SectionHeader
            eyebrow="Kubernetes"
            title="Control and workload entry"
            detail="The edge node also fronts the Kubernetes API HAProxy path."
            badge={<StatusPill tone="blue">API 6443</StatusPill>}
          />

          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
            <Cloud className="mx-auto text-blue-600" size={42} />
            <div className="mt-2 text-lg font-bold text-blue-800">Kubernetes API</div>
            <div className="text-sm font-semibold text-blue-600">172.30.1.27:6443</div>
          </div>

          <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs">
            {cpVms.map((vm) => (
              <div key={vm.vmid} className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-700">{vm.name}</span>
                <span className="text-blue-600">6443</span>
              </div>
            ))}
            {cpVms.length === 0 && <div className="text-slate-500">Control plane endpoints unavailable.</div>}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <SummaryMetric label="routes" value={visibleEdgeRoutes.length || '-'} />
            <SummaryMetric label="workers" value={`${proxy.running_worker_count ?? '-'} / ${proxy.configured_worker_count ?? '-'}`} />
          </div>
        </section>

        <section className="rounded-lg border border-orange-300 bg-white p-4 shadow-sm">
          <SectionHeader
            eyebrow="Proxmox VE"
            title="Virtualized cluster inventory"
            detail="172.30.1.12"
            badge={<StatusPill tone="amber">{runningVms}/{vms.length} running</StatusPill>}
          />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <SummaryMetric label="control" value={cpVms.length} />
            <SummaryMetric label="workers" value={workerVms.length} />
            <SummaryMetric label="storage" value={storageVms.length} />
          </div>
          <div className="mt-4 space-y-4">
            <VmGroup title="Control Plane" tone="border-blue-300 text-blue-700" vms={cpVms} type="cp" />
            <VmGroup title="Worker Nodes" tone="border-green-300 text-green-700" vms={workerVms} type="worker" />
            <VmGroup title="Storage VM" tone="border-purple-300 text-purple-700" vms={storageVms} type="storage" />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <section className="rounded-lg border border-purple-200 bg-purple-50/30 p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-purple-800">
                <Shield size={14} />
                Operate
              </div>
              <div className="mt-1 text-sm font-bold text-slate-900">관리 노드에서 클러스터 제어</div>
              <div className="mt-1 text-xs text-slate-500">Odroid가 Proxmox와 Kubernetes 작업의 진입점입니다.</div>
            </div>
          </div>
          <div className={flowGridClasses[3]}>
            <FlowChip icon={Settings} label="Helm" detail="release config" tone="purple" />
            <FlowArrow />
            <FlowChip icon={Server} label="Argo CD" detail="sync state" tone="slate" />
            <FlowArrow />
            <FlowChip icon={Cloud} label="kubectl" detail="API HAProxy" tone="blue" />
          </div>
        </section>

        <section className="rounded-lg border border-green-200 bg-green-50/30 p-4 shadow-sm">
          <div className="mb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-green-800">
              <Database size={14} />
              Persist
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900">워크로드 데이터 저장 경로</div>
            <div className="mt-1 text-xs text-slate-500">Pod 데이터는 PVC를 거쳐 NFS/NAS VM에 보존됩니다.</div>
          </div>
          <div className={flowGridClasses[4]}>
            <FlowChip icon={Box} label="Pod" detail="app writes" tone="blue" />
            <FlowArrow />
            <FlowChip icon={Database} label="PVC" detail="claim" tone="blue" />
            <FlowArrow />
            <FlowChip icon={HardDrive} label="NFS" detail="shared mount" tone="green" />
            <FlowArrow />
            <FlowChip icon={Server} label="NAS VM" detail="storage" tone="purple" />
          </div>
        </section>

        <section className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-4 shadow-sm">
          <div className="mb-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-indigo-800">
                <GitBranch size={14} />
                Release
              </div>
              <div className="mt-1 text-sm font-bold text-slate-900">커밋에서 운영 반영까지</div>
              <div className="mt-1 text-xs text-slate-500">GitHub push가 이미지와 GitOps sync를 거쳐 K8s에 반영됩니다.</div>
            </div>
          </div>
          <div className={flowGridClasses[4]}>
            <FlowChip icon={GitBranch} label="GitHub" detail="push" tone="slate" />
            <FlowArrow />
            <FlowChip icon={Box} label="GHCR" detail="image" tone="blue" />
            <FlowArrow />
            <FlowChip icon={ShieldCheck} label="Argo CD" detail="sync" tone={isAllSynced ? 'green' : 'amber'} />
            <FlowArrow />
            <FlowChip icon={Cloud} label="K8s" detail="rollout" tone="green" />
          </div>
        </section>
      </div>
    </div>
  );
};
