import { t, localize } from "../shared/i18n.js";

localize();
const status = document.getElementById("try-status");
document.getElementById("try").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "start", source: "test", title: t("popupNowTest"), paragraphs: [t("welcomeSample")] });
});
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.target !== "ui" || msg.type !== "state") return;
  const e = msg.engine, s = msg.session;
  if (e?.state === "loading") {
    const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
    status.textContent = pct && pct < 100 ? t("statusLoadingPct", [String(pct)]) : t("statusLoading");
  } else if (s?.source === "test") {
    const key = { buffering: "statusBuffering", playing: "statusPlaying", paused: "statusPaused", ended: "statusEnded", error: "statusError" }[s.state];
    status.textContent = key ? t(key) : "";
  } else status.textContent = "";
});
