// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Theme toggle (remembers the visitor's choice)
const root = document.documentElement;
try {
  const saved = localStorage.getItem("theme");
  if (saved) root.dataset.theme = saved;
} catch {}
document.querySelector(".theme-toggle").addEventListener("click", () => {
  const isDark = root.dataset.theme
    ? root.dataset.theme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = isDark ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch {}
});

// Project filters (data science / ML / cloud / SWE)
const filterButtons = document.querySelectorAll(".filters button");
const projects = document.querySelectorAll(".project[data-tags]");
filterButtons.forEach((btn) => btn.addEventListener("click", () => {
  const f = btn.dataset.filter;
  filterButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
  projects.forEach((p) => { p.hidden = f !== "all" && !p.dataset.tags.split(" ").includes(f); });
}));

// Hero photo stack: clicking brings the back photo forward
const deck = document.querySelector(".stack__deck");
if (deck) {
  const cards = [...deck.querySelectorAll(".stack__card")];
  deck.addEventListener("click", () => {
    cards.forEach((c) => { c.dataset.pos = (Number(c.dataset.pos) + cards.length - 1) % cards.length; });
  });
}

// The capstone card opens into a panel.
// The panel is revealed with a clip-path that starts at the card's exact box, so nothing stretches.
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE = "cubic-bezier(.22, 1, .36, 1)";
let openPanel = null;

function connectPanel(card, panel, frameEl = card) {
  const cardFrame = () => {
    const from = frameEl.getBoundingClientRect(), to = panel.getBoundingClientRect();
    const w = Math.min(from.width, to.width), h = Math.min(from.height, to.height);
    const x = (to.width - w) / 2, y = (to.height - h) / 2;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    return { clipPath: `inset(${y}px ${x}px round 16px)`, transform: `translate(${dx}px, ${dy}px)` };
  };
  const full = { clipPath: "inset(0px 0px round 18px)", transform: "translate(0px, 0px)" };
  const backdrop = (from, to, duration) => {
    try { panel.animate([{ opacity: from }, { opacity: to }], { duration, easing: "ease", pseudoElement: "::backdrop", fill: "forwards" }); } catch (e) {}
  };
  const parts = () => [...panel.children].filter((el) => !el.classList.contains("panel__close"));

  const open = () => {
    if (panel.open || openPanel) return;
    openPanel = panel;
    document.documentElement.classList.add("study-open");
    panel.showModal();
    panel.scrollTop = 0;
    if (calm) return;
    backdrop(0, 1, 380);
    panel.animate([{ ...cardFrame(), opacity: 0.6 }, { ...full, opacity: 1 }], { duration: 560, easing: EASE });
    parts().forEach((el, i) =>
      el.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
        { duration: 460, delay: 140 + Math.min(i, 8) * 45, easing: EASE, fill: "backwards" }));
  };

  const close = () => {
    if (!panel.open || panel.dataset.closing) return;
    const done = () => {
      panel.close(); delete panel.dataset.closing; openPanel = null;
      document.documentElement.classList.remove("study-open");
      panel.getAnimations({ subtree: true }).forEach((an) => an.cancel());
    };
    if (calm) return done();
    panel.dataset.closing = "1";
    // Content fades first, then the frame folds back into the card and fades onto it.
    parts().forEach((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: "ease-out", fill: "forwards" }));
    backdrop(1, 0, 420);
    panel.animate([{ ...full, opacity: 1 }, { ...cardFrame(), opacity: 1, offset: 0.8 }, { ...cardFrame(), opacity: 0 }],
      { duration: 440, easing: EASE, fill: "forwards" }).onfinish = done;
  };

  card.addEventListener("click", (e) => { if (!e.target.closest("a")) open(); });
  panel.querySelector(".panel__close").addEventListener("click", close);
  panel.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
  panel.addEventListener("click", (e) => {
    const r = panel.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
  });
}

const capstone = document.getElementById("capstone");
if (capstone) connectPanel(capstone, document.getElementById("capstone-study"));

