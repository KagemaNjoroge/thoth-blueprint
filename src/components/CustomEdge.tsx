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
    const markerUrl = (type: 'one' | 'many') => `url(#${type}${isHighlighted ? '-selected' : ''})`;
    let startUrl, endUrl;

    switch (relationship) {
      case 'one-to-one':
        startUrl = markerUrl('one');
        endUrl = markerUrl('one');
        break;
      case 'one-to-many':
        startUrl = markerUrl('one');
        endUrl = markerUrl('many');
        break;
      case 'many-to-one':
        startUrl = markerUrl('many');
        endUrl = markerUrl('one');
        break;
      case 'many-to-many':
        startUrl = markerUrl('many');
        endUrl = markerUrl('many');
        break;
      default: // Default to one-to-many
        startUrl = markerUrl('one');
        endUrl = markerUrl('many');
        break;
    }
    return { markerStartUrl: startUrl, markerEndUrl: endUrl };
  }, [relationship, isHighlighted]);

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
    </>
  );
}