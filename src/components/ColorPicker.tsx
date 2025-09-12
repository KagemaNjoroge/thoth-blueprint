import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import ColorPickerComponent, { themes, type Color, type ColorObject } from "react-pick-color";
import { useTheme } from "next-themes";
import { useDebouncedCallback } from "use-debounce";

interface ColorPickerProps {
  color: string;
  onColorChange: (color: string) => void;
  disabled?: boolean;
}

export function ColorPicker({
  color,
  onColorChange,
  disabled,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentColor, setCurrentColor] = useState(color);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setCurrentColor(color);
  }, [color]);

  // Debounce the callback that updates the parent component's state to improve performance
  const debouncedOnColorChange = useDebouncedCallback((newColor: string) => {
    onColorChange(newColor);
  }, 20);

  const handleColorChange = (color: ColorObject) => {
    let colorValue: string;

    if (typeof color === "string") {
      colorValue = color;
    } else if (typeof color === "object" && color !== null && "hex" in color) {
      colorValue = (color as { hex: string }).hex;
    } else if (
      typeof color === "object" &&
      color !== null &&
      "r" in color &&
      "g" in color &&
      "b" in color
    ) {
      const rgbColor = color as { r: number; g: number; b: number };
      const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
      colorValue = `#${toHex(rgbColor.r)}${toHex(rgbColor.g)}${toHex(
        rgbColor.b
      )}`;
    } else {
      colorValue = currentColor;
    }
    setCurrentColor(colorValue);
    debouncedOnColorChange(colorValue);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button variant="outline" className="w-full justify-start text-left">
          <div className="flex items-center gap-2">
            <div
              className="h-4 w-4 rounded-full border"
              style={{ backgroundColor: color }}
            />
            <span className="truncate flex-1">Color</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-none">
        <ColorPickerComponent
          color={currentColor}
          onChange={handleColorChange}
          theme={resolvedTheme === "dark" ? themes.dark : themes.light}
          hideAlpha={true}
        />
      </PopoverContent>
    </Popover>
  );
}
