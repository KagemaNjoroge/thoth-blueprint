import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { usePWA } from "@/hooks/usePWA";
import { exportDbToJson } from "@/lib/backup";
import { type Diagram } from "@/lib/types";
import { useTheme } from "next-themes";

interface EditorMenubarProps {
  diagram: Diagram;
  onAddTable: () => void;
  onDeleteDiagram: () => void;
  onBackToGallery: () => void;
  onUndoDelete: () => void;
  onSetSidebarState: (state: "docked" | "hidden") => void;
  onExport: () => void;
  onCheckForUpdate: () => void;
  onInstallAppRequest: () => void;
  isLocked: boolean;
}

export default function EditorMenubar({
  diagram,
  onAddTable,
  onDeleteDiagram,
  onBackToGallery,
  onUndoDelete,
  onSetSidebarState,
  onExport,
  onCheckForUpdate,
  onInstallAppRequest,
  isLocked,
}: EditorMenubarProps) {
  const { setTheme } = useTheme();
  const { isInstalled } = usePWA();

  const handleHideSidebar = () => {
    onSetSidebarState("hidden");
  };

  return (
    <Menubar className="rounded-none border-none bg-transparent">
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={onBackToGallery}>
            Back to Gallery
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={onExport}>Export Diagram</MenubarItem>
          <MenubarItem onClick={exportDbToJson}>Save Data</MenubarItem>
          <MenubarSeparator />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <MenubarItem
                onSelect={(e) => e.preventDefault()}
                className="text-destructive focus:text-destructive"
                disabled={isLocked}
              >
                Delete Diagram
              </MenubarItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will move the "{diagram.name}" diagram to the trash. You can restore it later from the gallery.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDeleteDiagram}>Move to Trash</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={onUndoDelete} disabled={isLocked}>
            Undo Delete Table <MenubarShortcut>⌘Z</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={onAddTable} disabled={isLocked}>
            Add Table <MenubarShortcut>⌘A</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={handleHideSidebar}>
            Hide Sidebar
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Settings</MenubarTrigger>
        <MenubarContent>
          <MenubarSub>
            <MenubarSubTrigger>Theme</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem onClick={() => setTheme("light")}>
                Light
              </MenubarItem>
              <MenubarItem onClick={() => setTheme("dark")}>
                Dark
              </MenubarItem>
              <MenubarItem onClick={() => setTheme("system")}>
                System
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Help</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={onCheckForUpdate}>
            Check for Updates
          </MenubarItem>
          {!isInstalled && (
            <MenubarItem onClick={onInstallAppRequest}>
              Install App
            </MenubarItem>
          )}
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}