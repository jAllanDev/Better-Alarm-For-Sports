const TARGET_HOSTS = ["Cruise", "Wes"];
const POLL_INTERVAL_MS = 1500;

let lastReportedSignature = "";
let pendingScan = null;

function collectTextFromDocument(rootDocument) {
  if (!rootDocument) {
    return "";
  }

  const exactBubbleNodes = Array.from(rootDocument.querySelectorAll("span.v-btn__content[data-no-activator], [data-no-activator]"));
  const exactBubbleText = exactBubbleNodes.map((node) => node.textContent || "").join(" ");
  if (exactBubbleText.trim()) {
    return exactBubbleText;
  }

  const pieces = [];
  const visited = new Set();

  const visitNode = (node) => {
    if (!node || visited.has(node)) {
      return;
    }

    visited.add(node);

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        pieces.push(text);
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
      return;
    }

    const element = node;
    if (element.shadowRoot) {
      visitNode(element.shadowRoot);
    }

    if (element.tagName === "IFRAME") {
      try {
        visitNode(element.contentDocument);
      } catch {
        return;
      }
      return;
    }

    const children = element.childNodes || [];
    for (const child of children) {
      visitNode(child);
    }
  };

  visitNode(rootDocument.body || rootDocument.documentElement);

  return pieces.join(" ");
}

function collectCandidateText() {
  const documents = [document];
  const frameElements = Array.from(document.querySelectorAll("iframe"));

  for (const frameElement of frameElements) {
    try {
      if (frameElement.contentDocument) {
        documents.push(frameElement.contentDocument);
      }
    } catch {
      continue;
    }
  }

  return documents.map((rootDocument) => collectTextFromDocument(rootDocument)).filter(Boolean).join(" ");
}

function detectHosts(text) {
  return TARGET_HOSTS.filter((host) => new RegExp(`\\b${host}\\b`, "i").test(text));
}

function reportDetection(hosts) {
  const signature = hosts.join("|");
  if (signature === lastReportedSignature) {
    return;
  }

  lastReportedSignature = signature;

  chrome.runtime.sendMessage({
    type: hosts.length ? "HOSTS_DETECTED" : "NO_HOSTS",
    hosts,
    url: location.href
  }).catch(() => {});
}

function scanPage() {
  const text = collectCandidateText();
  const hosts = detectHosts(text);
  reportDetection(hosts);
}

function scheduleScan() {
  if (pendingScan) {
    return;
  }

  pendingScan = window.setTimeout(() => {
    pendingScan = null;
    scanPage();
  }, 250);
}

const observer = new MutationObserver(() => scheduleScan());

if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

window.addEventListener("DOMContentLoaded", scanPage, { once: true });
window.addEventListener("load", scanPage, { once: true });
setInterval(scanPage, POLL_INTERVAL_MS);
scheduleScan();