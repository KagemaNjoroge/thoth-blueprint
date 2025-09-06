import { BaseEdge, EdgeProps, getSmoothStepPath } from 'reactflow';
import { useMemo } from 'react';

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

  const { markerStartUrl, markerEndUrl } = useMemo(() => {
    const markerUrl = `url(#many${isHighlighted ? '-selected' : ''})`;
    let startUrl, endUrl;

    switch (relationship) {
      case 'one-to-one':
        startUrl = undefined;
        endUrl = undefined;
        break;
      case 'one-to-many':
        startUrl = undefined;
        endUrl = markerUrl;
        break;
      case 'many-to-one':
        startUrl = markerUrl;
        endUrl = undefined;
        break;
      case 'many-to-many':
        startUrl = markerUrl;
        endUrl = markerUrl;
        break;
      default: // Default to one-to-many
        startUrl = undefined;
        endUrl = markerUrl;
        break;
    }
    return { markerStartUrl: startUrl, markerEndUrl: endUrl };
  }, [relationship, isHighlighted]);

  return (
    <g className={isHighlighted ? 'animated-edge' : ''}>
      <BaseEdge 
        path={edgePath} 
        markerStart={markerStartUrl}
        markerEnd={markerEndUrl}
        style={{
          stroke: isHighlighted ? '#60a5fa' : '#a1a1aa',
          strokeWidth: isHighlighted ? 2 : 1.5,
          strokeDasharray: isHighlighted ? '5 5' : 'none',
          transition: 'all 0.2s ease-in-out',
          ...style,
        }}
      />
    </g>
  );
}