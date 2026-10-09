// User settings (chrome.storage.sync). content/content.js keeps a copy of DEFAULTS, since content scripts
// cannot import modules; keep the two in step.
export const DEFAULTS = {
  speed: 1, // 1 = the voice's natural pace
  readTitle: true,
  highlight: true,
  autoScroll: true,
  showButton: true,
  autoPlay: false,
  position: "right", // right | left
  disabledSites: [],
};

export const SPEEDS = [0.8, 1, 1.15, 1.3, 1.5, 1.75];

export async function getSettings() {
  return { ...DEFAULTS, ...(await chrome.storage.sync.get(null)) };
}