// Project stories: the card lifts, a side sheet slides in, and a loss curve down its edge
// draws as you read, lighting each part of the story as it arrives
const SVG_NS = "http://www.w3.org/2000/svg";
const hoverable = matchMedia("(hover: hover)");
const pointer = { x: -1, y: -1 };
addEventListener("pointermove", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
function connectStory(cue, sheet) {
  const html = document.documentElement;
  const card = cue.closest(".project");
  const scroller = sheet.querySelector(".story__scroll");
  const body = sheet.querySelector(".story__body");
  const svg = sheet.querySelector(".story__curve");
  const track = svg.querySelector(".story__track"), line = svg.querySelector(".story__line");
  const beats = [...sheet.querySelectorAll(".beat")];
  const fromBelow = matchMedia("(max-width: 600px)");
  let nodes = [], marks = [], len = 0, frame = 0;

  // One point per beat; x is the beat's "loss", so the line spikes where it got hard and settles as it resolves
  const layout = () => {
    const w = svg.clientWidth, top = body.getBoundingClientRect().top;
    const pts = beats.map((b) => [4 + (w - 8) * Number(b.dataset.loss), b.getBoundingClientRect().top - top + 9]);
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], my = (y0 + y1) / 2;
      d += ` C${x0} ${my} ${x1} ${my} ${x1} ${y1}`;
    }
    track.setAttribute("d", d);
    line.setAttribute("d", d);
    len = line.getTotalLength();
    line.style.strokeDasharray = len;
    nodes.forEach((n) => n.remove());
    nodes = pts.map(([x, y]) => {
      const c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("class", "node"); c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", 5);
      return svg.appendChild(c);
    });
    marks = pts.map(([, y]) => lengthAt(y));
  };
  // The path only ever moves down, so the length at a given height can be found by bisection
  const lengthAt = (y) => {
    let lo = 0, hi = len;
    for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (line.getPointAtLength(mid).y < y) lo = mid; else hi = mid; }
    return hi;
  };
  // The reading line sits 60% down the sheet; reaching the bottom finishes the curve
  const draw = () => {
    frame = 0;
    const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4;
    const readY = scroller.clientHeight * 0.6 - (body.getBoundingClientRect().top - scroller.getBoundingClientRect().top);
    const l = atEnd ? len : Math.min(len, Math.max(0, lengthAt(readY)));
    line.style.strokeDashoffset = len - l;
    marks.forEach((m, i) => { if (l >= m - 1) { nodes[i].classList.add("is-hit"); beats[i].classList.add("is-in"); } });
  };
  const backdrop = (from, to, duration) => {
    try { sheet.animate([{ opacity: from }, { opacity: to }], { duration, easing: "ease", pseudoElement: "::backdrop", fill: "forwards" }); } catch (e) {}
  };
  const open = () => {
    if (sheet.open) return;
    card.classList.add("is-lifted", "is-open");
    html.classList.add("story-open");
    sheet.showModal();
    scroller.scrollTop = 0;
    beats.forEach((b) => b.classList.remove("is-in"));
    layout();
    line.style.transition = "none";
    line.style.strokeDashoffset = len;
    line.getBoundingClientRect();
    line.style.transition = "stroke-dashoffset .9s cubic-bezier(.22, 1, .36, 1)";
    if (calm) { line.style.transition = "none"; return draw(); }
    backdrop(0, 1, 420);
    sheet.animate([{ transform: fromBelow.matches ? "translateY(100%)" : "translateX(100%)" }, { transform: "none" }],
      { duration: 620, easing: EASE });
    setTimeout(draw, 380);
  };
  const close = () => {
    if (!sheet.open || sheet.dataset.closing) return;
    const done = () => {
      sheet.close(); delete sheet.dataset.closing;
      sheet.getAnimations().forEach((an) => an.cancel());
      card.classList.remove("is-lifted");
      // The preview stays expanded only if the pointer is still on the card when the sheet closes
      const r = card.getBoundingClientRect();
      const onCard = pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= r.bottom;
      if (!(hoverable.matches && onCard)) card.classList.remove("is-open");
      html.classList.remove("story-open");
    };
    if (calm) return done();
    sheet.dataset.closing = "1";
    html.classList.remove("story-open");
    backdrop(1, 0, 380);
    sheet.animate([{ transform: "none" }, { transform: fromBelow.matches ? "translateY(100%)" : "translateX(100%)" }],
      { duration: 420, easing: "cubic-bezier(.5, 0, .75, 0)", fill: "forwards" }).onfinish = done;
  };

  cue.addEventListener("click", (e) => { e.stopPropagation(); open(); });
  card.addEventListener("mouseleave", () => { if (!sheet.open) card.classList.remove("is-open"); });
  sheet.querySelector(".story__close").addEventListener("click", close);
  sheet.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
  sheet.addEventListener("click", (e) => {
    const r = sheet.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
  });
  scroller.addEventListener("scroll", () => { if (!frame) frame = requestAnimationFrame(draw); }, { passive: true });
  addEventListener("resize", () => { if (sheet.open) { layout(); line.style.transition = "none"; draw(); } });
}
document.querySelectorAll("[data-story]").forEach((cue) => {
  const sheet = document.getElementById(cue.dataset.story);
  if (sheet) connectStory(cue, sheet);
});
// Project cards: tap or click (or Enter on the title) expands the card in place; hover does the same on mouse devices
// A click on a card that hover has opened closes it, and it stays shut until the pointer leaves
// Cards with a story open it from a click or tap anywhere on the card (the title's overlay covers it);
// hover still previews on mouse devices
document.querySelectorAll(".project").forEach((card) => {
  const btn = card.querySelector(".project__open");
  const story = card.querySelector("[data-story]");
  card.addEventListener("click", (e) => {
    if (e.target.closest("a, [data-story]")) return;
    if (story) return story.click();
    const shown = card.classList.contains("is-open") ||
      (hoverable.matches && card.matches(":hover") && !card.classList.contains("is-shut"));
    card.classList.toggle("is-open", !shown);
    card.classList.toggle("is-shut", shown);
    btn.setAttribute("aria-expanded", String(!shown));
  });
  card.addEventListener("mouseleave", () => card.classList.remove("is-shut"));
});

