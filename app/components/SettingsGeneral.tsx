import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import {
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  Collapsible,
  InlineStack,
  RadioButton,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { ChevronDownIcon, ChevronUpIcon, DeleteIcon } from "@shopify/polaris-icons";
import type { LinkItem, SettingsState } from "../utils/settings-types";
import { useT } from "../utils/i18n";

interface SettingsGeneralProps {
  settings: SettingsState;
  onChange: (patch: Partial<SettingsState>) => void;
  plan?: string;
}

export default function SettingsGeneral({ settings, onChange, plan }: SettingsGeneralProps) {
  const t = useT();
  const isPro = plan === "pro";
  const [openLinkId, setOpenLinkId] = useState<string | null>(null);
  const syncFetcher = useFetcher<{ links: LinkItem[] }>();

  useEffect(() => {
    if (syncFetcher.data?.links) {
      const fetched = syncFetcher.data.links;
      onChange({
        links: settings.links.some((l) => fetched.some((f) => f.id === l.id))
          ? settings.links.map((link) => fetched.find((f) => f.id === link.id) || link)
          : [...fetched, ...settings.links],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncFetcher.data]);

  const handleSyncPolicies = () => {
    syncFetcher.submit({}, { method: "POST", action: "/app/sync-policies" });
  };

  const updateLink = (id: string, patch: Partial<SettingsState["links"][number]>) => {
    onChange({ links: settings.links.map((link) => (link.id === id ? { ...link, ...patch } : link)) });
  };

  const removeLink = (id: string) => {
    onChange({ links: settings.links.filter((link) => link.id !== id) });
  };

  const addLink = () => {
    const nextNumber = settings.links.length + 1;
    const id = nextNumber === 1 ? "link" : `link-${nextNumber}`;
    onChange({ links: [...settings.links, { id, label: "", url: "" }] });
  };

  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">{t.settings.agreementTitle}</Text>
          <TextField
            label={t.settings.agreementLabel}
            value={settings.agreementText}
            onChange={(value) => onChange({ agreementText: value })}
            autoComplete="off"
            helpText={t.settings.agreementHelp}
          />
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="300">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingMd">{t.settings.linksTitle}</Text>
            <Button onClick={handleSyncPolicies} loading={syncFetcher.state !== "idle"}>
              {t.settings.syncPolicies}
            </Button>
          </InlineStack>
          <Text as="span" tone="subdued">{t.settings.syncPoliciesHelp}</Text>
          <BlockStack gap="200">
            {settings.links.map((link) => {
              const isOpen = openLinkId === link.id;
              return (
                <Box key={link.id} borderWidth="025" borderColor="border" borderRadius="200">
                  <Box padding="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <Button
                        variant="tertiary"
                        icon={isOpen ? ChevronUpIcon : ChevronDownIcon}
                        onClick={() => setOpenLinkId(isOpen ? null : link.id)}
                      >
                        {`{${link.id}}`}
                      </Button>
                      <Button
                        variant="tertiary"
                        tone="critical"
                        icon={DeleteIcon}
                        accessibilityLabel="Delete link"
                        onClick={() => removeLink(link.id)}
                      />
                    </InlineStack>
                    <Collapsible open={isOpen} id={`link-${link.id}`}>
                      <Box paddingBlockStart="300">
                        <BlockStack gap="300">
                          <TextField
                            label={t.settings.linkText}
                            value={link.label}
                            onChange={(value) => updateLink(link.id, { label: value })}
                            autoComplete="off"
                            placeholder="terms and conditions"
                          />
                          <TextField
                            label={t.settings.linkUrl}
                            value={link.url}
                            onChange={(value) => updateLink(link.id, { url: value })}
                            autoComplete="off"
                            placeholder="/policies/terms-of-service"
                          />
                          <Text as="span" tone="subdued">
                            Placeholder: {`{${link.id}}`}
                          </Text>
                        </BlockStack>
                      </Box>
                    </Collapsible>
                  </Box>
                </Box>
              );
            })}
          </BlockStack>
          <Box>
            <Button onClick={addLink}>{t.settings.addLink}</Button>
          </Box>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">{t.settings.behaviorTitle}</Text>
          <Checkbox
            label={t.settings.requireAcceptance}
            checked={settings.requireAcceptance}
            onChange={(value) => onChange({ requireAcceptance: value })}
          />
          <TextField
            label={t.settings.helperText}
            value={settings.helperText}
            onChange={(value) => onChange({ helperText: value })}
            autoComplete="off"
          />
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="300">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">{t.settings.errorTitle}</Text>
            <Text as="span" tone="subdued">{t.settings.errorDesc}</Text>
          </BlockStack>
          <TextField
            label={t.settings.errorMessage}
            value={settings.errorMessage}
            onChange={(value) => onChange({ errorMessage: value })}
            autoComplete="off"
            multiline={2}
            disabled={!isPro}
            helpText={!isPro ? t.settings.errorLocked : undefined}
          />
          <BlockStack gap="200">
            <RadioButton
              label={t.settings.inline}
              helpText={t.settings.inlineHelp}
              checked={settings.errorDisplayType === "inline"}
              name="errorDisplayType"
              onChange={() => onChange({ errorDisplayType: "inline" })}
            />
            <RadioButton
              label={t.settings.popup}
              helpText={t.settings.popupHelp}
              checked={settings.errorDisplayType === "popup"}
              name="errorDisplayType"
              onChange={() => onChange({ errorDisplayType: "popup" })}
            />
          </BlockStack>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="300">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">{t.settings.locationTitle}</Text>
            <Text as="span" tone="subdued">{t.settings.locationDesc}</Text>
          </BlockStack>
          <Checkbox
            label={t.settings.cart}
            helpText={t.settings.cartHelp}
            checked={settings.locationCart}
            onChange={(value) => onChange({ locationCart: value })}
          />
          <Checkbox
            label={t.settings.product}
            helpText={t.settings.productHelp}
            checked={settings.locationProduct}
            onChange={(value) => onChange({ locationProduct: value })}
          />
          <Checkbox
            label={t.settings.collection}
            helpText={t.settings.collectionHelp}
            checked={settings.locationCollection}
            onChange={(value) => onChange({ locationCollection: value })}
          />
          <Checkbox
            label={t.settings.allCheckout}
            helpText={t.settings.allCheckoutHelp}
            checked={settings.locationAllCheckout}
            onChange={(value) => onChange({ locationAllCheckout: value })}
          />
          <Checkbox
            label={t.settings.custom}
            helpText={t.settings.customHelp}
            checked={settings.locationCustom}
            onChange={(value) => onChange({ locationCustom: value })}
          />
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="300">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">{t.settings.languageTitle}</Text>
            <Text as="span" tone="subdued">{t.settings.languageDesc}</Text>
          </BlockStack>
          <Select
            label={t.settings.languageLabel}
            options={[...t.settings.languageOptions]}
            value={settings.language || "auto"}
            onChange={(value) => onChange({ language: value })}
          />
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
