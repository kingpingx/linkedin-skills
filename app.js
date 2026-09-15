(function () {
  "use strict";

  const PLAN = window.PLAN;
  PLAN.days.sort((a, b) => a.date.localeCompare(b.date)); // days can be moved around in data.js
  const KEY = "linkedin-week:" + PLAN.week.start;
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const STATUSES = ["draft", "ready", "scheduled", "posted"];
  const LIMIT = 3000; // LinkedIn's post character limit
  const FOLD = 210;   // roughly where "…see more" cuts in
  const PLACEHOLDER = /\[[^\]\n]+\]/g;

  // Everything you can do on LinkedIn in a day. Every day gets a tab for each.
  const ACTS = [
    { key: "post", label: "Post", icon: "✍️" },
    {
      key: "comment", label: "Comment", plural: "Comments", icon: "💬",
      tip: "Comment on other people's posts. Thoughtful comments bring in more people than an extra post does.",
      hint: "What you'll say, or whose post it is",
    },
    {
      key: "like", label: "Like", plural: "Likes", icon: "👍",
      tip: "Like posts from people you want to notice you. It's the lightest way to show up in their notifications.",
      hint: "Whose post",
    },
    {
      key: "reply", label: "Reply", plural: "Replies", icon: "↩️",
      tip: "Reply to comments on your own posts, ideally within the first hour. Each reply keeps the conversation (and the post) going.",
      hint: "Who commented, or your reply",
    },
    {
      key: "repost", label: "Repost", plural: "Reposts", icon: "🔁",
      tip: "Repost with a line of your own on top. Plain reposts get very little reach.",
      hint: "The line you'll add on top",
    },
  ];
  const ACT = Object.fromEntries(ACTS.map((a) => [a.key, a]));
  const DO_ACTS = ACTS.filter((a) => a.key !== "post");

  // ---------- state ----------
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  const state = Object.assign(
    { posts: {}, extraPosts: {}, counts: {}, targets: {}, logs: {}, checklist: {}, selected: null, tab: null },
    load()
  );
  // Older versions stored only comment counts.
  if (state.comments) {
    Object.keys(state.comments).forEach((id) => {
      state.counts[id] = Object.assign({ comment: state.comments[id] }, state.counts[id]);
    });
    delete state.comments;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
  }

  const items = () => PLAN.days.concat(PLAN.previous);
  const find = (id) => items().find((d) => d.id === id);
  const isDay = (d) => PLAN.days.includes(d);
  const hasPost = (d) => d.kind === "post" || !!state.extraPosts[d.id];
  const postDays = () => PLAN.days.filter(hasPost);
  const timeOf = (d) => (state.extraPosts[d.id] && state.extraPosts[d.id].time) || d.time || "";

  const textOf = (p) => (state.posts[p.id] && state.posts[p.id].text != null ? state.posts[p.id].text : p.text || "");
  const statusOf = (p) => (state.posts[p.id] && state.posts[p.id].status) || p.status || "draft";
  const imageOf = (p) => (state.posts[p.id] && state.posts[p.id].image != null ? state.posts[p.id].image : p.image || "");
  function attachOf(p) {
    const s = state.posts[p.id];
    const has = !!imageOf(p);
    return s && s.attach != null ? s.attach && has : has;
  }
  function setPost(id, patch) {
    state.posts[id] = Object.assign({}, state.posts[id], patch);
    save();
  }

  // Daily targets, counters, and saved links per activity.
  function defaultTarget(d, key) {
    if (d.targets && d.targets[key] != null) return d.targets[key];
    if (d.kind === "off") return 0;
    if (key === "comment") return d.commentTarget || 10;
    if (key === "like") return 20;
    if (key === "reply") return hasPost(d) ? 5 : 0;
    return 0;
  }
  const targetOf = (d, key) => {
    const t = state.targets[d.id];
    return t && t[key] != null ? t[key] : defaultTarget(d, key);
  };
  const countOf = (d, key) => (state.counts[d.id] && state.counts[d.id][key]) || 0;
  function setCount(d, key, n) {
    state.counts[d.id] = Object.assign({}, state.counts[d.id], { [key]: Math.max(0, n) });
    save();
  }
  function setTarget(d, key, n) {
    state.targets[d.id] = Object.assign({}, state.targets[d.id], { [key]: Math.max(0, n) });
    save();
  }
  const logOf = (d, key) => (state.logs[d.id] && state.logs[d.id][key]) || [];
  function setLog(d, key, list) {
    state.logs[d.id] = Object.assign({}, state.logs[d.id], { [key]: list });
    save();
  }

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
  const isHttp = (u) => /^https?:\/\/\S+$/i.test(u || "");
  function shortUrl(u) {
    try {
      const x = new URL(u);
      const path = x.pathname.length > 40 ? x.pathname.slice(0, 40) + "…" : x.pathname;
      return x.hostname.replace(/^www\./, "") + path;
    } catch (e) { return u; }
  }
  const pct = (a, b) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0);

  // Calls to serve.py. The custom header is what lets serve.py tell the planner
  // apart from any other website trying to reach it.
  function api(method, path, body) {
    return fetch("api/" + path, {
      method,
      headers: Object.assign({ "X-Planner": "1" }, body ? { "Content-Type": "application/json" } : {}),
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "HTTP " + res.status);
      return data;
    });
  }

  // ---------- Publora (real scheduling, through serve.py) ----------
  const publora = { enabled: false, reason: "To schedule from here, open the planner through python serve.py.", account: "" };
  let published = {}; // fileKey -> { postGroupId, status, scheduledTime, error }
  const busy = {};    // post id -> message shown while a request runs or after it fails
  const PUB_LABEL = {
    draft: "Draft on Publora (not scheduled)",
    scheduled: "Scheduled on Publora",
    pending: "Publishing soon",
    processing: "Publishing now",
    published: "Published on LinkedIn",
    partially_published: "Partly published",
    failed: "Publishing failed",
    unknown: "On Publora",
  };
  const recordOf = (d) => published[fileKey(d.id)] || (d.publoraId ? { postGroupId: d.publoraId, status: "unknown" } : null);
  function fmtWhen(isoStr) {
    const t = new Date(isoStr);
    return isNaN(t) ? "" : t.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  // ---------- your own images (IndexedDB; localStorage is too small) ----------
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
  const imgKey = (id) => KEY + ":" + id;              // IndexedDB key
  const fileKey = (id) => PLAN.week.start + ":" + id; // images.json key
  // With `python serve.py`, your own images are saved as base64 in images.json
  // (one per post, replaced on a new upload). Without it, they stay in this browser.
  let fileStore = false;
  const loadImage = (id) => idb("readonly", (s) => s.get(imgKey(id)));
  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1]);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }
  function fromBase64(b64, type) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
  }
  async function saveImage(id, file) {
    if (!fileStore) return idb("readwrite", (s) => s.put(file, imgKey(id)));
    await api("PUT", "images/" + encodeURIComponent(fileKey(id)),
      { name: file.name, type: file.type, size: file.size, data: await toBase64(file) });
  }
  function dropLocal(id) {
    if (localUrls[id]) {
      URL.revokeObjectURL(localUrls[id]);
      delete localUrls[id];
    }
    if (fileStore) api("DELETE", "images/" + encodeURIComponent(fileKey(id))).catch(() => {});
    idb("readwrite", (s) => s.delete(imgKey(id))).catch(() => {});
  }
  function useOwnImage(d, file) {
    if (!d || !hasPost(d) || !file || !$("imgMsg")) return;
    if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) {
      $("imgMsg").textContent = "Pick a PNG, JPG, GIF, or WebP image.";
      return;
    }
    if (localUrls[d.id]) URL.revokeObjectURL(localUrls[d.id]);
    localUrls[d.id] = URL.createObjectURL(file);
    setPost(d.id, { image: "local:" + file.name, imageSize: file.size, attach: true });
    saveImage(d.id, file).catch(() => {
      $("imgMsg").textContent = "Couldn't save the image, so it will be gone after a refresh.";
    });
    $("imgUrl").value = "";
    updateAnalysis(d);
    renderWeek();
    renderTabs(d);
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
    if (!chars) {
      checks.push({ level: "warn", msg: "Empty post" });
      return { chars, checks };
    }
    checks.push(placeholders.length
      ? { level: "bad", msg: placeholders.length + " placeholder" + (placeholders.length > 1 ? "s" : "") + " left to fill in" }
      : { level: "ok", msg: "No placeholders left" });

    if (chars > LIMIT) checks.push({ level: "bad", msg: "Over LinkedIn's 3,000-character limit" });
    else if (chars < 900) checks.push({ level: "warn", msg: "Short: under 900 characters" });
    else if (chars <= 1300) checks.push({ level: "ok", msg: "In the 900–1,300 character sweet spot" });
    else checks.push({ level: "ok", msg: "Long-form (1,300+ characters is fine)" });

    if (firstLine.endsWith("?")) checks.push({ level: "warn", msg: "Opens with a question (these tend to get fewer likes)" });
    checks.push(/[?？]["”']?$/.test(lastLine)
      ? { level: "ok", msg: "Ends with a question" }
      : { level: "warn", msg: "No closing question" });
    if (emDashes > Math.max(1, Math.floor(words / 100))) checks.push({ level: "warn", msg: emDashes + " em dashes (keep to about 1 per 100 words)" });
    if (hashtags > 2) checks.push({ level: "warn", msg: hashtags + " hashtags (0–2 works best)" });
    if (hasLink) checks.push({ level: "warn", msg: "Link in the body: move it to the first comment" });

    return { chars, checks };
  }

  function renderText(s) {
    return esc(s).replace(PLACEHOLDER, (m) => "<mark>" + m + "</mark>").replace(/\n/g, "<br>");
  }

  // ---------- week strip ----------
  function miniSummary(d) {
    return DO_ACTS.map((a) => {
      const t = targetOf(d, a.key);
      const n = countOf(d, a.key);
      if (!t && !n) return "";
      return '<span class="mini' + (t && n >= t ? " done" : "") + '" title="' + a.label + '">' +
        a.icon + " " + n + (t ? "/" + t : "") + "</span>";
    }).join("");
  }

  function renderWeek() {
    const today = todayISO();
    $("week").innerHTML = PLAN.days.map((d) => {
      let sub;
      let badge = "";
      if (hasPost(d)) {
        const st = statusOf(d);
        sub = (timeOf(d) || "Post") + (d.goal ? " · " + d.goal : "") + (attachOf(d) ? " · 🖼" : "");
        badge = '<span class="status s-' + st + '">' + st + "</span>";
      } else {
        sub = d.kind === "off" ? "Rest day" : "No post";
      }
      const minis = miniSummary(d);
      const quiet = !hasPost(d) && !minis;
      const cls = ["day", quiet ? "quiet" : "", state.selected === d.id ? "sel" : "", d.date === today ? "today" : ""].join(" ");
      return '<button class="' + cls + '" data-id="' + d.id + '">' +
        '<span class="d-name">' + esc(dayLabel(d.date)) + "</span>" +
        '<span class="d-sub">' + esc(sub) + "</span>" + badge +
        (minis ? '<span class="minis">' + minis + "</span>" : "") +
        "</button>";
    }).join("");
  }

  // ---------- detail: tabs ----------
  function currentTab(d) {
    if (ACT[state.tab]) return state.tab;
    return hasPost(d) ? "post" : "comment";
  }

  function tabsInner(d, tab) {
    return ACTS.map((a) => {
      let badge;
      if (a.key === "post") badge = hasPost(d) ? statusOf(d) : "none";
      else {
        const t = targetOf(d, a.key);
        badge = countOf(d, a.key) + (t ? "/" + t : "");
      }
      const on = a.key === tab;
      return '<button role="tab" class="tab' + (on ? " on" : "") + '" data-tab="' + a.key + '" aria-selected="' + on + '">' +
        a.icon + " " + a.label + ' <span class="tab-badge">' + esc(badge) + "</span></button>";
    }).join("");
  }
  function renderTabs(d) {
    const el = $("tabs");
    if (el) el.innerHTML = tabsInner(d, currentTab(d));
  }

  function renderDetail() {
    const d = find(state.selected);
    const el = $("detail");
    if (!d) { el.innerHTML = "<p>Pick a day above.</p>"; return; }

    // Earlier posts (before this week) only have the post editor.
    if (!isDay(d)) {
      el.innerHTML = "<h2>" + esc(dayLabel(d.date)) + " · " + esc(d.time) + " " + esc(PLAN.week.timezone) + "</h2>" +
        postMetaHTML(d) + postEditorHTML(d);
      initPostEditor(d);
      return;
    }

    const tab = currentTab(d);
    let intro = "";
    if (d.kind === "off") intro = "Rest day. Nothing is planned, but you can still add anything below.";
    else if (d.kind === "comment") intro = d.title + ": no post planned, the focus is engaging with others.";

    el.innerHTML =
      "<h2>" + esc(dayLabel(d.date)) + "</h2>" +
      (intro ? '<p class="muted">' + esc(intro) + "</p>" : "") +
      '<div class="tabs" id="tabs" role="tablist">' + tabsInner(d, tab) + "</div>" +
      '<div class="tab-body">' + (tab === "post" ? postTabHTML(d) : actTabHTML(d, tab)) + "</div>";

    if (tab === "post" && hasPost(d)) initPostEditor(d);
  }

  // ---------- post tab ----------
  function postTabHTML(d) {
    if (!hasPost(d)) {
      return '<div class="empty">' +
        "<p>No post planned for this day.</p>" +
        '<div class="row"><label>Time <input class="field" type="time" id="newPostTime" value="09:00"></label>' +
        '<button class="btn" data-act="add-post">Add a post</button></div>' +
        "</div>";
    }
    return postMetaHTML(d) + postEditorHTML(d) +
      (state.extraPosts[d.id] ? '<div class="row"><button class="btn ghost" data-act="remove-post">Remove this post</button></div>' : "");
  }

  function postMetaHTML(d) {
    if (state.extraPosts[d.id]) {
      return '<div class="row"><label>Goes out at <input class="field" type="time" id="postTime" value="' + esc(timeOf(d)) + '"></label>' +
        '<span class="chip">Your own post</span></div>';
    }
    return '<p class="muted">Goes out at ' + esc(timeOf(d)) + " " + esc(PLAN.week.timezone) + "</p>" +
      '<div class="chips">' +
      [d.pillar, d.format, d.formula, d.goal ? "Goal: " + d.goal : ""].filter(Boolean)
        .map((c) => '<span class="chip">' + esc(c) + "</span>").join("") +
      "</div>" +
      (d.angle ? '<p class="angle">' + esc(d.angle) + "</p>" : "") +
      (d.note ? '<p class="note">' + esc(d.note) + "</p>" : "");
  }

  function postEditorHTML(d) {
    const st = statusOf(d);
    return '<div class="publish-box" id="publishBox"></div>' +
      '<div class="editor-grid">' +
      "<div>" +
      '<div class="label-row"><label for="postText">Post text</label><span id="charCount"></span></div>' +
      '<textarea id="postText" spellcheck="true" placeholder="Write your post here…"></textarea>' +
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
      "</div>";
  }

  function initPostEditor(d) {
    $("postText").value = textOf(d);
    $("imgUrl").value = isLocal(imageOf(d)) ? "" : imageOf(d);
    $("imgThumb").addEventListener("error", () => {
      $("imgMsg").textContent = "Couldn't load this image. Check the URL.";
    });
    updateAnalysis(d);
    renderPublish(d);
    if (recordOf(d)) checkStatus(d, true);
  }

  let expanded = false;
  function updateAnalysis(d) {
    if (!$("postText")) return;
    const text = textOf(d);
    const a = analyze(text);
    $("charCount").textContent = a.chars.toLocaleString() + " / " + LIMIT.toLocaleString();

    const img = imageOf(d);
    const attach = attachOf(d);
    const src = srcOf(d);
    const local = isLocal(img);
    const size = (state.posts[d.id] && state.posts[d.id].imageSize) || 0;
    const checks = a.checks.slice();
    if (attach) checks.push({ level: "ok", msg: local ? "Your own image attached" : "Image attached" });
    if (attach && local) checks.push(fileStore
      ? { level: "ok", msg: "Saved in images.json, ready to upload when scheduled" }
      : { level: "warn", msg: "Saved in this browser only. Run python serve.py so it's saved to images.json and can be scheduled" });
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
          (size ? " (" + (size / 1024 / 1024).toFixed(1) + " MB)" : "") +
          (fileStore ? ". Saved in images.json." : ". Saved in this browser only.");
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
      esc(dayLabel(d.date)) + (timeOf(d) ? " · " + esc(timeOf(d)) : "") + "</div></div></div>" +
      (t ? renderText(shown) : '<span class="muted">Your post will show here.</span>') +
      (cut ? ' <span class="more" data-act="more">…see more</span>' : "") +
      (attach && src ? '<img class="post-img" src="' + esc(src) + '" alt="Post image">' : "");
  }

  // ---------- Publora panel ----------
  function renderPublish(d) {
    const box = $("publishBox");
    if (!box) return;
    const rec = recordOf(d);
    const off = publora.enabled ? "" : " disabled";
    let html;
    if (rec) {
      const st = rec.status || "unknown";
      html = '<div class="pub-status pub-' + st + '"><strong>' + esc(PUB_LABEL[st] || st) + "</strong>" +
        (rec.scheduledTime ? "<span>" + (st === "published" ? "Went out " : "Goes out ") + esc(fmtWhen(rec.scheduledTime)) + "</span>" : "") +
        (rec.error ? '<span class="pub-err">' + esc(rec.error) + "</span>" : "") +
        "</div>" +
        '<div class="row"><button class="btn ghost" data-act="pub-check"' + off + ">Check status on Publora</button>" +
        (["draft", "scheduled", "pending"].includes(st) ? '<button class="btn ghost" data-act="pub-cancel"' + off + ">Cancel on Publora</button>" : "") +
        "</div>";
    } else {
      html = '<div class="pub-status pub-none"><strong>Not on Publora yet</strong>' +
        "<span>Nothing goes out until you press Schedule or Post now.</span></div>" +
        (publora.enabled
          ? '<div class="row"><label>Send at <input class="field" type="datetime-local" id="pubWhen" value="' +
            esc(d.date + "T" + (timeOf(d) || "09:00")) + '"></label>' +
            '<button class="btn" data-act="pub-schedule">Schedule</button>' +
            '<button class="btn ghost" data-act="pub-now">Post now</button></div>'
          : '<p class="muted small">' + esc(publora.reason) + "</p>");
    }
    if (busy[d.id]) html += '<p class="pub-msg">' + esc(busy[d.id]) + "</p>";
    box.innerHTML = "<h3>Publora</h3>" + html;
  }

  function refreshAfterPublora(d) {
    if (state.selected === d.id) {
      renderPublish(d);
      document.querySelectorAll("[data-status]").forEach((b) => b.classList.toggle("on", b.dataset.status === statusOf(d)));
      renderTabs(d);
    }
    renderWeek();
    renderSide();
  }

  async function sendPost(d, now) {
    const text = textOf(d).trim();
    if (!text) { busy[d.id] = "The post is empty."; return renderPublish(d); }
    const left = (text.match(PLACEHOLDER) || []).length;
    if (left && !confirm("This post still has " + left + " [placeholder]" + (left > 1 ? "s" : "") + ". Send it anyway?")) return;
    let scheduledTime = null;
    if (!now) {
      const t = $("pubWhen") && $("pubWhen").value ? new Date($("pubWhen").value) : null; // your local time
      if (!t || isNaN(t)) { busy[d.id] = "Pick a date and time."; return renderPublish(d); }
      scheduledTime = t.toISOString();
    }
    let image = null;
    if (attachOf(d)) {
      if (isLocal(imageOf(d))) {
        if (!fileStore) { busy[d.id] = "Your own image is only in this browser. Open the planner through python serve.py and upload it again."; return renderPublish(d); }
        image = { kind: "own" };
      } else {
        image = { kind: "url", url: imageOf(d) };
      }
    }
    busy[d.id] = "Waiting for you to click Yes in the approval box on your desktop (check the taskbar if you don't see it)…";
    renderPublish(d);
    try {
      published[fileKey(d.id)] = await api("POST", "publish/" + encodeURIComponent(fileKey(d.id)), { text, now, scheduledTime, image });
      setPost(d.id, { status: "scheduled" });
      delete busy[d.id];
    } catch (err) {
      busy[d.id] = err.message;
    }
    refreshAfterPublora(d);
  }

  async function checkStatus(d, quiet) {
    if (!recordOf(d) || !publora.enabled) return;
    if (!quiet) { busy[d.id] = "Checking Publora…"; renderPublish(d); }
    try {
      const q = d.publoraId ? "?id=" + encodeURIComponent(d.publoraId) : "";
      const rec = await api("GET", "status/" + encodeURIComponent(fileKey(d.id)) + q);
      if (rec.status === "none") delete published[fileKey(d.id)];
      else published[fileKey(d.id)] = rec;
      const label = { scheduled: "scheduled", pending: "scheduled", processing: "scheduled", published: "posted", partially_published: "posted" }[rec.status];
      if (label) setPost(d.id, { status: label });
      delete busy[d.id];
    } catch (err) {
      busy[d.id] = "Couldn't check Publora: " + err.message;
    }
    refreshAfterPublora(d);
  }

  async function cancelPost(d) {
    if (!confirm("Cancel this post on Publora? It won't go out.")) return;
    busy[d.id] = "Waiting for you to click Yes in the approval box on your desktop…";
    renderPublish(d);
    try {
      await api("POST", "cancel/" + encodeURIComponent(fileKey(d.id)));
      delete published[fileKey(d.id)];
      setPost(d.id, { status: "draft" });
      delete busy[d.id];
    } catch (err) {
      busy[d.id] = err.message;
    }
    refreshAfterPublora(d);
  }

  // ---------- comment / like / reply / repost tabs ----------
  function actTabHTML(d, key) {
    const a = ACT[key];
    const t = targetOf(d, key);
    const n = countOf(d, key);
    const log = logOf(d, key);
    const guide = key === "comment" && d.whom
      ? "<p><strong>Whose posts:</strong> " + esc(d.whom) + "</p><p><strong>How:</strong> " + esc(d.how) + "</p>"
      : "";
    const items = log.length
      ? log.map((it, i) =>
        '<li class="' + (it.done ? "done" : "") + '">' +
        '<input type="checkbox" data-log="' + i + '"' + (it.done ? " checked" : "") + ' aria-label="Done">' +
        '<div class="log-body">' +
        (isHttp(it.url) ? '<a href="' + esc(it.url) + '" target="_blank" rel="noopener">' + esc(shortUrl(it.url)) + "</a>" : "") +
        (it.note ? "<span>" + esc(it.note) + "</span>" : "") +
        "</div>" +
        '<button class="x" data-del="' + i + '" aria-label="Delete">×</button>' +
        "</li>").join("")
      : '<li class="empty-log muted">Nothing saved yet. Save posts you plan to ' + a.label.toLowerCase() +
        " on, then tick them off as you go.</li>";

    return '<p class="note">' + esc(a.tip) + "</p>" +
      '<p class="muted small">This tab only keeps count of what you do yourself on LinkedIn. Nothing is ' +
      esc(a.label.toLowerCase() === "like" ? "liked" : a.label.toLowerCase() + "ed") +
      " from the planner. Save the posts you pick below, open them, act on LinkedIn, then tick them off." +
      (key !== "like" ? " Want a draft? Paste the post link into Claude Code." : "") + "</p>" +
      guide +
      '<div class="act-row">' +
      '<div class="counter">' +
      '<button data-act="dec" aria-label="One fewer">−</button>' +
      '<span class="n" id="actCount">' + n + (t ? " / " + t : "") + "</span>" +
      '<button data-act="inc" aria-label="One more">+</button>' +
      "</div>" +
      '<label class="target">Daily target <input class="field" type="number" id="actTarget" min="0" max="500" value="' + t + '"></label>' +
      "</div>" +
      '<div class="bar"><span id="actBar" style="width:' + pct(n, t) + '%"></span></div>' +
      '<h3 class="log-title">Links and notes</h3>' +
      '<form class="log-form" id="logForm">' +
      '<input class="field" type="url" id="logUrl" placeholder="Post URL (optional)" aria-label="Post URL">' +
      '<input class="field" type="text" id="logNote" placeholder="' + esc(a.hint) + '" aria-label="Note">' +
      '<button class="btn" type="submit">Add</button>' +
      "</form>" +
      '<ul class="log">' + items + "</ul>";
  }

  function refreshCounter(d, key) {
    const t = targetOf(d, key);
    const n = countOf(d, key);
    if ($("actCount")) $("actCount").textContent = n + (t ? " / " + t : "");
    if ($("actBar")) $("actBar").style.width = pct(n, t) + "%";
    renderTabs(d);
    renderWeek();
    renderSide();
  }

  // ---------- side panels ----------
  function renderSide() {
    const posts = postDays();
    const count = (s) => posts.filter((p) => statusOf(p) === s).length;
    const doneish = posts.filter((p) => ["scheduled", "posted"].includes(statusOf(p))).length;
    const placeholders = posts.reduce((n, p) => n + (textOf(p).match(PLACEHOLDER) || []).length, 0);

    const actRows = DO_ACTS.map((a) => {
      const done = PLAN.days.reduce((n, d) => n + countOf(d, a.key), 0);
      const goal = PLAN.days.reduce((n, d) => n + targetOf(d, a.key), 0);
      if (!done && !goal) return "";
      return '<div class="stat"><span>' + a.icon + " " + a.plural + "</span><strong>" + done + (goal ? " / " + goal : "") + "</strong></div>" +
        (goal ? '<div class="bar"><span style="width:' + pct(done, goal) + '%"></span></div>' : "");
    }).join("");

    $("progress").innerHTML =
      "<h3>This week</h3>" +
      '<div class="stat"><span>✍️ Posts scheduled or posted</span><strong>' + doneish + " / " + posts.length + "</strong></div>" +
      '<div class="bar"><span style="width:' + pct(doneish, posts.length) + '%"></span></div>' +
      actRows +
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
  const checkedOf = (i) => (state.checklist[i] != null ? state.checklist[i] : PLAN.checklist[i].done);

  function renderAll() {
    renderWeek();
    renderDetail();
    renderSide();
  }

  function syncHash() {
    const d = find(state.selected);
    if (!d) return;
    const hash = "#" + d.id + (isDay(d) ? "/" + currentTab(d) : "");
    try { history.replaceState(null, "", hash); } catch (e) { /* file:// in some browsers */ }
  }

  function select(id) {
    state.selected = id;
    expanded = false;
    save();
    renderAll();
    syncHash();
  }

  // ---------- events ----------
  document.addEventListener("click", (e) => {
    const dayBtn = e.target.closest("[data-id]");
    if (dayBtn) { select(dayBtn.dataset.id); return; }

    const d = find(state.selected);
    if (!d) return;

    const tabBtn = e.target.closest("[data-tab]");
    if (tabBtn) {
      state.tab = tabBtn.dataset.tab;
      expanded = false;
      save();
      renderDetail();
      syncHash();
      return;
    }

    const statusBtn = e.target.closest("[data-status]");
    if (statusBtn) {
      setPost(d.id, { status: statusBtn.dataset.status });
      renderAll();
      return;
    }

    const del = e.target.closest("[data-del]");
    if (del) {
      const key = currentTab(d);
      const list = logOf(d, key).slice();
      list.splice(Number(del.dataset.del), 1);
      setLog(d, key, list);
      renderDetail();
      return;
    }

    const act = e.target.closest("[data-act]");
    if (!act) return;
    switch (act.dataset.act) {
      case "inc":
      case "dec": {
        const key = currentTab(d);
        setCount(d, key, countOf(d, key) + (act.dataset.act === "inc" ? 1 : -1));
        refreshCounter(d, key);
        break;
      }
      case "add-post":
        state.extraPosts[d.id] = { time: ($("newPostTime") && $("newPostTime").value) || "09:00" };
        save();
        renderAll();
        if ($("postText")) $("postText").focus();
        break;
      case "remove-post":
        if (confirm("Remove this post and its text?")) {
          if (isLocal(imageOf(d))) dropLocal(d.id);
          delete state.extraPosts[d.id];
          delete state.posts[d.id];
          save();
          renderAll();
        }
        break;
      case "copy": {
        const text = textOf(d).trim();
        const done = () => { act.textContent = "Copied"; setTimeout(() => (act.textContent = "Copy text"), 1500); };
        const fallbackCopy = () => {
          $("postText").select();
          try { document.execCommand("copy"); done(); } catch (err) { /* ignore */ }
        };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, fallbackCopy);
        else fallbackCopy();
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
      case "pub-schedule":
        sendPost(d, false);
        break;
      case "pub-now":
        if (confirm("Post this to LinkedIn right now?")) sendPost(d, true);
        break;
      case "pub-check":
        checkStatus(d, false);
        break;
      case "pub-cancel":
        cancelPost(d);
        break;
      case "more":
        expanded = true;
        updateAnalysis(d);
        break;
    }
  });

  document.addEventListener("submit", (e) => {
    if (e.target.id !== "logForm") return;
    e.preventDefault();
    const d = find(state.selected);
    const key = currentTab(d);
    let url = $("logUrl").value.trim();
    let note = $("logNote").value.trim();
    if (url && !isHttp(url)) { note = note ? url + " · " + note : url; url = ""; }
    if (!url && !note) return;
    setLog(d, key, logOf(d, key).concat([{ url, note, done: false }]));
    renderDetail();
    $("logUrl").focus();
  });

  document.addEventListener("input", (e) => {
    const d = find(state.selected);
    if (!d) return;
    if (e.target.id === "postText") {
      setPost(d.id, { text: e.target.value });
      updateAnalysis(d);
      renderSide();
    } else if (e.target.id === "imgUrl") {
      if (isLocal(imageOf(d))) dropLocal(d.id);
      setPost(d.id, { image: e.target.value.trim(), imageSize: null });
      updateAnalysis(d);
      renderWeek();
    } else if (e.target.id === "actTarget") {
      const key = currentTab(d);
      setTarget(d, key, parseInt(e.target.value, 10) || 0);
      refreshCounter(d, key);
    } else if (e.target.id === "postTime") {
      state.extraPosts[d.id].time = e.target.value;
      save();
      renderWeek();
      updateAnalysis(d);
    }
  });

  document.addEventListener("change", (e) => {
    const d = find(state.selected);
    if (e.target.dataset.check != null) {
      state.checklist[e.target.dataset.check] = e.target.checked;
      save();
    } else if (e.target.dataset.log != null && d) {
      const key = currentTab(d);
      const list = logOf(d, key).slice();
      const i = Number(e.target.dataset.log);
      list[i] = Object.assign({}, list[i], { done: e.target.checked });
      setLog(d, key, list);
      // Ticking an item off counts it; unticking takes it back.
      setCount(d, key, countOf(d, key) + (e.target.checked ? 1 : -1));
      renderDetail();
      refreshCounter(d, key);
    } else if (e.target.id === "imgFile" && d) {
      if (e.target.files[0]) useOwnImage(d, e.target.files[0]);
      e.target.value = "";
    } else if (e.target.id === "attachImg" && d) {
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
    const postOut = (p) => ({
      time: timeOf(p), status: statusOf(p), text: textOf(p).trim(),
      image: !attachOf(p) ? null : isLocal(imageOf(p)) ? "your own file: " + imageOf(p).slice(6) : imageOf(p),
    });
    const out = {
      week: PLAN.week,
      days: PLAN.days.map((d) => ({
        id: d.id,
        date: d.date,
        post: hasPost(d) ? postOut(d) : null,
        activities: Object.fromEntries(DO_ACTS.map((a) => [a.key, {
          done: countOf(d, a.key), target: targetOf(d, a.key), saved: logOf(d, a.key),
        }])),
      })),
      earlierPosts: PLAN.previous.map((p) => Object.assign({ id: p.id, date: p.date }, postOut(p))),
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
    if (!confirm("Clear all edits, statuses, activity counts, and saved links for this week?")) return;
    items().forEach((p) => { if (isLocal(imageOf(p))) dropLocal(p.id); });
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    Object.assign(state, { posts: {}, extraPosts: {}, counts: {}, targets: {}, logs: {}, checklist: {} });
    renderAll();
  });

  // ---------- boot ----------
  $("weekLabel").textContent = PLAN.week.label + " · times in " + PLAN.week.timezone;
  // The address can point at a day and tab, e.g. #wed/comment.
  function readHash() {
    const [id, tab] = decodeURIComponent(location.hash.slice(1)).split("/");
    if (!find(id)) return false;
    state.selected = id;
    if (ACT[tab]) state.tab = tab;
    return true;
  }
  if (!readHash() && !find(state.selected)) {
    const today = PLAN.days.find((d) => d.date === todayISO());
    state.selected = (today || postDays()[0] || PLAN.days[0]).id;
  }
  renderAll();
  syncHash();

  // Is serve.py able to publish, and what's already on Publora?
  api("GET", "publora")
    .then((p) => {
      Object.assign(publora, p, { reason: p.reason || publora.reason });
      return api("GET", "published");
    })
    .then((p) => { published = p || {}; })
    .catch(() => { /* opened without serve.py: buttons stay off */ })
    .then(() => {
      const d = find(state.selected);
      if (d && $("publishBox")) {
        renderPublish(d);
        if (recordOf(d)) checkStatus(d, true);
      }
      renderWeek();
    });

  // Follow the Back button, bookmarks, and hand-edited links.
  window.addEventListener("hashchange", () => {
    if (readHash()) {
      expanded = false;
      save();
      renderAll();
    }
  });

  // Bring back your own images: from images.json when serve.py is running,
  // otherwise from this browser's IndexedDB.
  function showRestored(p, blob) {
    if (!blob) return;
    localUrls[p.id] = URL.createObjectURL(blob);
    if (state.selected === p.id) updateAnalysis(p);
  }
  fetch("api/images", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then((saved) => {
      fileStore = true;
      items().forEach((p) => {
        if (!isLocal(imageOf(p))) return;
        const entry = saved[fileKey(p.id)];
        if (entry) {
          showRestored(p, fromBase64(entry.data, entry.type));
          return;
        }
        // Uploaded before images.json existed: move it over.
        loadImage(p.id).then((blob) => {
          if (!blob) return;
          showRestored(p, blob);
          saveImage(p.id, new File([blob], imageOf(p).slice(6), { type: blob.type })).catch(() => {});
        }).catch(() => {});
      });
      const d = find(state.selected);
      if (d && $("postText")) updateAnalysis(d);
    })
    .catch(() => {
      items().forEach((p) => {
        if (isLocal(imageOf(p))) loadImage(p.id).then((blob) => showRestored(p, blob)).catch(() => {});
      });
    });
})();
