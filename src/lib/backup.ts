import { showError, showSuccess } from "@/utils/toast";
import { saveAs } from "file-saver";
import { db } from "./db";
import { type Diagram } from "./types";

export async function exportDbToJson() {
  try {
    const diagrams = await db.diagrams.toArray();
    const appState = await db.appState.toArray();

    const backupData = {
      diagrams,
      appState,
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;

    saveAs(blob, `thoth_backup_${timestamp}.thot`);
    showSuccess("Project data saved successfully!");
  } catch (error) {
    console.error("Failed to save project data:", error);
    showError("Failed to save project data.");
  }
}

export async function importJsonToDb(jsonString: string) {
  try {
    const backupData = JSON.parse(jsonString);

    if (!backupData.diagrams || !Array.isArray(backupData.diagrams)) {
      throw new Error('Invalid save file format. Missing "diagrams" array.');
    }

    await db.transaction("rw", db.diagrams, db.appState, async () => {
      // Clear existing data
      await db.diagrams.clear();
      await db.appState.clear();

      // Add new data
      const diagramsToPut = backupData.diagrams.map((d: Diagram) => {
        // Dates might be strings after JSON serialization, so convert them back
        if (d.createdAt) d.createdAt = new Date(d.createdAt);
        if (d.updatedAt) d.updatedAt = new Date(d.updatedAt);
        if (d.deletedAt) d.deletedAt = new Date(d.deletedAt);
        return d;
      });
      await db.diagrams.bulkPut(diagramsToPut);

      if (backupData.appState && Array.isArray(backupData.appState)) {
        await db.appState.bulkPut(backupData.appState);
      }
    });

    showSuccess("Save loaded successfully! The page will now reload.");

    // Reload the page to reflect the new state
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    console.error("Failed to load save:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    showError(`Failed to load save: ${errorMessage}`);
  }
}
