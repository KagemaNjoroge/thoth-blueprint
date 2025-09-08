import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import ColorPickerComponent, { themes, type Color } from 'react-pick-color';
import { useTheme } from "next-themes";
import { useDebouncedCallback } from "use-debounce";

interface ColorPickerProps {
  color: string;
  onColorChange: (color: string) => void;
  disabled?: boolean;
}

export function ColorPicker({ color, onColorChange, disabled }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentColor, setCurrentColor] = useState(color);
  const { resolvedTheme } = useTheme();

  // Update internal state if the prop changes from outside
  useEffect(() => {
    setCurrentColor(color);
  }, [color]);

  // Debounce the callback that updates the parent component's state to improve performance
  const debouncedOnColorChange = useDebouncedCallback((newColor: string) => {
    onColorChange(newColor);
  }, 200);

  const handleColorChange = (color: Color) => {
    // Update local state immediately for a responsive UI
    setCurrentColor(color.hex);
    // Call the debounced function to update the diagram state
    debouncedOnColorChange(color.hex);
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
          theme={resolvedTheme === 'dark' ? themes.dark : themes.light}
          hideAlpha={true}
        />
      </PopoverContent>
    </Popover>
  );
}