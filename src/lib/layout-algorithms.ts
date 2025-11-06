import { type AppNode, type AppEdge } from "@/lib/types";

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
  connections: Set<string>;
  actualHeight: number; // Store actual table height
}

interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalSpacing?: number;
  verticalSpacing?: number;
  startX?: number;
  startY?: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  nodeWidth: 288,
  nodeHeight: 120,
  horizontalSpacing: 100,
  verticalSpacing: 80,
  startX: 50,
  startY: 50,
};

/**
 * Calculates the actual height of a table node based on its content
 */
function calculateTableHeight(node: AppNode): number {
  // Base height for table header and padding
  const baseHeight = 60;
  // Height per column (including borders and spacing)
  const columnHeight = 32;
  // Number of columns
  const columnCount = node.data.columns?.length || 0;
  
  return baseHeight + (columnCount * columnHeight);
}

/**
 * Checks if two rectangles overlap
 */
function rectanglesOverlap(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}

/**
 * Finds a non-overlapping position for a node within a level
 */
function findNonOverlappingPosition(
  node: LayoutNode,
  levelNodes: LayoutNode[],
  opts: Required<LayoutOptions>
): { x: number; y: number } {
  let attempts = 0;
  const maxAttempts = 50;
  let currentX = node.x;
  let currentY = node.y;
  
  while (attempts < maxAttempts) {
    let hasOverlap = false;
    
    // Check for overlaps with other nodes in the same level
    for (const otherNode of levelNodes) {
      if (otherNode.id === node.id) continue;
      
      const otherRect = {
        x: otherNode.x,
        y: otherNode.y,
        width: otherNode.width,
        height: otherNode.actualHeight
      };
      
      const currentRect = {
        x: currentX,
        y: currentY,
        width: node.width,
        height: node.actualHeight
      };
      
      if (rectanglesOverlap(currentRect, otherRect)) {
        hasOverlap = true;
        // Move to the right
        currentX = otherNode.x + otherNode.width + opts.horizontalSpacing;
        break;
      }
    }
    
    if (!hasOverlap) {
      // Also check for overlaps with nodes from previous levels
      // This helps prevent vertical stacking issues
      const verticalSpacing = Math.max(opts.verticalSpacing, node.actualHeight + 20);
      if (currentY < node.y + verticalSpacing) {
        currentY = node.y + (attempts * 20); // Gradually move down
      }
      
      return { x: currentX, y: currentY };
    }
    
    attempts++;
  }
  
  // Fallback: return original position if we can't find a non-overlapping one
  return { x: node.x, y: node.y };
}

/**
 * Organizes tables based on their relationships using a hierarchical layout algorithm.
 * Tables with foreign key relationships are positioned closer together,
 * with parent tables above child tables. Includes collision detection to prevent overlaps.
 */
export function organizeTablesByRelationships(
  nodes: AppNode[],
  edges: AppEdge[],
  options: LayoutOptions = {}
): AppNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (nodes.length === 0) return nodes;
  
  // Build relationship graph
  const nodeMap = new Map<string, LayoutNode>();
  const adjacencyList = new Map<string, Set<string>>();
  
  // Initialize nodes with actual heights
  nodes.forEach(node => {
    const actualHeight = calculateTableHeight(node);
    const layoutNode: LayoutNode = {
      id: node.id,
      x: 0,
      y: 0,
      width: opts.nodeWidth,
      height: opts.nodeHeight,
      actualHeight: actualHeight,
      level: 0,
      connections: new Set(),
    };
    nodeMap.set(node.id, layoutNode);
    adjacencyList.set(node.id, new Set());
  });
  
  // Build connections from edges (foreign key relationships)
  edges.forEach(edge => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    
    if (sourceNode && targetNode) {
      // Add bidirectional connections for layout purposes
      sourceNode.connections.add(edge.target);
      targetNode.connections.add(edge.source);
      
      adjacencyList.get(edge.source)?.add(edge.target);
      adjacencyList.get(edge.target)?.add(edge.source);
    }
  });
  
  // Find root nodes (tables that are referenced but don't reference others)
  const referencedTables = new Set<string>();
  const referencingTables = new Set<string>();
  
  edges.forEach(edge => {
    referencedTables.add(edge.target);
    referencingTables.add(edge.source);
  });
  
  const rootNodes = nodes
    .filter(node => !referencingTables.has(node.id))
    .map(node => node.id);
  
  // If no clear roots, use nodes with fewer connections as roots
  const rootNodeIds = rootNodes.length > 0 ? rootNodes : 
    nodes
      .map(node => ({ id: node.id, connections: nodeMap.get(node.id)?.connections.size || 0 }))
      .sort((a, b) => a.connections - b.connections)
      .slice(0, Math.max(1, Math.ceil(nodes.length * 0.3)))
      .map(item => item.id);
  
  // Assign levels using BFS
  const visited = new Set<string>();
  const queue: Array<{ id: string; level: number }> = [];
  
  rootNodeIds.forEach(id => {
    queue.push({ id, level: 0 });
    visited.add(id);
  });
  
  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) {
      node.level = level;
    }
    
    const neighbors = adjacencyList.get(id) || new Set();
    neighbors.forEach(neighborId => {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push({ id: neighborId, level: level + 1 });
      }
    });
  }
  
  // Group nodes by level
  const levels = new Map<number, LayoutNode[]>();
  nodeMap.forEach(node => {
    if (!levels.has(node.level)) {
      levels.set(node.level, []);
    }
    levels.get(node.level)!.push(node);
  });
  
  // Position nodes with collision detection
  let currentY = opts.startY;
  const maxLevel = Math.max(...Array.from(levels.keys()));
  
  for (let level = 0; level <= maxLevel; level++) {
    const levelNodes = levels.get(level) || [];
    
    // Sort nodes within level by number of connections (more connected nodes first)
    levelNodes.sort((a, b) => b.connections.size - a.connections.size);
    
    // Calculate optimal positioning within level
    const totalWidth = levelNodes.length * opts.nodeWidth + (levelNodes.length - 1) * opts.horizontalSpacing;
    let currentX = opts.startX + Math.max(0, (800 - totalWidth) / 2); // Center the level
    
    // Initial positioning
    levelNodes.forEach(node => {
      node.x = currentX;
      node.y = currentY;
      currentX += opts.nodeWidth + opts.horizontalSpacing;
    });
    
    // Apply collision detection within the level
    for (let i = 0; i < levelNodes.length; i++) {
      const node = levelNodes[i];
      const otherNodesInLevel = levelNodes.slice(0, i); // Only check against previously positioned nodes
      
      if (otherNodesInLevel.length > 0 && node) {
        const newPosition = findNonOverlappingPosition(node, otherNodesInLevel, opts);
        node.x = newPosition.x;
        node.y = newPosition.y;
      }
    }
    
    // Calculate the maximum height in this level for proper vertical spacing
    const maxHeightInLevel = Math.max(...levelNodes.map(node => node.actualHeight));
    currentY += maxHeightInLevel + opts.verticalSpacing;
  }
  
  // Apply positions back to AppNode objects
  return nodes.map(node => {
    const layoutNode = nodeMap.get(node.id);
    if (!layoutNode) return node;
    
    return {
      ...node,
      position: {
        x: layoutNode.x,
        y: layoutNode.y,
      },
    };
  });
}

