import confetti from "canvas-confetti";

const CAIS_COLORS = ["#d9bd7e", "#002B49", "#081421"];

let overlayEl: HTMLDivElement | null = null;
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

function removeOverlay() {
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }
  overlayEl?.remove();
  overlayEl = null;
}

export function fireCelebration() {
  removeOverlay();

  const end = Date.now() + 3000;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: CAIS_COLORS,
      zIndex: 9999,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: CAIS_COLORS,
      zIndex: 9999,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();

  overlayEl = document.createElement("div");
  overlayEl.className =
    "fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none";
  overlayEl.innerHTML = `
    <div class="rounded-lg border border-ouro/40 bg-azul-profundo/90 px-8 py-6 text-center shadow-xl animate-fade-in">
      <p class="text-[22px] font-semibold text-ouro">Parabéns!</p>
      <p class="mt-1 text-[15px] text-branco">Meta Impulsionada!</p>
    </div>
  `;
  document.body.appendChild(overlayEl);

  cleanupTimer = setTimeout(removeOverlay, 4000);
}
