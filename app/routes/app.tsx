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
import { syncPlan } from "../utils/plan.server";
import { hasInstagramFeature, hasTermsFeature } from "../utils/plans";

const POLARIS_LOCALES: Record<string, object> = {
  en: polarisEn,
  es: polarisEs,
  it: polarisIt,
  de: polarisDe,
  fr: polarisFr,
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin, redirect } = await authenticate.admin(request);
  const rawSettings = await db.settings.findUnique({ where: { shop: session.shop } });
  const language = (rawSettings as unknown as { language?: string })?.language ?? "auto";

  // Free is for development stores only: a live store needs a paid plan, so every
  // page except Billing sends it there. Re-check with Shopify first (when not
  // already Pro) so a just-approved subscription or plan change isn't bounced back.
  const pathname = new URL(request.url).pathname;
  const onBilling = pathname.startsWith("/app/billing");
  let plan = rawSettings?.plan ?? "free";
  if (plan !== "pro") {
    plan = await syncPlan(admin, session.shop).then((r) => r.plan).catch(() => plan);
  }
  if (!onBilling) {
    if (!hasInstagramFeature(plan)) throw redirect("/app/billing");
    // Instagram plan: no terms checkbox, so its Settings/Analytics/Home don't apply.
    if (!hasTermsFeature(plan)) {
      if (pathname.startsWith("/app/settings") || pathname.startsWith("/app/analytics")) throw redirect("/app/billing");
      if (pathname === "/app" || pathname === "/app/") throw redirect("/app/instagram");
    }
  }

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "", language, hasTerms: hasTermsFeature(plan) };
};

export default function App() {
  const { apiKey, language, hasTerms } = useLoaderData<typeof loader>();
  const t = getTranslations(language);
  const effectiveLang = language === "auto" ? "en" : language;
  const polarisTranslations = POLARIS_LOCALES[effectiveLang] ?? POLARIS_LOCALES.en;

  return (
    <ShopifyAppProvider embedded apiKey={apiKey}>
      <PolarisAppProvider i18n={polarisTranslations}>
        <NavMenu>
          <Link to="/app" rel="home">
            {t.nav.home}
          </Link>
          {hasTerms && <Link to="/app/analytics">{t.nav.analytics}</Link>}
          <Link to="/app/instagram">{t.nav.instagram}</Link>
          {hasTerms && <Link to="/app/settings">{t.nav.settings}</Link>}
          <Link to="/app/billing">{t.nav.billing}</Link>
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
