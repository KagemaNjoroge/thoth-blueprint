import { BaseEdge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath, Position } from 'reactflow';
import { useMemo, ReactNode } from 'react';

const CardinalityLabel = ({ x, y, label, isHighlighted }: { x: number; y: number; label: ReactNode; isHighlighted: boolean }) => (
  <div
    style={{
      position: 'absolute',
      transform: `translate(-50%, -50%) translate(${x}px,${y}px)`,
      background: 'hsl(var(--background))',
      padding: '1px 4px',
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: 600,
      color: isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
      border: `1px solid ${isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
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

  const { markerStartUrl, markerEndUrl, sourceLabelText, targetLabelText } = useMemo(() => {
    const markerUrl = (type: 'one' | 'many') => `url(#${type}${isHighlighted ? '-selected' : ''})`;
    let startUrl, endUrl, sourceText, targetText;

    switch (relationship) {
      case 'one-to-one':
        startUrl = markerUrl('one');
        endUrl = markerUrl('one');
        sourceText = '1';
        targetText = '1';
        break;
      case 'one-to-many':
        startUrl = markerUrl('one');
        endUrl = markerUrl('many');
        sourceText = '1';
        targetText = '*';
        break;
      case 'many-to-one':
        startUrl = markerUrl('many');
        endUrl = markerUrl('one');
        sourceText = '*';
        targetText = '1';
        break;
      case 'many-to-many':
        startUrl = markerUrl('many');
        endUrl = markerUrl('many');
        sourceText = '*';
        targetText = '*';
        break;
      default: // Default to one-to-many
        startUrl = markerUrl('one');
        endUrl = markerUrl('many');
        sourceText = '1';
        targetText = '*';
        break;
    }
    return { markerStartUrl: startUrl, markerEndUrl: endUrl, sourceLabelText: sourceText, targetLabelText: targetText };
  }, [relationship, isHighlighted]);

  const getLabelPosition = (pos: Position, x: number, y: number) => {
    const offset = 20;
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
      <BaseEdge 
        id={id} 
        path={edgePath} 
        markerStart={markerStartUrl}
        markerEnd={markerEndUrl}
        style={{
          stroke: isHighlighted ? '#60a5fa' : '#a1a1aa',
          strokeWidth: isHighlighted ? 2.5 : 2,
          strokeDasharray: isHighlighted ? '5 5' : 'none',
          transition: 'all 0.2s ease-in-out',
          ...style,
        }}
        className={isHighlighted ? 'animated-edge' : ''}
      />
      <EdgeLabelRenderer>
        {sourceLabelText && (
          <CardinalityLabel
            x={sourceLabelX}
            y={sourceLabelY}
            label={sourceLabelText}
            isHighlighted={isHighlighted}
          />
        )}
        {targetLabelText && (
          <CardinalityLabel
            x={targetLabelX}
            y={targetLabelY}
            label={targetLabelText}
            isHighlighted={isHighlighted}
          />
        )}
      </EdgeLabelRenderer>
    </>
  );
}