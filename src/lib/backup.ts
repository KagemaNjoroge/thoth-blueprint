import { db } from './db';
import { saveAs } from 'file-saver';
import { showSuccess, showError } from '@/utils/toast';

export async function exportDbToJson() {
  try {
    const diagrams = await db.diagrams.toArray();
    const appState = await db.appState.toArray();

    const backupData = {
      diagrams,
      appState,
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    saveAs(blob, `thothblueprint_backup_${timestamp}.json`);
    showSuccess('Project saved successfully!');
  } catch (error) {
    console.error('Failed to save project:', error);
    showError('Failed to save project.');
  }
}

export async function importJsonToDb(jsonString: string) {
  try {
    const backupData = JSON.parse(jsonString);

    if (!backupData.diagrams || !Array.isArray(backupData.diagrams)) {
      throw new Error('Invalid backup file format. Missing "diagrams" array.');
    }

    await db.transaction('rw', db.diagrams, db.appState, async () => {
      // Clear existing data
      await db.diagrams.clear();
      await db.appState.clear();

      // Add new data
      const diagramsToPut = backupData.diagrams.map((d: any) => {
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

    showSuccess('Project loaded successfully! The page will now reload.');
    
    // Reload the page to reflect the new state
    setTimeout(() => {
      window.location.reload();
    }, 1500);

  } catch (error) {
    console.error('Failed to load project:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    showError(`Failed to load project: ${errorMessage}`);
  }
}