// Xebia track: hovering a month plays its scene below, leaving the card closes it,
// and a click or tap always toggles. In one column the scene opens under its month.
const now = document.querySelector(".now");
if (now) {
  const monthBtns = [...now.querySelectorAll(".track__btn")];
  const canHover = matchMedia("(hover: hover)");
  let current = null, timer;
  const show = (id) => {
    current = id;
    now.classList.toggle("is-showing", Boolean(id));
    if (id) now.dataset.scene = id;
    monthBtns.forEach((b) => b.setAttribute("aria-expanded", String(b.getAttribute("aria-controls") === id)));
    now.querySelectorAll(".scene").forEach((s) => s.classList.toggle("is-on", s.id === id));
  };
  const after = (ms, fn) => { clearTimeout(timer); timer = setTimeout(fn, ms); };
  let shutByClick = null;
  monthBtns.forEach((b) => {
    const id = b.getAttribute("aria-controls");
    // Opens once the pointer rests on a month, so gliding past one on the way to the scene doesn't switch it
    const rest = () => { if (canHover.matches && current !== id && shutByClick !== id) after(140, () => show(id)); };
    b.addEventListener("mouseenter", rest);
    b.addEventListener("mousemove", rest);
    b.addEventListener("mouseleave", () => { shutByClick = null; if (current !== id) clearTimeout(timer); });
    b.addEventListener("click", () => {
      clearTimeout(timer);
      shutByClick = current === id ? id : null;
      show(current === id ? null : id);
    });
  });
  now.addEventListener("mouseenter", () => clearTimeout(timer));
  now.addEventListener("mouseleave", () => { if (canHover.matches) after(250, () => show(null)); });
}

// Cue hints play once per page load, the first time a card is mostly on screen
const cueWatch = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add("cue-play"); cueWatch.unobserve(e.target); }
}, { threshold: 0.6 });
document.querySelectorAll(".project, .now").forEach((el) => cueWatch.observe(el));

// Fade sections in as they scroll into view
const revealables = document.querySelectorAll(".now, .research, .section__head, .project, .about__grid, .skills, .gallery, .timeline, .stats");
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
}, { threshold: 0.12 });
revealables.forEach((el) => { el.classList.add("reveal"); io.observe(el); });

