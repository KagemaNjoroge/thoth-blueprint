import { type AppZoneNode, type CombinedNode } from "@/lib/types";
import { clsx, type ClassValue } from "clsx";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { twMerge } from "tailwind-merge";

const MAX_SEARCH_DISTANCE = 10;
const OVERLAP_OFFSET = 20;
const DEFAULT_TABLE_WIDTH = 288;
const DEFAULT_TABLE_HEIGHT = 100;
const DEFAULT_NOTE_WIDTH = 192;
const DEFAULT_NOTE_HEIGHT = 192;
const DEFAULT_ZONE_WIDTH = 300;
const DEFAULT_ZONE_HEIGHT = 300;
const DEFAULT_NODE_SPACING = 50;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
interface MigrationFile {
  filename: string;
  content: string;
}

export async function downloadZip(
  files: MigrationFile[],
  zipName: string
): Promise<void> {
  if (files.length === 0) {
    throw new Error("No files to download");
  }

  const zip = new JSZip();
  files.forEach((file) => {
    zip.file(file.filename, file.content);
  });

  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, zipName);
}

/**
 * Check if a point is inside a rectangle
 */
function isPointInRect(
  point: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number }
) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/**
 * Check if a node is completely inside a zone
 */
export function isNodeInsideZone(
  node: CombinedNode,
  zone: AppZoneNode
): boolean {
  if (!node.position || !zone.position) return false;

  // Get node dimensions (use defaults if not specified)
  const nodeWidth =
    node.width ||
    (node.type === "table" ? DEFAULT_TABLE_WIDTH : node.type === "note" ? DEFAULT_NOTE_WIDTH : DEFAULT_ZONE_WIDTH);
  const nodeHeight =
    node.height ||
    (node.type === "table" ? DEFAULT_TABLE_HEIGHT : node.type === "note" ? DEFAULT_NOTE_HEIGHT : DEFAULT_ZONE_HEIGHT);

  const zoneWidth = zone.width || DEFAULT_ZONE_WIDTH;
  const zoneHeight = zone.height || DEFAULT_ZONE_HEIGHT;

  // Check if all four corners of the node are inside the zone
  const topLeft = { x: node.position.x, y: node.position.y };
  const topRight = { x: node.position.x + nodeWidth, y: node.position.y };
  const bottomLeft = { x: node.position.x, y: node.position.y + nodeHeight };
  const bottomRight = {
    x: node.position.x + nodeWidth,
    y: node.position.y + nodeHeight,
  };

  const zoneRect = {
    x: zone.position.x,
    y: zone.position.y,
    width: zoneWidth,
    height: zoneHeight,
  };

  return (
    isPointInRect(topLeft, zoneRect) &&
    isPointInRect(topRight, zoneRect) &&
    isPointInRect(bottomLeft, zoneRect) &&
    isPointInRect(bottomRight, zoneRect)
  );
}

/**
 * Find all locked zones that contain a node
 */
export function getLockedZonesForNode(
  node: CombinedNode,
  zones: AppZoneNode[]
): AppZoneNode[] {
  return zones.filter(
    (zone) => zone.data.isLocked && isNodeInsideZone(node, zone)
  );
}

/**
 * Check if a node is inside any locked zone
 */
export function isNodeInLockedZone(
  node: CombinedNode,
  zones: AppZoneNode[]
): boolean {
  return zones.some(
    (zone) => zone.data.isLocked && isNodeInsideZone(node, zone)
  );
}

// Check if two rectangles overlap
function doRectanglesOverlap(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    rect1.x + rect1.width <= rect2.x ||
    rect2.x + rect2.width <= rect1.x ||
    rect1.y + rect1.height <= rect2.y ||
    rect2.y + rect2.height <= rect1.y
  );
}

// Find a non-overlapping position for a new table
export function findNonOverlappingPosition(
  existingNodes: CombinedNode[],
  preferredPosition: { x: number; y: number },
  nodeWidth: number = DEFAULT_TABLE_WIDTH,
  nodeHeight: number = DEFAULT_TABLE_HEIGHT,
  spacing: number = DEFAULT_NODE_SPACING
): { x: number; y: number } {
  // Check if preferred position is free
  const hasOverlap = existingNodes.some((node) => {
    if (!node.position) return false;
    
    const existingRect = {
      x: node.position.x,
      y: node.position.y,
      width: node.width || (node.type === "table" ? DEFAULT_TABLE_WIDTH : node.type === "note" ? DEFAULT_NOTE_WIDTH : DEFAULT_ZONE_WIDTH),
      height: node.height || (node.type === "table" ? DEFAULT_TABLE_HEIGHT : node.type === "note" ? DEFAULT_NOTE_HEIGHT : DEFAULT_ZONE_HEIGHT),
    };

    const newRect = {
      x: preferredPosition.x,
      y: preferredPosition.y,
      width: nodeWidth,
      height: nodeHeight,
    };

    return doRectanglesOverlap(newRect, existingRect);
  });

  if (!hasOverlap) {
    return preferredPosition;
  }

  const gridSize = nodeWidth + spacing;
  
  // try positions in a grid around the preferred position
  for (let distance = 1; distance <= MAX_SEARCH_DISTANCE; distance++) {
    const positions = [
      { x: preferredPosition.x + distance * gridSize, y: preferredPosition.y },
      { x: preferredPosition.x - distance * gridSize, y: preferredPosition.y },
      { x: preferredPosition.x, y: preferredPosition.y + distance * gridSize },
      { x: preferredPosition.x, y: preferredPosition.y - distance * gridSize },
      { x: preferredPosition.x + distance * gridSize, y: preferredPosition.y + distance * gridSize },
      { x: preferredPosition.x - distance * gridSize, y: preferredPosition.y - distance * gridSize },
      { x: preferredPosition.x + distance * gridSize, y: preferredPosition.y - distance * gridSize },
      { x: preferredPosition.x - distance * gridSize, y: preferredPosition.y + distance * gridSize },
    ];

    for (const candidate of positions) {
      const candidateRect = {
        x: candidate.x,
        y: candidate.y,
        width: nodeWidth,
        height: nodeHeight,
      };

      const hasCandidateOverlap = existingNodes.some((node) => {
        if (!node.position) return false;
        
        const existingRect = {
          x: node.position.x,
          y: node.position.y,
          width: node.width || (node.type === "table" ? DEFAULT_TABLE_WIDTH : node.type === "note" ? DEFAULT_NOTE_WIDTH : DEFAULT_ZONE_WIDTH),
          height: node.height || (node.type === "table" ? DEFAULT_TABLE_HEIGHT : node.type === "note" ? DEFAULT_NOTE_HEIGHT : DEFAULT_ZONE_HEIGHT),
        };

        return doRectanglesOverlap(candidateRect, existingRect);
      });

      if (!hasCandidateOverlap) {
        return candidate;
      }
    }
  }
  
  // If all else fails, overlap on the last added table
  const lastAddedNode = existingNodes
    .filter(node => node.position)
    .sort((a, b) => {
      const orderA = typeof a.data.order === 'number' ? a.data.order : 0;
      const orderB = typeof b.data.order === 'number' ? b.data.order : 0;
      return orderB - orderA;
    })[0];
  
  if (lastAddedNode && lastAddedNode.position) {
    return {
      x: lastAddedNode.position.x + OVERLAP_OFFSET,
      y: lastAddedNode.position.y + OVERLAP_OFFSET,
    };
  }
  
  return preferredPosition;
}