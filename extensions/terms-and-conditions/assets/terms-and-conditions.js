(function () {
  "use strict";

  var PROXY_BASE = "/apps/termguard";
  var shop = window.__termguardShop || (window.Shopify && window.Shopify.shop);
  if (!shop) return;

  // Prevent double-init (embed block + script tag both active). Uses its own flag
  // so an older copy of this script (e.g. another install of the app) that
  // loaded first can't stop this one from guarding checkout; setting the old
  // flag too keeps an older copy that loads *later* from running as well.
  if (window.__termguardV2Loaded) return;
  window.__termguardV2Loaded = true;
  window.__termguardLoaded = true;

  var locale = (
    (window.Shopify && window.Shopify.locale) ||
    document.documentElement.lang ||
    "en"
  ).slice(0, 2).toLowerCase();

  var TRANSLATIONS = {
    en: {
      upgradeMessage: "You've reached your free plan limit (10 checkouts/month). Upgrade to Pro to continue.",
      popupTitle: "Terms not accepted",
    },
    es: {
      upgradeMessage: "Has alcanzado el límite del plan gratuito (10 pagos/mes). Actualiza a Pro para continuar.",
      popupTitle: "Términos no aceptados",
    },
    it: {
      upgradeMessage: "Hai raggiunto il limite del piano gratuito (10 checkout/mese). Passa a Pro per continuare.",
      popupTitle: "Termini non accettati",
    },
    de: {
      upgradeMessage: "Sie haben das Limit des kostenlosen Plans erreicht (10 Checkouts/Monat). Upgraden Sie auf Pro.",
      popupTitle: "Bedingungen nicht akzeptiert",
    },
    fr: {
      upgradeMessage: "Vous avez atteint la limite du plan gratuit (10 paiements/mois). Passez à Pro pour continuer.",
      popupTitle: "Conditions non acceptées",
    },
  };

  var t = TRANSLATIONS[locale] || TRANSLATIONS.en;

  var currentSettings = null;
  var customCssApplied = false;
  var customScriptApplied = false;

  function postAnalytics(location, checked, blocked) {
    fetch(PROXY_BASE + "/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop: shop, location: location, checked: checked, blocked: blocked }),
    }).catch(function () {});
  }

  function renderAgreementHtml(text, links, linkColor, underline, newTab) {
    return text.replace(/\{([^}]+)\}/g, function (match, id) {
      var link = null;
      for (var i = 0; i < links.length; i++) {
        if (links[i].id === id) { link = links[i]; break; }
      }
      if (!link) return match;
      var target = newTab ? ' target="_blank" rel="noopener noreferrer"' : "";
      var style = "color:" + linkColor + ";text-decoration:" + (underline ? "underline" : "none") + ";";
      return '<a href="' + link.url + '" style="' + style + '"' + target + ">" + link.label + "</a>";
    });
  }

  function checkboxVisualHtml(style, checked, uncheckedColor, checkedColor) {
    if (style === "none") return "";
    if (style === "toggle") {
      return (
        '<span class="termguard-toggle" style="display:inline-block;width:32px;height:18px;border-radius:9px;background-color:' +
        (checked ? checkedColor : uncheckedColor) +
        ';position:relative;flex-shrink:0;vertical-align:middle;">' +
        '<span style="position:absolute;top:2px;left:' + (checked ? "16px" : "2px") +
        ';width:14px;height:14px;border-radius:50%;background:#fff;"></span></span>'
      );
    }
    var radius = style === "rounded" ? "6px" : style === "outlined" ? "2px" : "3px";
    var bg = checked ? checkedColor : "transparent";
    var tick = checked
      ? '<svg style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)" width="11" height="11" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : "";
    return (
      '<span class="termguard-checkbox-visual" style="display:inline-block;width:18px;height:18px;border-radius:' +
      radius + ";border:2px solid " + (checked ? checkedColor : uncheckedColor) +
      ";background-color:" + bg + ';flex-shrink:0;vertical-align:middle;position:relative;">' +
      tick + "</span>"
    );
  }

  // One acceptance state for the whole page, so ticking the box in the cart
  // drawer also counts on the cart page (and every widget shows the same state).
  var accepted = false;
  var widgetPainters = [];

  function setAccepted(value) {
    accepted = value;
    widgetPainters.forEach(function (paint) { paint(); });
    syncExpressLock();
  }

  function buildWidget(settings, location) {

    var wrapper = document.createElement("div");
    wrapper.className = "termguard-widget termguard-" + location;
    wrapper.setAttribute("data-termguard-location", location);
    wrapper.style.paddingTop = settings.spacingTop + "px";
    wrapper.style.paddingRight = settings.spacingRight + "px";
    wrapper.style.paddingBottom = settings.spacingBottom + "px";
    wrapper.style.paddingLeft = settings.spacingLeft + "px";
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.gap = "4px";
    wrapper.style.textAlign = settings.alignment.toLowerCase();
    wrapper.style.alignItems =
      settings.alignment === "Center" ? "center" : settings.alignment === "Right" ? "flex-end" : "flex-start";
    wrapper.style.pointerEvents = "auto";
    wrapper.style.zIndex = "10000";

    // Free plan over-limit: greyed out + upgrade message, checkout still allowed
    if (settings.overLimit) {
      var limitRow = document.createElement("div");
      limitRow.style.cssText =
        "display:flex;gap:8px;align-items:flex-start;opacity:0.4;cursor:not-allowed;pointer-events:none;user-select:none;";
      limitRow.innerHTML =
        checkboxVisualHtml(settings.checkboxStyle, false, settings.uncheckedColor, settings.checkedColor) +
        '<span style="color:' + settings.textColor + ";font-size:" + settings.fontSize + 'px;">' +
        renderAgreementHtml(settings.agreementText, settings.links, settings.linkColor, false, false) +
        "</span>";

      var limitMsg = document.createElement("span");
      limitMsg.style.cssText = "color:#D72C0D;font-size:12px;font-weight:500;margin-top:2px;";
      limitMsg.textContent = t.upgradeMessage;

      wrapper.appendChild(limitRow);
      wrapper.appendChild(limitMsg);
      wrapper.__termguardIsChecked = function () { return true; }; // allow checkout to pass through
      return wrapper;
    }

    var row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "8px";
    row.style.alignItems = "flex-start";
    row.style.cursor = "pointer";
    row.style.userSelect = "none";
    row.style.pointerEvents = "auto";
    row.style.zIndex = "10000";
    if (settings.fontFamily !== "Inherit") row.style.fontFamily = settings.fontFamily;

    var visualHolder = document.createElement("span");
    visualHolder.style.cursor = "pointer";
    visualHolder.style.pointerEvents = "auto";
    visualHolder.style.zIndex = "10001";
    var textSpan = document.createElement("span");
    textSpan.style.color = settings.textColor;
    textSpan.style.fontSize = settings.fontSize + "px";
    textSpan.style.cursor = "pointer";
    textSpan.style.pointerEvents = "auto";
    textSpan.innerHTML = renderAgreementHtml(
      settings.agreementText, settings.links, settings.linkColor,
      settings.showLinkUnderline, settings.openLinksNewTab,
    );

    row.appendChild(visualHolder);
    row.appendChild(textSpan);

    var helperSpan = document.createElement("span");
    helperSpan.style.color = settings.helperTextColor;
    helperSpan.style.fontSize = settings.helperFontSize + "px";
    helperSpan.textContent = settings.helperText;

    var errorSpan = document.createElement("span");
    errorSpan.style.color = "#D72C0D";
    errorSpan.style.fontSize = settings.helperFontSize + "px";
    errorSpan.style.display = "none";
    errorSpan.textContent = settings.errorMessage;

    function paint() {
      visualHolder.innerHTML = checkboxVisualHtml(settings.checkboxStyle, accepted, settings.uncheckedColor, settings.checkedColor);
      if (accepted) errorSpan.style.display = "none";
      wrapper.setAttribute("aria-checked", accepted ? "true" : "false");
    }
    widgetPainters.push(paint);
    paint();

    function handleRowClick(e) {
      e.stopPropagation();
      var link = e.target.closest && e.target.closest("a");
      if (link) return;
      setAccepted(!accepted);
      postAnalytics(location, accepted, false);
    }

    row.addEventListener("click", handleRowClick, false);
    wrapper.setAttribute("role", "checkbox");
    wrapper.setAttribute("tabindex", "0");
    wrapper.addEventListener("keydown", function (e) {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setAccepted(!accepted); postAnalytics(location, accepted, false); }
    });

    wrapper.appendChild(row);
    wrapper.appendChild(helperSpan);
    wrapper.appendChild(errorSpan);

    wrapper.__termguardErrorSpan = errorSpan;
    wrapper.__termguardLocation = location;
    wrapper.__termguardIsChecked = function () { return accepted; };

    return wrapper;
  }

  function showPopupError(settings) {
    var existing = document.getElementById("termguard-popup-overlay");
    if (existing) existing.remove();

    var overlay = document.createElement("div");
    overlay.id = "termguard-popup-overlay";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;";

    var modal = document.createElement("div");
    modal.style.cssText =
      "background:" + settings.popupBgColor +
      ";border-radius:12px;padding:32px 28px;max-width:380px;width:100%;text-align:center;font-family:inherit;";

    var icon = document.createElement("div");
    icon.style.cssText =
      "width:40px;height:40px;border-radius:50%;background:" + settings.popupIconColor + ";margin:0 auto 16px;";

    var title = document.createElement("h3");
    title.style.cssText = "margin:0 0 12px;color:" + settings.popupTitleColor + ";font-size:18px;";
    title.textContent = t.popupTitle;

    var message = document.createElement("p");
    message.style.cssText = "margin:0 0 20px;color:" + settings.popupMessageColor + ";font-size:14px;";
    message.textContent = settings.errorMessage;

    var button = document.createElement("button");
    button.type = "button";
    button.textContent = "OK";
    button.style.cssText =
      "background:" + settings.popupBtnBgColor + ";color:" + settings.popupBtnTextColor +
      ";border:none;border-radius:6px;padding:10px 24px;cursor:pointer;font-size:14px;";
    button.addEventListener("click", function () { overlay.remove(); });
    overlay.addEventListener("click", function (e) { if (e.target === overlay) overlay.remove(); });

    modal.appendChild(icon);
    modal.appendChild(title);
    modal.appendChild(message);
    modal.appendChild(button);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // ─── What counts as "going to checkout" ──────────────────────────────────

  var CART_CHECKOUT_SEL =
    'button[name="checkout"], input[name="checkout"], a[href^="/checkout"], a[href*="/checkouts/"], .cart__checkout-button, #checkout, #CartDrawer-Checkout';
  var PRODUCT_ADD_SEL =
    'form[action*="/cart/add"] button[type="submit"], form[action*="/cart/add"] [name="add"]';
  var CUSTOM_SEL = '[data-termguard-target="custom"]';
  // Express / accelerated checkout (Shop Pay, Apple Pay, Google Pay, PayPal …).
  var EXPRESS_SEL =
    "shopify-accelerated-checkout, shopify-accelerated-checkout-cart, .shopify-payment-button, .additional-checkout-buttons, #dynamic-checkout-cart, [data-shopify='payment-button'], [data-shopify='dynamic-checkout-cart']";
  var EXPRESS_WRAP_ATTR = "data-termguard-express";

  function inProductForm(el) {
    return !!(el.closest && el.closest('form[action*="/cart/add"], product-form, .product-form'));
  }

  // Which analytics location an element belongs to, or null if it isn't guarded.
  function guardLocation(el) {
    var s = currentSettings;
    if (!s) return null;
    if (el.matches(CUSTOM_SEL)) return s.locationCustom ? "custom" : null;
    var product = el.matches(PRODUCT_ADD_SEL) || (el.hasAttribute(EXPRESS_WRAP_ATTR) && inProductForm(el));
    if (product) return s.locationProduct ? "product" : s.locationAllCheckout ? "checkout" : null;
    return s.locationCart ? "cart" : s.locationAllCheckout ? "checkout" : null;
  }

  function mustBlock() {
    var s = currentSettings;
    return !!(s && s.requireAcceptance && !s.overLimit && !accepted);
  }

  function showError(location, anchorEl) {
    var s = currentSettings;
    if (s.errorDisplayType === "popup") {
      showPopupError(s);
      return;
    }
    // Inline: reveal the error on the widget next to the button (or every widget).
    var container = anchorEl && (anchorEl.closest("form") || anchorEl.parentElement);
    var near = container && container.querySelector(".termguard-widget");
    var targets = near ? [near] : Array.prototype.slice.call(document.querySelectorAll(".termguard-widget"));
    targets.forEach(function (w) { if (w.__termguardErrorSpan) w.__termguardErrorSpan.style.display = "inline"; });
    if (targets[0] && targets[0].scrollIntoView) targets[0].scrollIntoView({ block: "center", behavior: "smooth" });
    if (!targets.length) showPopupError(s); // no widget visible — still tell the shopper why
  }

  function block(e, location, anchorEl) {
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    showError(location, anchorEl);
    postAnalytics(location, false, true);
  }

  // Capture phase runs before the theme's own handlers (cart drawers, AJAX
  // checkout buttons), so the theme never gets a chance to navigate away.
  function onClickCapture(e) {
    if (!mustBlock() || !e.target || !e.target.closest) return;
    if (e.target.closest(".termguard-widget, #termguard-popup-overlay")) return;
    var el = e.target.closest(CART_CHECKOUT_SEL + ", " + PRODUCT_ADD_SEL + ", " + CUSTOM_SEL + ", [" + EXPRESS_WRAP_ATTR + "]");
    if (!el) return;
    var location = guardLocation(el);
    if (location) block(e, location, el);
  }

  // Catches keyboard submits (Enter in the cart form) and programmatic submits.
  function onSubmitCapture(e) {
    if (!mustBlock()) return;
    var form = e.target;
    var action = (form.getAttribute && form.getAttribute("action")) || "";
    var submitter = e.submitter;
    var toCheckout = (submitter && submitter.name === "checkout") || /\/checkout/.test(action);
    var toCart = /\/cart\/add/.test(action);
    if (!toCheckout && !toCart) return;
    var location = guardLocation(submitter && submitter.matches ? submitter : form.querySelector(toCheckout ? CART_CHECKOUT_SEL : PRODUCT_ADD_SEL) || form);
    if (location) block(e, location, submitter || form);
  }

  // Express buttons render inside iframes / shadow DOM, where clicks can't be
  // intercepted — so they're made unclickable until the terms are accepted,
  // and a click on their wrapper explains why.
  function syncExpressLock() {
    document.documentElement.classList.toggle("termguard-locked", mustBlock());
  }

  function injectLockStyles() {
    if (document.getElementById("termguard-lock-styles")) return;
    var style = document.createElement("style");
    style.id = "termguard-lock-styles";
    style.textContent =
      // Buttons keep their normal look; clicks just land on the wrapper (which shows the terms error).
      ".termguard-locked [" + EXPRESS_WRAP_ATTR + "] > * { pointer-events: none !important; }" +
      ".termguard-locked [" + EXPRESS_WRAP_ATTR + "] { cursor: pointer; }" +
      ".termguard-widget[role=checkbox]:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }";
    document.head.appendChild(style);
  }

  // ─── Widget placement ────────────────────────────────────────────────────

  function findAll(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  }

  function placeWidgets(settings, location, buttons) {
    buttons.forEach(function (btn) {
      var container = btn.closest("form") || btn.parentElement;
      if (!container || container.querySelector(":scope > .termguard-widget")) return;
      // Insert before the container's child that holds the button, so the checkbox
      // sits above the button's row instead of being squeezed into it.
      var anchor = btn;
      while (anchor.parentElement && anchor.parentElement !== container) anchor = anchor.parentElement;
      if (anchor.parentElement === container) container.insertBefore(buildWidget(settings, location), anchor);
    });
  }

  function markExpressButtons() {
    findAll(EXPRESS_SEL).forEach(function (node) {
      // Mark the outermost express container once; its children get locked by CSS.
      if (node.parentElement && node.parentElement.closest("[" + EXPRESS_WRAP_ATTR + "]")) return;
      var wrap = node.parentElement || node;
      if (!wrap.hasAttribute(EXPRESS_WRAP_ATTR)) wrap.setAttribute(EXPRESS_WRAP_ATTR, "");
    });
  }

  function scanAndBind() {
    if (!currentSettings) return;
    var settings = currentSettings;
    if (settings.locationCart || settings.locationAllCheckout) {
      placeWidgets(settings, settings.locationCart ? "cart" : "checkout", findAll(CART_CHECKOUT_SEL));
    }
    if (settings.locationProduct || settings.locationAllCheckout) {
      placeWidgets(settings, settings.locationProduct ? "product" : "checkout", findAll(PRODUCT_ADD_SEL));
    }
    if (settings.locationCustom) placeWidgets(settings, "custom", findAll(CUSTOM_SEL));
    markExpressButtons();
  }

  function applyCustomCss(css) {
    if (!css || customCssApplied) return;
    customCssApplied = true;
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function applyCustomScript(script) {
    if (!script || customScriptApplied) return;
    customScriptApplied = true;
    var tag = document.createElement("script");
    tag.textContent = script;
    document.body.appendChild(tag);
  }

  function startWatching() {
    scanAndBind();
    var debounceTimer = null;
    var observer = new MutationObserver(function () {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(scanAndBind, 150);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    setInterval(scanAndBind, 1000);
  }

  function init(settings) {
    currentSettings = settings;
    accepted = !!settings.checksByDefault;
    window.TermGuard = window.TermGuard || {};
    window.TermGuard.settings = settings;
    applyCustomCss(settings.customCss);
    applyCustomScript(settings.customScript);
    injectLockStyles();
    document.addEventListener("click", onClickCapture, true);
    document.addEventListener("submit", onSubmitCapture, true);
    syncExpressLock();
    startWatching();
  }

  // Shopify renames the proxy (e.g. /apps/termguard-1) when another app on the
  // store already owns /apps/termguard — try each and keep the one that answers.
  var PROXY_BASES = [PROXY_BASE, PROXY_BASE + "-1", PROXY_BASE + "-2"];

  function loadSettings(i) {
    if (i >= PROXY_BASES.length) return Promise.resolve(null);
    var query = "/api/settings?shop=" + encodeURIComponent(shop) + "&locale=" + encodeURIComponent(locale);
    return fetch(PROXY_BASES[i] + query)
      .then(function (response) {
        var isJson = (response.headers.get("content-type") || "").indexOf("application/json") !== -1;
        return response.ok && isJson ? response.json() : null;
      })
      .catch(function () { return null; })
      .then(function (settings) {
        if (settings && typeof settings.agreementText === "string") {
          PROXY_BASE = PROXY_BASES[i]; // analytics posts go to the same app
          return settings;
        }
        return loadSettings(i + 1);
      });
  }

  loadSettings(0)
    .then(function (settings) {
      if (!settings) return;
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () { init(settings); });
      } else {
        init(settings);
      }
    })
    .catch(function () {});
})();