// Highlight the nav link for the section on screen
const links = [...document.querySelectorAll(".nav__links a")];
const spy = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${e.target.id}`));
  }
}, { rootMargin: "-45% 0px -50% 0px" });
document.querySelectorAll("section[id]").forEach((s) => spy.observe(s));

// Clear the highlight while the hero is on screen
new IntersectionObserver(([e]) => {
  if (e.isIntersecting) links.forEach((a) => a.classList.remove("active"));
}, { rootMargin: "-45% 0px -50% 0px" }).observe(document.querySelector(".hero"));

// Page progress: reading the page is a training run. A loss curve runs down the right edge,
// the dot descends it as you scroll, and each section in the nav is an epoch you can jump to
const rail = document.querySelector(".rail"), topbar = document.querySelector(".topbar");
if (rail && topbar) {
  const svgNS = "http://www.w3.org/2000/svg";
  const line = rail.querySelector(".rail__line"), track = rail.querySelector(".rail__track");
  const dot = rail.querySelector(".rail__dot"), read = rail.querySelector(".rail__read");
  const epochs = links.map((a) => ({ el: document.querySelector(a.getAttribute("href")), name: a.textContent.trim().toLowerCase(), href: a.getAttribute("href") }))
    .filter((e) => e.el);
  const n = epochs.length;
  const ticks = epochs.map((e, i) => {
    const t = document.createElement("a");
    t.className = "rail__tick"; t.href = e.href;
    t.innerHTML = `<span>epoch ${i + 1}/${n} · ${e.name}</span>`;
    t.setAttribute("aria-label", `Go to ${e.name}`);
    return rail.appendChild(t);
  });
  const bars = epochs.map(() => topbar.appendChild(document.createElement("b")));
  let W = 0, H = 0, len = 0, frame = 0, idle = 0;
  // Loss falls fast at first, then flattens: x drifts from the outer edge toward the page as the run goes on
  const xAt = (t) => 6 + (W - 12) * Math.exp(-3.2 * t);
  const layout = () => {
    W = rail.clientWidth; H = rail.clientHeight;
    let d = "";
    for (let k = 0; k <= 40; k++) { const t = k / 40; d += `${k ? "L" : "M"}${xAt(t).toFixed(1)} ${(t * H).toFixed(1)} `; }
    track.setAttribute("d", d); line.setAttribute("d", d);
    len = line.getTotalLength(); line.style.strokeDasharray = len;
    draw();
  };
  const draw = () => {
    frame = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    const fracs = epochs.map((e) => Math.min(1, Math.max(0, (e.el.getBoundingClientRect().top + scrollY - innerHeight * 0.35) / max)));
    // A section counts as reached once its top passes a third of the way down the screen
    let cur = -1;
    fracs.forEach((f, i) => { if (p >= f - 0.002) cur = i; });
    if (W) {
      line.style.strokeDashoffset = len * (1 - p);
      dot.style.transform = `translate(${xAt(p)}px, ${p * H}px)`;
      read.style.left = `${xAt(p)}px`; read.style.top = `${p * H}px`;
      read.textContent = cur < 0 ? `epoch 0/${n} · init` : `epoch ${cur + 1}/${n} · ${epochs[cur].name}`;
      ticks.forEach((t, i) => { t.style.left = `${xAt(fracs[i])}px`; t.style.top = `${fracs[i] * H}px`; t.classList.toggle("is-hit", i <= cur); });
    }
    topbar.style.setProperty("--p", p);
    bars.forEach((b, i) => { b.style.left = `${fracs[i] * 100}%`; b.classList.toggle("is-hit", i <= cur); });
  };
  addEventListener("scroll", () => {
    if (!frame) frame = requestAnimationFrame(draw);
    rail.classList.add("is-moving");
    clearTimeout(idle); idle = setTimeout(() => rail.classList.remove("is-moving"), 1200);
  }, { passive: true });
  addEventListener("resize", layout);
  addEventListener("load", layout);
  layout();
}
