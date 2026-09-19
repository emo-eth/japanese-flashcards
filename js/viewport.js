export function computeKeyboardViewport({ visualHeight, visualOffsetTop, innerHeight }) {
  const height = Math.round(visualHeight ?? innerHeight);
  const offsetTop = Math.round(visualOffsetTop ?? 0);
  const keyboardHeight = Math.max(0, Math.round(innerHeight - height));
  return { height, offsetTop, keyboardHeight };
}

export function observeKeyboardViewport(target = document.documentElement) {
  const vv = window.visualViewport ?? null;
  const emit = () => {
    const viewport = computeKeyboardViewport({
      visualHeight: vv ? vv.height : null,
      visualOffsetTop: vv ? vv.offsetTop : null,
      innerHeight: window.innerHeight,
    });
    target.style.setProperty("--kbv-height", `${viewport.height}px`);
    target.style.setProperty("--kbv-offset", `${viewport.offsetTop}px`);
    target.classList.toggle("kb-open", viewport.keyboardHeight > 140);
    return viewport;
  };
  emit();
  vv?.addEventListener("resize", emit);
  vv?.addEventListener("scroll", emit);
  window.addEventListener("resize", emit);
  return emit;
}
