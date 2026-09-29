(function () {
  "use strict";

  if (window.__termguardInstafeedLoaded) return;
  window.__termguardInstafeedLoaded = true;

  // Shopify renames the proxy (e.g. /apps/termguard-1) when another app on the
  // store already owns /apps/termguard, so try the usual path first, then fall back.
  var PROXY_BASES = ["/apps/termguard", "/apps/termguard-1", "/apps/termguard-2"];
  // Keep in sync with SPACING_PX / SIZE_PX in app/utils/instagram-feed-types.ts
  var SPACING_PX = { none: 0, small: 8, medium: 16, large: 24 };
  var SIZE_PX = { small: 180, medium: 260, large: 340, xlarge: 420 };
  var STORY_IMAGE_MS = 5000;
  var MAX_STORY_SEGMENTS = 20;

  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  var locale = ((window.Shopify && window.Shopify.locale) || document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  var I18N = {
    en: { view: "View on Instagram", empty: "No posts to show yet.", error: "Unable to load the feed.", close: "Close", prev: "Previous", next: "Next", play: "Play", pause: "Pause", mute: "Mute", unmute: "Unmute", more: "more" },
    es: { view: "Ver en Instagram", empty: "Aún no hay publicaciones.", error: "No se pudo cargar el feed.", close: "Cerrar", prev: "Anterior", next: "Siguiente", play: "Reproducir", pause: "Pausar", mute: "Silenciar", unmute: "Activar sonido", more: "más" },
    it: { view: "Vedi su Instagram", empty: "Nessun post da mostrare.", error: "Impossibile caricare il feed.", close: "Chiudi", prev: "Precedente", next: "Successivo", play: "Riproduci", pause: "Pausa", mute: "Disattiva audio", unmute: "Attiva audio", more: "altro" },
    de: { view: "Auf Instagram ansehen", empty: "Noch keine Beiträge.", error: "Feed konnte nicht geladen werden.", close: "Schließen", prev: "Zurück", next: "Weiter", play: "Abspielen", pause: "Pause", mute: "Stumm", unmute: "Ton an", more: "mehr" },
    fr: { view: "Voir sur Instagram", empty: "Aucune publication pour le moment.", error: "Impossible de charger le flux.", close: "Fermer", prev: "Précédent", next: "Suivant", play: "Lire", pause: "Pause", mute: "Couper le son", unmute: "Activer le son", more: "plus" },
  };
  var t = I18N[locale] || I18N.en;

  var ICONS = {
    instagram: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor"/></svg>',
    instagramLarge: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor"/></svg>',
    reel: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 8h18M8 3l3 5M14 3l3 5"/><path d="M10 12v5l4-2.5z" fill="currentColor"/></svg>',
    carousel: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="7" y="7" width="13" height="13" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg>',
    playBig: '<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="rgba(0,0,0,0.4)"/><path d="M19 15l15 9-15 9z" fill="#fff"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M7 4.5l13 7.5-13 7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><rect x="5" y="4" width="4.5" height="16" rx="1.5"/><rect x="14.5" y="4" width="4.5" height="16" rx="1.5"/></svg>',
    volume: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>',
    muted: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    chevronLeft: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function el(tag, className, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) for (var key in attrs) if (Object.prototype.hasOwnProperty.call(attrs, key)) node.setAttribute(key, attrs[key]);
    return node;
  }

  function iconButton(className, icon, label) {
    var b = el("button", className, { type: "button", "aria-label": label });
    b.innerHTML = icon;
    return b;
  }

  function isVideo(type) {
    return String(type).toUpperCase() === "VIDEO";
  }

  function safePlay(video) {
    var p = video.play();
    return p && p.catch ? p : Promise.resolve();
  }

  // Some themes (e.g. Horizon) hide or fade in every <video>/<img> on the page.
  // Inline !important styles beat those rules — same fix StockPing's video block uses.
  var FORCE_VISIBLE = { display: "block", opacity: "1", visibility: "visible", "clip-path": "none", filter: "none", animation: "none" };
  function forceVisible(node, extra) {
    var styles = Object.assign({}, FORCE_VISIBLE, extra || {});
    Object.keys(styles).forEach(function (p) { node.style.setProperty(p, styles[p], "important"); });
    return node;
  }

  function expandSlides(post) {
    return post.carouselChildren && post.carouselChildren.length
      ? post.carouselChildren.map(function (c) { return { type: c.media_type, url: c.media_url, thumb: c.thumbnail_url || null }; })
      : [{ type: post.mediaType, url: post.mediaUrl, thumb: post.thumbnailUrl }];
  }

  // ─── Feed videos: autoplay (muted) while on screen ────────────────────────

  var viewObserver = !reduceMotion && "IntersectionObserver" in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var video = entry.target;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (video.preload === "none") video.preload = "auto";
            safePlay(video).catch(function () {});
          } else {
            video.pause();
          }
        });
      }, { threshold: [0, 0.5] })
    : null;

  function feedMediaEl(post, fit) {
    var fitStyle = { width: "100%", height: "100%", "object-fit": fit };
    if (isVideo(post.mediaType)) {
      var video = el("video");
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("muted", "");
      video.preload = viewObserver ? "none" : "metadata";
      if (post.thumbnailUrl) video.poster = post.thumbnailUrl;
      video.src = post.mediaUrl;
      forceVisible(video, fitStyle);
      if (viewObserver) viewObserver.observe(video);
      return video;
    }
    var img = el("img", null, { loading: "lazy", decoding: "async", alt: post.caption ? post.caption.slice(0, 120) : "" });
    img.src = post.thumbnailUrl || post.mediaUrl;
    forceVisible(img, fitStyle);
    return img;
  }

  // ─── Player: theme-isolated video with custom controls ───────────────────

  function createPlayer(url, poster, opts) {
    opts = opts || {};
    var wrap = el("div", "tg-if-player");
    var host = el("div", "tg-if-player-host");
    var video = document.createElement("video");
    video.src = url;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.loop = !!opts.loop;
    video.muted = !!opts.muted;
    if (poster) video.poster = poster;

    // Shadow DOM keeps theme CSS/JS from touching the video (proven on Horizon & Dawn).
    if (host.attachShadow) {
      var root = host.attachShadow({ mode: "open" });
      var style = document.createElement("style");
      style.textContent = "video{display:block!important;width:100%!important;height:100%!important;object-fit:contain!important;background:#000!important;opacity:1!important;visibility:visible!important;transform:none!important;}";
      root.appendChild(style);
      root.appendChild(video);
    } else {
      forceVisible(video, { width: "100%", height: "100%", "object-fit": "contain", background: "#000" });
      host.appendChild(video);
    }
    wrap.appendChild(host);

    var cleanups = [];
    function listen(target, type, fn, options) {
      target.addEventListener(type, fn, options);
      cleanups.push(function () { target.removeEventListener(type, fn, options); });
    }

    var userPaused = false;
    var btnPlay = null;
    var btnMute = null;

    if (opts.controls) {
      var shade = el("div", "tg-if-player-shade");
      var bar = el("div", "tg-if-progress", { role: "slider", "aria-label": "Seek", "aria-valuemin": "0", "aria-valuemax": "100" });
      var fill = el("div", "tg-if-progress-fill");
      fill.appendChild(el("span", "tg-if-progress-thumb"));
      bar.appendChild(fill);

      btnPlay = iconButton("tg-if-ctl tg-if-ctl-play", ICONS.pause, t.pause);
      btnMute = iconButton("tg-if-ctl tg-if-ctl-mute", video.muted ? ICONS.muted : ICONS.volume, video.muted ? t.unmute : t.mute);

      var syncPlay = function () {
        btnPlay.innerHTML = video.paused ? ICONS.play : ICONS.pause;
        btnPlay.setAttribute("aria-label", video.paused ? t.play : t.pause);
        wrap.classList.toggle("is-paused", video.paused);
      };
      listen(video, "play", syncPlay);
      listen(video, "pause", syncPlay);
      listen(video, "ended", syncPlay);
      listen(video, "timeupdate", function () {
        if (video.duration) {
          var pct = (video.currentTime / video.duration) * 100;
          fill.style.width = pct + "%";
          bar.setAttribute("aria-valuenow", String(Math.round(pct)));
        }
      });

      var togglePlay = function () {
        if (video.paused) { userPaused = false; safePlay(video).catch(function () {}); }
        else { userPaused = true; video.pause(); }
      };
      btnPlay.addEventListener("click", function (e) { e.stopPropagation(); togglePlay(); });
      host.addEventListener("click", togglePlay);
      btnMute.addEventListener("click", function (e) {
        e.stopPropagation();
        setMuted(!video.muted);
        if (opts.onMuteChange) opts.onMuteChange(video.muted);
      });

      // Seek by click or drag (mouse + touch).
      var dragging = false;
      var seek = function (clientX) {
        var rect = bar.getBoundingClientRect();
        var pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        if (video.duration) video.currentTime = pct * video.duration;
      };
      bar.addEventListener("mousedown", function (e) { dragging = true; seek(e.clientX); e.preventDefault(); e.stopPropagation(); });
      bar.addEventListener("touchstart", function (e) { dragging = true; seek(e.touches[0].clientX); e.stopPropagation(); }, { passive: true });
      bar.addEventListener("click", function (e) { e.stopPropagation(); });
      listen(document, "mousemove", function (e) { if (dragging) seek(e.clientX); });
      listen(document, "touchmove", function (e) { if (dragging) seek(e.touches[0].clientX); }, { passive: true });
      listen(document, "mouseup", function () { dragging = false; });
      listen(document, "touchend", function () { dragging = false; });

      wrap.appendChild(shade);
      wrap.appendChild(bar);
      wrap.appendChild(btnPlay);
      wrap.appendChild(btnMute);
    }

    if (opts.onEnded) listen(video, "ended", opts.onEnded);
    if (opts.onTime) listen(video, "timeupdate", function () { if (video.duration) opts.onTime(video.currentTime / video.duration); });

    function setMuted(muted) {
      video.muted = muted;
      if (btnMute) {
        btnMute.innerHTML = muted ? ICONS.muted : ICONS.volume;
        btnMute.setAttribute("aria-label", muted ? t.unmute : t.mute);
      }
    }

    // Autoplay with sound can be refused — fall back to muted. Retry a couple of
    // times for themes that initialise media late (Dawn).
    function tryPlay() {
      if (userPaused) return;
      safePlay(video).catch(function () {
        if (!video.muted) {
          setMuted(true);
          if (opts.onMuteChange) opts.onMuteChange(true);
          safePlay(video).catch(function () {});
        }
      });
    }
    tryPlay();
    var retries = [setTimeout(function () { if (video.paused) tryPlay(); }, 300), setTimeout(function () { if (video.paused) tryPlay(); }, 800)];

    return {
      el: wrap,
      video: video,
      setMuted: setMuted,
      pause: function () { video.pause(); },
      resume: function () { if (!userPaused) safePlay(video).catch(function () {}); },
      destroy: function () {
        retries.forEach(clearTimeout);
        cleanups.forEach(function (fn) { fn(); });
        video.pause();
        video.removeAttribute("src");
        video.load();
      },
    };
  }

  // ─── Overlay plumbing ────────────────────────────────────────────────────

  function lockScroll() {
    var prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return function () { document.documentElement.style.overflow = prev; };
  }

  function avatarEl() {
    var avatar = el("span", "tg-if-avatar");
    var inner = el("span", "tg-if-avatar-inner");
    inner.innerHTML = ICONS.instagram;
    avatar.appendChild(inner);
    return avatar;
  }


  // ─── Post popup (grid, slider, list, masonry, mosaic) ────────────────────

  function openPopup(state, index) {
    var posts = state.posts;
    var post = posts[index];
    var lastFocus = document.activeElement;
    var unlock = lockScroll();
    var player = null;

    var overlay = el("div", "tg-if-popup", { role: "dialog", "aria-modal": "true" });
    var card = el("div", "tg-if-popup-card");
    var mediaBox = el("div", "tg-if-popup-media");
    var side = el("div", "tg-if-popup-side");

    var slides = expandSlides(post);
    var slide = 0;

    function renderSlide() {
      if (player) { player.destroy(); player = null; }
      mediaBox.innerHTML = "";
      var s = slides[slide];
      if (isVideo(s.type)) {
        player = createPlayer(s.url, s.thumb || post.thumbnailUrl, { controls: true, loop: true, muted: state.muted });
        player.el.addEventListener("click", function (e) { e.stopPropagation(); });
        mediaBox.appendChild(player.el);
      } else {
        var img = el("img", null, { alt: "" });
        img.src = s.url;
        mediaBox.appendChild(forceVisible(img, { "max-width": "100%", "max-height": "calc(100vh - 32px)", "object-fit": "contain" }));
      }
      if (slides.length > 1) {
        var prev = iconButton("tg-if-slide-btn tg-if-slide-prev", ICONS.chevronLeft, t.prev);
        prev.onclick = function () { slide = (slide - 1 + slides.length) % slides.length; renderSlide(); };
        var next = iconButton("tg-if-slide-btn tg-if-slide-next", ICONS.chevronRight, t.next);
        next.onclick = function () { slide = (slide + 1) % slides.length; renderSlide(); };
        var dots = el("div", "tg-if-dots");
        slides.forEach(function (_, i) { dots.appendChild(el("span", i === slide ? "is-active" : "")); });
        mediaBox.appendChild(prev);
        mediaBox.appendChild(next);
        mediaBox.appendChild(dots);
      }
    }
    renderSlide();

    // Only Instagram posts get the Instagram account header; the merchant's own
    // uploads are shown as plain media.
    var isInstagram = post.source === "instagram";
    if (isInstagram && state.username) {
      var head = el("div", "tg-if-popup-head");
      head.appendChild(avatarEl());
      var name = el("span", "tg-if-popup-user");
      name.textContent = "@" + state.username;
      head.appendChild(name);
      side.appendChild(head);
    }

    if (post.caption) {
      var caption = el("p", "tg-if-popup-caption");
      caption.textContent = post.caption;
      side.appendChild(caption);
    }
    if (state.feed.linkToOriginalPost && post.source === "instagram") {
      var link = el("a", "tg-if-popup-link", { href: post.permalink, target: "_blank", rel: "noopener noreferrer" });
      link.innerHTML = ICONS.instagram;
      link.appendChild(document.createTextNode(" " + t.view));
      side.appendChild(link);
    }

    card.appendChild(mediaBox);
    // No header, caption or link → show the media on its own, without an empty panel.
    if (side.childNodes.length) card.appendChild(side);
    else card.classList.add("tg-if-popup-card-media-only");
    overlay.appendChild(card);

    var close = iconButton("tg-if-popup-close", ICONS.close, t.close);
    overlay.appendChild(close);

    function go(delta) {
      destroy(false);
      openPopup(state, (index + delta + posts.length) % posts.length);
    }
    if (posts.length > 1) {
      var prevPost = iconButton("tg-if-popup-nav tg-if-popup-prev", ICONS.chevronLeft, t.prev);
      prevPost.onclick = function () { go(-1); };
      var nextPost = iconButton("tg-if-popup-nav tg-if-popup-next", ICONS.chevronRight, t.next);
      nextPost.onclick = function () { go(1); };
      overlay.appendChild(prevPost);
      overlay.appendChild(nextPost);
    }

    function onKey(e) {
      if (e.key === "Escape") destroy(true);
      else if (e.key === "ArrowLeft" && posts.length > 1) go(-1);
      else if (e.key === "ArrowRight" && posts.length > 1) go(1);
    }

    function destroy(restoreFocus) {
      if (player) player.destroy();
      if (player && player.video) state.muted = player.video.muted;
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      unlock();
      if (restoreFocus && lastFocus && lastFocus.focus) lastFocus.focus();
    }

    close.onclick = function () { destroy(true); };
    overlay.addEventListener("click", function (e) { if (e.target === overlay) destroy(true); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);
    close.focus();
  }

  // ─── Story / reel viewer (stories, reels, floating bubble) ───────────────

  function openStories(state, startIndex) {
    // Every carousel child becomes its own frame, like Instagram stories.
    var frames = [];
    var startFrame = 0;
    state.posts.forEach(function (post, i) {
      if (i === startIndex) startFrame = frames.length;
      expandSlides(post).forEach(function (s) { frames.push({ post: post, slide: s }); });
    });
    if (!frames.length) return;

    var lastFocus = document.activeElement;
    var unlock = lockScroll();
    var current = -1;
    var player = null;
    var paused = false;
    var imageElapsed = 0;
    var imageStartedAt = 0;
    var rafId = 0;

    var overlay = el("div", "tg-if-story", { role: "dialog", "aria-modal": "true" });
    var frame = el("div", "tg-if-story-frame");
    var stage = el("div", "tg-if-story-stage");
    var bars = el("div", "tg-if-story-bars");
    var segmented = frames.length <= MAX_STORY_SEGMENTS;
    var segments = [];
    (segmented ? frames : [0]).forEach(function () {
      var seg = el("span", "tg-if-story-seg");
      var fill = el("span", "tg-if-story-seg-fill");
      seg.appendChild(fill);
      bars.appendChild(seg);
      segments.push(fill);
    });

    var head = el("div", "tg-if-story-head");
    var avatar = avatarEl();
    head.appendChild(avatar);
    var who = el("span", "tg-if-story-user");
    head.appendChild(who);
    var counter = el("span", "tg-if-story-count");
    head.appendChild(counter);
    var spacer = el("span", "tg-if-story-spacer");
    head.appendChild(spacer);
    var btnPause = iconButton("tg-if-story-btn", ICONS.pause, t.pause);
    var btnMute = iconButton("tg-if-story-btn", state.muted ? ICONS.muted : ICONS.volume, state.muted ? t.unmute : t.mute);
    var btnClose = iconButton("tg-if-story-btn", ICONS.close, t.close);
    head.appendChild(btnPause);
    head.appendChild(btnMute);
    head.appendChild(btnClose);

    var foot = el("div", "tg-if-story-foot");
    var tapPrev = el("button", "tg-if-story-tap tg-if-story-tap-prev", { type: "button", "aria-label": t.prev });
    var tapNext = el("button", "tg-if-story-tap tg-if-story-tap-next", { type: "button", "aria-label": t.next });

    frame.appendChild(stage);
    frame.appendChild(tapPrev);
    frame.appendChild(tapNext);
    frame.appendChild(bars);
    frame.appendChild(head);
    frame.appendChild(foot);
    overlay.appendChild(frame);

    var arrowPrev = iconButton("tg-if-story-arrow tg-if-story-arrow-prev", ICONS.chevronLeft, t.prev);
    var arrowNext = iconButton("tg-if-story-arrow tg-if-story-arrow-next", ICONS.chevronRight, t.next);
    overlay.appendChild(arrowPrev);
    overlay.appendChild(arrowNext);

    function setProgress(ratio) {
      var idx = segmented ? current : 0;
      var value = segmented ? ratio : (current + ratio) / frames.length;
      if (segments[idx]) segments[idx].style.width = Math.min(100, value * 100) + "%";
    }

    function paintSegments() {
      if (!segmented) return;
      segments.forEach(function (fill, i) { fill.style.width = i < current ? "100%" : "0%"; });
    }

    function tickImage() {
      if (paused) return;
      var elapsed = imageElapsed + (performance.now() - imageStartedAt);
      setProgress(elapsed / STORY_IMAGE_MS);
      if (elapsed >= STORY_IMAGE_MS) { next(); return; }
      rafId = requestAnimationFrame(tickImage);
    }

    function show(index) {
      cancelAnimationFrame(rafId);
      if (player) { state.muted = player.video.muted; player.destroy(); player = null; }
      current = index;
      paintSegments();
      setProgress(0);
      stage.innerHTML = "";
      foot.innerHTML = "";

      var f = frames[current];
      counter.textContent = segmented ? "" : current + 1 + " / " + frames.length;
      // Instagram account branding only on Instagram posts, not the merchant's own uploads.
      var fromInstagram = f.post.source === "instagram" && state.username;
      avatar.style.display = fromInstagram ? "" : "none";
      who.textContent = fromInstagram ? "@" + state.username : state.feed.title || "";

      if (isVideo(f.slide.type)) {
        btnMute.style.display = "";
        player = createPlayer(f.slide.url, f.slide.thumb || f.post.thumbnailUrl, {
          muted: state.muted,
          onEnded: next,
          onTime: setProgress,
          onMuteChange: function (m) { state.muted = m; syncMute(); },
        });
        stage.appendChild(player.el);
        if (paused) player.pause();
      } else {
        btnMute.style.display = "none";
        var img = el("img", null, { alt: "" });
        img.src = f.slide.url;
        stage.appendChild(forceVisible(img, { width: "100%", height: "100%", "object-fit": "contain" }));
        imageElapsed = 0;
        imageStartedAt = performance.now();
        if (!paused) rafId = requestAnimationFrame(tickImage);
      }

      if (f.post.caption) {
        var cap = el("p", "tg-if-story-caption");
        cap.textContent = f.post.caption;
        cap.addEventListener("click", function (e) { e.stopPropagation(); cap.classList.toggle("is-open"); });
        foot.appendChild(cap);
      }
      if (state.feed.linkToOriginalPost && f.post.source === "instagram") {
        var link = el("a", "tg-if-story-link", { href: f.post.permalink, target: "_blank", rel: "noopener noreferrer" });
        link.innerHTML = ICONS.instagram;
        link.appendChild(document.createTextNode(" " + t.view));
        foot.appendChild(link);
      }

      arrowPrev.disabled = current === 0;
      arrowNext.disabled = false;
      // Warm up the next image so tapping forward feels instant.
      var upcoming = frames[current + 1];
      if (upcoming && !isVideo(upcoming.slide.type)) { var pre = new Image(); pre.src = upcoming.slide.url; }
    }

    function next() {
      if (current >= frames.length - 1) destroy();
      else show(current + 1);
    }
    function prev() {
      show(Math.max(0, current - 1));
    }

    function setPaused(value) {
      paused = value;
      btnPause.innerHTML = paused ? ICONS.play : ICONS.pause;
      btnPause.setAttribute("aria-label", paused ? t.play : t.pause);
      frame.classList.toggle("is-paused", paused);
      if (player) { if (paused) player.pause(); else player.resume(); }
      else if (paused) { cancelAnimationFrame(rafId); imageElapsed += performance.now() - imageStartedAt; }
      else { imageStartedAt = performance.now(); rafId = requestAnimationFrame(tickImage); }
    }

    function syncMute() {
      btnMute.innerHTML = state.muted ? ICONS.muted : ICONS.volume;
      btnMute.setAttribute("aria-label", state.muted ? t.unmute : t.mute);
    }

    // Tap = navigate, press-and-hold = pause (like Instagram).
    var holdTimer = 0;
    var held = false;
    function bindTap(zone, action) {
      zone.addEventListener("pointerdown", function () {
        held = false;
        holdTimer = setTimeout(function () { held = true; setPaused(true); }, 220);
      });
      zone.addEventListener("pointerup", function () {
        clearTimeout(holdTimer);
        if (held) setPaused(false);
        else action();
      });
      zone.addEventListener("pointerleave", function () {
        clearTimeout(holdTimer);
        if (held) { held = false; setPaused(false); }
      });
    }
    bindTap(tapPrev, prev);
    bindTap(tapNext, next);

    // Swipe down to close on touch screens.
    var startY = null;
    frame.addEventListener("touchstart", function (e) { startY = e.touches[0].clientY; }, { passive: true });
    frame.addEventListener("touchend", function (e) {
      if (startY !== null && e.changedTouches[0].clientY - startY > 90) destroy();
      startY = null;
    });

    btnPause.onclick = function () { setPaused(!paused); };
    btnMute.onclick = function () {
      state.muted = !state.muted;
      if (player) player.setMuted(state.muted);
      syncMute();
    };
    btnClose.onclick = function () { destroy(); };
    arrowPrev.onclick = prev;
    arrowNext.onclick = next;
    overlay.addEventListener("click", function (e) { if (e.target === overlay) destroy(); });

    function onKey(e) {
      if (e.key === "Escape") destroy();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === " ") { e.preventDefault(); setPaused(!paused); }
    }
    document.addEventListener("keydown", onKey);

    function onVisibility() { if (document.hidden && !paused) setPaused(true); }
    document.addEventListener("visibilitychange", onVisibility);

    var destroyed = false;
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(holdTimer);
      if (player) player.destroy();
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
      overlay.remove();
      unlock();
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    document.body.appendChild(overlay);
    show(startFrame);
    btnClose.focus();
  }

  // ─── Tiles ────────────────────────────────────────────────────────────────

  function badgeFor(post) {
    if (isVideo(post.mediaType)) return ICONS.reel;
    if (post.mediaType === "CAROUSEL_ALBUM") return ICONS.carousel;
    return null;
  }

  function tileEl(state, post, index, opener) {
    var feed = state.feed;
    // Custom media has no Instagram post to redirect to, so it always opens the viewer.
    var redirect = feed.onPostClick === "redirect" && post.source === "instagram" && opener === openPopup;
    var tile = redirect
      ? el("a", "tg-if-item", { href: post.permalink, target: "_blank", rel: "noopener noreferrer" })
      : el("button", "tg-if-item", { type: "button", "aria-label": (post.caption || t.view).slice(0, 80) });

    var media = el("span", "tg-if-media");
    media.appendChild(feedMediaEl(post, feed.postFit === "contain" ? "contain" : "cover"));

    var overlay = el("span", "tg-if-overlay");
    overlay.innerHTML = post.source === "instagram" ? ICONS.instagramLarge : isVideo(post.mediaType) ? ICONS.playBig : "";
    if (post.caption) {
      var text = el("span", "tg-if-overlay-text");
      text.textContent = post.caption;
      overlay.appendChild(text);
    }
    if (overlay.childNodes.length) media.appendChild(overlay);

    var badge = badgeFor(post);
    if (badge) {
      var b = el("span", "tg-if-badge");
      b.innerHTML = badge;
      media.appendChild(b);
    }
    tile.appendChild(media);

    if (!redirect) tile.addEventListener("click", function () { opener(state, index); });
    return tile;
  }

  // ─── Layouts ──────────────────────────────────────────────────────────────

  function renderGrid(state) {
    var feed = state.feed;
    var desktopMax = feed.rowsDesktop * feed.colsDesktop;
    var mobileMax = feed.rowsMobile * feed.colsMobile;
    var grid = el("div", "tg-if-grid");
    state.posts.slice(0, Math.max(desktopMax, mobileMax)).forEach(function (post, i) {
      var tile = tileEl(state, post, i, openPopup);
      if (i >= mobileMax) tile.classList.add("tg-if-desktop-only");
      else if (i >= desktopMax) tile.classList.add("tg-if-mobile-only");
      grid.appendChild(tile);
    });
    return grid;
  }

  // Collage: a large feature tile followed by smaller tiles.
  function renderMosaic(state) {
    var feed = state.feed;
    var grid = el("div", "tg-if-mosaic");
    var count = Math.max(5, feed.rowsDesktop * feed.colsDesktop - 3);
    state.posts.slice(0, count).forEach(function (post, i) {
      var tile = tileEl(state, post, i, openPopup);
      if (i === 0) tile.classList.add("tg-if-feature");
      grid.appendChild(tile);
    });
    return grid;
  }

  // Masonry: natural image heights in balanced columns.
  function renderMasonry(state) {
    var feed = state.feed;
    var wall = el("div", "tg-if-masonry");
    state.posts.slice(0, feed.rowsDesktop * feed.colsDesktop).forEach(function (post, i) {
      wall.appendChild(tileEl(state, post, i, openPopup));
    });
    return wall;
  }

  function sliderShell(state, className, items) {
    var wrap = el("div", "tg-if-slider-wrap" + (state.feed.showSliderPreviews ? " tg-if-peek" : ""));
    var track = el("div", className);
    items.forEach(function (node) { track.appendChild(node); });

    var prev = iconButton("tg-if-arrow tg-if-arrow-prev", ICONS.chevronLeft, t.prev);
    var next = iconButton("tg-if-arrow tg-if-arrow-next", ICONS.chevronRight, t.next);
    function step(dir) { track.scrollBy({ left: dir * track.clientWidth * 0.85, behavior: reduceMotion ? "auto" : "smooth" }); }
    function sync() {
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    }
    prev.onclick = function () { step(-1); };
    next.onclick = function () { step(1); };
    track.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    setTimeout(sync, 0);

    wrap.appendChild(prev);
    wrap.appendChild(track);
    wrap.appendChild(next);
    return wrap;
  }

  function renderSlider(state) {
    return sliderShell(state, "tg-if-slider", state.posts.map(function (post, i) { return tileEl(state, post, i, openPopup); }));
  }

  // Reels: tall 9:16 cards that autoplay muted and open the full-screen viewer.
  function renderReels(state) {
    var cards = state.posts.map(function (post, i) {
      var tile = tileEl(state, post, i, openStories);
      tile.classList.add("tg-if-reel");
      if (post.caption) {
        var cap = el("span", "tg-if-reel-caption");
        cap.textContent = post.caption;
        tile.querySelector(".tg-if-media").appendChild(cap);
      }
      return tile;
    });
    return sliderShell(state, "tg-if-slider tg-if-reels", cards);
  }

  // Stories bar: Instagram-style gradient rings that open the story viewer.
  function renderStories(state) {
    var row = el("div", "tg-if-stories");
    state.posts.forEach(function (post, i) {
      var item = el("button", "tg-if-story-bubble", { type: "button", "aria-label": (post.caption || t.view).slice(0, 80) });
      var ring = el("span", "tg-if-story-ring");
      var pic = el("span", "tg-if-story-pic");
      var thumb = post.thumbnailUrl || (isVideo(post.mediaType) ? null : post.mediaUrl);
      if (thumb) {
        var img = el("img", null, { loading: "lazy", alt: "" });
        img.src = thumb;
        pic.appendChild(forceVisible(img, { width: "100%", height: "100%", "object-fit": "cover" }));
      } else {
        pic.appendChild(feedMediaEl(post, "cover"));
      }
      ring.appendChild(pic);
      item.appendChild(ring);
      if (post.caption) {
        var label = el("span", "tg-if-story-label");
        label.textContent = post.caption.split(/\s+/).slice(0, 2).join(" ");
        item.appendChild(label);
      }
      item.addEventListener("click", function () {
        item.classList.add("is-seen");
        openStories(state, i);
      });
      row.appendChild(item);
    });
    return row;
  }

  function renderList(state) {
    var list = el("div", "tg-if-list");
    state.posts.slice(0, state.feed.rowsDesktop * state.feed.colsDesktop).forEach(function (post, i) {
      var row = el("div", "tg-if-row");
      row.appendChild(tileEl(state, post, i, openPopup));
      if (post.caption) {
        var caption = el("p", "tg-if-list-caption");
        caption.textContent = post.caption;
        row.appendChild(caption);
      }
      list.appendChild(row);
    });
    return list;
  }

  function renderFloating(state) {
    var bubble = el("button", "tg-if-floating", { type: "button", "aria-label": t.view });
    var first = state.posts[0];
    if (first.thumbnailUrl || !isVideo(first.mediaType)) {
      var img = el("img", null, { alt: "" });
      img.src = first.thumbnailUrl || first.mediaUrl;
      bubble.appendChild(forceVisible(img, { width: "100%", height: "100%", "object-fit": "cover" }));
    } else {
      bubble.appendChild(feedMediaEl(first, "cover"));
    }
    bubble.onclick = function () { openStories(state, 0); };
    return bubble;
  }

  var LAYOUTS = {
    grid: renderGrid,
    mosaic: renderMosaic,
    masonry: renderMasonry,
    slider: renderSlider,
    reels: renderReels,
    stories: renderStories,
    list: renderList,
  };

  // ─── Section ──────────────────────────────────────────────────────────────

  function applyVars(root, feed) {
    var circle = feed.postShape === "circle" && feed.layout !== "reels" && feed.layout !== "masonry";
    root.classList.toggle("tg-if-shape-circle", circle);
    root.style.setProperty("--tg-if-gap", (SPACING_PX[feed.postSpacing] != null ? SPACING_PX[feed.postSpacing] : 8) + "px");
    root.style.setProperty("--tg-if-size", (SIZE_PX[feed.postSize] || 260) + "px");
    root.style.setProperty("--tg-if-fit", feed.postFit === "contain" ? "contain" : "cover");
    root.style.setProperty("--tg-if-cols", feed.colsMobile || 2);
    root.style.setProperty("--tg-if-cols-desktop", feed.colsDesktop || 4);
    root.style.setProperty("--tg-if-ratio", circle ? "1 / 1" : String(feed.aspectRatio || "3:4").replace(":", " / "));
    root.style.setProperty("--tg-if-radius", circle ? "9999px" : (feed.cornerRadius || 0) + "px");
  }

  function renderHeader(root, state) {
    var heading = root.getAttribute("data-heading") || state.feed.title;
    if (!heading && !state.username) return null;

    var header = el("div", "tg-if-header");
    if (heading) {
      var h = el("h2", "tg-if-title");
      h.textContent = heading;
      header.appendChild(h);
    }
    if (state.username) {
      var handle = el("a", "tg-if-handle", { href: "https://www.instagram.com/" + encodeURIComponent(state.username) + "/", target: "_blank", rel: "noopener noreferrer" });
      handle.innerHTML = ICONS.instagram;
      handle.appendChild(document.createTextNode("@" + state.username));
      header.appendChild(handle);
    }
    return header;
  }

  function renderSkeleton(root) {
    var grid = el("div", "tg-if-grid tg-if-skeleton-grid");
    for (var i = 0; i < 4; i++) grid.appendChild(el("div", "tg-if-skeleton"));
    root.appendChild(grid);
  }

  function render(root, data) {
    var feed = data.feed || {};
    // `muted` is shared by all viewers on the page so the shopper's choice sticks.
    var state = { feed: feed, posts: data.posts || [], username: data.username, muted: false };
    root.innerHTML = "";
    root.setAttribute("data-layout", feed.layout || "grid");
    applyVars(root, feed);

    if (!state.posts.length) {
      // Only tell the merchant in the theme editor; stay invisible for shoppers.
      if (window.Shopify && window.Shopify.designMode) {
        var empty = el("p", "tg-if-empty");
        empty.textContent = t.empty;
        root.appendChild(empty);
      }
      return;
    }

    if (feed.layout === "floating") {
      root.appendChild(renderFloating(state));
      return;
    }

    var inner = el("div", "tg-if-inner");
    var header = renderHeader(root, state);
    if (header) inner.appendChild(header);
    inner.appendChild((LAYOUTS[feed.layout] || renderGrid)(state));
    root.appendChild(inner);
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────

  var request = null;
  function loadFeed() {
    if (!request) {
      request = (function tryBase(i) {
        if (i >= PROXY_BASES.length) return Promise.reject(new Error("App proxy not reachable"));
        return fetch(PROXY_BASES[i] + "/api/instafeed", { headers: { Accept: "application/json" } })
          .then(function (res) {
            var isJson = (res.headers.get("content-type") || "").indexOf("application/json") !== -1;
            if (!res.ok || !isJson) throw new Error("HTTP " + res.status);
            return res.json();
          })
          .then(function (data) {
            if (!data || !Array.isArray(data.posts)) throw new Error("Not our app");
            return data;
          })
          .catch(function () { return tryBase(i + 1); });
      })(0);
    }
    return request;
  }

  function init() {
    var roots = document.querySelectorAll("[data-tg-instafeed]:not([data-tg-ready])");
    if (!roots.length) return;

    Array.prototype.forEach.call(roots, function (root) {
      root.setAttribute("data-tg-ready", "true");
      // Skeleton appears only if the merchant enabled it — the flag arrives with the data,
      // so the last known value is cached to avoid a flash on repeat visits.
      try { if (localStorage.getItem("tg-if-skeleton") === "1") renderSkeleton(root); } catch (e) { /* storage blocked */ }
    });

    loadFeed()
      .then(function (data) {
        try { localStorage.setItem("tg-if-skeleton", data.feed && data.feed.showLoadingAnimation ? "1" : "0"); } catch (e) { /* storage blocked */ }
        Array.prototype.forEach.call(roots, function (root) { render(root, data); });
      })
      .catch(function () {
        Array.prototype.forEach.call(roots, function (root) {
          root.innerHTML = "";
          if (window.Shopify && window.Shopify.designMode) {
            var msg = el("p", "tg-if-empty");
            msg.textContent = t.error;
            root.appendChild(msg);
          }
        });
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // Theme editor: re-render when the block is added or its settings change.
  document.addEventListener("shopify:section:load", function () { request = null; init(); });
})();
