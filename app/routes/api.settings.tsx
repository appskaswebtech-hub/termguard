import type { LoaderFunctionArgs } from "react-router";
import db from "../db.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const FREE_PLAN_LIMIT = 10;

const DEFAULT_TEXTS: Record<string, { agreementText: string; errorMessage: string; helperText: string }> = {
  en: {
    agreementText: "I have read and agreed with the {link} and {link-2}",
    errorMessage: "You must accept the terms and conditions to continue.",
    helperText: "Required to complete checkout.",
  },
  es: {
    agreementText: "He leído y acepto los {link} y la {link-2}",
    errorMessage: "Debes aceptar los términos y condiciones para continuar.",
    helperText: "Requerido para completar el pago.",
  },
  it: {
    agreementText: "Ho letto e accettato i {link} e la {link-2}",
    errorMessage: "Devi accettare i termini e le condizioni per continuare.",
    helperText: "Obbligatorio per completare il checkout.",
  },
  de: {
    agreementText: "Ich habe die {link} und die {link-2} gelesen und stimme zu",
    errorMessage: "Sie müssen die Allgemeinen Geschäftsbedingungen akzeptieren.",
    helperText: "Erforderlich, um den Checkout abzuschließen.",
  },
  fr: {
    agreementText: "J'ai lu et accepté les {link} et la {link-2}",
    errorMessage: "Vous devez accepter les conditions générales pour continuer.",
    helperText: "Requis pour finaliser le paiement.",
  },
};

const EN_DEFAULTS = DEFAULT_TEXTS.en;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const requestLocale = (url.searchParams.get("locale") || "en").slice(0, 2).toLowerCase();

  if (!shop) {
    return Response.json({ error: "Missing shop parameter" }, { status: 400, headers: CORS_HEADERS });
  }

  const session = await db.session.findFirst({ where: { shop } });
  if (!session) {
    return Response.json({ error: "Shop not found" }, { status: 404, headers: CORS_HEADERS });
  }

  const settings = await db.settings.findUnique({ where: { shop } });
  if (!settings) {
    return Response.json({ error: "Settings not found" }, { status: 404, headers: CORS_HEADERS });
  }

  // Manual language override wins over auto-detected locale
  const settingsLanguage = (settings as unknown as { language?: string }).language || "auto";
  const locale = settingsLanguage !== "auto" ? settingsLanguage : requestLocale;
  const translations = DEFAULT_TEXTS[locale] || DEFAULT_TEXTS.en;
  const overLimit = settings.plan === "free" && settings.monthlyOrderCount >= FREE_PLAN_LIMIT;

  // Use locale-translated defaults when merchant hasn't customized the text
  const agreementText =
    settings.agreementText === EN_DEFAULTS.agreementText ? translations.agreementText : settings.agreementText;
  const errorMessage =
    settings.errorMessage === EN_DEFAULTS.errorMessage ? translations.errorMessage : settings.errorMessage;
  const helperText =
    settings.helperText === EN_DEFAULTS.helperText ? translations.helperText : settings.helperText;

  return Response.json(
    {
      agreementText,
      links: settings.links,
      requireAcceptance: settings.requireAcceptance,
      helperText,
      errorMessage,
      errorDisplayType: settings.errorDisplayType,
      locationCart: settings.locationCart,
      locationProduct: settings.locationProduct,
      locationCollection: settings.locationCollection,
      locationAllCheckout: settings.locationAllCheckout,
      locationCustom: settings.locationCustom,
      textColor: settings.textColor,
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      alignment: settings.alignment,
      helperTextColor: settings.helperTextColor,
      helperFontSize: settings.helperFontSize,
      spacingTop: settings.spacingTop,
      spacingRight: settings.spacingRight,
      spacingBottom: settings.spacingBottom,
      spacingLeft: settings.spacingLeft,
      checksByDefault: settings.checksByDefault,
      checkboxStyle: settings.checkboxStyle,
      uncheckedColor: settings.uncheckedColor,
      checkedColor: settings.checkedColor,
      linkColor: settings.linkColor,
      showLinkUnderline: settings.showLinkUnderline,
      openLinksNewTab: settings.openLinksNewTab,
      popupTitleColor: settings.popupTitleColor,
      popupMessageColor: settings.popupMessageColor,
      popupBtnTextColor: settings.popupBtnTextColor,
      popupBtnBgColor: settings.popupBtnBgColor,
      popupBgColor: settings.popupBgColor,
      popupIconColor: settings.popupIconColor,
      customCss: settings.customCss,
      customScript: settings.customScript,
      plan: settings.plan,
      overLimit,
      monthlyOrderCount: settings.monthlyOrderCount,
    },
    { headers: CORS_HEADERS },
  );
};
