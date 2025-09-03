import { BaseEdge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath } from 'reactflow';
import { useMemo } from 'react';

const EdgeLabel = ({ transform, label }: { transform: string; label: string }) => {
  return (
    <div
      style={{
        position: 'absolute',
        transform,
        background: 'hsl(var(--background))',
        padding: '1px 3px',
        borderRadius: '50%',
        border: '1px solid hsl(var(--border))',
        fontSize: 10,
        fontWeight: 700,
        minWidth: '16px',
        textAlign: 'center',
        lineHeight: '1',
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
    switch (data?.relationship) {
      case 'one-to-one':
        return { sourceLabel: '1', targetLabel: '1' };
      case 'one-to-many':
        return { sourceLabel: '1', targetLabel: 'n' };
      case 'many-to-one':
        return { sourceLabel: 'n', targetLabel: '1' };
      case 'many-to-many':
        return { sourceLabel: 'n', targetLabel: 'm' };
      default:
        return { sourceLabel: '', targetLabel: '' };
    }
  }, [data?.relationship]);

  const sourceLabelX = sourceX + (sourcePosition === 'right' ? 15 : -15);
  const sourceLabelY = sourceY;

  const targetLabelX = targetX + (targetPosition === 'left' ? -15 : 15);
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