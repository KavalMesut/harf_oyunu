"use strict";

const GAME_LENGTHS = [5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10];
const REQUIRED_LENGTHS = [5, 6, 7, 8, 9, 10];
const MAX_SCORE = 900;
const HINT_SECONDS = 5;
const TURKISH_WORD_PATTERN = /^[A-ZÇĞİÖŞÜ]+$/u;
const VOLUME_BOOST = 5.5;

// Açık oyun durumu: her yeni oyunda tek bir kaynaktan sıfırlanır.
let wordPool = new Map();
let selectedQuestions = [];
let currentQuestionIndex = 0;
let totalScore = 0;
let revealedLetterCount = 0;
let currentQuestionTimer = null;
let countdownTimer = null;
let letterDomIds = [];
let previousGameWords = new Set();
let audioContext = null;
let masterGainNode = null;
let compressorNode = null;
let soundEnabled = true;
let volumeLevel = 50;
let lastAudibleVolume = 50;
let userHasInteracted = false;
let countdown = HINT_SECONDS;
let roundLocked = false;
let questionToken = 0;

const elements = {
  loadingPanel: document.querySelector("#loadingPanel"),
  startPanel: document.querySelector("#startPanel"),
  startGameButton: document.querySelector("#startGameButton"),
  errorPanel: document.querySelector("#errorPanel"),
  errorMessage: document.querySelector("#errorMessage"),
  gameLayout: document.querySelector("#gameLayout"),
  endPanel: document.querySelector("#endPanel"),
  questionCounter: document.querySelector("#questionCounter"),
  totalScore: document.querySelector("#totalScore"),
  availableScore: document.querySelector("#availableScore"),
  progressFill: document.querySelector("#progressFill"),
  progressText: document.querySelector("#progressText"),
  countdownValue: document.querySelector("#countdownValue"),
  hintClock: document.querySelector("#hintClock"),
  wordLength: document.querySelector("#wordLength"),
  letters: document.querySelector("#letters"),
  answerForm: document.querySelector("#answerForm"),
  answerRow: document.querySelector("#answerRow"),
  answerInput: document.querySelector("#answerInput"),
  checkButton: document.querySelector("#checkButton"),
  feedbackMessage: document.querySelector("#feedbackMessage"),
  revealedCount: document.querySelector("#revealedCount"),
  newGameButton: document.querySelector("#newGameButton"),
  playAgainButton: document.querySelector("#playAgainButton"),
  finalScore: document.querySelector("#finalScore"),
  successRate: document.querySelector("#successRate"),
  resultMeterFill: document.querySelector("#resultMeterFill"),
  soundButton: document.querySelector("#soundButton"),
  soundLabel: document.querySelector("#soundLabel"),
  volumeSlider: document.querySelector("#volumeSlider"),
  volumeOutput: document.querySelector("#volumeOutput")
};

function normalizeTurkish(value) {
  return value.trim().toLocaleUpperCase("tr-TR");
}

function characterCount(word) {
  return [...word].length;
}