/**
 * Alternative force-directed layout that pushes connected nodes together
 * and unconnected nodes apart.
 */
export function forceDirectedLayout(
  nodes: AppNode[],
  edges: AppEdge[],
  options: LayoutOptions = {}
): AppNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (nodes.length === 0) return nodes;
  
  // Initialize positions randomly if not set
  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((node, index) => {
    positions.set(node.id, {
      x: node.position?.x ?? opts.startX + (index % 5) * (opts.nodeWidth + opts.horizontalSpacing),
      y: node.position?.y ?? opts.startY + Math.floor(index / 5) * (opts.nodeHeight + opts.verticalSpacing),
    });
  });
  
  // Build adjacency list
  const connections = new Map<string, Set<string>>();
  nodes.forEach(node => connections.set(node.id, new Set()));
  edges.forEach(edge => {
    connections.get(edge.source)?.add(edge.target);
    connections.get(edge.target)?.add(edge.source);
  });
  
  // Simple force-directed iterations
  for (let iteration = 0; iteration < 50; iteration++) {
    const forces = new Map<string, { x: number; y: number }>();
    
    // Initialize forces
    nodes.forEach(node => {
      forces.set(node.id, { x: 0, y: 0 });
    });
    
    // Repulsion forces between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];
        const pos1 = positions.get(node1?.id || "")!;
        const pos2 = positions.get(node2?.id || "")!;
        
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = (opts.nodeWidth * opts.nodeHeight) / (distance * distance);
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        const force1 = forces.get(node1?.id || "")!;
        const force2 = forces.get(node2?.id || "")!;
        
        force1.x -= fx;
        force1.y -= fy;
        force2.x += fx;
        force2.y += fy;
      }
    }
    
    // Attraction forces for connected nodes
    edges.forEach(edge => {
      const pos1 = positions.get(edge.source)!;
      const pos2 = positions.get(edge.target)!;
      
      const dx = pos2.x - pos1.x;
      const dy = pos2.y - pos1.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      
      const force = distance * 0.1;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      
      const force1 = forces.get(edge.source)!;
      const force2 = forces.get(edge.target)!;
      
      force1.x += fx;
      force1.y += fy;
      force2.x -= fx;
      force2.y -= fy;
    });
    
    // Apply forces
    nodes.forEach(node => {
      const pos = positions.get(node.id)!;
      const force = forces.get(node.id)!;
      
      pos.x += force.x * 0.1;
      pos.y += force.y * 0.1;
      
      // Keep nodes within bounds
      pos.x = Math.max(opts.startX, Math.min(pos.x, opts.startX + 1000));
      pos.y = Math.max(opts.startY, Math.min(pos.y, opts.startY + 1000));
    });
  }
  
  // Apply positions back to AppNode objects
  return nodes.map(node => {
    const position = positions.get(node.id);
    if (!position) return node;
    
    return {
      ...node,
      position,
    };
  });
}