import { BaseEdge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath, Position } from '@xyflow/react';

const EdgeIndicator = ({ x, y, label, isHighlighted }: { x: number; y: number; label: string; isHighlighted?: boolean }) => (
  <div
    style={{
      position: 'absolute',
      transform: `translate(-50%, -50%) translate(${x}px,${y}px)`,
      background: isHighlighted ? '#60a5fa' : '#4b5563',
      color: 'white',
      fontSize: '10px',
      fontWeight: 'bold',
      width: '18px',
      height: '18px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: '50%',
      zIndex: 1,
      lineHeight: '1',
      paddingBottom: '1px',
      transition: 'background-color 0.2s ease-in-out',
    }}
    className="nodrag nopan"
  >
    {label}
  </div>
);

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10,
  });

  const { isHighlighted, relationship } = data;

  let sourceLabel = '';
  let targetLabel = '';
  switch (relationship) {
    case 'one-to-one': sourceLabel = '1'; targetLabel = '1'; break;
    case 'one-to-many': sourceLabel = '1'; targetLabel = 'n'; break;
    case 'many-to-one': sourceLabel = 'n'; targetLabel = '1'; break;
    case 'many-to-many': sourceLabel = 'n'; targetLabel = 'n'; break;
    default: sourceLabel = '1'; targetLabel = 'n'; break;
  }

  const labelOffset = 40;
  let sourceLabelX = sourceX;
  let sourceLabelY = sourceY;
  let targetLabelX = targetX;
  let targetLabelY = targetY;

  if (sourcePosition === Position.Right) sourceLabelX += labelOffset;
  if (sourcePosition === Position.Left) sourceLabelX -= labelOffset;
  if (sourcePosition === Position.Top) sourceLabelY -= labelOffset;
  if (sourcePosition === Position.Bottom) sourceLabelY += labelOffset;

  if (targetPosition === Position.Right) targetLabelX += labelOffset;
  if (targetPosition === Position.Left) targetLabelX -= labelOffset;
  if (targetPosition === Position.Top) targetLabelY -= labelOffset;
  if (targetPosition === Position.Bottom) targetLabelY += labelOffset;

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        style={{
          stroke: isHighlighted ? '#60a5fa' : '#a1a1aa',
          strokeWidth: isHighlighted ? 2 : 1.5,
          ...style,
        }}
      />
      {isHighlighted && (
        <BaseEdge
          path={edgePath}
          style={{
            stroke: '#FFFFFF',
            strokeWidth: 2,
            strokeDasharray: '10, 20',
            animation: 'flow 2s linear infinite',
          }}
        />
      )}
      <EdgeLabelRenderer>
        <EdgeIndicator x={sourceLabelX} y={sourceLabelY} label={sourceLabel} isHighlighted={isHighlighted} />
        <EdgeIndicator x={targetLabelX} y={targetLabelY} label={targetLabel} isHighlighted={isHighlighted} />
      </EdgeLabelRenderer>
    </>
  );
}