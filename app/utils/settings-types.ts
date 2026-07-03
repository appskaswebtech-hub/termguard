export interface LinkItem {
  id: string;
  label: string;
  url: string;
}

export interface SettingsState {
  agreementText: string;
  links: LinkItem[];
  requireAcceptance: boolean;
  helperText: string;
  errorMessage: string;
  errorDisplayType: "inline" | "popup";
  locationCart: boolean;
  locationProduct: boolean;
  locationCollection: boolean;
  locationAllCheckout: boolean;
  locationCustom: boolean;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  alignment: "Left" | "Center" | "Right";
  helperTextColor: string;
  helperFontSize: number;
  spacingTop: number;
  spacingRight: number;
  spacingBottom: number;
  spacingLeft: number;
  checksByDefault: boolean;
  checkboxStyle: "default" | "outlined" | "rounded" | "toggle" | "none";
  uncheckedColor: string;
  checkedColor: string;
  linkColor: string;
  showLinkUnderline: boolean;
  openLinksNewTab: boolean;
  popupTitleColor: string;
  popupMessageColor: string;
  popupBtnTextColor: string;
  popupBtnBgColor: string;
  popupBgColor: string;
  popupIconColor: string;
  customCss: string;
  customScript: string;
  language: string;
}

export const FONT_FAMILY_OPTIONS = [
  "Inherit",
  "Arial",
  "Georgia",
  "Times New Roman",
  "Verdana",
];

export const CHECKBOX_STYLE_OPTIONS: { value: SettingsState["checkboxStyle"]; label: string }[] = [
  { value: "default", label: "Standard filled" },
  { value: "outlined", label: "Outlined square" },
  { value: "rounded", label: "Rounded outlined" },
  { value: "toggle", label: "Oval / pill toggle" },
  { value: "none", label: "None" },
];
