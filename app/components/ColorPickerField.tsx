import { useState } from "react";
import {
  Box,
  ColorPicker,
  Popover,
  TextField,
  hexToRgb,
  hsbToHex,
  rgbToHsb,
} from "@shopify/polaris";
import type { HSBAColor } from "@shopify/polaris";

interface ColorPickerFieldProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

function safeHexToHsb(hex: string): HSBAColor {
  try {
    const rgb = hexToRgb(hex);
    return { ...rgbToHsb(rgb), alpha: 1 };
  } catch {
    return { hue: 0, saturation: 0, brightness: 0, alpha: 1 };
  }
}

export default function ColorPickerField({ label, value, onChange }: ColorPickerFieldProps) {
  const [active, setActive] = useState(false);

  return (
    <TextField
      label={label}
      value={value}
      onChange={(next) => onChange(next)}
      autoComplete="off"
      connectedLeft={
        <Popover
          active={active}
          onClose={() => setActive(false)}
          activator={
            <button
              type="button"
              aria-label={`${label} swatch`}
              onClick={() => setActive((prev) => !prev)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                border: "1px solid var(--p-color-border)",
                backgroundColor: value,
                cursor: "pointer",
                padding: 0,
              }}
            />
          }
        >
          <Box padding="300">
            <ColorPicker
              color={safeHexToHsb(value)}
              onChange={(color) => onChange(hsbToHex(color))}
            />
          </Box>
        </Popover>
      }
    />
  );
}
