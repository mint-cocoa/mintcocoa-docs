const REMOTE_API_BASE = 'https://ops-api.mintcocoa.cc/api';
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
const defaultApiBase = typeof window !== 'undefined' && localHosts.has(window.location.hostname)
  ? '/api'
  : REMOTE_API_BASE;
const rawApiBase = import.meta.env.VITE_OPS_API_BASE || defaultApiBase;
const API_BASE = rawApiBase.replace(/\/+$/, '');

const websocketBase = () => {
  const configured = import.meta.env.VITE_OPS_WS_BASE;
  if (configured) return configured.replace(/\/+$/, '');
  if (API_BASE.startsWith('https://')) return API_BASE.replace(/^https:/, 'wss:');
  if (API_BASE.startsWith('http://')) return API_BASE.replace(/^http:/, 'ws:');

  const path = API_BASE.startsWith('/') ? API_BASE : `/${API_BASE}`;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${path}`;
};

const WS_BASE = websocketBase();

export const API_LABEL = API_BASE.startsWith('/')
  ? `${window.location.host}${API_BASE}`
  : API_BASE
    .replace(/^https?:\/\//, '')
    .replace(/\/api$/, '');

const getJson = async (path) => {
  const response = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload.detail ?? `${response.status} ${response.statusText}`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }

  return payload;
};

export const fetchHealth = async () => {
  const payload = await getJson('/health');
  return {
    ...payload,
    status: payload.ok ? 'ok' : 'error',
    details: {
      prometheus: { status: payload.prometheus === 'ok' ? 'ok' : 'error', value: payload.prometheus },
      proxmox: { status: payload.proxmox === 'ok' ? 'ok' : 'error', value: payload.proxmox },
    },
  };
};

export const fetchSummary = () => getJson('/ops/summary');
export const fetchEdgeRuntime = () => getJson('/edge-runtime');
export const fetchDeployPipeline = () => getJson('/deploy-pipeline');
export const fetchPrometheusSummary = () => getJson('/prometheus/summary');

export const fetchPrometheusTargets = async () => {
  const payload = await getJson('/prometheus/targets');
  const activeTargets = payload.targets ?? payload.data?.activeTargets ?? [];
  return {
    ...payload,
    activeTargets,
    data: { ...(payload.data ?? {}), activeTargets },
  };
};

export const fetchPrometheusQuery = (query) => getJson(`/prometheus/query?query=${encodeURIComponent(query)}`);

export const fetchProxmoxNodes = async () => {
  const payload = await getJson('/proxmox/nodes');
  return payload.nodes ?? payload.data ?? [];
};

export const fetchProxmoxVersion = () => getJson('/proxmox/version');

export const fetchProxmoxResources = async (type) => {
  const payload = await getJson(`/proxmox/resources${type ? `?type=${type}` : ''}`);
  return payload.resources ?? payload.data ?? [];
};

export const createOpsStream = () => new WebSocket(`${WS_BASE}/ops/stream`);
