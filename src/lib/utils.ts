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
