document.documentElement.classList.add("js");

const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const links = navLinks.querySelectorAll("a");
const sections = document.querySelectorAll("main section[id]");

function setMenu(open) {
  navLinks.classList.toggle("open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

function updateNavigation() {
  header.classList.toggle("scrolled", window.scrollY > 20);

  let current = sections[0].id;
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= header.offsetHeight + 24) {
      current = section.id;
    }
  }

  const page = document.scrollingElement;
  if (page.scrollHeight > page.clientHeight &&
      page.scrollHeight - page.clientHeight - page.scrollTop <= 2) {
    current = sections[sections.length - 1].id;
  }

  for (const link of links) {
    const active = link.hash === "#" + current;
    link.classList.toggle("active", active);
    if (active) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  }
}

menuToggle.addEventListener("click", () => {
  setMenu(!navLinks.classList.contains("open"));
});

for (const link of links) {
  link.addEventListener("click", () => setMenu(false));
}

header.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navLinks.classList.contains("open")) {
    setMenu(false);
    menuToggle.focus();
  }
});

window.addEventListener("scroll", updateNavigation, { passive: true });
window.addEventListener("resize", updateNavigation);
updateNavigation();

document.querySelector("#year").textContent = new Date().getFullYear();
