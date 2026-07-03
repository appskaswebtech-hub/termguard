import { Box, InlineStack, Link, Text } from "@shopify/polaris";
import { useT } from "../utils/i18n";

const SUPPORT_EMAIL = "apps.kaswebtech@gmail.com";

export default function FooterHelpBar() {
  const t = useT();

  return (
    <Box padding="400" background="bg-surface-secondary">
      <InlineStack align="center">
        <Text as="span" tone="subdued">
          {t.footer.needHelp}{" "}
          <Link url={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Link>
        </Text>
      </InlineStack>
    </Box>
  );
}
