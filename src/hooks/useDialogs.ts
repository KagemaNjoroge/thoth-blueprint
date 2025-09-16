import { useState } from "react";

export function useDialogs() {
  const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isAddNoteDialogOpen, setIsAddNoteDialogOpen] = useState(false);
  const [isAddZoneDialogOpen, setIsAddZoneDialogOpen] = useState(false);

  return {
    isAddTableDialogOpen,
    setIsAddTableDialogOpen,
    isExportDialogOpen,
    setIsExportDialogOpen,
    isUpdateDialogOpen,
    setIsUpdateDialogOpen,
    isAddNoteDialogOpen,
    setIsAddNoteDialogOpen,
    isAddZoneDialogOpen,
    setIsAddZoneDialogOpen,
  };
}
