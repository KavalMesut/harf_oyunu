"use strict";

const GAME_LENGTHS = [5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10];
const REQUIRED_LENGTHS = [5, 6, 7, 8, 9, 10];
const MAX_SCORE = 900;
const HINT_SECONDS = 5;
const DERIVATION_SECONDS = 100;
const DERIVATION_MIN_LENGTH = 4;
const SOLVED_LETTER_DELAY = 80;
const SOLVED_WORD_PAUSE = 650;
// Tanıma oturumu bittiğinde oluşan sessiz aralığı mümkün olduğunca kısa tutar.
// Bazı tarayıcılar uzun sessizlikte Web Speech oturumunu kendileri kapatır.
const VOICE_RESTART_DELAY = 120;
const TURKISH_WORD_PATTERN = /^[A-ZÇĞİÖŞÜ]+$/u;
const VOLUME_BOOST = 5.5;
const DERIVATION_VOWELS = ["A", "E", "I", "İ", "O", "Ö", "U", "Ü"];
const DERIVATION_CONSONANTS = ["B", "C", "Ç", "D", "F", "G", "Ğ", "H", "J", "K", "L", "M", "N", "P", "R", "S", "Ş", "T", "V", "Y", "Z"];
const DERIVATION_FREQUENCIES = {
  A: 11.92, E: 8.91, İ: 8.6, N: 7.48, R: 6.95, L: 5.75, T: 5.54, K: 4.68,
  S: 4.59, U: 4.34, M: 3.75, D: 3.74, O: 3.51, Y: 3.49, B: 2.85, I: 2.77,
  Z: 2.75, V: 2.25, G: 2.18, H: 1.85, P: 1.64, Ş: 1.58, C: 1.45, Ç: 1.13,
  F: 0.84, Ö: 0.78, Ü: 0.69, Ğ: 0.68, J: 0.25
};
const RECORDED_SOUND_SOURCES = {
  cheer: "assets/cheering.wav",
  correct: "assets/correct.mp3",
  hint: "assets/hint.mp3",
  start: "assets/start.mp3",
  wrong: "assets/wrong.mp3"
};
const RECORDED_SOUND_LEVELS = {
  cheer: 0.55,
  correct: 0.45,
  hint: 1.875,
  start: 1,
  wrong: 0.9
};
const RECORDED_SOUND_BOOSTS = {
  cheer: 1,
  correct: 1,
  hint: 1.5,
  start: 2,
  wrong: 1
};

// Açık oyun durumu: her yeni oyunda tek bir kaynaktan sıfırlanır.
let wordPool = new Map();
let derivationDictionary = [];
let selectedQuestions = [];
let gameMode = null;
let currentQuestionIndex = 0;
let totalScore = 0;
let revealedLetterCount = 0;
let currentQuestionTimer = null;
let countdownTimer = null;
let derivationTimer = null;
let derivationLetters = [];
let derivationValidWords = new Set();
let derivationFoundWords = [];
let derivationScore = 0;
let derivationTimeLeft = DERIVATION_SECONDS;
let derivationLongestWordLength = 0;
let letterDomIds = [];
let previousGameWords = new Set();
let audioContext = null;
let masterGainNode = null;
let compressorNode = null;
const recordedSounds = new Map();
const recordedSoundGainNodes = new Map();
let soundEnabled = true;
let volumeLevel = 50;
let lastAudibleVolume = 50;
let userHasInteracted = false;
let countdown = HINT_SECONDS;
let roundLocked = false;
let questionToken = 0;
let speechRecognition = null;
let voiceListening = false;
let voiceQuestionToken = 0;
let voiceModeEnabled = loadVoiceModePreference();
let voiceRestartTimer = null;
let voiceListeningContext = null;

