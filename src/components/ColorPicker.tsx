import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { tableColors } from "@/lib/colors";
import { useState } from "react";

interface ColorPickerProps {
  color: string;
  onColorChange: (color: string) => void;
  disabled?: boolean;
}

export function ColorPicker({ color, onColorChange, disabled }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleColorSelect = (newColor: string) => {
    onColorChange(newColor);
    setIsOpen(false);
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
      <PopoverContent className="w-64 p-2">
        <div className="grid grid-cols-10 gap-1">
          {tableColors.map((c) => (
            <button
              key={c}
              className="h-5 w-5 rounded-full border transition-transform hover:scale-110"
              style={{ backgroundColor: c }}
              onClick={() => handleColorSelect(c)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}