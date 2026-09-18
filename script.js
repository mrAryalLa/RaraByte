document.documentElement.classList.add("js");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Page load ---------- */
window.addEventListener("load", () => {
  requestAnimationFrame(() => document.documentElement.classList.add("is-loaded"));
});
// Fallback in case fonts/images are slow
setTimeout(() => document.documentElement.classList.add("is-loaded"), 1200);

/* ---------- Footer year ---------- */
document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

/* ---------- Nav: scroll state + mobile menu ---------- */
const nav = document.querySelector(".nav");
const hero = document.querySelector(".hero");
const onScroll = () => {
  const threshold = hero ? hero.offsetHeight - 80 : 40;
  nav.classList.toggle("is-scrolled", window.scrollY > threshold);
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

const toggle = document.querySelector(".nav__toggle");
const menu = document.getElementById("menu");
toggle.addEventListener("click", () => {
  const open = menu.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(open));
  toggle.textContent = open ? "Close" : "Menu";
});
menu.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "Menu";
  })
);

/* ---------- Hero: the byte field ---------- */
(function byteField() {
  const canvas = document.querySelector(".hero__field");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const GAP = 26;       // spacing between bytes
  const SIZE = 5;       // base byte size
  const RADIUS = 170;   // cursor influence
  let w, h, dpr, cols, rows, cells = [];
  let pointer = { x: -9999, y: -9999 };
  let rare = { i: 0, born: 0 };
  let running = true;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / GAP) + 1;
    rows = Math.ceil(h / GAP) + 1;
    cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({
          x: c * GAP + (r % 2 ? GAP / 2 : 0),
          y: r * GAP,
          on: Math.random() < 0.18,        // "1" bits glow brighter
          phase: Math.random() * Math.PI * 2,
          lift: 0,
        });
      }
    }
    pickRare(performance.now());
  }

  function pickRare(t) {
    // Prefer the right half so it doesn't hide behind the headline
    let tries = 0, i;
    do {
      i = Math.floor(Math.random() * cells.length);
      tries++;
    } while (cells[i].x < w * 0.5 && tries < 30);
    rare = { i, born: t };
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (let k = 0; k < cells.length; k++) {
      const cell = cells[k];
      const dx = cell.x - pointer.x;
      const dy = cell.y - pointer.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const target = dist < RADIUS ? 1 - dist / RADIUS : 0;
      cell.lift += (target - cell.lift) * 0.12;

      // slow shimmer for "1" bits
      const shimmer = cell.on ? 0.1 + 0.08 * Math.sin(t * 0.0012 + cell.phase) : 0;
      const alpha = 0.1 + shimmer + cell.lift * 0.75;
      const s = SIZE + cell.lift * 7;

      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
      roundRect(cell.x - s / 2, cell.y - s / 2, s, s, Math.min(2, s / 3));
    }

    // The rare byte
    const rc = cells[rare.i];
    if (rc) {
      const age = (t - rare.born) / 1000;
      const pulse = 0.5 + 0.5 * Math.sin(age * 2.4);
      const s = 13 + pulse * 5 + rc.lift * 8;
      ctx.save();
      ctx.translate(rc.x, rc.y);
      ctx.rotate(age * 0.6);
      const g = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
      g.addColorStop(0, "#3FA2FF");
      g.addColorStop(1, "#A96BFF");
      ctx.shadowColor = "rgba(140,110,255,1)";
      ctx.shadowBlur = 24 + pulse * 18;
      ctx.fillStyle = g;
      roundRect(-s / 2, -s / 2, s, s, 3);
      ctx.restore();

      // Found it? Hover near it and it hops somewhere new.
      const d = Math.hypot(rc.x - pointer.x, rc.y - pointer.y);
      if (d < 22 || age > 7) pickRare(t);
    }
  }

  function roundRect(x, y, width, height, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.fill();
  }

  function loop(t) {
    if (running) draw(t);
    requestAnimationFrame(loop);
  }

  const heroEl = canvas.parentElement;
  heroEl.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
  });
  heroEl.addEventListener("pointerleave", () => (pointer = { x: -9999, y: -9999 }));

  // Pause when hero is off-screen
  new IntersectionObserver(([entry]) => (running = entry.isIntersecting)).observe(heroEl);

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  resize();
  if (reduceMotion) {
    draw(performance.now()); // static frame only
  } else {
    requestAnimationFrame(loop);
  }
})();

/* ---------- Services tabs (accessible) ---------- */
(function tabs() {
  const root = document.querySelector("[data-services]");
  if (!root) return;
  const tabs = [...root.querySelectorAll('[role="tab"]')];

  function select(tab, focus = false) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (e) => {
      const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      if (e.key in keys) {
        e.preventDefault();
        select(tabs[(i + keys[e.key] + tabs.length) % tabs.length], true);
      } else if (e.key === "Home") {
        e.preventDefault(); select(tabs[0], true);
      } else if (e.key === "End") {
        e.preventDefault(); select(tabs[tabs.length - 1], true);
      }
    });
  });
})();

/* ---------- Contact form ---------- */
(function contactForm() {
  const form = document.querySelector(".form");
  if (!form) return;
  const status = form.querySelector(".form__status");

  const rules = {
    name: (v) => (v.trim().length >= 2 ? "" : "Enter your name."),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Enter a valid email, like you@company.com."),
    message: (v) => (v.trim().length >= 10 ? "" : "Add a sentence or two about your project."),
  };

  function check(input) {
    const msg = rules[input.name] ? rules[input.name](input.value) : "";
    const field = input.closest(".field");
    field.classList.toggle("has-error", !!msg);
    field.querySelector(".field__error").textContent = msg;
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  }

  Object.keys(rules).forEach((name) => {
    const input = form.elements[name];
    input.addEventListener("blur", () => check(input));
    input.addEventListener("input", () => {
      if (input.closest(".field").classList.contains("has-error")) check(input);
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const inputs = Object.keys(rules).map((n) => form.elements[n]);
    const results = inputs.map(check);
    const firstBad = inputs[results.indexOf(false)];
    if (firstBad) { firstBad.focus(); status.textContent = ""; return; }

    const needs = [...form.querySelectorAll('input[name="need"]:checked')].map((c) => c.value);
    const body =
      `Name: ${form.elements.name.value}\n` +
      `Email: ${form.elements.email.value}\n` +
      `Needs: ${needs.join(", ") || "Not specified"}\n\n` +
      form.elements.message.value;

    // No backend yet: open the visitor's email app with the message filled in.
    // Replace this with a fetch() to your form service (Formspree, Netlify Forms, your API) when ready.
    window.location.href =
      "mailto:hello@rarabyte.com?subject=" +
      encodeURIComponent("New project inquiry from " + form.elements.name.value) +
      "&body=" + encodeURIComponent(body);

    status.textContent = "Your email app should open with the message ready to send.";
  });
})();

/* ---------- Links that pre-select services in the contact form ---------- */
document.querySelectorAll("[data-need]").forEach((link) => {
  link.addEventListener("click", () => {
    const wanted = link.dataset.need.split(",");
    document.querySelectorAll('.form input[name="need"]').forEach((box) => {
      if (wanted.includes(box.value)) box.checked = true;
    });
  });
});
