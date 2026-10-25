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

// Fade sections in as they scroll into view
const revealables = document.querySelectorAll(".now, .section__head, .project, .about__grid, .skills, .gallery, .timeline, .stats");
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
