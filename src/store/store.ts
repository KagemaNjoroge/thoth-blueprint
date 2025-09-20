import { db } from "@/lib/db";
import {
  type AppEdge,
  type AppNode,
  type AppNoteNode,
  type AppZoneNode,
  type DatabaseType,
  type Diagram,
} from "@/lib/types";
import {
  type EdgeChange,
  type NodeChange,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import debounce from "lodash/debounce";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { shallow } from "zustand/shallow";

export interface Settings {
  rememberLastPosition: boolean;
}

export interface StoreState {
  diagrams: Diagram[];
  selectedDiagramId: number | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  settings: Settings;
  isLoading: boolean;
  loadInitialData: () => Promise<void>;
  setSelectedDiagramId: (id: number | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  createDiagram: (
    diagram: Omit<Diagram, "id" | "createdAt" | "updatedAt">
  ) => Promise<void>;
  importDiagram: (diagramData: {
    name: string;
    dbType: DatabaseType;
    data: Diagram["data"];
  }) => Promise<void>;
  renameDiagram: (id: number, name: string) => void;
  moveDiagramToTrash: (id: number) => void;
  restoreDiagram: (id: number) => void;
  permanentlyDeleteDiagram: (id: number) => void;
  updateCurrentDiagramData: (data: Partial<Diagram["data"]>) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addEdge: (edge: AppEdge) => void;
  updateNode: (node: AppNode | AppNoteNode | AppZoneNode) => void;
  deleteNodes: (nodeIds: string[]) => void;
  updateEdge: (edge: AppEdge) => void;
  deleteEdge: (edgeId: string) => void;
  addNode: (node: AppNode | AppNoteNode | AppZoneNode) => void;
  undoDelete: () => void;
  batchUpdateNodes: (nodes: AppNode[]) => void;
}

export const TABLE_SOFT_DELETE_LIMIT = 10

const debouncedSave = debounce(
  async (diagrams: Diagram[], selectedDiagramId: number | null) => {
    try {
      await db.transaction("rw", db.diagrams, db.appState, async () => {
        const allDbDiagramIds = (await db.diagrams
          .toCollection()
          .primaryKeys()) as number[];
        const storeDiagramIds = diagrams
          .map((d) => d.id)
          .filter(Boolean) as number[];

        const idsToDelete = allDbDiagramIds.filter(
          (id) => !storeDiagramIds.includes(id)
        );
        if (idsToDelete.length > 0) {
          await db.diagrams.bulkDelete(idsToDelete);
        }

        if (diagrams.length > 0) {
          await db.diagrams.bulkPut(diagrams);
        }

        if (selectedDiagramId !== null) {
          await db.appState.put({
            key: "selectedDiagramId",
            value: selectedDiagramId,
          });
        } else {
          await db.appState.delete("selectedDiagramId").catch(() => {});
        }
      });
    } catch (error) {
      console.error("Failed to save state to IndexedDB:", error);
    }
  },
  1000
);

const DEFAULT_SETTINGS: Settings = {
  rememberLastPosition: true,
};

export const useStore = create(
  subscribeWithSelector<StoreState>((set) => ({
    diagrams: [],
    selectedDiagramId: null,
    selectedNodeId: null,
    selectedEdgeId: null,
    settings: DEFAULT_SETTINGS,
    isLoading: true,
    loadInitialData: async () => {
      set({ isLoading: true });
      const diagrams = await db.diagrams.toArray();
      const selectedDiagramIdState = await db.appState.get("selectedDiagramId");

      // Load settings
      const settingsState = await db.appState.get("settings");
      let settings = DEFAULT_SETTINGS;
      if (settingsState && typeof settingsState.value === "string") {
        try {
          settings = JSON.parse(settingsState.value);
        } catch (e) {
          console.error("Failed to parse settings:", e);
        }
      }

      let selectedDiagramId = null;
      if (
        selectedDiagramIdState &&
        typeof selectedDiagramIdState.value === "number"
      ) {
        const diagramExists = diagrams.some(
          (d) => d.id === selectedDiagramIdState.value && !d.deletedAt
        );
        if (diagramExists) {
          selectedDiagramId = selectedDiagramIdState.value;
        }
      }
      set({ diagrams, selectedDiagramId, settings, isLoading: false });
    },
    setSelectedDiagramId: (id) =>
      set({
        selectedDiagramId: id,
        selectedNodeId: null,
        selectedEdgeId: null,
      }),
    setSelectedNodeId: (id) => set({ selectedNodeId: id }),
    setSelectedEdgeId: (id) => set({ selectedEdgeId: id }),
    updateSettings: (newSettings) => {
      set((state) => {
        const updatedSettings = { ...state.settings, ...newSettings };
        db.appState
          .put({
            key: "settings",
            value: JSON.stringify(updatedSettings),
          })
          .catch((error) => {
            console.error("Failed to save settings:", error);
          });
        return { settings: updatedSettings };
      });
    },
    createDiagram: async (diagramData) => {
      const newDiagram: Diagram = {
        ...diagramData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const id = await db.diagrams.add(newDiagram);
      set((state) => ({
        diagrams: [...state.diagrams, { ...newDiagram, id }],
        selectedDiagramId: id,
      }));
    },
    importDiagram: async (diagramData) => {
      const newDiagram: Diagram = {
        ...diagramData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const id = await db.diagrams.add(newDiagram);
      set((state) => ({
        diagrams: [...state.diagrams, { ...newDiagram, id }],
        selectedDiagramId: id,
      }));
    },
    renameDiagram: (id, name) => {
      set((state) => ({
        diagrams: state.diagrams.map((d) =>
          d.id === id ? { ...d, name, updatedAt: new Date() } : d
        ),
      }));
    },
    moveDiagramToTrash: (id) => {
      set((state) => ({
        diagrams: state.diagrams.map((d) =>
          d.id === id
            ? { ...d, deletedAt: new Date(), updatedAt: new Date() }
            : d
        ),
      }));
    },
    restoreDiagram: (id) => {
      set((state) => ({
        diagrams: state.diagrams.map((d) =>
          d.id === id ? { ...d, deletedAt: null, updatedAt: new Date() } : d
        ),
      }));
    },
    permanentlyDeleteDiagram: (id) => {
      set((state) => ({
        diagrams: state.diagrams.filter((d) => d.id !== id),
      }));
    },
    updateCurrentDiagramData: (data) => {
      set((state) => ({
        diagrams: state.diagrams.map((d) =>
          d.id === state.selectedDiagramId
            ? { ...d, data: { ...d.data, ...data }, updatedAt: new Date() }
            : d
        ),
      }));
    },
    onNodesChange: (changes) => {
      set((state) => {
        const diagram = state.diagrams.find(
          (d) => d.id === state.selectedDiagramId
        );
        if (!diagram) return state;

        const allDiagramNodes = [
          ...(diagram.data.nodes || []),
          ...(diagram.data.notes || []),
          ...(diagram.data.zones || []),
        ];
        const updatedNodes = applyNodeChanges(changes, allDiagramNodes);

        const newNodes = updatedNodes.filter(
          (n) => n.type === "table"
        ) as AppNode[];
        const newNotes = updatedNodes.filter(
          (n) => n.type === "note"
        ) as AppNoteNode[];
        const newZones = updatedNodes.filter(
          (n) => n.type === "zone"
        ) as AppZoneNode[];

        return {
          diagrams: state.diagrams.map((d) =>
            d.id === state.selectedDiagramId
              ? {
                  ...d,
                  data: {
                    ...d.data,
                    nodes: newNodes,
                    notes: newNotes,
                    zones: newZones,
                  },
                  updatedAt: new Date(),
                }
              : d
          ),
        };
      });
    },
    onEdgesChange: (changes) => {
      set((state) => {
        const diagram = state.diagrams.find(
          (d) => d.id === state.selectedDiagramId
        );
        if (!diagram) return state;
        const updatedEdges = applyEdgeChanges(
          changes,
          diagram.data.edges || []
        ) as AppEdge[];
        return {
          diagrams: state.diagrams.map((d) =>
            d.id === state.selectedDiagramId
              ? {
                  ...d,
                  data: { ...d.data, edges: updatedEdges },
                  updatedAt: new Date(),
                }
              : d
          ),
        };
      });
    },
    addEdge: (edge) => {
      set((state) => {
        const diagram = state.diagrams.find(
          (d) => d.id === state.selectedDiagramId
        );
        if (!diagram) return state;
        const newEdges = [...(diagram.data.edges || []), edge];
        return {
          diagrams: state.diagrams.map((d) =>
            d.id === state.selectedDiagramId
              ? {
                  ...d,
                  data: { ...d.data, edges: newEdges },
                  updatedAt: new Date(),
                }
              : d
          ),
        };
      });
    },
    updateNode: (nodeToUpdate) => {
      set((state) => {
        const diagram = state.diagrams.find(
          (d) => d.id === state.selectedDiagramId
        );
        if (!diagram) return state;

        const updatedData = { ...diagram.data };

        if (nodeToUpdate.type === "table") {
          updatedData.nodes = (diagram.data.nodes || []).map((node) =>
            node.id === nodeToUpdate.id ? (nodeToUpdate as AppNode) : node
          );
        } else if (nodeToUpdate.type === "note") {
          updatedData.notes = (diagram.data.notes || []).map((note) =>
            note.id === nodeToUpdate.id ? (nodeToUpdate as AppNoteNode) : note
          );
        } else if (nodeToUpdate.type === "zone") {
          updatedData.zones = (diagram.data.zones || []).map((zone) =>
            zone.id === nodeToUpdate.id ? (nodeToUpdate as AppZoneNode) : zone
          );
        }

        return {
          diagrams: state.diagrams.map((d) =>
            d.id === state.selectedDiagramId
              ? {
                  ...d,
                  data: updatedData,
                  updatedAt: new Date(),
                }
              : d
          ),
        };
      });
    },
    deleteNodes: (nodeIds) => {
      set((state) => {
        const diagram = state.diagrams.find(
          (d) => d.id === state.selectedDiagramId
        );
        if (!diagram) return state;

        // Helper function to mark table nodes as deleted
        const markAsDeleted = (list: AppNode[] | undefined): AppNode[] =>
          (list || []).map((item) =>
            nodeIds.includes(item.id) && item.type === "table"
              ? {
                  ...item,
                  data: {
                    ...item.data,
                    isDeleted: true,
                    deletedAt: new Date(),
                  },
                }
              : item
          );

        const nodesWithNewDeletes = markAsDeleted(diagram.data.nodes);
        const allDeletedTables = nodesWithNewDeletes.filter(
          (node) => node.type === "table" && node.data?.isDeleted === true
        );

        let finalNodes = nodesWithNewDeletes;

        if (allDeletedTables.length > TABLE_SOFT_DELETE_LIMIT) {
          // Sort deleted tables by deletion time (oldest first)
          const sortedDeletedTables = [...allDeletedTables].sort((a, b) => {
            const aTime = a.data?.deletedAt
              ? new Date(a.data.deletedAt).getTime()
              : 0;
            const bTime = b.data?.deletedAt
              ? new Date(b.data.deletedAt).getTime()
              : 0;
            return aTime - bTime;
          });

          const tablesToRemoveCount = allDeletedTables.length - TABLE_SOFT_DELETE_LIMIT;
          const tablesToRemove = sortedDeletedTables.slice(
            0,
            tablesToRemoveCount
          );
          const tableIdsToRemove = new Set(
            tablesToRemove.map((table) => table.id)
          );

          // Permanently remove the oldest deleted tables
          finalNodes = nodesWithNewDeletes.filter(
            (node) => !tableIdsToRemove.has(node.id)
          );
        }

        const filterNotesForDeletion = (notes: AppNoteNode[]): AppNoteNode[] =>
          (notes || []).filter((note) => !nodeIds.includes(note.id));

        const filterZonesForDeletion = (zones: AppZoneNode[]): AppZoneNode[] =>
          (zones || []).filter((zone) => !nodeIds.includes(zone.id));

        return {
          diagrams: state.diagrams.map((d) =>
            d.id === state.selectedDiagramId
              ? {
                  ...d,
                  data: {
                    ...d.data,
                    nodes: finalNodes,
                    notes: filterNotesForDeletion(d.data.notes || []),
                    zones: filterZonesForDeletion(d.data.zones || []),
                  },
                  updatedAt: new Date(),
                }
              : d
          ),
        };
      });
    },
    updateEdge: (edgeToUpdate) => {
      set((state) => {
        const diagram = state.diagrams.find(
          (d) => d.id === state.selectedDiagramId
        );
        if (!diagram) return state;
        const newEdges = (diagram.data.edges || []).map((edge) =>
          edge.id === edgeToUpdate.id ? edgeToUpdate : edge
        );
        return {
          diagrams: state.diagrams.map((d) =>
            d.id === state.selectedDiagramId
              ? {
                  ...d,
                  data: { ...d.data, edges: newEdges },
                  updatedAt: new Date(),
                }
              : d
          ),
        };
      });
    },
    deleteEdge: (edgeId) => {
      set((state) => {
        const diagram = state.diagrams.find(
          (d) => d.id === state.selectedDiagramId
        );
        if (!diagram) return state;
        const newEdges = (diagram.data.edges || []).filter(
          (edge) => edge.id !== edgeId
        );
        return {
          diagrams: state.diagrams.map((d) =>
            d.id === state.selectedDiagramId
              ? {
                  ...d,
                  data: { ...d.data, edges: newEdges },
                  updatedAt: new Date(),
                }
              : d
          ),
        };
      });
    },
    addNode: (node) => {
      set((state) => {
        const diagram = state.diagrams.find(
          (d) => d.id === state.selectedDiagramId
        );
        if (!diagram) return state;

        const updatedData = { ...diagram.data };
        if (node.type === "table") {
          updatedData.nodes = [...(diagram.data.nodes || []), node];
        } else if (node.type === "note") {
          updatedData.notes = [...(diagram.data.notes || []), node];
        } else if (node.type === "zone") {
          updatedData.zones = [...(diagram.data.zones || []), node];
        }

        return {
          diagrams: state.diagrams.map((d) =>
            d.id === state.selectedDiagramId
              ? { ...d, data: updatedData, updatedAt: new Date() }
              : d
          ),
        };
      });
    },
    undoDelete: () => {
      set((state) => {
        const diagram = state.diagrams.find(
          (d) => d.id === state.selectedDiagramId
        );
        if (!diagram) return state;

        const deletedNodes = (diagram.data.nodes || []).filter(
          (n) => n.data?.isDeleted === true && n.data?.deletedAt
        );

        if (deletedNodes.length === 0) return state;

        const lastDeletedNode = deletedNodes.reduce((latest, current) => {
          const latestTime = new Date(latest?.data?.deletedAt || "").getTime();
          const currentTime = new Date(
            current?.data?.deletedAt || ""
          ).getTime();
          return latestTime > currentTime ? latest : current;
        });

        console.log("restoring node:", lastDeletedNode);

        const newNodes = (diagram.data.nodes || []).map((n) => {
          if (n.id === lastDeletedNode.id) {
            return {
              ...n,
              data: {
                ...n.data,
                isDeleted: false,
                deletedAt: undefined as unknown as Date, // Clear the deletion timestamp
              },
            };
          }
          return n;
        });

        return {
          diagrams: state.diagrams.map((d) =>
            d.id === state.selectedDiagramId
              ? {
                  ...d,
                  data: {
                    ...d.data,
                    nodes: newNodes,
                  },
                  updatedAt: new Date(),
                }
              : d
          ),
        };
      });
    },

    batchUpdateNodes: (nodesToUpdate) => {
      set((state) => {
        const diagram = state.diagrams.find(
          (d) => d.id === state.selectedDiagramId
        );
        if (!diagram) return state;
        const nodeMap = new Map(nodesToUpdate.map((n) => [n.id, n]));
        const newNodes = (diagram.data.nodes || []).map(
          (n) => nodeMap.get(n.id) || n
        );
        return {
          diagrams: state.diagrams.map((d) =>
            d.id === state.selectedDiagramId
              ? {
                  ...d,
                  data: { ...d.data, nodes: newNodes },
                  updatedAt: new Date(),
                }
              : d
          ),
        };
      });
    },
  }))
);

useStore.subscribe(
  (state) => ({
    diagrams: state.diagrams,
    selectedDiagramId: state.selectedDiagramId,
    isLoading: state.isLoading,
  }),
  (state) => {
    if (!state.isLoading) {
      debouncedSave(state.diagrams, state.selectedDiagramId);
    }
  },
  { equalityFn: shallow }
);
