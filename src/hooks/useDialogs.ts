import { useState } from "react";

export function useDialogs() {
  const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  return {
    isAddTableDialogOpen,
    setIsAddTableDialogOpen,
    isExportDialogOpen,
    setIsExportDialogOpen,
    isUpdateDialogOpen,
    setIsUpdateDialogOpen,
  };
}
