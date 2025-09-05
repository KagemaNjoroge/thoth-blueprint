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
    
    const getManyIcon = (position: Position) => {
      let rotation = 0;
      switch (position) {
        case Position.Left: rotation = 90; break;   // Handle on left, icon points right (inward)
        case Position.Right: rotation = -90; break;  // Handle on right, icon points left (inward)
        case Position.Top: rotation = 180; break;   // Handle on top, icon points down (inward)
        case Position.Bottom: rotation = 0; break;    // Handle on bottom, icon points up (inward)
      }
      return <GitFork size={14} strokeWidth={2.5} style={{ transform: `rotate(${rotation}deg)` }} />;
    };

    const sourceManyIcon = getManyIcon(sourcePosition);
    const targetManyIcon = getManyIcon(targetPosition);

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

  const getLabelPosition = (pos: Position, x: number, y: number) => {
    const offset = 25;
    switch(pos) {
        case Position.Right: return { x: x + offset, y };
        case Position.Left: return { x: x - offset, y };
        case Position.Top: return { x, y: y - offset };
        case Position.Bottom: return { x, y: y + offset };
        default: return { x, y };
    }
  }

  const { x: sourceLabelX, y: sourceLabelY } = getLabelPosition(sourcePosition, sourceX, sourceY);
  const { x: targetLabelX, y: targetLabelY } = getLabelPosition(targetPosition, targetX, targetY);

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