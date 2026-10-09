import { t, localize, formatSpeed } from "../shared/i18n.js";
import { SPEEDS } from "../shared/settings.js";
import { hasAutoDetect, requestAutoDetect } from "../shared/auto-detect.js";

const $ = (id) => document.getElementById(id);
const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5.6v12.8a1 1 0 0 0 1.5.86l10.2-6.4a1 1 0 0 0 0-1.72L9.5 4.74A1 1 0 0 0 8 5.6z" fill="currentColor"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24"><rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>';

let tab = null, detection = null, detecting = true, state = { session: null, engine: { state: "idle" } };

const send = (msg) => chrome.runtime.sendMessage(msg);
const control = (action, value) => send({ type: "control", action, value });

function show(id) {
  for (const s of ["now", "found", "none", "restricted"]) $(s).hidden = s !== id;
}

function showError(key) {
  $("error").textContent = t(key);
  $("error").hidden = false;
}

function renderEngine() {
  const e = state.engine || {};
  const chip = $("engine");
  chip.dataset.state = e.state || "idle";
  if (e.state === "loading") {
    const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
    $("engine-text").textContent = pct && pct < 100 ? t("engineLoadingPct", [String(pct)]) : t("engineLoading");
  } else if (e.state === "ready") $("engine-text").textContent = t("engineReady");
  else if (e.state === "error") $("engine-text").textContent = t("engineError");
  else $("engine-text").textContent = t("engineOnDevice");
}

function renderSpeeds(current) {
  const box = $("speeds");
  if (!box.children.length) {
    for (const s of SPEEDS) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = formatSpeed(s);
      b.dataset.speed = String(s);
      b.addEventListener("click", () => control("speed", s));
      box.append(b);
    }
  }
  for (const b of box.children) b.setAttribute("aria-pressed", String(Number(b.dataset.speed) === current));
}

function render() {
  renderEngine();
  const s = state.session;
  if (s) {
    show("now");
    $("now-kicker").textContent = s.source === "selection" ? t("popupNowSelection") : s.source === "test" ? t("popupNowTest") : (s.site || t("popupNowReading"));
    $("now-title").textContent = s.title || "";
    $("now-excerpt").textContent = s.current || "";
    $("now-count").textContent = `${Math.min(s.index + 1, s.total)}/${s.total}`;
    $("now-bar").style.width = `${Math.round(((s.index + (s.state === "ended" ? 1 : 0.5)) / s.total) * 100)}%`;
    const playing = ["playing", "buffering", "loading"].includes(s.state);
    $("toggle").innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    $("toggle").setAttribute("aria-label", t(playing ? "playerPause" : "playerPlay"));
    $("toggle").title = t(playing ? "playerPause" : "playerPlay");
    $("prev").disabled = s.index <= 0;
    $("next").disabled = s.index >= s.total - 1;
    const statusKey = { loading: "statusLoading", buffering: "statusBuffering", playing: "statusPlaying", paused: "statusPaused", ended: "statusEnded", error: "statusError" }[s.state];
    $("now-status").textContent = statusKey ? t(statusKey) : "";
    renderSpeeds(s.speed ?? 1);
    $("goto").hidden = s.tabId == null || s.tabId === tab?.id;
    return;
  }
  if (detecting) { show(""); return; }
  if (!detection) { show("restricted"); return; }
  if (detection.isTurkish && detection.isArticle) {
    show("found");
    $("found-title").textContent = detection.title;
    $("found-meta").textContent = [detection.site, t("pillMinutes", [String(detection.minutes || 1)]), t("popupParagraphs", [String(detection.paragraphs)])].filter(Boolean).join(" · ");
  } else {
    show("none");
  }
}

async function detect() {
  if (!tab?.id || !/^https?:/.test(tab.url || "")) return null;
  const ask = () => chrome.tabs.sendMessage(tab.id, { type: "istima-detect" });
  try {
    return await ask();
  } catch {
    try {
      // the tab was open before İstima was installed: inject now (activeTab allows it)
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["vendor/readability/Readability-readerable.js", "vendor/readability/Readability.js", "content/player-ui.js", "content/content.js"],
      });
      return await ask();
    } catch {
      return null;
    }
  }
}

async function startFromTab() {
  $("error").hidden = true;
  const res = await send({ type: "start-tab", tabId: tab.id });
  if (!res?.ok) showError(res?.error === "restricted" ? "popupRestrictedTitle" : "popupNoArticle");
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.target !== "ui" || msg.type !== "state") return;
  state = { session: msg.session, engine: msg.engine };
  render();
});

$("listen").addEventListener("click", startFromTab);
// the permission prompt may close the popup; the background picks the grant up either way
$("auto-on").addEventListener("click", () => requestAutoDetect().then((ok) => { $("auto-hint").hidden = ok; }, () => {}));
$("read-anyway").addEventListener("click", startFromTab);
$("toggle").addEventListener("click", () => control("toggle"));
$("prev").addEventListener("click", () => control("prev"));
$("next").addEventListener("click", () => control("next"));
$("stop").addEventListener("click", async () => {
  await control("stop");
  detection = await detect();
  detecting = false;
  render();
});
$("goto").addEventListener("click", async () => {
  const s = state.session;
  if (s?.tabId == null) return;
  const target = await chrome.tabs.update(s.tabId, { active: true });
  if (target?.windowId != null) chrome.windows.update(target.windowId, { focused: true });
  window.close();
});
$("open-options").addEventListener("click", (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); window.close(); });
$("open-shortcuts").addEventListener("click", (e) => { e.preventDefault(); chrome.tabs.create({ url: "chrome://extensions/shortcuts" }); window.close(); });

(async () => {
  localize();
  hasAutoDetect().then((on) => { $("auto-hint").hidden = on; });
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state = await send({ type: "get-state", tabId: tab?.id });
  render();
  if (!state.session) {
    detection = await detect();
  }
  detecting = false;
  render();
})();
