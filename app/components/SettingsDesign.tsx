import {
  BlockStack,
  Card,
  Checkbox,
  InlineGrid,
  RadioButton,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import ColorPickerField from "./ColorPickerField";
import {
  CHECKBOX_STYLE_OPTIONS,
  FONT_FAMILY_OPTIONS,
  type SettingsState,
} from "../utils/settings-types";

interface SettingsDesignProps {
  settings: SettingsState;
  onChange: (patch: Partial<SettingsState>) => void;
}

export default function SettingsDesign({ settings, onChange }: SettingsDesignProps) {
  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">
            Styling options
          </Text>
          <InlineGrid columns={2} gap="300">
            <ColorPickerField
              label="Text color"
              value={settings.textColor}
              onChange={(value) => onChange({ textColor: value })}
            />
            <TextField
              label="Font size"
              type="number"
              suffix="Px"
              value={String(settings.fontSize)}
              onChange={(value) => onChange({ fontSize: Number(value) || 0 })}
              autoComplete="off"
            />
            <Select
              label="Font family"
              options={FONT_FAMILY_OPTIONS}
              value={settings.fontFamily}
              onChange={(value) => onChange({ fontFamily: value })}
            />
            <Select
              label="Alignment"
              options={["Left", "Center", "Right"]}
              value={settings.alignment}
              onChange={(value) => onChange({ alignment: value as SettingsState["alignment"] })}
            />
            <ColorPickerField
              label="Helper text color"
              value={settings.helperTextColor}
              onChange={(value) => onChange({ helperTextColor: value })}
            />
            <TextField
              label="Helper font size"
              type="number"
              suffix="Px"
              value={String(settings.helperFontSize)}
              onChange={(value) => onChange({ helperFontSize: Number(value) || 0 })}
              autoComplete="off"
            />
          </InlineGrid>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">
            T&amp;C spacing (px)
          </Text>
          <InlineGrid columns={4} gap="300">
            <TextField
              label="Top"
              type="number"
              value={String(settings.spacingTop)}
              onChange={(value) => onChange({ spacingTop: Number(value) || 0 })}
              autoComplete="off"
            />
            <TextField
              label="Right"
              type="number"
              value={String(settings.spacingRight)}
              onChange={(value) => onChange({ spacingRight: Number(value) || 0 })}
              autoComplete="off"
            />
            <TextField
              label="Bottom"
              type="number"
              value={String(settings.spacingBottom)}
              onChange={(value) => onChange({ spacingBottom: Number(value) || 0 })}
              autoComplete="off"
            />
            <TextField
              label="Left"
              type="number"
              value={String(settings.spacingLeft)}
              onChange={(value) => onChange({ spacingLeft: Number(value) || 0 })}
              autoComplete="off"
            />
          </InlineGrid>
        </BlockStack>
      </Card>

      <Card>
        <Checkbox
          label="Checks by default"
          checked={settings.checksByDefault}
          onChange={(value) => onChange({ checksByDefault: value })}
        />
      </Card>

      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">
            Customize checkbox
          </Text>
          <BlockStack gap="200">
            {CHECKBOX_STYLE_OPTIONS.map((option) => (
              <RadioButton
                key={option.value}
                label={option.label}
                checked={settings.checkboxStyle === option.value}
                name="checkboxStyle"
                onChange={() => onChange({ checkboxStyle: option.value })}
              />
            ))}
          </BlockStack>
          <InlineGrid columns={2} gap="300">
            <ColorPickerField
              label="Unchecked color"
              value={settings.uncheckedColor}
              onChange={(value) => onChange({ uncheckedColor: value })}
            />
            <ColorPickerField
              label="Checked color"
              value={settings.checkedColor}
              onChange={(value) => onChange({ checkedColor: value })}
            />
          </InlineGrid>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">
            Link settings
          </Text>
          <ColorPickerField
            label="Link color"
            value={settings.linkColor}
            onChange={(value) => onChange({ linkColor: value })}
          />
          <Checkbox
            label="Show link underline"
            checked={settings.showLinkUnderline}
            onChange={(value) => onChange({ showLinkUnderline: value })}
          />
          <Checkbox
            label="Open links in new tab"
            checked={settings.openLinksNewTab}
            onChange={(value) => onChange({ openLinksNewTab: value })}
          />
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="300">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">
              Alert popup styling
            </Text>
            <Text as="span" tone="subdued">
              Customize the colors of the alert popup shown when terms are
              not accepted.
            </Text>
          </BlockStack>
          <InlineGrid columns={2} gap="300">
            <ColorPickerField
              label="Title color"
              value={settings.popupTitleColor}
              onChange={(value) => onChange({ popupTitleColor: value })}
            />
            <ColorPickerField
              label="Message color"
              value={settings.popupMessageColor}
              onChange={(value) => onChange({ popupMessageColor: value })}
            />
            <ColorPickerField
              label="Button text color"
              value={settings.popupBtnTextColor}
              onChange={(value) => onChange({ popupBtnTextColor: value })}
            />
            <ColorPickerField
              label="Button background"
              value={settings.popupBtnBgColor}
              onChange={(value) => onChange({ popupBtnBgColor: value })}
            />
            <ColorPickerField
              label="Popup background"
              value={settings.popupBgColor}
              onChange={(value) => onChange({ popupBgColor: value })}
            />
            <ColorPickerField
              label="Icon color"
              value={settings.popupIconColor}
              onChange={(value) => onChange({ popupIconColor: value })}
            />
          </InlineGrid>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
