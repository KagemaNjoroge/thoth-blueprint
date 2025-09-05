import { BaseEdge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath } from 'reactflow';
import { useMemo, ReactNode } from 'react';
import { GitFork, Minus } from 'lucide-react';

const EdgeLabel = ({ transform, label }: { transform: string; label: ReactNode }) => {
  return (
    <div
      style={{
        position: 'absolute',
        transform,
        background: 'hsl(var(--background))',
        borderRadius: '50%',
        border: '1px solid hsl(var(--border))',
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      className="nodrag nopan"
    >
      {label}
    </div>
  );
};

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { sourceLabel, targetLabel } = useMemo(() => {
    const oneIcon = <Minus size={14} strokeWidth={3} />;
    const manyIcon = <GitFork size={14} strokeWidth={2.5} />;

    switch (data?.relationship) {
      case 'one-to-one':
        return { sourceLabel: oneIcon, targetLabel: oneIcon };
      case 'one-to-many':
        return { sourceLabel: oneIcon, targetLabel: manyIcon };
      case 'many-to-one':
        return { sourceLabel: manyIcon, targetLabel: oneIcon };
      case 'many-to-many':
        return { sourceLabel: manyIcon, targetLabel: manyIcon };
      default:
        return { sourceLabel: null, targetLabel: null };
    }
  }, [data?.relationship]);

  const sourceLabelX = sourceX + (sourcePosition === 'right' ? 25 : -25);
  const sourceLabelY = sourceY;

  const targetLabelX = targetX + (targetPosition === 'left' ? -25 : 25);
  const targetLabelY = targetY;

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <EdgeLabelRenderer>
        {sourceLabel && (
          <EdgeLabel
            transform={`translate(-50%, -50%) translate(${sourceLabelX}px,${sourceLabelY}px)`}
            label={sourceLabel}
          />
        )}
        {targetLabel && (
          <EdgeLabel
            transform={`translate(-50%, -50%) translate(${targetLabelX}px,${targetLabelY}px)`}
            label={targetLabel}
          />
        )}
      </EdgeLabelRenderer>
    </>
  );
}