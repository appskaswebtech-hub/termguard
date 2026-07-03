import { BlockStack, Card, Text, TextField } from "@shopify/polaris";
import type { SettingsState } from "../utils/settings-types";

interface SettingsDeveloperProps {
  settings: SettingsState;
  onChange: (patch: Partial<SettingsState>) => void;
}

export default function SettingsDeveloper({ settings, onChange }: SettingsDeveloperProps) {
  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          Developer options
        </Text>
        <TextField
          label="Custom CSS"
          value={settings.customCss}
          onChange={(value) => onChange({ customCss: value })}
          autoComplete="off"
          multiline={8}
          placeholder="/* Add custom styles for checkbox, links, spacing, etc. */"
        />
        <TextField
          label="Custom script"
          value={settings.customScript}
          onChange={(value) => onChange({ customScript: value })}
          autoComplete="off"
          multiline={8}
          placeholder="// Add custom script if needed"
        />
      </BlockStack>
    </Card>
  );
}
