(function () {
  "use strict";

  const PLAN = window.PLAN;
  const KEY = "linkedin-week:" + PLAN.week.start;
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const STATUSES = ["draft", "ready", "scheduled", "posted"];
  const LIMIT = 3000; // LinkedIn's post character limit
  const FOLD = 210;   // roughly where "…see more" cuts in
  const PLACEHOLDER = /\[[^\]\n]+\]/g;

  // ---------- state ----------
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  const state = Object.assign({ posts: {}, comments: {}, checklist: {}, selected: null }, load());
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
  }

  const items = () => PLAN.days.concat(PLAN.previous);
  const find = (id) => items().find((d) => d.id === id);
  const weekPosts = () => PLAN.days.filter((d) => d.kind === "post");

  const textOf = (p) => (state.posts[p.id] && state.posts[p.id].text != null ? state.posts[p.id].text : p.text);
  const statusOf = (p) => (state.posts[p.id] && state.posts[p.id].status) || p.status || "draft";
  const imageOf = (p) => (state.posts[p.id] && state.posts[p.id].image != null ? state.posts[p.id].image : p.image || "");
  function attachOf(p) {
    const s = state.posts[p.id];
    const has = !!imageOf(p);
    return s && s.attach != null ? s.attach && has : has;
  }
  // Your own images live in IndexedDB (localStorage is too small for them).
  const localUrls = {};
  const isLocal = (img) => img.startsWith("local:");
  const srcOf = (p) => {
    const img = imageOf(p);
    return isLocal(img) ? localUrls[p.id] || "" : img;
  };
  function idb(mode, fn) {
    return new Promise((resolve, reject) => {
      const open = indexedDB.open("linkedin-week-images", 1);
      open.onupgradeneeded = () => open.result.createObjectStore("images");
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const tx = open.result.transaction("images", mode);
        const req = fn(tx.objectStore("images"));
        tx.oncomplete = () => resolve(req && req.result);
        tx.onerror = () => reject(tx.error);
      };
    });
  }
  const imgKey = (id) => KEY + ":" + id;
  const saveImage = (id, blob) => idb("readwrite", (s) => s.put(blob, imgKey(id)));
  const loadImage = (id) => idb("readonly", (s) => s.get(imgKey(id)));
  function dropLocal(id) {
    if (localUrls[id]) {
      URL.revokeObjectURL(localUrls[id]);
      delete localUrls[id];
    }
    idb("readwrite", (s) => s.delete(imgKey(id))).catch(() => {});
  }
  function useOwnImage(d, file) {
    if (!d || d.kind !== "post" || !file) return;
    if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) {
      $("imgMsg").textContent = "Pick a PNG, JPG, GIF, or WebP image.";
      return;
    }
    if (localUrls[d.id]) URL.revokeObjectURL(localUrls[d.id]);
    localUrls[d.id] = URL.createObjectURL(file);
    setPost(d.id, { image: "local:" + file.name, imageSize: file.size, attach: true });
    saveImage(d.id, file).catch(() => {
      $("imgMsg").textContent = "Couldn't save the image in this browser, so it will be gone after a refresh.";
    });
    $("imgUrl").value = "";
    updateAnalysis(d);
    renderWeek();
  }

  function setPost(id, patch) {
    state.posts[id] = Object.assign({}, state.posts[id], patch);
    save();
  }
  const commentsOf = (d) => state.comments[d.id] || 0;
  const checkedOf = (i) => (state.checklist[i] != null ? state.checklist[i] : PLAN.checklist[i].done);

  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function parseDate(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function todayISO() {
    const t = new Date();
    return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
  }
  function dayLabel(iso) {
    const d = parseDate(iso);
    return DAY_NAMES[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()];
  }

  // ---------- post analysis ----------
  function analyze(text) {
    const t = text.trim();
    const chars = t.length;
    const words = t.split(/\s+/).filter(Boolean).length;
    const placeholders = t.match(PLACEHOLDER) || [];
    const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);
    const firstLine = lines[0] || "";
    const body = lines.filter((l) => !/^(#\w+\s*)+$/.test(l));
    const lastLine = body[body.length - 1] || "";
    const emDashes = (t.match(/—/g) || []).length;
    const hashtags = (t.match(/(^|\s)#\w+/g) || []).length;
    const hasLink = /https?:\/\/\S+/.test(t);

    const checks = [];
    checks.push(placeholders.length
      ? { level: "bad", msg: placeholders.length + " placeholder" + (placeholders.length > 1 ? "s" : "") + " left to fill in" }
      : { level: "ok", msg: "No placeholders left" });

    if (chars > LIMIT) checks.push({ level: "bad", msg: "Over LinkedIn's 3,000-character limit" });
    else if (chars < 900) checks.push({ level: "warn", msg: "Short: under 900 characters" });
    else if (chars <= 1300) checks.push({ level: "ok", msg: "In the 900–1,300 character sweet spot" });
    else checks.push({ level: "ok", msg: "Long-form (1,300+ characters is fine)" });

    if (firstLine.endsWith("?")) checks.push({ level: "warn", msg: "Opens with a question (these tend to get fewer likes)" });
    checks.push(lastLine.endsWith("?")
      ? { level: "ok", msg: "Ends with a question" }
      : { level: "warn", msg: "No closing question" });
    if (emDashes > Math.max(1, Math.floor(words / 100))) checks.push({ level: "warn", msg: emDashes + " em dashes (keep to about 1 per 100 words)" });
    if (hashtags > 2) checks.push({ level: "warn", msg: hashtags + " hashtags (0–2 works best)" });
    if (hasLink) checks.push({ level: "warn", msg: "Link in the body: move it to the first comment" });

    return { chars, words, placeholders, checks };
  }

  function renderText(s) {
    return esc(s).replace(PLACEHOLDER, (m) => "<mark>" + m + "</mark>").replace(/\n/g, "<br>");
  }

  // ---------- week strip ----------
  function renderWeek() {
    const today = todayISO();
    $("week").innerHTML = PLAN.days.map((d) => {
      let sub = "Off";
      let badge = "";
      if (d.kind === "post") {
        const st = statusOf(d);
        sub = d.time + " · " + d.goal + (attachOf(d) ? " · 🖼" : "");
        badge = '<span class="status s-' + st + '">' + st + "</span>";
      } else if (d.kind === "comment") {
        sub = "Commenting";
        badge = '<span class="status">' + commentsOf(d) + "/" + d.commentTarget + " comments</span>";
      }
      const cls = ["day", d.kind, state.selected === d.id ? "sel" : "", d.date === today ? "today" : ""].join(" ");
      return '<button class="' + cls + '" data-id="' + d.id + '">' +
        '<span class="d-name">' + esc(dayLabel(d.date)) + "</span>" +
        '<span class="d-sub">' + esc(sub) + "</span>" + badge + "</button>";
    }).join("");
  }

  // ---------- detail panel ----------
  function commentsBlock(d) {
    if (!d.commentTarget) return "";
    return '<div class="comments">' +
      "<h3>Comments on other people's posts</h3>" +
      "<p><strong>Whose posts:</strong> " + esc(d.whom) + "</p>" +
      "<p><strong>How:</strong> " + esc(d.how) + "</p>" +
      '<div class="counter">' +
      '<button data-act="dec" aria-label="One fewer comment">−</button>' +
      '<span class="n" id="commentCount">' + commentsOf(d) + " / " + d.commentTarget + "</span>" +
      '<button data-act="inc" aria-label="One more comment">+</button>' +
      "</div></div>";
  }

  function renderDetail() {
    const d = find(state.selected);
    const el = $("detail");
    if (!d) { el.innerHTML = "<p>Pick a day above.</p>"; return; }

    if (d.kind === "off") {
      el.innerHTML = "<h2>" + esc(dayLabel(d.date)) + "</h2><p class='muted'>Rest day. No posts, no comment quota.</p>";
      return;
    }
    if (d.kind === "comment") {
      el.innerHTML = "<h2>" + esc(dayLabel(d.date)) + " · " + esc(d.title) + "</h2>" +
        "<p class='muted'>No post today. Spend the time commenting; comments bring in more inbound than posts.</p>" +
        commentsBlock(d);
      return;
    }

    const st = statusOf(d);
    el.innerHTML =
      "<h2>" + esc(dayLabel(d.date)) + " · " + esc(d.time) + " " + esc(PLAN.week.timezone) + "</h2>" +
      '<div class="chips">' +
      [d.pillar, d.format, d.formula, "Goal: " + d.goal].map((c) => '<span class="chip">' + esc(c) + "</span>").join("") +
      "</div>" +
      '<p class="angle">' + esc(d.angle) + "</p>" +
      (d.note ? '<p class="note">' + esc(d.note) + "</p>" : "") +
      '<div class="editor-grid">' +
      "<div>" +
      '<div class="label-row"><label for="postText">Post text</label><span id="charCount"></span></div>' +
      '<textarea id="postText" spellcheck="true"></textarea>' +
      "</div>" +
      "<div>" +
      '<div class="label-row"><span>Feed preview</span><span>' + FOLD + ' chars before "…see more"</span></div>' +
      '<div class="preview" id="preview"></div>' +
      "</div>" +
      "</div>" +
      '<div class="image-box">' +
      "<h3>Image</h3>" +
      '<label class="attach"><input type="checkbox" id="attachImg"> <span>Attach image to this post</span></label>' +
      '<div class="img-row">' +
      '<input type="url" id="imgUrl" placeholder="Paste an image URL, or upload / drop your own" aria-label="Image URL">' +
      '<label class="btn ghost file-btn">Upload your own' +
      '<input type="file" id="imgFile" accept="image/png,image/jpeg,image/gif,image/webp" hidden></label>' +
      '<button class="btn ghost" data-act="clear-img">Remove image</button>' +
      "</div>" +
      '<img id="imgThumb" class="thumb" alt="Image preview" hidden>' +
      '<p class="muted small" id="imgMsg"></p>' +
      "</div>" +
      '<ul class="checks" id="checks"></ul>' +
      '<div class="row">' +
      '<div class="seg" role="group" aria-label="Status">' +
      STATUSES.map((s) => '<button data-status="' + s + '" class="' + (s === st ? "on" : "") + '">' + s + "</button>").join("") +
      "</div>" +
      '<button class="btn" data-act="copy">Copy text</button>' +
      '<button class="btn ghost" data-act="reset">Reset to original</button>' +
      "</div>" +
      commentsBlock(d);

    $("postText").value = textOf(d);
    $("imgUrl").value = isLocal(imageOf(d)) ? "" : imageOf(d);
    $("imgThumb").addEventListener("error", () => {
      $("imgMsg").textContent = "Couldn't load this image. Check the URL.";
    });
    updateAnalysis(d);
  }

  let expanded = false;
  function updateAnalysis(d) {
    const text = textOf(d);
    const a = analyze(text);
    $("charCount").textContent = a.chars.toLocaleString() + " / " + LIMIT.toLocaleString();
    const img = imageOf(d);
    const attach = attachOf(d);
    const checks = a.checks.slice();
    const src = srcOf(d);
    const local = isLocal(img);
    const size = (state.posts[d.id] && state.posts[d.id].imageSize) || 0;
    if (attach) checks.push({ level: "ok", msg: local ? "Your own image attached" : "Image attached" });
    if (attach && local) checks.push({ level: "warn", msg: "Your own image needs a hosted link before it can be scheduled (see README)" });
    if (attach && local && size > 5 * 1024 * 1024) checks.push({ level: "warn", msg: "Image is over 5 MB; LinkedIn may reject it" });
    if (!attach && /image/i.test(d.format || "")) checks.push({ level: "warn", msg: "Planned with an image, but none is attached" });
    $("checks").innerHTML = checks.map((c) => '<li class="' + c.level + '">' + esc(c.msg) + "</li>").join("");

    const box = $("attachImg");
    box.checked = attach;
    box.disabled = !img;
    const thumb = $("imgThumb");
    if (img && src) {
      if (thumb.getAttribute("src") !== src) {
        thumb.src = src;
        $("imgMsg").textContent = "";
      }
      thumb.hidden = false;
      thumb.classList.toggle("dim", !attach);
      if (local) {
        $("imgMsg").textContent = "Your image: " + img.slice(6) +
          (size ? " (" + (size / 1024 / 1024).toFixed(1) + " MB)" : "") + ". Saved in this browser only.";
      }
    } else if (img) {
      thumb.hidden = true;
      $("imgMsg").textContent = "Loading your image…";
    } else {
      thumb.hidden = true;
      thumb.removeAttribute("src");
      $("imgMsg").textContent = "No image yet. Paste an image URL, or upload or drop your own.";
    }

    const t = text.trim();
    const cut = !expanded && t.length > FOLD;
    const shown = cut ? t.slice(0, FOLD).replace(/\s+\S*$/, "") : t;
    $("preview").innerHTML =
      '<div class="author"><div class="avatar">You</div><div><strong>You</strong><div class="muted" style="font-size:12px">' +
      esc(dayLabel(d.date)) + " · " + esc(d.time) + "</div></div></div>" +
      renderText(shown) + (cut ? ' <span class="more" data-act="more">…see more</span>' : "") +
      (attach && src ? '<img class="post-img" src="' + esc(src) + '" alt="Post image">' : "");
  }

  // ---------- side panels ----------
  function renderSide() {
    const posts = weekPosts();
    const count = (s) => posts.filter((p) => statusOf(p) === s).length;
    const doneish = posts.filter((p) => ["scheduled", "posted"].includes(statusOf(p))).length;
    const placeholders = posts.reduce((n, p) => n + (textOf(p).match(PLACEHOLDER) || []).length, 0);
    const commentDays = PLAN.days.filter((d) => d.commentTarget);
    const cDone = commentDays.reduce((n, d) => n + commentsOf(d), 0);
    const cGoal = commentDays.reduce((n, d) => n + d.commentTarget, 0);
    const pct = (a, b) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0);

    $("progress").innerHTML =
      "<h3>This week</h3>" +
      '<div class="stat"><span>Posts scheduled or posted</span><strong>' + doneish + " / " + posts.length + "</strong></div>" +
      '<div class="bar"><span style="width:' + pct(doneish, posts.length) + '%"></span></div>' +
      '<div class="stat"><span>Comments made</span><strong>' + cDone + " / " + cGoal + "</strong></div>" +
      '<div class="bar"><span style="width:' + pct(cDone, cGoal) + '%"></span></div>' +
      '<div class="stat"><span>Draft · Ready</span><strong>' + count("draft") + " · " + count("ready") + "</strong></div>" +
      '<div class="stat"><span>Placeholders left</span><strong>' + placeholders + "</strong></div>";

    $("checklist").innerHTML = '<h3>Weekly checklist</h3><div class="checklist">' +
      PLAN.checklist.map((c, i) =>
        '<label><input type="checkbox" data-check="' + i + '"' + (checkedOf(i) ? " checked" : "") + "> <span>" + esc(c.text) + "</span></label>"
      ).join("") + "</div>";

    $("previous").innerHTML = "<h3>Earlier posts</h3>" + (PLAN.previous.length
      ? PLAN.previous.map((p) =>
        '<button class="prev-item" data-id="' + p.id + '"><strong>' + esc(dayLabel(p.date)) + " · " + esc(p.time) + "</strong>" +
        '<span class="muted" style="font-size:13px">' + esc(p.angle) + "</span>" +
        '<span class="status s-' + statusOf(p) + '">' + statusOf(p) + "</span></button>"
      ).join("")
      : "<p class='muted'>None yet.</p>");
  }

  function renderAll() {
    renderWeek();
    renderDetail();
    renderSide();
  }

  function select(id) {
    state.selected = id;
    expanded = false;
    save();
    try { history.replaceState(null, "", "#" + id); } catch (e) { /* file:// in some browsers */ }
    renderAll();
  }

  // ---------- events ----------
  document.addEventListener("click", (e) => {
    const dayBtn = e.target.closest("[data-id]");
    if (dayBtn) { select(dayBtn.dataset.id); return; }

    const d = find(state.selected);
    const statusBtn = e.target.closest("[data-status]");
    if (statusBtn && d) {
      setPost(d.id, { status: statusBtn.dataset.status });
      renderAll();
      return;
    }

    const act = e.target.closest("[data-act]");
    if (!act || !d) return;
    switch (act.dataset.act) {
      case "inc":
      case "dec": {
        const n = Math.max(0, commentsOf(d) + (act.dataset.act === "inc" ? 1 : -1));
        state.comments[d.id] = n;
        save();
        $("commentCount").textContent = n + " / " + d.commentTarget;
        renderWeek();
        renderSide();
        break;
      }
      case "copy": {
        const text = textOf(d).trim();
        const done = () => { act.textContent = "Copied"; setTimeout(() => (act.textContent = "Copy text"), 1500); };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, fallbackCopy);
        else fallbackCopy();
        function fallbackCopy() {
          const ta = $("postText");
          ta.select();
          try { document.execCommand("copy"); done(); } catch (err) { /* ignore */ }
        }
        break;
      }
      case "reset":
        if (confirm("Replace your edits with the original draft?")) {
          if (isLocal(imageOf(d))) dropLocal(d.id);
          setPost(d.id, { text: null, image: null, attach: null, imageSize: null });
          renderAll();
        }
        break;
      case "clear-img":
        if (isLocal(imageOf(d))) dropLocal(d.id);
        setPost(d.id, { image: "", attach: false, imageSize: null });
        $("imgUrl").value = "";
        updateAnalysis(d);
        renderWeek();
        break;
      case "more":
        expanded = true;
        updateAnalysis(d);
        break;
    }
  });

  document.addEventListener("input", (e) => {
    if (e.target.id === "postText") {
      const d = find(state.selected);
      setPost(d.id, { text: e.target.value });
      updateAnalysis(d);
      renderSide();
    } else if (e.target.id === "imgUrl") {
      const d = find(state.selected);
      if (isLocal(imageOf(d))) dropLocal(d.id);
      setPost(d.id, { image: e.target.value.trim(), imageSize: null });
      updateAnalysis(d);
      renderWeek();
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.dataset.check != null) {
      state.checklist[e.target.dataset.check] = e.target.checked;
      save();
    } else if (e.target.id === "imgFile") {
      if (e.target.files[0]) useOwnImage(find(state.selected), e.target.files[0]);
      e.target.value = "";
    } else if (e.target.id === "attachImg") {
      const d = find(state.selected);
      setPost(d.id, { attach: e.target.checked });
      updateAnalysis(d);
      renderWeek();
    }
  });

  // Drop an image file anywhere on the Image section.
  document.addEventListener("dragover", (e) => {
    if (e.target.closest && e.target.closest(".image-box")) e.preventDefault();
  });
  document.addEventListener("drop", (e) => {
    if (!(e.target.closest && e.target.closest(".image-box"))) return;
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) useOwnImage(find(state.selected), f);
  });

  $("exportBtn").addEventListener("click", () => {
    const out = {
      week: PLAN.week,
      posts: items().filter((d) => d.kind === "post").map((p) => ({
        id: p.id, date: p.date, time: p.time, formula: p.formula, goal: p.goal,
        status: statusOf(p), text: textOf(p).trim(), image: !attachOf(p) ? null : isLocal(imageOf(p)) ? "your own file: " + imageOf(p).slice(6) : imageOf(p),
      })),
      comments: state.comments,
      checklist: PLAN.checklist.map((c, i) => ({ text: c.text, done: checkedOf(i) })),
    };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "linkedin-week-" + PLAN.week.start + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("resetAllBtn").addEventListener("click", () => {
    if (!confirm("Clear all edits, statuses, and comment counts for this week?")) return;
    items().forEach((p) => { if (isLocal(imageOf(p))) dropLocal(p.id); });
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    state.posts = {}; state.comments = {}; state.checklist = {};
    renderAll();
  });

  // ---------- boot ----------
  $("weekLabel").textContent = PLAN.week.label + " · times in " + PLAN.week.timezone;
  const fromHash = find(decodeURIComponent(location.hash.slice(1)));
  if (fromHash) {
    state.selected = fromHash.id;
  } else if (!find(state.selected)) {
    const today = PLAN.days.find((d) => d.date === todayISO());
    state.selected = (today || weekPosts()[0] || PLAN.days[0]).id;
  }
  renderAll();

  // Bring back your own images saved in IndexedDB.
  items().forEach((p) => {
    if (!isLocal(imageOf(p))) return;
    loadImage(p.id).then((blob) => {
      if (!blob) return;
      localUrls[p.id] = URL.createObjectURL(blob);
      if (state.selected === p.id) updateAnalysis(p);
    }).catch(() => {});
  });
})();
