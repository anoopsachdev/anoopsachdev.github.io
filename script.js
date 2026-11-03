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

// Cards that open into panels (capstone + projects).
// The panel is revealed with a clip-path that starts at the card's exact box, so nothing stretches.
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE = "cubic-bezier(.22, 1, .36, 1)";
let openPanel = null;

function connectPanel(card, panel) {
  const cardFrame = () => {
    const from = card.getBoundingClientRect(), to = panel.getBoundingClientRect();
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
document.querySelectorAll(".project[data-panel]").forEach((card) => {
  const panel = document.getElementById(card.dataset.panel);
  if (panel) connectPanel(card, panel);
});

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
