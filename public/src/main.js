const routes = ["works", "index", "information"];

const sections = {
  works: document.getElementById("section-works"),
  index: document.getElementById("section-index"),
  information: document.getElementById("section-information"),
};

const navLinks = {
  works: document.getElementById("nav-works"),
  index: document.getElementById("nav-index"),
  information: document.getElementById("nav-information"),
};

let prefersReducedMotion = false;
const captionsToggle = document.getElementById("toggle-captions");
const projectsGrid = document.getElementById("projects-grid");
const galleryContainer = document.getElementById("gallery");
const backToProjectsBtn = document.getElementById("back-to-projects");
const indexList = document.getElementById("index-list");

let projects = [];
let showCaptions = false;

function initReducedMotion() {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  prefersReducedMotion = mq.matches;
  mq.addEventListener("change", (e) => {
    prefersReducedMotion = e.matches;
  });
}

function getRouteFromHash() {
  const hash = window.location.hash.replace(/^#/, "");
  return routes.includes(hash) ? hash : "works";
}

async function navigate(to) {
  const current = Object.entries(sections).find(([, el]) => !el.hasAttribute("hidden"));
  const next = sections[to];
  if (!next) return;

  if (current && current[0] === to) return; // already on it

  // update aria-current on nav
  Object.entries(navLinks).forEach(([key, link]) => {
    if (!link) return;
    if (key === to) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  const transitionClass = prefersReducedMotion ? "" : "transition-opacity duration-300";

  if (current) {
    const el = current[1];
    if (!prefersReducedMotion) {
      el.classList.add("opacity-0");
      await waitForTransition(el);
    }
    el.setAttribute("hidden", "");
  }

  next.classList.add(transitionClass);
  next.removeAttribute("hidden");
  if (!prefersReducedMotion) {
    next.classList.remove("opacity-0");
    await waitForTransition(next);
  }

  // lazy render per-section
  if (to === "works") {
    renderProjects();
  } else if (to === "index") {
    renderIndex();
  }
}

function waitForTransition(el) {
  return new Promise((resolve) => {
    if (prefersReducedMotion) return resolve();
    const handle = () => {
      el.removeEventListener("transitionend", handle);
      resolve();
    };
    // Fallback timeout in case transitionend doesn't fire
    const timeout = setTimeout(() => {
      el.removeEventListener("transitionend", handle);
      resolve();
    }, 320);
    el.addEventListener("transitionend", () => {
      clearTimeout(timeout);
      handle();
    }, { once: true });
  });
}

async function loadProjects() {
  if (projects.length) return projects;
  const res = await fetch("/data/projects.json");
  const json = await res.json();
  projects = json.projects || [];
  return projects;
}

async function renderProjects() {
  await loadProjects();
  // if a gallery is open, keep it visible
  if (!galleryContainer.hasAttribute("hidden")) return;
  projectsGrid.innerHTML = "";
  projects.forEach((p) => {
    const card = document.createElement("button");
    card.className = "group text-left";
    card.innerHTML = `
      <div class="aspect-[4/3] w-full overflow-hidden rounded border border-neutral-200 bg-neutral-100">
        <img src="${p.cover || ""}" alt="" class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" />
      </div>
      <div class="mt-2 text-sm text-neutral-700">${p.title || p.slug} ${p.year ? `· ${p.year}` : ""}</div>
    `;
    card.addEventListener("click", () => openProject(p));
    projectsGrid.appendChild(card);
  });
}

async function openProject(project) {
  projectsGrid.setAttribute("hidden", "");
  backToProjectsBtn.removeAttribute("hidden");
  galleryContainer.removeAttribute("hidden");
  galleryContainer.innerHTML = "";

  const res = await fetch(`/data/images/${project.slug}.json`);
  const { images = [] } = await res.json();

  images.forEach((img) => {
    const figure = document.createElement("figure");
    figure.className = "space-y-2";
    const imageEl = document.createElement("img");
    imageEl.src = img.src;
    imageEl.alt = img.title || "";
    imageEl.loading = "lazy";
    imageEl.className = "w-full rounded border border-neutral-200 bg-neutral-100";
    figure.appendChild(imageEl);
    if (showCaptions && img.title) {
      const figcap = document.createElement("figcaption");
      figcap.className = "text-sm text-neutral-600";
      figcap.textContent = img.title;
      figure.appendChild(figcap);
    }
    galleryContainer.appendChild(figure);
  });
}

function renderIndex() {
  if (!projects.length) return; // will render after load when navigating
  indexList.innerHTML = "";
  projects.forEach((p) => {
    const row = document.createElement("a");
    row.href = "#works";
    row.className = "flex items-center justify-between py-3 hover:bg-neutral-50 px-2 -mx-2 rounded";
    row.addEventListener("click", (e) => {
      e.preventDefault();
      // Navigate to works and open project after navigation settles
      window.location.hash = "#works";
      setTimeout(() => openProject(p), 0);
    });
    row.innerHTML = `
      <span>${p.title || p.slug}${p.year ? ` · ${p.year}` : ""}</span>
      <span class="text-xs text-neutral-500">view →</span>
    `;
    indexList.appendChild(row);
  });
}

backToProjectsBtn.addEventListener("click", () => {
  galleryContainer.setAttribute("hidden", "");
  backToProjectsBtn.setAttribute("hidden", "");
  projectsGrid.removeAttribute("hidden");
  renderProjects();
});

captionsToggle.addEventListener("change", (e) => {
  showCaptions = !!e.target.checked;
  // re-open current gallery to reflect captions toggle
  const openFigure = !galleryContainer.hasAttribute("hidden");
  if (openFigure) {
    // naive re-render by triggering back and re-open last project if available
    const lastProjectTitle = galleryContainer.querySelector("figcaption")?.textContent;
    galleryContainer.setAttribute("hidden", "");
    projectsGrid.removeAttribute("hidden");
    renderProjects();
  }
});

window.addEventListener("hashchange", () => navigate(getRouteFromHash()));

(async function start() {
  initReducedMotion();
  await loadProjects().catch(() => {});
  const initial = getRouteFromHash();
  // ensure initial section visible
  Object.values(sections).forEach((el) => el.setAttribute("hidden", ""));
  Object.values(sections).forEach((el) => el.classList.add("opacity-0"));
  await navigate(initial);
})();