async function loadWords() {
  try {
    const response = await fetch("turkce_kelime_listesi.txt", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const rawText = await response.text();
    const uniqueWords = new Set(
      rawText
        .split(/\r?\n/u)
        .map(normalizeTurkish)
        .filter(Boolean)
        .filter((word) => TURKISH_WORD_PATTERN.test(word))
        .filter((word) => REQUIRED_LENGTHS.includes(characterCount(word)))
    );

    wordPool = new Map(REQUIRED_LENGTHS.map((length) => [length, []]));
    uniqueWords.forEach((word) => wordPool.get(characterCount(word)).push(word));

    const insufficient = REQUIRED_LENGTHS.filter((length) => wordPool.get(length).length < 2);
    if (insufficient.length) {
      const labels = insufficient.map((length) => `${length} harfli`).join(", ");
      showFatalError(`Şu gruplarda en az iki geçerli kelime bulunmalı: ${labels}.`);
      return;
    }

    elements.loadingPanel.hidden = true;
    showStartScreen();
  } catch (error) {
    console.error("Kelime listesi yüklenemedi:", error);
    showFatalError(
      "Kelime listesi yüklenemedi. Projeyi VS Code Live Server veya yerel bir HTTP sunucusu üzerinden çalıştırın."
    );
  }
}

function showStartScreen() {
  clearAllTimers();
  elements.gameLayout.hidden = true;
  elements.endPanel.hidden = true;
  elements.errorPanel.hidden = true;
  elements.startPanel.hidden = false;
  requestAnimationFrame(() => elements.startGameButton.focus({ preventScroll: true }));
}

function showFatalError(message) {
  clearAllTimers();
  elements.loadingPanel.hidden = true;
  elements.startPanel.hidden = true;
  elements.gameLayout.hidden = true;
  elements.endPanel.hidden = true;
  elements.errorMessage.textContent = message;
  elements.errorPanel.hidden = false;
}

function randomIndex(max) {
  if (globalThis.crypto?.getRandomValues) {
    const limit = Math.floor(0x100000000 / max) * max;
    const value = new Uint32Array(1);
    do globalThis.crypto.getRandomValues(value); while (value[0] >= limit);
    return value[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function takeRandom(items) {
  return items.splice(randomIndex(items.length), 1)[0];
}

function pickTwoWords(length) {
  const all = [...wordPool.get(length)];
  const fresh = all.filter((word) => !previousGameWords.has(word));
  const chosen = [];

  while (chosen.length < 2 && fresh.length) chosen.push(takeRandom(fresh));

  const fallback = all.filter((word) => !chosen.includes(word));
  while (chosen.length < 2) chosen.push(takeRandom(fallback));

  return chosen;
}

function selectQuestions() {
  const chosenByLength = new Map();
  REQUIRED_LENGTHS.forEach((length) => chosenByLength.set(length, pickTwoWords(length)));
  return GAME_LENGTHS.map((length) => chosenByLength.get(length).shift());
}

function startNewGame() {
  clearAllTimers();
  questionToken += 1;
  totalScore = 0;
  currentQuestionIndex = 0;
  revealedLetterCount = 0;
  roundLocked = false;
  elements.answerInput.value = "";
  elements.errorPanel.hidden = true;
  elements.startPanel.hidden = true;
  elements.endPanel.hidden = true;
  elements.gameLayout.hidden = false;

  selectedQuestions = selectQuestions();
  previousGameWords = new Set(selectedQuestions);
  startQuestion();
}

function shuffleWord(word) {
  const original = [...word];
  const shuffled = [...original];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  if (shuffled.join("") === original.join("")) {
    const differentIndex = shuffled.findIndex((character) => character !== shuffled[0]);
    if (differentIndex > 0) {
      [shuffled[0], shuffled[differentIndex]] = [shuffled[differentIndex], shuffled[0]];
    }
  }

  return shuffled;
}

function startQuestion() {
  clearAllTimers();
  questionToken += 1;
  roundLocked = false;
  revealedLetterCount = 0;
  countdown = HINT_SECONDS;

  const word = selectedQuestions[currentQuestionIndex];
  const characters = shuffleWord(word);

  elements.answerInput.disabled = false;
  elements.checkButton.disabled = false;
  elements.answerInput.value = "";
  elements.feedbackMessage.textContent = "";
  elements.feedbackMessage.className = "feedback";
  elements.answerRow.classList.remove("is-wrong");

  renderLetters(characters);
  updateInterface();
  startHintTimers();

  requestAnimationFrame(() => elements.answerInput.focus({ preventScroll: true }));
}

function renderLetters(characters) {
  const fragment = document.createDocumentFragment();
  letterDomIds = [];
  elements.letters.replaceChildren();
  elements.letters.style.setProperty("--letter-count", characters.length);

  characters.forEach((character, index) => {
    const id = `letter-${questionToken}-${index}`;
    const tile = document.createElement("span");
    tile.className = "letter-tile";
    tile.id = id;
    tile.dataset.character = character;
    tile.dataset.revealed = "false";
    tile.textContent = character;
    tile.setAttribute("aria-label", character);
    letterDomIds.push(id);
    fragment.appendChild(tile);
  });

  elements.letters.appendChild(fragment);
}

function updateInterface() {
  const word = selectedQuestions[currentQuestionIndex];
  const length = characterCount(word);
  const available = Math.max(0, length * 10 - revealedLetterCount * 10);
  const completed = currentQuestionIndex;

  elements.questionCounter.textContent = `Soru ${currentQuestionIndex + 1} / 12`;
  elements.totalScore.textContent = totalScore;
  elements.availableScore.textContent = available;
  elements.wordLength.textContent = length;
  elements.revealedCount.textContent = `${revealedLetterCount} / ${length}`;
  elements.progressFill.style.width = `${(completed / GAME_LENGTHS.length) * 100}%`;
  elements.progressText.textContent = `${GAME_LENGTHS.length - completed} soru kaldı`;
  elements.countdownValue.textContent = countdown;
}

function startHintTimers() {
  clearAllTimers();
  countdown = HINT_SECONDS;
  elements.countdownValue.textContent = countdown;

  countdownTimer = window.setInterval(() => {
    countdown -= 1;
    if (countdown <= 0) countdown = HINT_SECONDS;
    elements.countdownValue.textContent = countdown;
    const ring = elements.hintClock.querySelector(".hint-clock__ring");
    ring.classList.remove("tick");
    void ring.offsetWidth;
    ring.classList.add("tick");
  }, 1000);

  currentQuestionTimer = window.setInterval(revealNextHint, HINT_SECONDS * 1000);
}

function clearAllTimers() {
  if (currentQuestionTimer !== null) window.clearInterval(currentQuestionTimer);
  if (countdownTimer !== null) window.clearInterval(countdownTimer);
  currentQuestionTimer = null;
  countdownTimer = null;
}

function revealNextHint() {
  if (roundLocked) return;

  const word = selectedQuestions[currentQuestionIndex];
  const answerCharacters = [...word];
  if (revealedLetterCount >= answerCharacters.length) {
    clearAllTimers();
    return;
  }

  const targetCharacter = answerCharacters[revealedLetterCount];
  const tiles = [...elements.letters.children];
  const targetTile = tiles
    .slice(revealedLetterCount)
    .find((tile) => tile.dataset.revealed === "false" && tile.dataset.character === targetCharacter);

  if (!targetTile) {
    console.error("İpucu için uygun harf kutusu bulunamadı.", targetCharacter);
    clearAllTimers();
    return;
  }

  animateTileMove(targetTile, revealedLetterCount);
  targetTile.dataset.revealed = "true";
  targetTile.classList.add("is-revealed");
  revealedLetterCount += 1;
  countdown = HINT_SECONDS;
  updateInterface();
  playSound("hint");

  if (revealedLetterCount >= answerCharacters.length) clearAllTimers();
}

function animateTileMove(targetTile, destinationIndex) {
  const tilesBefore = [...elements.letters.children];
  const firstPositions = new Map(tilesBefore.map((tile) => [tile.id, tile.getBoundingClientRect()]));
  const destinationTile = elements.letters.children[destinationIndex];

  if (targetTile !== destinationTile) elements.letters.insertBefore(targetTile, destinationTile);

  const tilesAfter = [...elements.letters.children];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  tilesAfter.forEach((tile) => {
    const first = firstPositions.get(tile.id);
    const last = tile.getBoundingClientRect();
    const deltaX = first.left - last.left;
    const deltaY = first.top - last.top;

    if (tile === targetTile) {
      tile.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px) scale(1)`, zIndex: 3 },
          { transform: `translate(${deltaX * 0.54}px, ${deltaY - 32}px) scale(1.11)`, offset: 0.46, zIndex: 3 },
          { transform: "translate(0, -5px) scale(1.025)", offset: 0.84, zIndex: 3 },
          { transform: "translate(0, 0) scale(1)", zIndex: 1 }
        ],
        { duration: 760, easing: "cubic-bezier(0.2, 0.82, 0.24, 1.08)" }
      );
    } else if (deltaX || deltaY) {
      tile.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: "translate(0, 0)" }
        ],
        { duration: 700, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );
    }
  });
}

function checkAnswer(event) {
  event.preventDefault();
  ensureAudioContext();
  if (roundLocked) return;

  const answer = normalizeTurkish(elements.answerInput.value);
  const correctWord = selectedQuestions[currentQuestionIndex];

  if (!answer || answer !== correctWord) {
    elements.feedbackMessage.textContent = answer
      ? "Henüz değil — harflere bir kez daha bak."
      : "Önce bir cevap yazmalısın."
    elements.feedbackMessage.className = "feedback feedback--wrong";
    elements.answerRow.classList.remove("is-wrong");
    void elements.answerRow.offsetWidth;
    elements.answerRow.classList.add("is-wrong");
    playSound("wrong");
    elements.answerInput.value = "";
    elements.answerInput.focus();
    return;
  }

  handleCorrectAnswer(correctWord);
}

function handleCorrectAnswer(word) {
  roundLocked = true;
  clearAllTimers();
  const earned = Math.max(0, characterCount(word) * 10 - revealedLetterCount * 10);
  totalScore += earned;
  elements.totalScore.textContent = totalScore;
  elements.answerInput.disabled = true;
  elements.checkButton.disabled = true;
  elements.feedbackMessage.textContent = `Doğru! +${earned} puan`;
  elements.feedbackMessage.className = "feedback feedback--correct";
  playSound("correct");

  [...elements.letters.children].forEach((tile, index) => {
    tile.animate(
      [
        { transform: "translateY(0) scale(1)" },
        { transform: "translateY(-9px) scale(1.04)" },
        { transform: "translateY(0) scale(1)" }
      ],
      { duration: 430, delay: index * 35, easing: "cubic-bezier(0.2, 0.8, 0.3, 1.15)" }
    );
  });

  const tokenAtAnswer = questionToken;
  window.setTimeout(() => {
    if (tokenAtAnswer !== questionToken) return;
    currentQuestionIndex += 1;
    if (currentQuestionIndex >= selectedQuestions.length) finishGame();
    else startQuestion();
  }, 800);
}

function finishGame() {
  clearAllTimers();
  questionToken += 1;
  roundLocked = true;
  const rate = Math.round((totalScore / MAX_SCORE) * 100);

  elements.gameLayout.hidden = true;
  elements.endPanel.hidden = false;
  elements.finalScore.textContent = totalScore;
  elements.successRate.textContent = `%${rate}`;
  elements.resultMeterFill.style.width = "0%";
  requestAnimationFrame(() => {
    elements.resultMeterFill.style.width = `${rate}%`;
  });
  playSound("finish");
  elements.playAgainButton.focus({ preventScroll: true });
}

function ensureAudioContext() {
  if (!soundEnabled || !userHasInteracted) return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) {
    audioContext = new AudioContextClass();
    masterGainNode = audioContext.createGain();
    compressorNode = audioContext.createDynamicsCompressor();
    compressorNode.threshold.value = -14;
    compressorNode.knee.value = 12;
    compressorNode.ratio.value = 4;
    compressorNode.attack.value = 0.003;
    compressorNode.release.value = 0.2;
    masterGainNode.connect(compressorNode).connect(audioContext.destination);
    applyMasterVolume(true);
  }
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function volumeToGain(level) {
  if (level <= 0) return 0;
  const normalized = level / 100;
  return 0.3 + Math.pow(normalized, 1.35) * 1.9;
}

function applyMasterVolume(immediate = false) {
  if (!audioContext || !masterGainNode) return;
  const target = soundEnabled ? volumeToGain(volumeLevel) : 0;
  const now = audioContext.currentTime;
  masterGainNode.gain.cancelScheduledValues(now);
  if (immediate) masterGainNode.gain.setValueAtTime(target, now);
  else masterGainNode.gain.setTargetAtTime(target, now, 0.025);
}

function tone({ frequency, endFrequency = frequency, duration = 0.12, type = "sine", gain = 0.065, delay = 0 }) {
  const context = ensureAudioContext();
  if (!context) return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(Math.min(gain * VOLUME_BOOST, 0.35), start + 0.018);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gainNode).connect(masterGainNode);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playWhoosh() {
  const context = ensureAudioContext();
  if (!context) return;
  const start = context.currentTime;
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const gainNode = context.createGain();
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(115, start);
  oscillator.frequency.exponentialRampToValueAtTime(360, start + 0.24);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(420, start);
  filter.frequency.exponentialRampToValueAtTime(1250, start + 0.24);
  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(0.03 * VOLUME_BOOST, start + 0.035);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
  oscillator.connect(filter).connect(gainNode).connect(masterGainNode);
  oscillator.start(start);
  oscillator.stop(start + 0.27);
}

function playSound(kind) {
  if (!soundEnabled) return;
  if (kind === "correct") {
    tone({ frequency: 440, endFrequency: 520, duration: 0.12, type: "sine" });
    tone({ frequency: 660, endFrequency: 760, duration: 0.18, type: "sine", delay: 0.09 });
  } else if (kind === "wrong") {
    tone({ frequency: 190, endFrequency: 135, duration: 0.19, type: "triangle", gain: 0.035 });
  } else if (kind === "hint") {
    playWhoosh();
  } else if (kind === "finish") {
    [392, 523, 659].forEach((frequency, index) => {
      tone({ frequency, endFrequency: frequency * 1.04, duration: 0.24, gain: 0.038, delay: index * 0.12 });
    });
  }
}

function toggleSound() {
  userHasInteracted = true;
  if (soundEnabled) {
    soundEnabled = false;
  } else {
    soundEnabled = true;
    if (volumeLevel === 0) volumeLevel = lastAudibleVolume;
  }
  ensureAudioContext();
  applyMasterVolume();
  updateSoundControls();
  if (soundEnabled) tone({ frequency: 440, endFrequency: 560, duration: 0.1, gain: 0.035 });
}

function updateSoundControls() {
  elements.soundButton.setAttribute("aria-pressed", String(!soundEnabled));
  elements.soundLabel.textContent = soundEnabled ? "Ses açık" : "Ses kapalı";
  elements.soundButton.querySelector(".sound-button__icon").textContent = soundEnabled ? "♪" : "×";
  elements.volumeSlider.value = String(volumeLevel);
  elements.volumeOutput.value = `%${soundEnabled ? volumeLevel : 0}`;
  elements.volumeOutput.textContent = `%${soundEnabled ? volumeLevel : 0}`;
}

function changeVolume(event) {
  userHasInteracted = true;
  volumeLevel = Number(event.target.value);
  if (volumeLevel > 0) {
    lastAudibleVolume = volumeLevel;
    soundEnabled = true;
  } else {
    soundEnabled = false;
  }
  ensureAudioContext();
  applyMasterVolume();
  updateSoundControls();
}

elements.answerForm.addEventListener("submit", checkAnswer);
elements.startGameButton.addEventListener("click", () => {
  userHasInteracted = true;
  ensureAudioContext();
  startNewGame();
});
elements.answerInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  userHasInteracted = true;
  elements.answerForm.requestSubmit();
});
elements.newGameButton.addEventListener("click", () => {
  userHasInteracted = true;
  ensureAudioContext();
  startNewGame();
});
elements.playAgainButton.addEventListener("click", () => {
  userHasInteracted = true;
  ensureAudioContext();
  startNewGame();
});
elements.soundButton.addEventListener("click", toggleSound);
elements.volumeSlider.addEventListener("input", changeVolume);
elements.volumeSlider.addEventListener("change", () => {
  if (soundEnabled) tone({ frequency: 420, endFrequency: 620, duration: 0.12, gain: 0.04 });
});
document.addEventListener(
  "pointerdown",
  () => {
    userHasInteracted = true;
  },
  { once: true, passive: true }
);
document.addEventListener(
  "keydown",
  () => {
    userHasInteracted = true;
  },
  { once: true }
);

updateSoundControls();
loadWords();
