const body = document.body;
const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const navLinks = document.querySelectorAll(".nav-links a");
const evidenceTrack = document.querySelector("[data-evidence-track]");
const carouselPrev = document.querySelector("[data-carousel-prev]");
const carouselNext = document.querySelector("[data-carousel-next]");
const particleCanvas = document.querySelector("[data-particle-canvas]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const syncHeader = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 16);
};

menuButton?.addEventListener("click", () => {
  const isOpen = body.classList.toggle("menu-open");
  header.classList.toggle("is-open", isOpen);
  menuButton.setAttribute("aria-label", isOpen ? "关闭导航" : "打开导航");
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    body.classList.remove("menu-open");
    header.classList.remove("is-open");
    menuButton?.setAttribute("aria-label", "打开导航");
  });
});

window.addEventListener("scroll", syncHeader, { passive: true });
syncHeader();

const scrollEvidence = (direction) => {
  if (!evidenceTrack) return;
  const firstCard = evidenceTrack.querySelector(".evidence-card");
  const distance = firstCard ? firstCard.getBoundingClientRect().width + 18 : 520;
  evidenceTrack.scrollBy({ left: direction * distance, behavior: "smooth" });
};

carouselPrev?.addEventListener("click", () => scrollEvidence(-1));
carouselNext?.addEventListener("click", () => scrollEvidence(1));

if (!reduceMotion) {
  const pointer = { x: 0, y: 0 };
  const spring = { x: 0, y: 0, vx: 0, vy: 0 };
  const trail = { x: 0, y: 0, vx: 0, vy: 0 };

  const setPointer = (clientX, clientY) => {
    pointer.x = clientX - window.innerWidth / 2;
    pointer.y = clientY - window.innerHeight / 2;
  };

  window.addEventListener(
    "pointermove",
    (event) => {
      setPointer(event.clientX, event.clientY);
    },
    { passive: true },
  );

  window.addEventListener("pointerleave", () => {
    pointer.x = 0;
    pointer.y = 0;
  });

  const tickSpring = () => {
    spring.vx += (pointer.x - spring.x) * 0.085;
    spring.vy += (pointer.y - spring.y) * 0.085;
    spring.vx *= 0.78;
    spring.vy *= 0.78;
    spring.x += spring.vx;
    spring.y += spring.vy;

    trail.vx += (spring.x - trail.x) * 0.045;
    trail.vy += (spring.y - trail.y) * 0.045;
    trail.vx *= 0.84;
    trail.vy *= 0.84;
    trail.x += trail.vx;
    trail.y += trail.vy;

    const softX = spring.x * 0.028;
    const softY = spring.y * 0.028;
    const midX = spring.x * 0.052;
    const midY = spring.y * 0.052;
    const strongX = spring.x * 0.092;
    const strongY = spring.y * 0.092;
    const rootStyle = document.documentElement.style;

    rootStyle.setProperty("--mouse-x", `${spring.x.toFixed(2)}px`);
    rootStyle.setProperty("--mouse-y", `${spring.y.toFixed(2)}px`);
    rootStyle.setProperty("--mouse-soft-x", `${softX.toFixed(2)}px`);
    rootStyle.setProperty("--mouse-soft-y", `${softY.toFixed(2)}px`);
    rootStyle.setProperty("--mouse-soft-x-neg", `${(-softX).toFixed(2)}px`);
    rootStyle.setProperty("--mouse-soft-y-neg", `${(-softY).toFixed(2)}px`);
    rootStyle.setProperty("--mouse-mid-x", `${midX.toFixed(2)}px`);
    rootStyle.setProperty("--mouse-mid-y", `${midY.toFixed(2)}px`);
    rootStyle.setProperty("--mouse-mid-x-neg", `${(-midX).toFixed(2)}px`);
    rootStyle.setProperty("--mouse-mid-y-neg", `${(-midY).toFixed(2)}px`);
    rootStyle.setProperty("--mouse-strong-x", `${strongX.toFixed(2)}px`);
    rootStyle.setProperty("--mouse-strong-y", `${strongY.toFixed(2)}px`);
    rootStyle.setProperty("--mouse-strong-x-neg", `${(-strongX).toFixed(2)}px`);
    rootStyle.setProperty("--mouse-strong-y-neg", `${(-strongY).toFixed(2)}px`);
    rootStyle.setProperty("--cursor-x", `${(window.innerWidth / 2 + spring.x).toFixed(2)}px`);
    rootStyle.setProperty("--cursor-y", `${(window.innerHeight / 2 + spring.y).toFixed(2)}px`);
    rootStyle.setProperty("--cursor-trail-x", `${(window.innerWidth / 2 + trail.x).toFixed(2)}px`);
    rootStyle.setProperty("--cursor-trail-y", `${(window.innerHeight / 2 + trail.y).toFixed(2)}px`);
    requestAnimationFrame(tickSpring);
  };

  tickSpring();
}

if (particleCanvas && !reduceMotion) {
  const context = particleCanvas.getContext("2d");
  const particles = [];
  let width = 0;
  let height = 0;
  let pixelRatio = 1;

  const resizeCanvas = () => {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    particleCanvas.width = Math.floor(width * pixelRatio);
    particleCanvas.height = Math.floor(height * pixelRatio);
    particleCanvas.style.width = `${width}px`;
    particleCanvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const count = Math.min(140, Math.max(56, Math.floor((width * height) / 15000)));
    particles.length = 0;
    for (let index = 0; index < count; index += 1) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.45,
        alpha: Math.random() * 0.48 + 0.16,
        speedX: (Math.random() - 0.5) * 0.24,
        speedY: Math.random() * -0.2 - 0.04,
      });
    }
  };

  const drawParticles = () => {
    context.clearRect(0, 0, width, height);
    context.lineWidth = 1;

    particles.forEach((particle, index) => {
      particle.x += particle.speedX;
      particle.y += particle.speedY;

      if (particle.y < -10) {
        particle.y = height + 10;
        particle.x = Math.random() * width;
      }
      if (particle.x < -10) particle.x = width + 10;
      if (particle.x > width + 10) particle.x = -10;

      const glow = context.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.radius * 8,
      );
      glow.addColorStop(0, `rgba(98, 236, 220, ${particle.alpha})`);
      glow.addColorStop(1, "rgba(98, 236, 220, 0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius * 8, 0, Math.PI * 2);
      context.fill();

      for (let otherIndex = index + 1; otherIndex < particles.length; otherIndex += 1) {
        const other = particles[otherIndex];
        const dx = particle.x - other.x;
        const dy = particle.y - other.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 138) {
          context.strokeStyle = `rgba(98, 236, 220, ${(1 - distance / 138) * 0.11})`;
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(other.x, other.y);
          context.stroke();
        }
      }
    });

    requestAnimationFrame(drawParticles);
  };

  window.addEventListener("resize", resizeCanvas, { passive: true });
  resizeCanvas();
  drawParticles();
}
