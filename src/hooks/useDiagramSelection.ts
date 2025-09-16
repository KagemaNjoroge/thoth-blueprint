import { db } from "@/lib/db";
import { useEffect, useState } from "react";

export function useDiagramSelection() {
  const [selectedDiagramId, setSelectedDiagramId] = useState<number | null>(null);

  // Load selected diagram ID on mount
  useEffect(() => {
    const loadSelectedDiagram = async () => {
      try {
        const state = await db.appState.get('selectedDiagramId');
        if (state && typeof state.value === 'number') {
          const diagramExists = await db.diagrams.get(state.value);
          if (diagramExists && !diagramExists.deletedAt) {
            setSelectedDiagramId(state.value);
          } else {
            await db.appState.delete('selectedDiagramId');
          }
        }
      } catch (error) {
        console.error("Failed to load selected diagram:", error);
      }
    };
    loadSelectedDiagram();
  }, []);

  // Save selected diagram ID when it changes
  useEffect(() => {
    const saveSelectedDiagram = async () => {
      try {
        if (selectedDiagramId !== null) {
          await db.appState.put({ key: 'selectedDiagramId', value: selectedDiagramId });
        } else {
          const state = await db.appState.get('selectedDiagramId');
          if (state) {
            await db.appState.delete('selectedDiagramId');
          }
        }
      } catch (error) {
        console.error("Failed to save selected diagram:", error);
      }
    };
    saveSelectedDiagram();
  }, [selectedDiagramId]);

  return { selectedDiagramId, setSelectedDiagramId };
}