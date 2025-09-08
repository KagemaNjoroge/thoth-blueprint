import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { SketchPicker, type ColorResult } from 'react-color';
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

  const handleColorChange = (colorResult: ColorResult) => {
    // Update local state immediately for a responsive UI
    setCurrentColor(colorResult.hex);
    // Call the debounced function to update the diagram state
    debouncedOnColorChange(colorResult.hex);
  };

  // Custom styles for the picker to support dark mode using app's theme
  const pickerStyles = {
    default: {
      picker: {
        background: resolvedTheme === 'dark' ? '#141414' : '#ffffff',
        border: '1px solid',
        borderColor: resolvedTheme === 'dark' ? '#262626' : '#e2e8f0',
        boxShadow: 'none',
        fontFamily: 'inherit',
      },
      // This targets the input fields (Hex, R, G, B, A)
      "input": {
        background: resolvedTheme === 'dark' ? '#262626' : '#ffffff',
        color: resolvedTheme === 'dark' ? '#f8fafc' : '#0f172a',
        boxShadow: `inset 0 0 0 1px ${resolvedTheme === 'dark' ? '#4d4d4d' : '#cbd5e1'}`,
        height: '24px',
        padding: '4px',
      },
      // This targets the labels for the input fields
      "label": {
        color: resolvedTheme === 'dark' ? '#f8fafc' : '#64748b',
        fontSize: '12px',
      }
    },
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
        <SketchPicker
          color={currentColor}
          onChange={handleColorChange}
          styles={pickerStyles}
        />
      </PopoverContent>
    </Popover>
  );
}