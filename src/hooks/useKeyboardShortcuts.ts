import { useEffect } from "react";

export function useKeyboardShortcuts(
  selectedDiagramId: number | null,
  isAddTableDialogOpen: boolean,
  handleAddTable: () => void
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (selectedDiagramId) {
        const target = event.target as HTMLElement;
        if (
          ["INPUT", "TEXTAREA"].includes(target.tagName) ||
          target.isContentEditable
        ) {
          return;
        }

        if (
          (event.ctrlKey || event.metaKey) &&
          (event.key === "n" || event.key === "a")
        ) {
          event.preventDefault();
          if (!isAddTableDialogOpen) {
            handleAddTable();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDiagramId, isAddTableDialogOpen, handleAddTable]);
}
