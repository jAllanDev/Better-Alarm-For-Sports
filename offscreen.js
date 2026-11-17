let audioContext = null;
let alarmTimer = null;
let alarmPulseCount = 0;

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }

  return audioContext;
}

async function playBeep() {
  const context = ensureAudioContext();

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      return;
    }
  }

  const now = context.currentTime;
  const tones = alarmPulseCount % 2 === 0 ? [1040, 1560] : [1240, 1860];

  tones.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const compressor = context.createDynamicsCompressor();

    oscillator.type = "square";
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.0001;

    oscillator.connect(gain);
    gain.connect(compressor);
    compressor.connect(context.destination);

    const startTime = now + index * 0.04;
    const endTime = startTime + 0.22;

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.55, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

    oscillator.start(startTime);
    oscillator.stop(endTime + 0.02);
  });

  alarmPulseCount += 1;
}

function startAlarm() {
  if (alarmTimer) {
    return;
  }

  playBeep().catch(() => {});
  alarmTimer = setInterval(() => {
    playBeep().catch(() => {});
  }, 700);
}

function stopAlarm() {
  if (alarmTimer) {
    clearInterval(alarmTimer);
    alarmTimer = null;
  }

  alarmPulseCount = 0;

  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "START_ALARM") {
    startAlarm();
  }

  if (message?.type === "STOP_ALARM") {
    stopAlarm();
  }
});