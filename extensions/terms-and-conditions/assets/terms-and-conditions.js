(function () {
  "use strict";

  var PROXY_BASE = "/apps/termguard";
  var shop = window.__termguardShop || (window.Shopify && window.Shopify.shop);
  if (!shop) return;

  // Prevent double-init (embed block + script tag both active)
  if (window.__termguardLoaded) return;
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

  function buildWidget(settings, location) {
    var checked = settings.checksByDefault;

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
    visualHolder.innerHTML = checkboxVisualHtml(settings.checkboxStyle, checked, settings.uncheckedColor, settings.checkedColor);

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

    function handleRowClick(e) {
      e.stopPropagation();
      var link = e.target.closest && e.target.closest("a");
      if (link) return;
      checked = !checked;
      visualHolder.innerHTML = checkboxVisualHtml(settings.checkboxStyle, checked, settings.uncheckedColor, settings.checkedColor);
      errorSpan.style.display = "none";
      postAnalytics(location, checked, false);
    }

    row.addEventListener("click", handleRowClick, false);
    visualHolder.addEventListener("click", handleRowClick, false);
    textSpan.addEventListener("click", handleRowClick, false);

    wrapper.appendChild(row);
    wrapper.appendChild(helperSpan);
    wrapper.appendChild(errorSpan);

    wrapper.__termguardErrorSpan = errorSpan;
    wrapper.__termguardLocation = location;
    wrapper.__termguardIsChecked = function () { return checked; };

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

  function guardCheckoutClick(e, settings, location, widget) {
    if (!settings.requireAcceptance) return;
    var isChecked = !!(widget && widget.__termguardIsChecked && widget.__termguardIsChecked());
    if (isChecked) return;

    e.preventDefault();
    e.stopPropagation();

    if (settings.errorDisplayType === "popup") {
      showPopupError(settings);
    } else if (widget && widget.__termguardErrorSpan) {
      widget.__termguardErrorSpan.style.display = "inline";
    }

    postAnalytics(location, false, true);
  }

  function findCartCheckoutButtons() {
    return Array.prototype.slice.call(
      document.querySelectorAll(
        'button[name="checkout"], input[name="checkout"], a[href^="/checkout"], .cart__checkout-button, #checkout',
      ),
    );
  }

  function findProductButtons() {
    return Array.prototype.slice.call(
      document.querySelectorAll(
        'form[action^="/cart/add"] button[type="submit"], form[action^="/cart/add"] [name="add"]',
      ),
    );
  }

  function findCustomButtons() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-termguard-target="custom"]'));
  }

  var BOUND_ATTR = "data-termguard-bound";

  function bindButtons(settings, location, buttons) {
    buttons.forEach(function (btn) {
      var container = btn.closest("form") || btn.parentElement;
      var widget = null;
      var alreadyBound = btn.hasAttribute(BOUND_ATTR);

      if (container) {
        widget = container.querySelector(":scope > .termguard-widget");
        if (!widget) {
          widget = buildWidget(settings, location);
          container.insertBefore(widget, btn);
        }
      } else {
        widget = buildWidget(settings, location);
      }

      if (!alreadyBound) {
        btn.setAttribute(BOUND_ATTR, "true");
        btn.addEventListener("click", function (e) {
          var currentContainer = btn.closest("form") || btn.parentElement;
          var currentWidget = currentContainer ? currentContainer.querySelector(":scope > .termguard-widget") : null;
          guardCheckoutClick(e, settings, location, currentWidget);
        }, false);
      }
    });
  }

  function scanAndBind() {
    if (!currentSettings) return;
    var settings = currentSettings;
    if (settings.locationCart) bindButtons(settings, "cart", findCartCheckoutButtons());
    if (settings.locationProduct) bindButtons(settings, "product", findProductButtons());
    if (settings.locationCollection) bindButtons(settings, "collection", []);
    if (settings.locationAllCheckout) {
      bindButtons(settings, "checkout", findCartCheckoutButtons().concat(findProductButtons()));
    }
    if (settings.locationCustom) bindButtons(settings, "custom", findCustomButtons());
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
    window.TermGuard = window.TermGuard || {};
    window.TermGuard.settings = settings;
    applyCustomCss(settings.customCss);
    applyCustomScript(settings.customScript);
    startWatching();
  }

  fetch(PROXY_BASE + "/api/settings?shop=" + encodeURIComponent(shop) + "&locale=" + encodeURIComponent(locale))
    .then(function (response) { return response.ok ? response.json() : null; })
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
