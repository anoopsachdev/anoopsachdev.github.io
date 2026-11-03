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

// Capstone: the preview card grows into the study panel, and shrinks back on close.
// A clip-path reveal from the card's exact box, so nothing stretches mid-animation.
const studyCard = document.getElementById("capstone");
const study = document.getElementById("capstone-study");
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE = "cubic-bezier(.22, 1, .36, 1)";
if (studyCard && study) {
  const cardFrame = () => {
    const from = studyCard.getBoundingClientRect(), to = study.getBoundingClientRect();
    const w = Math.min(from.width, to.width), h = Math.min(from.height, to.height);
    const x = (to.width - w) / 2, y = (to.height - h) / 2;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    return { clipPath: `inset(${y}px ${x}px round 16px)`, transform: `translate(${dx}px, ${dy}px)` };
  };
  const fullFrame = { clipPath: "inset(0px 0px round 18px)", transform: "translate(0px, 0px)" };
  const fadeBackdrop = (keyframes, duration) => {
    try { study.animate(keyframes, { duration, easing: "ease", pseudoElement: "::backdrop", fill: "both" }); } catch (e) {}
  };
  const open = () => {
    if (study.open) return;
    document.documentElement.classList.add("study-open");
    study.showModal();
    if (calm) return;
    study.animate([cardFrame(), fullFrame], { duration: 560, easing: EASE });
    study.querySelectorAll(":scope > *:not(.study__close)").forEach((el, i) =>
      el.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }],
        { duration: 420, delay: 160 + i * 50, easing: EASE, fill: "backwards" }));
    fadeBackdrop([{ opacity: 0 }, { opacity: 1 }], 400);
  };
  const close = () => {
    if (!study.open || study.dataset.closing) return;
    const done = () => { study.close(); delete study.dataset.closing; document.documentElement.classList.remove("study-open"); };
    if (calm) return done();
    study.dataset.closing = "1";
    fadeBackdrop([{ opacity: 1 }, { opacity: 0 }], 360);
    study.animate([fullFrame, cardFrame()], { duration: 400, easing: EASE, fill: "forwards" }).onfinish = (e) => { done(); e.target.cancel(); };
  };
  studyCard.addEventListener("click", open);
  study.querySelector(".study__close").addEventListener("click", close);
  study.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
  study.addEventListener("click", (e) => {
    const r = study.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
  });
}

// Project "Why & how": slide the extra detail open and closed instead of snapping
document.querySelectorAll(".expand").forEach((details) => {
  const summary = details.querySelector("summary");
  const body = details.querySelector(".expand__body");
  summary.addEventListener("click", (e) => {
    if (calm) return;
    e.preventDefault();
    if (details.dataset.busy) return;
    details.dataset.busy = "1";
    const finish = () => delete details.dataset.busy;
    if (!details.open) {
      details.open = true;
      const h = body.scrollHeight;
      body.animate([{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }], { duration: 380, easing: EASE }).onfinish = finish;
    } else {
      const h = body.scrollHeight;
      body.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 300, easing: EASE }).onfinish = () => { details.open = false; finish(); };
    }
  });
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
