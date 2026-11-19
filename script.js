"use strict";

// Копирование телефона: Clipboard API + запасной вариант для file:// и старых браузеров.
async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Переходим к запасному способу ниже.
    }
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.top = "-1000px";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  field.setSelectionRange(0, field.value.length);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch (error) {
    copied = false;
  }
  field.remove();
  return copied;
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy]");
  if (!button) return;

  const value = button.getAttribute("data-copy");
  const label = button.querySelector(".copy-label");
  if (!value || !label) return;

  const copied = await copyText(value);
  const originalText = button.dataset.originalLabel || label.textContent;

  button.dataset.originalLabel = originalText;
  label.textContent = copied ? "Скопировано" : "Не получилось";
  button.classList.toggle("is-copied", copied);

  window.clearTimeout(Number(button.dataset.resetTimer));
  button.dataset.resetTimer = String(
    window.setTimeout(() => {
      label.textContent = originalText;
      button.classList.remove("is-copied");
    }, 2200)
  );
});

// Мобильное меню: навигация и кнопки прячутся за кнопкой с тремя точками.
const siteHeader = document.querySelector(".site-header");
const menuToggle = siteHeader ? siteHeader.querySelector(".menu-toggle") : null;
const headerPanel = siteHeader ? siteHeader.querySelector(".header-panel") : null;

function setMenuOpen(open) {
  if (!siteHeader || !menuToggle) return;
  siteHeader.classList.toggle("is-open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
}

if (siteHeader && menuToggle) {
  menuToggle.addEventListener("click", () => {
    setMenuOpen(!siteHeader.classList.contains("is-open"));
  });

  if (headerPanel) {
    headerPanel.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenuOpen(false);
    });
  }

  document.addEventListener("click", (event) => {
    if (!siteHeader.classList.contains("is-open")) return;
    if (!siteHeader.contains(event.target)) setMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !siteHeader.classList.contains("is-open")) return;
    setMenuOpen(false);
    menuToggle.focus();
  });

  const desktopQuery = window.matchMedia("(min-width: 801px)");
  const closeOnDesktop = (event) => {
    if (event.matches) setMenuOpen(false);
  };
  if (typeof desktopQuery.addEventListener === "function") {
    desktopQuery.addEventListener("change", closeOnDesktop);
  } else if (typeof desktopQuery.addListener === "function") {
    desktopQuery.addListener(closeOnDesktop);
  }
}

// Шапка остаётся на экране при прокрутке и показывает прогресс чтения.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (siteHeader) {
  const progressBar = document.createElement("span");
  progressBar.className = "scroll-progress";
  progressBar.setAttribute("aria-hidden", "true");
  siteHeader.append(progressBar);

  const visitFlower = document.querySelector(".visit-flower");
  let frame = 0;
  const updateScroll = () => {
    frame = 0;
    const top = window.scrollY || document.documentElement.scrollTop;
    siteHeader.classList.toggle("is-scrolled", top > 8);

    const max = document.documentElement.scrollHeight - window.innerHeight;
    const value = max > 0 ? Math.min(top / max, 1) : 0;
    progressBar.style.transform = `scaleX(${value})`;

    if (visitFlower && !reduceMotion.matches) {
      const rect = visitFlower.parentElement.getBoundingClientRect();
      if (rect.top < window.innerHeight + 160 && rect.bottom > -160) {
        const offset =
          (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
        visitFlower.style.transform = `translateY(${(-offset * 26).toFixed(1)}px) rotate(${(offset * 5).toFixed(1)}deg)`;
      }
    }
  };
  const requestUpdate = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(updateScroll);
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  updateScroll();
}

// Плавное появление блоков при прокрутке: лёгкий подъём и проявление.
if (
  window.matchMedia("(min-width: 801px)").matches &&
  !reduceMotion.matches &&
  "IntersectionObserver" in window &&
  typeof Element.prototype.animate === "function"
) {
  const revealSelectors = [
    ".hero-copy > *",
    ".hero-illustration",
    ".intro-strip",
    ".section-heading",
    ".service-card",
    ".review-card",
    ".review-links",
    ".visit-banner",
    ".contact-copy > *",
    ".contact-map",
    ".page-hero > *",
    ".price-list li",
    ".price-section > .button",
    ".next-service",
    ".works-grid figure",
    ".site-footer > *"
  ];

  const seen = new Set();
  const revealItems = [];

  revealSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      if (seen.has(element)) return;
      seen.add(element);
      revealItems.push(element);
    });
  });

  revealItems.forEach((element) => {
    const siblings = element.parentElement ? [...element.parentElement.children] : [];
    const index = Math.max(siblings.indexOf(element), 0);
    element.dataset.revealDelay = String(Math.min(index * 55, 220));
    element.style.opacity = "0";
    element.style.transform = "translateY(22px)";
    element.style.willChange = "opacity, transform";
  });

  const revealAnimations = new WeakMap();

  const hideForReveal = (element) => {
    element.style.opacity = "0";
    element.style.transform = "translateY(22px)";
    element.style.willChange = "opacity, transform";
  };

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const element = entry.target;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.12) {
          const previous = revealAnimations.get(element);
          if (previous) previous.cancel();

          const animation = element.animate(
            [
              { opacity: 0, transform: "translateY(22px)" },
              { opacity: 1, transform: "translateY(0)" }
            ],
            {
              duration: 720,
              delay: Number(element.dataset.revealDelay || 0),
              easing: "cubic-bezier(.22,.7,.24,1)",
              fill: "both"
            }
          );

          revealAnimations.set(element, animation);

          animation.onfinish = () => {
            element.style.opacity = "";
            element.style.transform = "";
            element.style.willChange = "";
            animation.cancel();
            revealAnimations.delete(element);
          };
        } else if (!entry.isIntersecting) {
          const previous = revealAnimations.get(element);
          if (previous) {
            previous.cancel();
            revealAnimations.delete(element);
          }
          hideForReveal(element);
        }
      });
    },
    { threshold: [0, 0.12], rootMargin: "0px 0px -6% 0px" }
  );

  revealItems.forEach((element) => revealObserver.observe(element));
}

// Мобильные карусели: горизонтальные списки должны быть доступны и с клавиатуры.
const carouselLists = [
  { element: document.querySelector(".service-cards"), label: "services-title" },
  { element: document.querySelector(".review-grid"), label: "reviews-title" },
  { element: document.querySelector(".works-grid"), label: "works-gallery-title" }
].filter((item) => item.element);
const narrowQuery = window.matchMedia("(max-width: 580px)");

const syncCarousels = () => {
  carouselLists.forEach(({ element, label }) => {
    if (narrowQuery.matches) {
      element.setAttribute("tabindex", "0");
      element.setAttribute("role", "group");
      element.setAttribute("aria-labelledby", label);
    } else {
      element.removeAttribute("tabindex");
      element.removeAttribute("role");
      element.removeAttribute("aria-labelledby");
    }
  });
};

carouselLists.forEach(({ element }) => {
  element.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const card = element.firstElementChild;
    if (!card) return;
    const step = card.getBoundingClientRect().width + 12;
    element.scrollBy({
      left: event.key === "ArrowRight" ? step : -step,
      behavior: reduceMotion.matches ? "auto" : "smooth"
    });
    event.preventDefault();
  });
});

syncCarousels();
if (typeof narrowQuery.addEventListener === "function") {
  narrowQuery.addEventListener("change", syncCarousels);
} else if (typeof narrowQuery.addListener === "function") {
  narrowQuery.addListener(syncCarousels);
}
