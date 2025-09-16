import { colors } from "@/lib/constants";
import { type EdgeData } from "@/lib/types";
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
} from "@xyflow/react";
import { useMemo } from "react";

const EdgeIndicator = ({
  x,
  y,
  label,
  isHighlighted = false,
}: {
  x: number;
  y: number;
  label: string;
  isHighlighted?: boolean;
}) => (
  <div
    style={{
      position: "absolute",
      transform: `translate(-50%, -50%) translate(${x}px,${y}px)`,
      background: isHighlighted ? colors.HIGHLIGHT : colors.DEFAULT_INDICATOR,
      color: "white",
      fontSize: "10px",
      fontWeight: "bold",
      width: "18px",
      height: "18px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      borderRadius: "50%",
      zIndex: 1,
      lineHeight: "1",
      paddingBottom: "1px",
      transition: "background-color 0.2s ease-in-out",
    }}
    className="nodrag nopan"
  >
    {label}
  </div>
);

const getPointAlongPath = (pathData: string, distance: number) => {
  if (typeof document === "undefined") return { x: 0, y: 0 };
  const pathNode = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  pathNode.setAttribute("d", pathData);
  return pathNode.getPointAtLength(distance);
};

const getTotalPathLength = (pathData: string) => {
  if (typeof document === "undefined") return 0;
  const pathNode = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  pathNode.setAttribute("d", pathData);
  return pathNode.getTotalLength();
};

export default function CustomEdge(props: EdgeProps) {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    style = {},
  } = props;

  // Type assertion for the data property
  const edgeData = data as EdgeData | undefined;
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10,
  });

  const { isHighlighted, relationship } = edgeData || {};

  const { sourcePoint, targetPoint } = useMemo(() => {
    const pathLength = getTotalPathLength(edgePath);
    const distance = 40;
    const safeDistance = Math.min(distance, pathLength / 2 - 5);

    const sp = getPointAlongPath(edgePath, safeDistance);
    const tp = getPointAlongPath(edgePath, pathLength - safeDistance);

    return { sourcePoint: sp, targetPoint: tp };
  }, [edgePath]);

  let sourceLabel = "";
  let targetLabel = "";
  switch (relationship) {
    case "one-to-one":
      sourceLabel = "1";
      targetLabel = "1";
      break;
    case "one-to-many":
      sourceLabel = "1";
      targetLabel = "n";
      break;
    case "many-to-one":
      sourceLabel = "n";
      targetLabel = "1";
      break;
    case "many-to-many":
      sourceLabel = "n";
      targetLabel = "n";
      break;
    default:
      sourceLabel = "1";
      targetLabel = "n";
      break;
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: isHighlighted ? colors.HIGHLIGHT : colors.DEFAULT_STROKE,
          strokeWidth: isHighlighted ? 2 : 1.5,
          ...style,
        }}
      />
      {isHighlighted && (
        <BaseEdge
          path={edgePath}
          style={{
            stroke: colors.WHITE,
            strokeWidth: 2,
            strokeDasharray: "10, 20",
            animation: "flow 2s linear infinite",
          }}
        />
      )}
      <EdgeLabelRenderer>
        <EdgeIndicator
          x={sourcePoint.x}
          y={sourcePoint.y}
          label={sourceLabel}
          isHighlighted={isHighlighted ?? false}
        />
        <EdgeIndicator
          x={targetPoint.x}
          y={targetPoint.y}
          label={targetLabel}
          isHighlighted={isHighlighted ?? false}
        />
      </EdgeLabelRenderer>
    </>
  );
}