const elements = {
  loadingPanel: document.querySelector("#loadingPanel"),
  startPanel: document.querySelector("#startPanel"),
  startUnscrambleButton: document.querySelector("#startUnscrambleButton"),
  startDerivationButton: document.querySelector("#startDerivationButton"),
  startVoiceButton: document.querySelector("#startVoiceButton"),
  startVoiceButtonLabel: document.querySelector("#startVoiceButtonLabel"),
  startVoiceStatus: document.querySelector("#startVoiceStatus"),
  errorPanel: document.querySelector("#errorPanel"),
  errorMessage: document.querySelector("#errorMessage"),
  gameLayout: document.querySelector("#gameLayout"),
  endPanel: document.querySelector("#endPanel"),
  questionCounter: document.querySelector("#questionCounter"),
  scoreLabel: document.querySelector("#scoreLabel"),
  totalScore: document.querySelector("#totalScore"),
  scoreMaximum: document.querySelector("#scoreMaximum"),
  availableScore: document.querySelector("#availableScore"),
  availableLabel: document.querySelector("#availableLabel"),
  availableUnit: document.querySelector("#availableUnit"),
  progressFill: document.querySelector("#progressFill"),
  progressText: document.querySelector("#progressText"),
  countdownValue: document.querySelector("#countdownValue"),
  hintClock: document.querySelector("#hintClock"),
  hintTitle: document.querySelector("#hintTitle"),
  hintDescription: document.querySelector("#hintDescription"),
  roundEyebrow: document.querySelector("#roundEyebrow"),
  roundHeading: document.querySelector("#roundHeading"),
  wordLength: document.querySelector("#wordLength"),
  letters: document.querySelector("#letters"),
  hintCopy: document.querySelector("#hintCopy"),
  answerForm: document.querySelector("#answerForm"),
  answerLabel: document.querySelector("#answerLabel"),
  answerRow: document.querySelector("#answerRow"),
  answerInput: document.querySelector("#answerInput"),
  voiceButton: document.querySelector("#voiceButton"),
  voiceButtonLabel: document.querySelector("#voiceButtonLabel"),
  voiceStatus: document.querySelector("#voiceStatus"),
  checkButton: document.querySelector("#checkButton"),
  checkButtonLabel: document.querySelector("#checkButtonLabel"),
  feedbackMessage: document.querySelector("#feedbackMessage"),
  deriveFoundSection: document.querySelector("#deriveFoundSection"),
  deriveFoundCount: document.querySelector("#deriveFoundCount"),
  deriveFoundList: document.querySelector("#deriveFoundList"),
  keyboardHint: document.querySelector("#keyboardHint"),
  footerDetail: document.querySelector("#footerDetail"),
  revealedCount: document.querySelector("#revealedCount"),
  newGameButton: document.querySelector("#newGameButton"),
  playAgainButton: document.querySelector("#playAgainButton"),
  endVoiceButton: document.querySelector("#endVoiceButton"),
  endVoiceButtonLabel: document.querySelector("#endVoiceButtonLabel"),
  endVoiceStatus: document.querySelector("#endVoiceStatus"),
  finalScore: document.querySelector("#finalScore"),
  finalScoreSuffix: document.querySelector("#finalScoreSuffix"),
  endTitle: document.querySelector("#endTitle"),
  endSummary: document.querySelector("#endSummary"),
  deriveResults: document.querySelector("#deriveResults"),
  deriveResultsGrid: document.querySelector("#deriveResultsGrid"),
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

function usesTouchInput() {
  return window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
}

function focusAnswerInput() {
  // Telefon/tablette ya da sesli tahmin açıkken otomatik odak, ekran klavyesini
  // gereksiz yere açar. Klavyeyle oynayan masaüstü kullanıcıları için odak korunur.
  if (usesTouchInput() || voiceModeEnabled) return;
  requestAnimationFrame(() => elements.answerInput.focus({ preventScroll: true }));
}

async function loadWords() {
  try {
    const [commonResponse, dictionaryResponse] = await Promise.all([
      fetch("turkce_kelime_listesi_sik_kulanilan_5000.txt", { cache: "no-store" }),
      fetch("turkce_kelime_listesi.txt", { cache: "no-store" })
    ]);
    if (!commonResponse.ok || !dictionaryResponse.ok) {
      throw new Error(`HTTP ${commonResponse.status} / ${dictionaryResponse.status}`);
    }

    const [rawText, dictionaryText] = await Promise.all([commonResponse.text(), dictionaryResponse.text()]);
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

    derivationDictionary = [...new Set(
      dictionaryText
        .split(/\r?\n/u)
        .map(normalizeTurkish)
        .filter((word) => TURKISH_WORD_PATTERN.test(word))
        .filter((word) => {
          const length = characterCount(word);
          return length >= DERIVATION_MIN_LENGTH && length <= 10;
        })
    )];
    if (!derivationDictionary.length) {
      showFatalError("Kelime türetme sözlüğünde geçerli kelime bulunamadı.");
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
  updateVoiceButton();
  if (voiceModeEnabled && speechRecognition) {
    setVoiceStatus(voiceCommandHint());
    scheduleVoiceRecognition(250);
  }
  requestAnimationFrame(() => elements.startUnscrambleButton.focus({ preventScroll: true }));
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

function startUnscrambleGame() {
  stopVoiceRecognition();
  clearAllTimers();
  gameMode = "unscramble";
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
  configureUnscrambleInterface();

  selectedQuestions = selectQuestions();
  previousGameWords = new Set(selectedQuestions);
  playSound("start");
  startQuestion();
}

function showGameModeMenu() {
  stopVoiceRecognition();
  clearAllTimers();
  questionToken += 1;
  roundLocked = true;
  gameMode = null;
  showStartScreen();
}

function startGameMode(mode) {
  if (mode === "derive") startDerivationGame();
  else startUnscrambleGame();
}

function configureUnscrambleInterface() {
  elements.scoreLabel.textContent = "Toplam puan";
  elements.scoreMaximum.textContent = "/ 900";
  elements.availableLabel.textContent = "Bu sorunun değeri";
  elements.availableUnit.textContent = "puan";
  elements.hintTitle.textContent = "Sıradaki ipucu";
  elements.hintDescription.textContent = "İlk harften başlayarak";
  elements.roundEyebrow.textContent = "Karışık harfler";
  elements.roundHeading.textContent = "Çöz";
  elements.answerLabel.textContent = "Cevabın";
  elements.answerInput.placeholder = "Kelimeyi buraya yaz";
  elements.checkButtonLabel.textContent = "Kontrol et";
  elements.hintCopy.textContent = "Her 5 saniyede bir harf doğru yerine yerleşir; sorunun değeri 10 puan azalır.";
  elements.keyboardHint.innerHTML = "<kbd>Enter</kbd> ile kontrol edebilirsin";
  elements.deriveFoundSection.hidden = true;
  elements.hintClock.classList.remove("is-derivation-timer");
  elements.hintClock.classList.remove("is-urgent");
}

function weightedDerivationLetters(letters, count) {
  const totalWeight = letters.reduce((total, letter) => total + DERIVATION_FREQUENCIES[letter], 0);
  return Array.from({ length: count }, () => {
    let value = (randomIndex(1000000) / 1000000) * totalWeight;
    for (const letter of letters) {
      value -= DERIVATION_FREQUENCIES[letter];
      if (value <= 0) return letter;
    }
    return letters[letters.length - 1];
  });
}

function shuffled(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const otherIndex = randomIndex(index + 1);
    [result[index], result[otherIndex]] = [result[otherIndex], result[index]];
  }
  return result;
}

function canFormWordFromLetters(word, letters) {
  const counts = new Map();
  letters.forEach((letter) => counts.set(letter, (counts.get(letter) ?? 0) + 1));
  for (const letter of word) {
    const available = counts.get(letter) ?? 0;
    if (!available) return false;
    counts.set(letter, available - 1);
  }
  return true;
}

function wordsForDerivationLetters(letters) {
  return derivationDictionary.filter((word) => canFormWordFromLetters(word, letters));
}

function createDerivationRack() {
  let bestLetters = [];
  let bestWords = [];
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const letters = shuffled([
      ...weightedDerivationLetters(DERIVATION_VOWELS, 4),
      ...weightedDerivationLetters(DERIVATION_CONSONANTS, 6)
    ]);
    const words = wordsForDerivationLetters(letters);
    const longest = Math.max(0, ...words.map(characterCount));
    if (words.length > bestWords.length) {
      bestLetters = letters;
      bestWords = words;
    }
    if (words.length >= 12 && longest >= 6) return { letters, words };
  }
  return { letters: bestLetters, words: bestWords };
}

function startDerivationGame() {
  stopVoiceRecognition();
  clearAllTimers();
  gameMode = "derive";
  questionToken += 1;
  roundLocked = false;
  derivationScore = 0;
  derivationFoundWords = [];
  derivationTimeLeft = DERIVATION_SECONDS;

  const rack = createDerivationRack();
  derivationLetters = rack.letters;
  derivationValidWords = new Set(rack.words);
  derivationLongestWordLength = Math.max(0, ...rack.words.map(characterCount));

  elements.errorPanel.hidden = true;
  elements.startPanel.hidden = true;
  elements.endPanel.hidden = true;
  elements.gameLayout.hidden = false;
  configureDerivationInterface();
  renderLetters(derivationLetters);
  elements.answerInput.disabled = false;
  elements.checkButton.disabled = false;
  elements.voiceButton.disabled = !speechRecognition;
  elements.answerInput.value = "";
  elements.feedbackMessage.textContent = "";
  elements.feedbackMessage.className = "feedback";
  elements.answerRow.classList.remove("is-wrong");
  elements.deriveFoundList.replaceChildren();
  elements.deriveFoundCount.textContent = "0";
  updateDerivationInterface();
  playSound("start");
  scheduleVoiceRecognition(80);
  derivationTimer = window.setInterval(() => {
    derivationTimeLeft -= 1;
    if (derivationTimeLeft > 0 && derivationTimeLeft <= 10) playSound("hint");
    updateDerivationInterface();
    if (derivationTimeLeft <= 0) finishGame();
  }, 1000);
  focusAnswerInput();
}

function configureDerivationInterface() {
  elements.scoreLabel.textContent = "Puan";
  elements.questionCounter.textContent = "Süre";
  elements.scoreMaximum.textContent = "";
  elements.availableLabel.textContent = "En uzun kelime";
  elements.availableUnit.textContent = "harf";
  elements.hintTitle.textContent = "Kalan süre";
  elements.hintDescription.textContent = "Süre bitmeden yaz";
  elements.roundEyebrow.textContent = "10 harf";
  elements.roundHeading.textContent = "Türet";
  elements.wordLength.textContent = "10";
  elements.answerLabel.textContent = "Tahminin";
  elements.answerInput.placeholder = "Kelimeyi buraya yaz";
  elements.checkButtonLabel.textContent = "Ekle";
  elements.hintCopy.textContent = "Bu 10 harfi kullanarak en az 4 harfli Türkçe kelimeler türet. En uzun kelimeler çift puan getirir.";
  elements.keyboardHint.innerHTML = "<kbd>Enter</kbd> ile kelimeyi ekleyebilirsin";
  elements.deriveFoundSection.hidden = false;
  elements.hintClock.classList.add("is-derivation-timer");
}

function updateDerivationInterface() {
  const longestFound = Math.max(0, ...derivationFoundWords.map(characterCount));
  elements.totalScore.textContent = derivationScore;
  elements.availableScore.textContent = longestFound || "—";
  elements.progressFill.style.width = `${((DERIVATION_SECONDS - Math.max(0, derivationTimeLeft)) / DERIVATION_SECONDS) * 100}%`;
  elements.progressText.textContent = `${Math.max(0, derivationTimeLeft)} sn kaldı`;
  elements.countdownValue.textContent = Math.max(0, derivationTimeLeft);
  elements.hintClock.style.setProperty(
    "--timer-progress",
    String((Math.max(0, derivationTimeLeft) / DERIVATION_SECONDS) * 100)
  );
  elements.hintClock.classList.toggle("is-urgent", derivationTimeLeft > 0 && derivationTimeLeft <= 10);
  elements.footerDetail.innerHTML = `Bulunan: <strong>${derivationFoundWords.length} kelime</strong>`;
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
  stopVoiceRecognition();
  clearAllTimers();
  questionToken += 1;
  roundLocked = false;
  revealedLetterCount = 0;
  countdown = HINT_SECONDS;

  const word = selectedQuestions[currentQuestionIndex];
  const characters = shuffleWord(word);

  elements.answerInput.disabled = false;
  elements.checkButton.disabled = false;
  elements.voiceButton.disabled = !speechRecognition;
  elements.voiceStatus.textContent = "";
  elements.answerInput.value = "";
  elements.answerInput.classList.remove("is-correct-answer");
  elements.feedbackMessage.textContent = "";
  elements.feedbackMessage.className = "feedback";
  elements.answerRow.classList.remove("is-wrong");

  renderLetters(characters);
  updateInterface();
  startHintTimers();
  scheduleVoiceRecognition(80);

  focusAnswerInput();
}

function renderLetters(characters) {
  const mobileColumns = characters.length > 7 ? Math.ceil(characters.length / 2) : characters.length;
  elements.letters.style.setProperty("--letter-columns", String(mobileColumns));
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
  if (derivationTimer !== null) window.clearInterval(derivationTimer);
  currentQuestionTimer = null;
  countdownTimer = null;
  derivationTimer = null;
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

  if (revealedLetterCount >= answerCharacters.length) handleFullyRevealed(word);
}

function handleFullyRevealed(word) {
  roundLocked = true;
  clearAllTimers();
  stopVoiceRecognition();
  elements.answerInput.disabled = true;
  elements.checkButton.disabled = true;
  elements.voiceButton.disabled = true;
  elements.feedbackMessage.textContent = `Kelime tamamen açıldı: ${word}. Sıradaki kelimeye geçiliyor…`;
  elements.feedbackMessage.className = "feedback feedback--revealed";

  const tokenAtReveal = questionToken;
  window.setTimeout(() => {
    if (tokenAtReveal !== questionToken) return;
    currentQuestionIndex += 1;
    if (currentQuestionIndex >= selectedQuestions.length) finishGame();
    else startQuestion();
  }, 1000);
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
  if (gameMode === "derive") {
    submitDerivationWord();
    return;
  }
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
    focusAnswerInput();
    return;
  }

  handleCorrectAnswer(correctWord);
}

function submitDerivationWord() {
  if (roundLocked || derivationTimeLeft <= 0) return;
  const word = normalizeTurkish(elements.answerInput.value);
  if (!word) {
    elements.feedbackMessage.textContent = "Önce bir kelime yazmalısın.";
    elements.feedbackMessage.className = "feedback feedback--wrong";
    return;
  }
  if (characterCount(word) < DERIVATION_MIN_LENGTH) {
    showDerivationError("En az 4 harfli bir kelime yazmalısın.");
    return;
  }
  if (!derivationValidWords.has(word)) {
    showDerivationError("Bu kelime sözlükte yok veya verilen harflerle kurulamıyor.");
    return;
  }
  if (derivationFoundWords.includes(word)) {
    showDerivationDuplicate(word);
    return;
  }

  const isLongest = characterCount(word) === derivationLongestWordLength;
  const points = characterCount(word) * 10 * (isLongest ? 2 : 1);
  derivationFoundWords.push(word);
  derivationScore += points;
  const tag = document.createElement("span");
  tag.className = "derive-word-tag";
  tag.dataset.word = word;
  tag.textContent = word;
  elements.deriveFoundList.appendChild(tag);
  elements.deriveFoundCount.textContent = String(derivationFoundWords.length);
  elements.answerInput.value = "";
  elements.feedbackMessage.textContent = isLongest
    ? `Harika! En uzun kelime · +${points} puan`
    : `Doğru! +${points} puan`;
  elements.feedbackMessage.className = "feedback feedback--correct";
  playSound(isLongest ? "cheer" : "correct");
  updateDerivationInterface();
}

function showDerivationError(message) {
  elements.feedbackMessage.textContent = message;
  elements.feedbackMessage.className = "feedback feedback--wrong";
  elements.answerRow.classList.remove("is-wrong");
  void elements.answerRow.offsetWidth;
  elements.answerRow.classList.add("is-wrong");
  elements.answerInput.value = "";
  focusAnswerInput();
  playSound("wrong");
}

function showDerivationDuplicate(word) {
  const existingTag = [...elements.deriveFoundList.children].find(
    (tag) => tag.dataset.word === word
  );
  if (existingTag) {
    existingTag.classList.remove("is-duplicate");
    void existingTag.offsetWidth;
    existingTag.classList.add("is-duplicate");
    const flashToken = String(Date.now());
    existingTag.dataset.flashToken = flashToken;
    window.setTimeout(() => {
      if (existingTag.dataset.flashToken === flashToken) existingTag.classList.remove("is-duplicate");
    }, 1000);
    existingTag.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }
  elements.feedbackMessage.textContent = `“${word}” zaten bulundu.`;
  elements.feedbackMessage.className = "feedback feedback--wrong";
  elements.answerRow.classList.remove("is-wrong");
  void elements.answerRow.offsetWidth;
  elements.answerRow.classList.add("is-wrong");
  elements.answerInput.value = "";
  focusAnswerInput();
  playSound("duplicate");
}

function handleCorrectAnswer(word) {
  roundLocked = true;
  stopVoiceRecognition();
  clearAllTimers();
  const earned = Math.max(0, characterCount(word) * 10 - revealedLetterCount * 10);
  totalScore += earned;
  elements.totalScore.textContent = totalScore;
  elements.answerInput.disabled = true;
  elements.checkButton.disabled = true;
  elements.voiceButton.disabled = true;
  elements.answerInput.value = word;
  elements.answerInput.classList.add("is-correct-answer");
  elements.feedbackMessage.textContent = `Doğru! +${earned} puan · ${word}`;
  elements.feedbackMessage.className = "feedback feedback--correct";
  playSound("correct");

  const tokenAtAnswer = questionToken;
  animateSolvedWord(word, tokenAtAnswer);
  const solvedAnimationDuration =
    (characterCount(word) - 1) * SOLVED_LETTER_DELAY + 700 + SOLVED_WORD_PAUSE;

  window.setTimeout(() => {
    if (tokenAtAnswer !== questionToken) return;
    currentQuestionIndex += 1;
    if (currentQuestionIndex >= selectedQuestions.length) finishGame();
    else startQuestion();
  }, solvedAnimationDuration);
}

function animateSolvedWord(word, tokenAtAnswer) {
  const characters = [...word];

  characters.forEach((character, destinationIndex) => {
    window.setTimeout(() => {
      if (tokenAtAnswer !== questionToken) return;

      const tiles = [...elements.letters.children];
      const targetTile = tiles
        .slice(destinationIndex)
        .find((tile) => tile.dataset.character === character);

      if (!targetTile) {
        console.error("Doğru cevap animasyonu için harf kutusu bulunamadı.", character);
        return;
      }

      animateTileMove(targetTile, destinationIndex);
      targetTile.dataset.revealed = "true";
      targetTile.classList.add("is-revealed");
      targetTile.classList.add("is-solved");
      revealedLetterCount = Math.max(revealedLetterCount, destinationIndex + 1);
      updateInterface();
    }, destinationIndex * SOLVED_LETTER_DELAY);
  });

}

function finishGame() {
  stopVoiceRecognition();
  clearAllTimers();
  questionToken += 1;
  roundLocked = true;
  const isDerivationGame = gameMode === "derive";
  const rate = isDerivationGame
    ? Math.min(100, Math.round((derivationFoundWords.length / Math.max(1, derivationValidWords.size)) * 100))
    : Math.round((totalScore / MAX_SCORE) * 100);

  elements.gameLayout.hidden = true;
  elements.endPanel.hidden = false;
  elements.endPanel.classList.toggle("end-panel--derivation", isDerivationGame);
  elements.finalScore.textContent = isDerivationGame ? derivationScore : totalScore;
  elements.finalScoreSuffix.textContent = isDerivationGame ? "puan" : "/ 900 puan";
  elements.endTitle.textContent = isDerivationGame ? "Süre doldu." : "12 kelimeyi de tamamladın.";
  elements.endSummary.innerHTML = isDerivationGame
    ? `Bulunan: <strong>${derivationFoundWords.length}</strong> · Kaçırılan: <strong>${Math.max(0, derivationValidWords.size - derivationFoundWords.length)}</strong> · Başarı: <strong>%${rate}</strong> · En uzun: <strong>${Math.max(0, ...derivationFoundWords.map(characterCount)) || "—"} harf</strong>`
    : `Başarı oranı: <strong id="successRate">%${rate}</strong>`;
  elements.deriveResults.hidden = !isDerivationGame;
  if (isDerivationGame) renderDerivationResults();
  elements.resultMeterFill.style.width = "0%";
  requestAnimationFrame(() => {
    elements.resultMeterFill.style.width = `${rate}%`;
  });
  playSound("finish");
  updateVoiceButton();
  if (voiceModeEnabled && speechRecognition) {
    setVoiceStatus(voiceCommandHint());
    scheduleVoiceRecognition(300);
  }
  elements.playAgainButton.focus({ preventScroll: true });
}

function renderDerivationResults() {
  const byLength = new Map();
  [...derivationValidWords]
    .sort((first, second) => first.localeCompare(second, "tr-TR"))
    .forEach((word) => {
      const length = characterCount(word);
      if (!byLength.has(length)) byLength.set(length, []);
      byLength.get(length).push(word);
    });

  const fragment = document.createDocumentFragment();
  [...byLength.keys()].sort((first, second) => first - second).forEach((length) => {
    const column = document.createElement("section");
    column.className = "derive-results__column";
    const heading = document.createElement("h3");
    heading.textContent = `${length} harf`;
    const wordList = document.createElement("div");
    wordList.className = "derive-results__words";

    byLength.get(length).forEach((word) => {
      const item = document.createElement("span");
      item.className = derivationFoundWords.includes(word)
        ? "derive-result-word is-found"
        : "derive-result-word is-missed";
      item.textContent = word;
      wordList.appendChild(item);
    });

    column.append(heading, wordList);
    fragment.appendChild(column);
  });
  elements.deriveResultsGrid.replaceChildren(fragment);
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

function playRecordedSound(kind) {
  const source = RECORDED_SOUND_SOURCES[kind];
  if (!source) return;

  let audio = recordedSounds.get(kind);
  if (!audio) {
    audio = new Audio(source);
    audio.preload = "auto";
    recordedSounds.set(kind, audio);
  }

  audio.pause();
  audio.currentTime = 0;
  audio.volume = Math.min(
    1,
    Math.pow(volumeLevel / 100, 0.72) * (RECORDED_SOUND_LEVELS[kind] ?? 1)
  );

  const context = ensureAudioContext();
  if (context) {
    let gainNode = recordedSoundGainNodes.get(kind);
    if (!gainNode) {
      const sourceNode = context.createMediaElementSource(audio);
      gainNode = context.createGain();
      sourceNode.connect(gainNode).connect(context.destination);
      recordedSoundGainNodes.set(kind, gainNode);
    }

    const now = context.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(RECORDED_SOUND_BOOSTS[kind] ?? 1, now);
  }

  audio.play().catch((error) => {
    console.debug(`${kind} sesi çalınamadı.`, error);
  });
}

function playSound(kind) {
  if (!soundEnabled) return;
  if (kind === "cheer") {
    playRecordedSound("cheer");
  } else if (kind === "correct") {
    playRecordedSound("correct");
  } else if (kind === "wrong") {
    playRecordedSound("wrong");
  } else if (kind === "hint") {
    playRecordedSound("hint");
  } else if (kind === "start") {
    playRecordedSound("start");
  } else if (kind === "duplicate") {
    tone({ frequency: 390, endFrequency: 390, duration: 0.11, type: "square", gain: 0.028 });
    tone({ frequency: 390, endFrequency: 390, duration: 0.11, type: "square", gain: 0.028, delay: 0.15 });
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

function normalizeSpokenWord(value) {
  return normalizeTurkish(value).replace(/[^A-ZÇĞİÖŞÜ]/gu, "");
}

function normalizeSpokenCommand(value) {
  return normalizeSpokenWord(value)
    .replaceAll("Ç", "C")
    .replaceAll("Ğ", "G")
    .replaceAll("İ", "I")
    .replaceAll("Ö", "O")
    .replaceAll("Ş", "S")
    .replaceAll("Ü", "U");
}

function gameModeFromSpokenCommand(value) {
  const command = normalizeSpokenCommand(value);
  if (command === "TURET" || command.includes("KELIMETURET") || command.includes("TURETMEOYUNU")) return "derive";
  if (command === "COZ" || command.includes("KELIMEBUL") || command.includes("KARISIKKELIME")) return "unscramble";
  return null;
}

function voiceCommandHint() {
  return "“Çöz” veya “türet” diyebilirsin";
}

function loadVoiceModePreference() {
  try {
    return window.localStorage.getItem("kelime-voice-mode") === "enabled";
  } catch (error) {
    console.debug("Sesli tahmin tercihi okunamadı.", error);
    return false;
  }
}

function saveVoiceModePreference() {
  try {
    window.localStorage.setItem(
      "kelime-voice-mode",
      voiceModeEnabled ? "enabled" : "disabled"
    );
  } catch (error) {
    console.debug("Sesli tahmin tercihi kaydedilemedi.", error);
  }
}

function updateVoiceButton() {
  const updateControl = (button, label, inactiveLabel, activeLabel) => {
    button.classList.toggle("is-enabled", voiceModeEnabled);
    button.classList.toggle("is-listening", voiceListening);
    button.setAttribute("aria-pressed", String(voiceModeEnabled));
    button.setAttribute(
      "aria-label",
      voiceModeEnabled ? "Sürekli sesli tahmini kapat" : "Sürekli sesli tahmini aç"
    );
    label.textContent = voiceListening ? "Dinliyor" : voiceModeEnabled ? activeLabel : inactiveLabel;
  };

  updateControl(elements.voiceButton, elements.voiceButtonLabel, "Sesle söyle", "Ses açık");
  updateControl(elements.startVoiceButton, elements.startVoiceButtonLabel, "Sesli seçim", "Ses açık");
  updateControl(elements.endVoiceButton, elements.endVoiceButtonLabel, "Sesli seçim", "Ses açık");

  const voiceOnlyOnTouch = voiceModeEnabled && usesTouchInput();
  elements.answerInput.readOnly = voiceOnlyOnTouch;
  elements.answerInput.inputMode = voiceOnlyOnTouch ? "none" : "text";
  elements.answerInput.setAttribute("aria-readonly", String(voiceOnlyOnTouch));
}

function setVoiceStatus(message) {
  const statusElement = !elements.startPanel.hidden
    ? elements.startVoiceStatus
    : !elements.endPanel.hidden
      ? elements.endVoiceStatus
      : elements.voiceStatus;
  statusElement.textContent = message;
}

function stopVoiceRecognition() {
  if (voiceRestartTimer !== null) window.clearTimeout(voiceRestartTimer);
  voiceRestartTimer = null;
  if (speechRecognition && voiceListening) {
    try {
      speechRecognition.abort();
    } catch (error) {
      console.debug("Ses tanıma zaten durmuş olabilir.", error);
    }
  }
  voiceListening = false;
  voiceListeningContext = null;
  updateVoiceButton();
}

function submitSpokenGuess(candidate) {
  if (!candidate || roundLocked || voiceQuestionToken !== questionToken) return;
  elements.answerInput.value = candidate;
  elements.voiceStatus.textContent = `“${candidate}” olarak duydum`;
  stopVoiceRecognition();
  elements.answerForm.requestSubmit();
  if (voiceModeEnabled && !roundLocked) scheduleVoiceRecognition(VOICE_RESTART_DELAY);
}

function scheduleVoiceRecognition(delay = VOICE_RESTART_DELAY) {
  if (voiceRestartTimer !== null) window.clearTimeout(voiceRestartTimer);
  voiceRestartTimer = null;
  const canListenForStartCommand = !elements.startPanel.hidden || !elements.endPanel.hidden;
  const canListenInGame = !elements.gameLayout.hidden && !roundLocked;
  if (!voiceModeEnabled || !speechRecognition || (!canListenForStartCommand && !canListenInGame)) return;

  voiceRestartTimer = window.setTimeout(() => {
    voiceRestartTimer = null;
    beginVoiceRecognition();
  }, delay);
}

function beginVoiceRecognition() {
  const canListenForStartCommand = !elements.startPanel.hidden || !elements.endPanel.hidden;
  const canListenInGame = !elements.gameLayout.hidden && !roundLocked;
  if (!voiceModeEnabled || !speechRecognition || voiceListening || (!canListenForStartCommand && !canListenInGame)) return;

  voiceListeningContext = canListenForStartCommand ? "command" : "game";
  voiceQuestionToken = questionToken;
  voiceListening = true;
  setVoiceStatus("Mikrofon açılıyor…");
  updateVoiceButton();
  try {
    speechRecognition.start();
  } catch (error) {
    voiceListening = false;
    updateVoiceButton();
    setVoiceStatus("Mikrofon yeniden hazırlanıyor…");
    console.debug("Ses tanıma başlatılamadı.", error);
    scheduleVoiceRecognition(VOICE_RESTART_DELAY);
  }
}

function setupSpeechRecognition() {
  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionClass) {
    elements.voiceButton.disabled = true;
    elements.startVoiceButton.disabled = true;
    elements.endVoiceButton.disabled = true;
    elements.voiceButton.title = "Bu tarayıcı sesli tahmini desteklemiyor.";
    elements.startVoiceButton.title = "Bu tarayıcı sesli başlatmayı desteklemiyor.";
    elements.endVoiceButton.title = "Bu tarayıcı sesli başlatmayı desteklemiyor.";
    elements.voiceStatus.textContent = "Sesli tahmin bu tarayıcıda desteklenmiyor";
    elements.startVoiceStatus.textContent = "Sesli başlatma bu tarayıcıda desteklenmiyor";
    elements.endVoiceStatus.textContent = "Sesli başlatma bu tarayıcıda desteklenmiyor";
    return;
  }

  speechRecognition = new SpeechRecognitionClass();
  speechRecognition.lang = "tr-TR";
  // Tek bir kelime duyulduktan sonra da mikrofonu açık bırak. Böylece sonraki
  // tahminde yeni bir oturum açılması beklenmez; yalnızca tarayıcı zorla
  // kapatırsa onend içinden hemen yeniden başlatılır.
  speechRecognition.continuous = true;
  speechRecognition.interimResults = true;
  speechRecognition.maxAlternatives = 5;
  updateVoiceButton();

  speechRecognition.onstart = () => {
    voiceListening = true;
    setVoiceStatus(
      voiceListeningContext === "command"
        ? voiceCommandHint()
        : "Dinliyorum…"
    );
    updateVoiceButton();
  };

  speechRecognition.onsoundstart = () => {
    if (voiceListeningContext === "game" && !roundLocked) {
      setVoiceStatus("Ses algılandı, kelimeyi dinliyorum…");
    }
  };

  speechRecognition.onspeechstart = () => {
    if (voiceListeningContext === "game" && !roundLocked) {
      setVoiceStatus("Seni duydum, çözümlüyorum…");
    }
  };

  speechRecognition.onresult = (event) => {
    if (voiceListeningContext === "command") {
      const result = event.results[event.resultIndex];
      const selectedMode = Array.from({ length: result.length }, (_, index) =>
        gameModeFromSpokenCommand(result[index].transcript)
      ).find(Boolean);

      if (selectedMode && result.isFinal) {
        userHasInteracted = true;
        ensureAudioContext();
        startGameMode(selectedMode);
      } else if (result.isFinal) {
        setVoiceStatus(voiceCommandHint());
      }
      return;
    }

    if (voiceQuestionToken !== questionToken || roundLocked) return;
    const result = event.results[event.resultIndex];
    const alternatives = Array.from({ length: result.length }, (_, index) =>
      normalizeSpokenWord(result[index].transcript)
    ).filter(Boolean);
    if (!alternatives.length) return;

    const bestCandidate = gameMode === "derive"
      ? alternatives.find((candidate) => characterCount(candidate) >= DERIVATION_MIN_LENGTH) || alternatives[0]
      : (() => {
          const correctWord = selectedQuestions[currentQuestionIndex];
          const exactMatch = alternatives.find((candidate) => candidate === correctWord);
          const lengthMatch = alternatives.find(
            (candidate) => characterCount(candidate) === characterCount(correctWord)
          );
          return exactMatch || lengthMatch || alternatives[0];
        })();

    elements.answerInput.value = bestCandidate;
    setVoiceStatus(`“${bestCandidate}” olarak duyuluyor…`);

    // Ara sonuç yalnızca gösterilir; kullanıcı sözünü bitirdiğinde kesin sonuç denenir.
    if (result.isFinal) submitSpokenGuess(bestCandidate);
  };

  speechRecognition.onerror = (event) => {
    voiceListening = false;
    updateVoiceButton();
    if (event.error === "aborted") return;
    const messages = {
      "no-speech": "Ses duyulamadı; dinlemeye devam ediliyor",
      "not-allowed": "Mikrofon izni verilmedi",
      "audio-capture": "Mikrofona ulaşılamadı",
      network: "Ses tanıma hizmetine ulaşılamadı"
    };
    setVoiceStatus(messages[event.error] || "Sesli tahmin tamamlanamadı");
    if (event.error === "not-allowed" || event.error === "audio-capture") {
      voiceModeEnabled = false;
      saveVoiceModePreference();
      updateVoiceButton();
    }
  };

  speechRecognition.onnomatch = () => {
    if (voiceListeningContext === "game" && !roundLocked) {
      setVoiceStatus("Ses algılandı ama kelime anlaşılamadı; dinlemeye devam ediyorum");
    }
  };

  speechRecognition.onend = () => {
    voiceListening = false;
    updateVoiceButton();
    // Bilerek başlatılmış daha erken bir yeniden dinleme varsa (ör. yeni soru
    // açılırken) eski oturumun onend olayı onu daha geç bir zamanla ezmesin.
    if (voiceRestartTimer === null) scheduleVoiceRecognition(VOICE_RESTART_DELAY);
  };
}

function toggleVoiceMode() {
  userHasInteracted = true;
  if (!speechRecognition) return;

  voiceModeEnabled = !voiceModeEnabled;
  saveVoiceModePreference();
  if (!voiceModeEnabled) {
    stopVoiceRecognition();
    setVoiceStatus("Sesli tahmin kapalı");
    updateVoiceButton();
    return;
  }

  setVoiceStatus(
    !elements.startPanel.hidden || !elements.endPanel.hidden
      ? voiceCommandHint()
      : "Sesli tahmin açık"
  );
  // Açık kalmış bir mobil klavye varsa sesli moda geçildiği anda kapat.
  if (usesTouchInput()) elements.answerInput.blur();
  updateVoiceButton();
  beginVoiceRecognition();
}

elements.answerForm.addEventListener("submit", checkAnswer);
elements.startUnscrambleButton.addEventListener("click", () => {
  userHasInteracted = true;
  ensureAudioContext();
  startUnscrambleGame();
});
elements.startDerivationButton.addEventListener("click", () => {
  userHasInteracted = true;
  ensureAudioContext();
  startDerivationGame();
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
  showGameModeMenu();
});
elements.playAgainButton.addEventListener("click", () => {
  userHasInteracted = true;
  ensureAudioContext();
  showGameModeMenu();
});
elements.soundButton.addEventListener("click", toggleSound);
elements.voiceButton.addEventListener("click", toggleVoiceMode);
elements.startVoiceButton.addEventListener("click", toggleVoiceMode);
elements.endVoiceButton.addEventListener("click", toggleVoiceMode);
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
setupSpeechRecognition();
loadWords();
