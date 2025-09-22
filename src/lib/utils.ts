import { type AppZoneNode, type CombinedNode } from "@/lib/types";
import { clsx, type ClassValue } from "clsx";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { twMerge } from "tailwind-merge";

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
    (node.type === "table" ? 288 : node.type === "note" ? 192 : 300);
  const nodeHeight =
    node.height ||
    (node.type === "table" ? 100 : node.type === "note" ? 192 : 300);

  const zoneWidth = zone.width || 300;
  const zoneHeight = zone.height || 300;

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
  nodeWidth: number = 288,
  nodeHeight: number = 100,
  spacing: number = 50
): { x: number; y: number } {
  const newRect = {
    x: preferredPosition.x,
    y: preferredPosition.y,
    width: nodeWidth,
    height: nodeHeight,
  };

  // Check if the default position overlaps with any existing node
  const hasOverlap = existingNodes.some((node) => {
    if (!node.position) return false;
    
    const existingRect = {
      x: node.position.x,
      y: node.position.y,
      width: node.width || (node.type === "table" ? 288 : node.type === "note" ? 192 : 300),
      height: node.height || (node.type === "table" ? 100 : node.type === "note" ? 192 : 300),
    };

    return doRectanglesOverlap(newRect, existingRect);
  });

  if (!hasOverlap) {
    return preferredPosition;
  }

  // Try positions in a spiral pattern around the preferred position
  const maxAttempts = 20;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const angle = (attempt * 0.5) * Math.PI; // Golden angle approximation
    const radius = attempt * spacing;
    
    const offsetX = Math.cos(angle) * radius;
    const offsetY = Math.sin(angle) * radius;
    
    const candidatePosition = {
      x: preferredPosition.x + offsetX,
      y: preferredPosition.y + offsetY,
    };

    const candidateRect = {
      x: candidatePosition.x,
      y: candidatePosition.y,
      width: nodeWidth,
      height: nodeHeight,
    };

    const hasCandidateOverlap = existingNodes.some((node) => {
      if (!node.position) return false;
      
      const existingRect = {
        x: node.position.x,
        y: node.position.y,
        width: node.width || (node.type === "table" ? 288 : node.type === "note" ? 192 : 300),
        height: node.height || (node.type === "table" ? 100 : node.type === "note" ? 192 : 300),
      };

      return doRectanglesOverlap(candidateRect, existingRect);
    });

    if (!hasCandidateOverlap) {
      return candidatePosition;
    }
  }

  // Fallback: return a position far from existing nodes
  const maxX = Math.max(...existingNodes.map(n => n.position?.x || 0), 0);
  const maxY = Math.max(...existingNodes.map(n => n.position?.y || 0), 0);
  
  return {
    x: maxX + spacing * 2,
    y: maxY + spacing * 2,
  };
}