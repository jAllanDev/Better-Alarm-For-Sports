const enabledToggle = document.getElementById("enabledToggle");
const ackButton = document.getElementById("ackButton");
const statusText = document.getElementById("statusText");
const hostList = document.getElementById("hostList");
const latestMatch = document.getElementById("latestMatch");

function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

function renderState(state) {
  enabledToggle.checked = Boolean(state.enabled);
  statusText.textContent = state.enabled
    ? state.alarmActive
      ? "Alarm sounding"
      : state.suppressedUntilClear
        ? "Acknowledged, waiting for the page to clear"
        : "Monitoring"
    : "Disabled";

  hostList.textContent = state.lastMatches?.length ? state.lastMatches.join(", ") : "Cruise, Wes";
  latestMatch.textContent = state.lastMatches?.length ? state.lastMatches.join(", ") : "None";
  ackButton.disabled = !state.enabled || !state.lastMatches?.length;
}

async function refreshState() {
  const response = await sendMessage({ type: "GET_STATE" });
  renderState(response?.state || {});
}

enabledToggle.addEventListener("change", async () => {
  const response = await sendMessage({ type: "SET_ENABLED", enabled: enabledToggle.checked });
  renderState(response?.state || {});
});

ackButton.addEventListener("click", async () => {
  const response = await sendMessage({ type: "ACKNOWLEDGE" });
  renderState(response?.state || {});
});

refreshState().catch(() => {
  statusText.textContent = "Extension unavailable";
});