// The optional "find articles automatically" host permission (see background.js syncAutoDetect).
// request() must run inside a user gesture.
const ORIGINS = ["http://*/*", "https://*/*"];
export const hasAutoDetect = () => chrome.permissions.contains({ origins: ORIGINS });
export const requestAutoDetect = () => chrome.permissions.request({ origins: ORIGINS });
export const removeAutoDetect = () => chrome.permissions.remove({ origins: ORIGINS });
