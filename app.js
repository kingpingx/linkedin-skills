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
        sub = d.time + " · " + d.goal;
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
    updateAnalysis(d);
  }

  let expanded = false;
  function updateAnalysis(d) {
    const text = textOf(d);
    const a = analyze(text);
    $("charCount").textContent = a.chars.toLocaleString() + " / " + LIMIT.toLocaleString();
    $("checks").innerHTML = a.checks.map((c) => '<li class="' + c.level + '">' + esc(c.msg) + "</li>").join("");

    const t = text.trim();
    const cut = !expanded && t.length > FOLD;
    const shown = cut ? t.slice(0, FOLD).replace(/\s+\S*$/, "") : t;
    $("preview").innerHTML =
      '<div class="author"><div class="avatar">You</div><div><strong>You</strong><div class="muted" style="font-size:12px">' +
      esc(dayLabel(d.date)) + " · " + esc(d.time) + "</div></div></div>" +
      renderText(shown) + (cut ? ' <span class="more" data-act="more">…see more</span>' : "");
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
          setPost(d.id, { text: null });
          renderAll();
        }
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
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.dataset.check != null) {
      state.checklist[e.target.dataset.check] = e.target.checked;
      save();
    }
  });

  $("exportBtn").addEventListener("click", () => {
    const out = {
      week: PLAN.week,
      posts: items().filter((d) => d.kind === "post").map((p) => ({
        id: p.id, date: p.date, time: p.time, formula: p.formula, goal: p.goal,
        status: statusOf(p), text: textOf(p).trim(),
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
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    state.posts = {}; state.comments = {}; state.checklist = {};
    renderAll();
  });

  // ---------- boot ----------
  $("weekLabel").textContent = PLAN.week.label + " · times in " + PLAN.week.timezone;
  if (!find(state.selected)) {
    const today = PLAN.days.find((d) => d.date === todayISO());
    state.selected = (today || weekPosts()[0] || PLAN.days[0]).id;
  }
  renderAll();
})();
