import React from "react";
import type { RGB } from "../../context/SettingsContext";

interface RGBColorPickerProps {
  title: string;
  color: RGB;
  onChange: (newColor: RGB) => void;
  disabled?: boolean;
}

export const RGBColorPicker: React.FC<RGBColorPickerProps> = ({
  title,
  color,
  onChange,
  disabled = false,
}) => {
  const handleSliderChange = (channel: keyof RGB, value: string) => {
    if (disabled) return;
    onChange({ ...color, [channel]: parseFloat(value) });
  };

  const colorString = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;

  return (
    <div className="flex flex-col gap-1 w-fit mt-2">
      <h3 className="font-bold text-sm md:text-base tracking-widest uppercase mb-1">
        {title}
      </h3>
      <div className="flex gap-4 items-center">
        <div
          className="w-16 h-16 shrink-0 border border-white/20"
          style={{ backgroundColor: colorString }}
        />

        <div
          className={`flex flex-col justify-between h-16 w-48 transition-opacity ${disabled ? "opacity-40 pointer-events-none" : ""}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-red-500 font-bold uppercase w-3">R</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={color.r}
              onChange={(e) => handleSliderChange("r", e.target.value)}
              disabled={disabled}
              className="flex-1 accent-red-500 h-2 bg-red-950 rounded-full appearance-none outline-none cursor-pointer disabled:cursor-not-allowed"
            />
            <span className="text-sm w-8 text-right shrink-0">
              {color.r.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-green-500 font-bold uppercase w-3">G</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={color.g}
              onChange={(e) => handleSliderChange("g", e.target.value)}
              disabled={disabled}
              className="flex-1 accent-green-500 h-2 bg-green-950 rounded-full appearance-none outline-none cursor-pointer disabled:cursor-not-allowed"
            />
            <span className="text-sm w-8 text-right shrink-0">
              {color.g.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-blue-500 font-bold uppercase w-3">B</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={color.b}
              onChange={(e) => handleSliderChange("b", e.target.value)}
              disabled={disabled}
              className="flex-1 accent-blue-500 h-2 bg-blue-950 rounded-full appearance-none outline-none cursor-pointer disabled:cursor-not-allowed"
            />
            <span className="text-sm w-8 text-right shrink-0">
              {color.b.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
