import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Link, Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisAppProvider, Frame } from "@shopify/polaris";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisEn from "@shopify/polaris/locales/en.json";
import polarisEs from "@shopify/polaris/locales/es.json";
import polarisIt from "@shopify/polaris/locales/it.json";
import polarisDe from "@shopify/polaris/locales/de.json";
import polarisFr from "@shopify/polaris/locales/fr.json";

import { authenticate } from "../shopify.server";
import db from "../db.server";
import FooterHelpBar from "../components/FooterHelpBar";
import { getTranslations } from "../utils/i18n";

const POLARIS_LOCALES: Record<string, object> = {
  en: polarisEn,
  es: polarisEs,
  it: polarisIt,
  de: polarisDe,
  fr: polarisFr,
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const rawSettings = await db.settings.findUnique({ where: { shop: session.shop } });
  const language = (rawSettings as unknown as { language?: string })?.language ?? "auto";

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "", language };
};

export default function App() {
  const { apiKey, language } = useLoaderData<typeof loader>();
  const t = getTranslations(language);
  const effectiveLang = language === "auto" ? "en" : language;
  const polarisTranslations = POLARIS_LOCALES[effectiveLang] ?? POLARIS_LOCALES.en;

  return (
    <ShopifyAppProvider embedded apiKey={apiKey}>
      <PolarisAppProvider i18n={polarisTranslations}>
        <NavMenu>
          <Link to="/app" rel="home">
            {t.nav.home} - Terms &amp; ...
          </Link>
          <Link to="/app/analytics">{t.nav.analytics}</Link>
          <Link to="/app/settings">{t.nav.settings}</Link>
          <Link to="/app/billing">{t.nav.billing}</Link>
          <Link to="/app/support">{t.nav.support}</Link>
        </NavMenu>
        <Frame>
          <Outlet />
          <FooterHelpBar />
        </Frame>
      </PolarisAppProvider>
    </ShopifyAppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
