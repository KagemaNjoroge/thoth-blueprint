import { BaseEdge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath, Position } from 'reactflow';
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
    
    const getManyIcon = (position: Position, isSource: boolean) => {
      let rotation = 0;
      if (isSource) {
        // Icon points away from the source node
        switch (position) {
          case Position.Right: rotation = 90; break;
          case Position.Left: rotation = -90; break;
          case Position.Bottom: rotation = 180; break;
          // case Position.Top: is default 0 (up)
        }
      } else { 
        // Icon points towards the target node
        switch (position) {
          case Position.Left: rotation = 90; break;
          case Position.Right: rotation = -90; break;
          case Position.Top: rotation = 180; break;
          // case Position.Bottom: is default 0 (up)
        }
      }
      return <GitFork size={14} strokeWidth={2.5} style={{ transform: `rotate(${rotation}deg)` }} />;
    };

    const sourceManyIcon = getManyIcon(sourcePosition, true);
    const targetManyIcon = getManyIcon(targetPosition, false);

    switch (data?.relationship) {
      case 'one-to-one':
        return { sourceLabel: oneIcon, targetLabel: oneIcon };
      case 'one-to-many':
        return { sourceLabel: oneIcon, targetLabel: targetManyIcon };
      case 'many-to-one':
        return { sourceLabel: sourceManyIcon, targetLabel: oneIcon };
      case 'many-to-many':
        return { sourceLabel: sourceManyIcon, targetLabel: targetManyIcon };
      default:
        return { sourceLabel: null, targetLabel: null };
    }
  }, [data?.relationship, sourcePosition, targetPosition]);

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