const DEFAULT_STATE = {
  enabled: true,
  suppressedUntilClear: false,
  alarmActive: false,
  lastMatches: []
};

let state = { ...DEFAULT_STATE };
const stateReady = loadState();

async function loadState() {
  const stored = await chrome.storage.local.get(DEFAULT_STATE);
  state = { ...DEFAULT_STATE, ...stored };
  updateBadge();
}

async function saveState() {
  await chrome.storage.local.set(state);
  updateBadge();
}

function updateBadge() {
  if (state.alarmActive) {
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#b91c1c" });
    chrome.action.setTitle({ title: `Support Host Alert: ${state.lastMatches.join(", ")} detected` });
    return;
  }

  if (!state.enabled) {
    chrome.action.setBadgeText({ text: "OFF" });
    chrome.action.setBadgeBackgroundColor({ color: "#525252" });
    chrome.action.setTitle({ title: "Support Host Alert: disabled" });
    return;
  }

  chrome.action.setBadgeText({ text: state.suppressedUntilClear ? "ACK" : "ON" });
  chrome.action.setBadgeBackgroundColor({ color: "#0f766e" });
  chrome.action.setTitle({ title: state.suppressedUntilClear ? "Support Host Alert: acknowledged, waiting for clear" : "Support Host Alert: monitoring" });
}

async function ensureOffscreenDocument() {
  if (await chrome.offscreen.hasDocument()) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["AUDIO_PLAYBACK"],
    justification: "Play a repeating alarm until the chat is acknowledged."
  });
}

async function startAlarm(hosts) {
  if (state.alarmActive) {
    state.lastMatches = hosts;
    await saveState();
    return;
  }

  await ensureOffscreenDocument();
  state.alarmActive = true;
  state.lastMatches = hosts;
  await saveState();
  chrome.runtime.sendMessage({ type: "START_ALARM", hosts }).catch(() => {});
}

async function stopAlarm() {
  state.alarmActive = false;
  await saveState();
  chrome.runtime.sendMessage({ type: "STOP_ALARM" }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set(DEFAULT_STATE).catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  loadState().catch(() => {});
});

async function handleMessage(message, sendResponse) {
  await stateReady;

  const reply = (payload) => {
    sendResponse(payload);
  };

  if (message?.type === "GET_STATE") {
    reply({ state });
    return false;
  }

  if (message?.type === "SET_ENABLED") {
    state.enabled = Boolean(message.enabled);
    if (!state.enabled) {
      state.suppressedUntilClear = false;
      state.lastMatches = [];
      stopAlarm().catch(() => {});
    } else {
      updateBadge();
      saveState().catch(() => {});
    }
    reply({ ok: true, state });
    return false;
  }

  if (message?.type === "ACKNOWLEDGE") {
    state.suppressedUntilClear = true;
    state.lastMatches = message.hosts || state.lastMatches;
    stopAlarm().catch(() => {});
    reply({ ok: true, state });
    return false;
  }

  if (message?.type === "HOSTS_DETECTED") {
    const hosts = Array.isArray(message.hosts) ? message.hosts : [];
    state.lastMatches = hosts;
    if (!state.enabled || state.suppressedUntilClear || hosts.length === 0) {
      saveState().catch(() => {});
      reply({ ok: true, state, triggered: false });
      return false;
    }

    startAlarm(hosts).catch(() => {});
    reply({ ok: true, state, triggered: true });
    return false;
  }

  if (message?.type === "NO_HOSTS") {
    state.lastMatches = [];
    state.suppressedUntilClear = false;
    if (state.alarmActive) {
      stopAlarm().catch(() => {});
    } else {
      saveState().catch(() => {});
    }
    reply({ ok: true, state });
    return false;
  }

  return false;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sendResponse).catch(() => {
    sendResponse({ ok: false });
  });

  return true;
});