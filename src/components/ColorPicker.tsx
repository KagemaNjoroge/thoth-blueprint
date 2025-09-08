import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { SketchPicker, type ColorResult } from 'react-color';

interface ColorPickerProps {
  color: string;
  onColorChange: (color: string) => void;
  disabled?: boolean;
}

export function ColorPicker({ color, onColorChange, disabled }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleColorChange = (colorResult: ColorResult) => {
    onColorChange(colorResult.hex);
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
          color={color}
          onChangeComplete={handleColorChange}
        />
      </PopoverContent>
    </Popover>
  );
}