// popup.js

const SUGGESTIONS = {
  overwhelmed: [
    { id: "ov1", text: "Pick just ONE tiny task: the smallest possible step. Write it down and do only that. You don't have to finish everything right now." },
    { id: "ov2", text: "Take 3 slow, deep breaths. Then write down everything on your mind. Getting it out of your head makes it feel smaller." },
    { id: "ov3", text: "Close all other tabs. Set a 3-minute timer and open only the ONE thing you need to work on." }
  ],
  distracted: [
    { id: "di1", text: "Put your phone face-down across the room. Tell yourself: 'I only need to focus for 3 minutes.' That's it." },
    { id: "di2", text: "Write down what's distracting you on a piece of paper and give yourself permission to think about it after the timer." },
    { id: "di3", text: "Try body doubling: open a focus live-stream or study with a friend virtually. Presence helps." }
  ],
  tired: [
    { id: "ti1", text: "Stand up, stretch your arms above your head for 20 seconds, and drink water. A micro-reset helps." },
    { id: "ti2", text: "Splash cold water on your face. Then just open the work. It doesn’t have to be perfect." },
    { id: "ti3", text: "Do 10 jumping jacks or walk around the room twice. Even 60 seconds of movement wakes up the brain." }
  ],
  lost: [
    { id: "lo1", text: "Ask: 'What's the very first sentence I could write, or first number I could calculate?' Start there." },
    { id: "lo2", text: "Open a blank doc and write: 'I'm going to work on ___.’ Fill in the blank. That’s your start." },
    { id: "lo3", text: "Review your notes or the last thing you did for 60 seconds. Momentum comes from seeing what you already know." }
  ]
};

const TIMER_DURATION = 180;
const RING_CIRCUMFERENCE = 2 * Math.PI * 42;

let currentReason = null;
let currentSuggestion = null;
let timerInterval = null;
let secondsLeft = TIMER_DURATION;

const screens = {
  reason: document.getElementById("screen-reason"),
  suggestion: document.getElementById("screen-suggestion"),
  feedback: document.getElementById("screen-feedback"),
  done: document.getElementById("screen-done")
};

const timerDisplay = document.getElementById("timer-display");
const ringProgress = document.getElementById("ring-progress");
const suggestionText = document.getElementById("suggestion-text");
const doneMessage = document.getElementById("done-message");

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

function loadScores() {
  return new Promise(resolve => {
    chrome.storage.local.get("scores", data => {
      resolve(data.scores || {});
    });
  });
}

function saveScores(scores) {
  return new Promise(resolve => {
    chrome.storage.local.set({ scores }, resolve);
  });
}

async function getBestSuggestion(reason) {
  const scores = await loadScores();
  return SUGGESTIONS[reason]
    .map(s => ({ ...s, score: scores[s.id] || 0 }))
    .sort((a, b) => b.score - a.score)[0];
}

async function recordFeedback(id, helpful) {
  const scores = await loadScores();
  scores[id] = (scores[id] || 0) + (helpful ? 1 : -1);
  await saveScores(scores);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function updateTimerUI(seconds) {
  const progress = seconds / TIMER_DURATION;

  ringProgress.style.strokeDashoffset =
    RING_CIRCUMFERENCE * (1 - progress);

  if (seconds <= 30) {
    ringProgress.style.stroke = "var(--accent-yellow)";
  }

  timerDisplay.textContent = formatTime(seconds);
}

function startTimer() {
  secondsLeft = TIMER_DURATION;

  ringProgress.style.strokeDasharray = RING_CIRCUMFERENCE;
  ringProgress.style.stroke = "var(--accent-green)";

  updateTimerUI(secondsLeft);

  timerInterval = setInterval(() => {
    secondsLeft--;
    updateTimerUI(secondsLeft);

    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
      showScreen("feedback");
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

document.querySelectorAll(".reason-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    currentReason = btn.dataset.reason;
    currentSuggestion = await getBestSuggestion(currentReason);

    suggestionText.textContent = currentSuggestion.text;
    showScreen("suggestion");
    startTimer();
  });
});

document.getElementById("btn-skip").addEventListener("click", () => {
  stopTimer();
  showScreen("feedback");
});

document.getElementById("btn-yes").addEventListener("click", async () => {
  await recordFeedback(currentSuggestion.id, true);
  doneMessage.textContent =
    "Nice. That one’s moving up for next time. Keep going.";
  showScreen("done");
});

document.getElementById("btn-no").addEventListener("click", async () => {
  await recordFeedback(currentSuggestion.id, false);
  doneMessage.textContent =
    "Got it. We’ll show that one less often.";
  showScreen("done");
});

document.getElementById("btn-restart").addEventListener("click", () => {
  currentReason = null;
  currentSuggestion = null;
  showScreen("reason");
});