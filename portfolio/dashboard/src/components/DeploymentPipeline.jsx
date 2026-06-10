import { useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
} from '@xyflow/react';
import { Boxes, CircleDashed, ExternalLink, GitBranch, GitCommit, Package, PlayCircle, RadioTower, ShieldCheck } from 'lucide-react';
import '@xyflow/react/dist/style.css';

const icons = {
  commit: GitCommit,
  actions: PlayCircle,
  image: Package,
  gitops: GitBranch,
  argocd: ShieldCheck,
  rollout: Boxes,
  live: RadioTower,
};

const PipelineNode = ({ data }) => {
  const Icon = data.icon ?? CircleDashed;

  return (
    <div className={`grid w-52 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg border bg-white p-3 text-left shadow-sm ${data.selected ? 'border-slate-950 ring-2 ring-slate-900' : 'border-slate-200'}`}>
      <Handle className="opacity-0" type="target" position={data.targetPosition ?? Position.Left} isConnectable={false} />
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{data.status ?? 'check'}</div>
        <div className="mt-1 truncate text-sm font-bold text-slate-900">{data.label}</div>
        <div className="mt-1 truncate text-xs font-semibold text-slate-600">{data.primary}</div>
        <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{data.secondary}</div>
      </div>
      <Handle className="opacity-0" type="source" position={data.sourcePosition ?? Position.Right} isConnectable={false} />
    </div>
  );
};

const nodeTypes = {
  pipeline: PipelineNode,
};

const pipelineEdge = (source, target, label) => ({
  id: `${source}-${target}`,
  source,
  target,
  label,
  type: 'smoothstep',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 16,
    height: 16,
  },
  style: {
    stroke: '#94a3b8',
    strokeWidth: 1.5,
  },
  labelStyle: {
    fill: '#64748b',
    fontSize: 10,
    fontWeight: 700,
  },
  labelBgPadding: [6, 3],
  labelBgBorderRadius: 4,
  labelBgStyle: {
    fill: '#ffffff',
    fillOpacity: 0.88,
  },
});

const pipelineNodePosition = (index, columnCount = 4, xGap = 270, yGap = 132) => {
  const row = Math.floor(index / columnCount);
  const column = index % columnCount;
  const isReverseRow = row % 2 === 1;

  return {
    x: (isReverseRow ? columnCount - 1 - column : column) * xGap,
    y: row * yGap,
  };
};

const pipelineNodePorts = (index, total, columnCount = 4) => {
  const row = Math.floor(index / columnCount);
  const previousRow = Math.floor((index - 1) / columnCount);
  const nextRow = Math.floor((index + 1) / columnCount);
  const isReverseRow = row % 2 === 1;

  return {
    targetPosition: index > 0 && previousRow < row ? Position.Top : isReverseRow ? Position.Right : Position.Left,
    sourcePosition: index < total - 1 && nextRow > row ? Position.Bottom : isReverseRow ? Position.Left : Position.Right,
  };
};

const DetailRow = ({ label, value }) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="grid grid-cols-[92px_1fr] gap-3 border-b border-slate-100 py-2 text-xs last:border-b-0">
      <div className="font-semibold uppercase text-slate-400">{label}</div>
      <div className="min-w-0 break-words text-slate-700">{String(value)}</div>
    </div>
  );
};

export const DeploymentPipeline = ({ pipeline }) => {
  const steps = useMemo(() => pipeline?.steps ?? [], [pipeline]);
  const [selectedId, setSelectedId] = useState(null);
  const selected = useMemo(
    () => steps.find((step) => step.id === (selectedId ?? steps[0]?.id)) ?? null,
    [selectedId, steps],
  );
  const details = selected?.details ?? {};
  const flowNodes = useMemo(() => steps.map((step, index) => ({
    id: step.id,
    type: 'pipeline',
    position: pipelineNodePosition(index),
    data: {
      ...step,
      icon: icons[step.id] ?? CircleDashed,
      selected: selected?.id === step.id,
      ...pipelineNodePorts(index, steps.length),
    },
  })), [selected?.id, steps]);
  const flowEdges = useMemo(() => steps.slice(0, -1).map((step, index) => (
    pipelineEdge(step.id, steps[index + 1].id, steps[index + 1].label)
  )), [steps]);

  if (!pipeline || steps.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Interactive CI/CD</p>
          <h3 className="text-xl font-bold text-slate-900">Commit to live rollout evidence</h3>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
          <GitCommit size={14} />
          {pipeline.commit?.shortSha ?? '-'} to {pipeline.kubernetes?.readyReplicas ?? 0}/{pipeline.kubernetes?.replicas ?? 0}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="h-[300px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50" style={{ height: '300px', minHeight: '300px' }}>
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.08 }}
            minZoom={0.5}
            maxZoom={1.4}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            panOnScroll={false}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1} color="#dbe4ef" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-900">{selected?.label}</div>
              <div className="mt-1 text-xs text-slate-500">{selected?.primary}</div>
            </div>
            {selected?.href && (
              <a className="rounded-md border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-900" href={selected.href} target="_blank" rel="noreferrer">
                <ExternalLink size={16} />
              </a>
            )}
          </div>
          <div className="mt-3 rounded-md border border-slate-200 bg-white px-3">
            <DetailRow label="status" value={selected?.status} />
            <DetailRow label="sha" value={details.shortSha ?? details.shortRevision ?? details.shortImageTag} />
            <DetailRow label="message" value={details.message} />
            <DetailRow label="image" value={details.image} />
            <DetailRow label="revision" value={details.shortRevision} />
            <DetailRow label="sync" value={details.syncStatus} />
            <DetailRow label="health" value={details.healthStatus} />
            <DetailRow label="replicas" value={details.replicas !== undefined ? `${details.readyReplicas}/${details.replicas}` : null} />
            <DetailRow label="assets" value={details.assets?.join(', ')} />
            <DetailRow label="updated" value={details.updatedAt ?? details.finishedAt ?? details.createdAt} />
          </div>
        </div>
      </div>
    </section>
  );
};
