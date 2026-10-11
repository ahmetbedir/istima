// İstima website: sticky header shadow, the audio sample player, the store link.

// The Chrome Web Store listing. The links are also written into the HTML; this keeps any "#yukle" button in step.
const STORE_URL = "https://chromewebstore.google.com/detail/idnhjopkmlgdhipcfplknfdfpkcehhle";

(() => {
  const header = document.querySelector(".site-header");
  const onScroll = () => header.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const store = document.getElementById("store-link");
  if (store && STORE_URL) {
    store.href = STORE_URL;
    store.target = "_blank";
    store.rel = "noopener";
    document.getElementById("store-label").textContent = "Chrome Web Mağazası'ndan ekle";
    for (const a of document.querySelectorAll('a[href="#yukle"].btn-primary')) a.href = STORE_URL;
  }

  // ---------------------------------------------------------------- sample
  const sample = document.querySelector(".sample");
  if (!sample) return;
  const audio = document.getElementById("sample-audio");
  const button = document.getElementById("sample-play");
  const wave = document.getElementById("wave");
  const time = document.getElementById("sample-time");
  // loudness of the real recording in 56 slices
  const PEAKS = [0.58, 0.89, 0.9, 0.78, 0.65, 0.74, 0.33, 0.18, 0.12, 0.94, 0.83, 0.71, 0.78, 0.91, 0.44, 0.49, 0.12, 0.73, 0.97, 0.77, 0.81, 0.33, 0.7, 0.69, 0.58, 0.88, 0.76, 0.61, 0.38, 0.22, 0.12, 0.89, 1.0, 0.93, 0.57, 0.69, 0.64, 0.47, 0.88, 0.73, 0.3, 0.98, 0.43, 0.21, 0.26, 0.74, 0.83, 0.72, 0.87, 0.74, 0.71, 0.77, 0.46, 0.61, 0.4, 0.12];
  const bars = PEAKS.map((p) => {
    const i = document.createElement("i");
    i.style.height = `${Math.round(p * 100)}%`;
    wave.append(i);
    return i;
  });
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const DURATION = 17.8;

  function paint() {
    const d = audio.duration || DURATION;
    const f = audio.currentTime / d;
    bars.forEach((b, k) => b.classList.toggle("on", k / bars.length < f));
    time.textContent = audio.currentTime > 0 ? `${fmt(audio.currentTime)} / ${fmt(d)}` : fmt(d);
  }

  button.addEventListener("click", () => (audio.paused ? audio.play() : audio.pause()));
  wave.addEventListener("click", (e) => {
    const r = wave.getBoundingClientRect();
    const f = (e.clientX - r.left) / r.width;
    const seek = () => { audio.currentTime = f * (audio.duration || DURATION); paint(); };
    if (audio.readyState >= 1) seek();
    else { audio.addEventListener("loadedmetadata", seek, { once: true }); audio.load(); }
    if (audio.paused) audio.play();
  });
  audio.addEventListener("play", () => { sample.classList.add("playing"); button.setAttribute("aria-label", "Duraklat"); });
  audio.addEventListener("pause", () => { sample.classList.remove("playing"); button.setAttribute("aria-label", "Örnek haberi dinle"); });
  audio.addEventListener("ended", () => { audio.currentTime = 0; paint(); });
  audio.addEventListener("timeupdate", paint);
})();
