"use strict";

const GAME_LENGTHS = [4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 10];
const REQUIRED_LENGTHS = [4, 5, 6, 7, 8, 9, 10];
const LEVELS = [
  { id: 1, label: "Çocuk", size: 500, lengths: [4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 8, 8] },
  { id: 2, label: "Başlangıç", size: 1000, lengths: [4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 8, 8] },
  { id: 3, label: "Orta", size: 2000, lengths: [4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9] },
  { id: 4, label: "İleri", size: 5000, lengths: GAME_LENGTHS },
  { id: 5, label: "Usta", size: 10000, lengths: GAME_LENGTHS }
];
const MULTIPLAYER_MAX_PLAYERS = 6;
const MULTIPLAYER_BUZZ_BUTTONS = [
  { code: "Space", label: "Boşluk" },
  { code: "NumpadEnter", label: "Sayısal Enter" }
];
const MULTIPLAYER_ANSWER_SECONDS = 3;
const MULTIPLAYER_DERIVATION_SECONDS = 5;
const MULTIPLAYER_DERIVATION_TURNS_PER_PLAYER = 10;
const HINT_SECONDS = 5;
const DERIVATION_SECONDS = 100;
const DERIVATION_MIN_LENGTH = 4;
const SOLVED_LETTER_DELAY = 80;
const SOLVED_WORD_PAUSE = 650;
// Tanıma oturumu bittiğinde oluşan sessiz aralığı mümkün olduğunca kısa tutar.
// Bazı tarayıcılar uzun sessizlikte Web Speech oturumunu kendileri kapatır.
const VOICE_RESTART_DELAY = 120;
const VOICE_PROCESSING_TIMEOUT = 2000;
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
  buzz: "assets/buzz.mp3?v=trimmed-1",
  cheer: "assets/cheering.wav",
  correct: "assets/correct.mp3",
  hint: "assets/hint.mp3",
  start: "assets/start.mp3",
  wrong: "assets/wrong.mp3"
};
const RECORDED_SOUND_LEVELS = {
  buzz: 1.26,
  cheer: 0.55,
  correct: 0.45,
  hint: 1.875,
  start: 1,
  wrong: 0.9
};
const RECORDED_SOUND_BOOSTS = {
  buzz: 1,
  cheer: 1,
  correct: 1,
  hint: 1.5,
  start: 2,
  wrong: 1
};

// Açık oyun durumu: her yeni oyunda tek bir kaynaktan sıfırlanır.
let wordPool = new Map();
const wordPoolsByLevel = new Map();
let derivationDictionary = [];
let selectedQuestions = [];
let gameMode = null;
let currentQuestionIndex = 0;
let totalScore = 0;
let selectedLevel = 4;
let gameSession = "single";
let menuState = "home";
let multiplayer = null;
let answerDeadlineTimer = null;
let answerCountdownTimer = null;
let multiplayerAnswerSecondsLeft = 0;
let multiplayerVoiceDetected = false;
let revealedLetterCount = 0;
let currentQuestionTimer = null;
let countdownTimer = null;
let derivationTimer = null;
let derivationLetters = [];
let derivationValidWords = new Set();
let derivationFoundWords = [];
let derivationRounds = [];
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
let voiceProcessingTimer = null;
let voiceListeningContext = null;

const elements = {
  loadingPanel: document.querySelector("#loadingPanel"),
  startPanel: document.querySelector("#startPanel"),
  startUnscrambleButton: document.querySelector("#startUnscrambleButton"),
  startDerivationButton: document.querySelector("#startDerivationButton"),
  modeGrid: document.querySelector(".mode-grid"),
  startVoiceButton: document.querySelector("#startVoiceButton"),
  startVoiceButtonLabel: document.querySelector("#startVoiceButtonLabel"),
  startVoiceStatus: document.querySelector("#startVoiceStatus"),
  singlePlayerButton: document.querySelector("#singlePlayerButton"),
  multiPlayerButton: document.querySelector("#multiPlayerButton"),
  difficultyPanel: document.querySelector("#difficultyPanel"),
  levelGrid: document.querySelector("#levelGrid"),
  backToModesButton: document.querySelector("#backToModesButton"),
  multiplayerPanel: document.querySelector("#multiplayerPanel"),
  multiplayerDescription: document.querySelector("#multiplayerDescription"),
  playerInputs: document.querySelector("#playerInputs"),
  addPlayerButton: document.querySelector("#addPlayerButton"),
  multiplayerModeSelect: document.querySelector("#multiplayerModeSelect"),
  multiplayerRoundsSelect: document.querySelector("#multiplayerRoundsSelect"),
  multiplayerLevelSelect: document.querySelector("#multiplayerLevelSelect"),
  multiplayerLevelOption: document.querySelector("#multiplayerLevelOption"),
  startMultiplayerButton: document.querySelector("#startMultiplayerButton"),
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
  derivationTurnSlot: document.querySelector("#derivationTurnSlot"),
  answerForm: document.querySelector("#answerForm"),
  answerLabel: document.querySelector("#answerLabel"),
  answerRow: document.querySelector("#answerRow"),
  answerInput: document.querySelector("#answerInput"),
  voiceButton: document.querySelector("#voiceButton"),
  voiceButtonLabel: document.querySelector("#voiceButtonLabel"),
  voiceStatus: document.querySelector("#voiceStatus"),
  checkButton: document.querySelector("#checkButton"),
  checkButtonLabel: document.querySelector("#checkButtonLabel"),
  passButton: document.querySelector("#passButton"),
  feedbackMessage: document.querySelector("#feedbackMessage"),
  multiplayerStatus: document.querySelector("#multiplayerStatus"),
  multiplayerTurnLabel: document.querySelector("#multiplayerTurnLabel"),
  multiplayerRoundLabel: document.querySelector("#multiplayerRoundLabel"),
  multiplayerAnswerCountdown: document.querySelector("#multiplayerAnswerCountdown"),
  multiplayerAnswerSeconds: document.querySelector("#multiplayerAnswerSeconds"),
  multiplayerAnswerCaption: document.querySelector("#multiplayerAnswerCaption"),
  liveLeaderboard: document.querySelector("#liveLeaderboard"),
  playerScoreboard: document.querySelector("#playerScoreboard"),
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
  multiplayerResults: document.querySelector("#multiplayerResults"),
  multiplayerResultsList: document.querySelector("#multiplayerResultsList"),
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
    const [largestLevelResponse, dictionaryResponse] = await Promise.all([
      fetch("assets/dictionaries/turkce_kelime_listesi_sik_kullanilan_10000.txt", { cache: "no-store" }),
      fetch("assets/dictionaries/turkce_kelime_listesi.txt", { cache: "no-store" })
    ]);
    if (!largestLevelResponse.ok || !dictionaryResponse.ok) {
      throw new Error("Seviye sözlüklerinden biri yüklenemedi.");
    }

    const [largestLevelText, dictionaryText] = await Promise.all([
      largestLevelResponse.text(),
      dictionaryResponse.text()
    ]);
    const rankedWords = largestLevelText.split(/\r?\n/u).map(normalizeTurkish).filter(Boolean);
    LEVELS.forEach((level) => {
      const pool = new Map(REQUIRED_LENGTHS.map((length) => [length, []]));
      [...new Set(rankedWords.slice(0, level.size))]
        .filter((word) => TURKISH_WORD_PATTERN.test(word))
        .filter((word) => REQUIRED_LENGTHS.includes(characterCount(word)))
        .forEach((word) => pool.get(characterCount(word)).push(word));
      wordPoolsByLevel.set(level.id, pool);
    });

    for (const level of LEVELS) {
      const pool = wordPoolsByLevel.get(level.id);
      const neededLengths = [...new Set(level.lengths)];
      const insufficient = neededLengths.filter((length) => pool.get(length).length < 2);
      if (insufficient.length) {
        showFatalError(`${level.label} seviyesi için yeterli kelime bulunamadı.`);
        return;
      }
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
  clearAnswerDeadline();
  multiplayer = null;
  gameSession = "single";
  menuState = "home";
  elements.gameLayout.hidden = true;
  elements.endPanel.hidden = true;
  elements.errorPanel.hidden = true;
  elements.startPanel.hidden = false;
  elements.difficultyPanel.hidden = true;
  elements.multiplayerPanel.hidden = true;
  elements.multiplayerResults.hidden = true;
  setGameType("single");
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

function currentLevelConfig() {
  return LEVELS.find((level) => level.id === selectedLevel) ?? LEVELS[3];
}

function maxScoreForQuestions(questions) {
  return questions.reduce(
    (total, item) => total + (typeof item === "number" ? item : characterCount(item)) * 10,
    0
  );
}

function setGameType(type) {
  gameSession = type === "multi" ? "multi" : "single";
  const isMulti = gameSession === "multi";
  elements.singlePlayerButton.classList.toggle("is-selected", !isMulti);
  elements.singlePlayerButton.setAttribute("aria-pressed", String(!isMulti));
  elements.multiPlayerButton.classList.toggle("is-selected", isMulti);
  elements.multiPlayerButton.setAttribute("aria-pressed", String(isMulti));
  elements.modeGrid.hidden = isMulti;
  elements.multiplayerPanel.hidden = !isMulti;
  elements.difficultyPanel.hidden = true;
  menuState = isMulti ? "multiplayer" : "home";
  updateMultiplayerLevelVisibility();
}

function showDifficultyChooser() {
  menuState = "difficulty";
  elements.difficultyPanel.hidden = false;
  elements.multiplayerPanel.hidden = true;
  elements.startUnscrambleButton.closest(".mode-grid").hidden = true;
  setVoiceStatus(voiceCommandHint());
  requestAnimationFrame(() => elements.levelGrid.querySelector("button").focus({ preventScroll: true }));
}

function hideDifficultyChooser() {
  menuState = "home";
  elements.difficultyPanel.hidden = true;
  elements.startUnscrambleButton.closest(".mode-grid").hidden = false;
  setVoiceStatus(voiceCommandHint());
}

function updateMultiplayerLevelVisibility() {
  const isUnscramble = elements.multiplayerModeSelect.value === "unscramble";
  elements.multiplayerLevelOption.hidden = !isUnscramble;
  elements.multiplayerDescription.innerHTML = isUnscramble
    ? "Çöz iki kişilik zil yarışı: birinci oyuncu <kbd>Boşluk</kbd>, ikinci oyuncu sayısal tuş takımındaki <kbd>Enter</kbd> ile cevap hakkını alır."
    : "Türet'te her oyuncu, her elde 10 kez beşer saniyelik sıra alır.";
  [...elements.playerInputs.children].forEach((label, index) => {
    label.hidden = isUnscramble && index >= MULTIPLAYER_BUZZ_BUTTONS.length;
  });
  elements.addPlayerButton.hidden = isUnscramble || elements.playerInputs.children.length >= MULTIPLAYER_MAX_PLAYERS;
}

function addPlayerInput(value) {
  const count = elements.playerInputs.children.length + 1;
  if (count > MULTIPLAYER_MAX_PLAYERS) return;
  const label = document.createElement("label");
  label.append(`Oyuncu ${count} `);
  const input = document.createElement("input");
  input.className = "player-name-input";
  input.type = "text";
  input.maxLength = 18;
  input.value = value || `Oyuncu ${count}`;
  preparePlayerNameInput(input);
  label.appendChild(input);
  elements.playerInputs.appendChild(label);
  elements.addPlayerButton.hidden = count >= MULTIPLAYER_MAX_PLAYERS;
}

function preparePlayerNameInput(input) {
  input.addEventListener("focus", () => {
    if (input.dataset.wasEdited === "true") return;
    input.value = "";
    input.dataset.wasEdited = "true";
  });
}

function startMultiplayerFromSetup() {
  const isUnscramble = elements.multiplayerModeSelect.value === "unscramble";
  const names = [...elements.playerInputs.querySelectorAll(".player-name-input")]
    .filter((input) => !input.closest("label").hidden)
    .map((input, index) => input.value.trim().slice(0, 18) || `Oyuncu ${index + 1}`);
  if (names.length < 2) return;
  gameSession = "multi";
  selectedLevel = Number(elements.multiplayerLevelSelect.value);
  multiplayer = {
    players: names.map((name, index) => ({ name, score: 0, buzzButton: MULTIPLAYER_BUZZ_BUTTONS[index] })),
    rounds: Number(elements.multiplayerRoundsSelect.value),
    activePlayerIndex: 0,
    lockedPlayerIndexes: new Set(),
    buzzedPlayerIndex: null,
    turnNumber: 0,
    currentDerivationRound: 1,
    turnsPerDerivationRound: names.length * MULTIPLAYER_DERIVATION_TURNS_PER_PLAYER
  };
  if (!isUnscramble) startDerivationGame();
  else startUnscrambleGame();
}

function resetMultiplayerForReplay() {
  if (!multiplayer) return;
  const players = multiplayer.players.map((player) => ({
    name: player.name,
    score: 0,
    buzzButton: player.buzzButton
  }));
  multiplayer = {
    players,
    rounds: multiplayer.rounds,
    activePlayerIndex: 0,
    lockedPlayerIndexes: new Set(),
    buzzedPlayerIndex: null,
    turnNumber: 0,
    currentDerivationRound: 1,
    turnsPerDerivationRound: players.length * MULTIPLAYER_DERIVATION_TURNS_PER_PLAYER
  };
}

function replayCurrentGame() {
  if (elements.endPanel.hidden || !gameMode) return;
  const replayMode = gameMode;
  userHasInteracted = true;
  ensureAudioContext();
  if (gameSession === "multi") resetMultiplayerForReplay();
  if (replayMode === "derive") startDerivationGame();
  else startUnscrambleGame();
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

function pickWords(length, count) {
  const all = [...wordPool.get(length)];
  const fresh = all.filter((word) => !previousGameWords.has(word));
  const chosen = [];

  while (chosen.length < count && fresh.length) chosen.push(takeRandom(fresh));

  const fallback = all.filter((word) => !chosen.includes(word));
  while (chosen.length < count) chosen.push(takeRandom(fallback));

  return chosen;
}

function selectQuestions() {
  const lengths = currentLevelConfig().lengths;
  const counts = new Map();
  lengths.forEach((length) => counts.set(length, (counts.get(length) ?? 0) + 1));
  const chosenByLength = new Map();
  counts.forEach((count, length) => chosenByLength.set(length, pickWords(length, count)));
  return lengths.map((length) => chosenByLength.get(length).shift());
}

function startUnscrambleGame() {
  stopVoiceRecognition();
  clearAllTimers();
  clearAnswerDeadline();
  gameMode = "unscramble";
  wordPool = wordPoolsByLevel.get(selectedLevel);
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

  previousGameWords = new Set();
  const hands = gameSession === "multi" ? multiplayer.rounds : 1;
  selectedQuestions = Array.from({ length: hands }, () => {
    const questions = selectQuestions();
    questions.forEach((word) => previousGameWords.add(word));
    return questions;
  }).flat();
  elements.scoreMaximum.textContent = `/ ${maxScoreForQuestions(selectedQuestions)}`;
  configureMultiplayerStatus();
  playSound("start");
  startQuestion();
}

function showGameModeMenu() {
  stopVoiceRecognition();
  clearAllTimers();
  clearAnswerDeadline();
  questionToken += 1;
  roundLocked = true;
  gameMode = null;
  showStartScreen();
}

function startGameMode(mode) {
  if (menuState === "multiplayer") return;
  if (mode === "derive") startDerivationGame();
  else showDifficultyChooser();
}

function configureUnscrambleInterface() {
  elements.feedbackMessage.after(elements.multiplayerStatus);
  elements.scoreLabel.textContent = "Toplam puan";
  elements.scoreMaximum.textContent = `/ ${maxScoreForQuestions(currentLevelConfig().lengths)}`;
  elements.availableLabel.textContent = "Bu sorunun değeri";
  elements.availableUnit.textContent = "puan";
  elements.hintTitle.textContent = "Sıradaki ipucu";
  elements.hintDescription.textContent = "İlk harften başlayarak";
  elements.roundEyebrow.textContent = "Karışık harfler";
  elements.roundHeading.textContent = gameSession === "multi" ? "Çöz · zil zamanı" : "Çöz";
  elements.answerLabel.textContent = "Cevabın";
  elements.answerInput.placeholder = "Kelimeyi buraya yaz";
  elements.checkButtonLabel.textContent = "Kontrol et";
  elements.hintCopy.textContent = "Her 5 saniyede bir harf doğru yerine yerleşir; sorunun değeri 10 puan azalır.";
  elements.keyboardHint.innerHTML = "<kbd>Enter</kbd> ile kontrol edebilirsin";
  elements.deriveFoundSection.hidden = true;
  elements.passButton.hidden = false;
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
  derivationRounds = [];
  derivationTimeLeft = gameSession === "multi" ? MULTIPLAYER_DERIVATION_SECONDS : DERIVATION_SECONDS;
  prepareDerivationRack();

  elements.errorPanel.hidden = true;
  elements.startPanel.hidden = true;
  elements.endPanel.hidden = true;
  elements.gameLayout.hidden = false;
  configureDerivationInterface();
  renderLetters(derivationLetters);
  elements.answerInput.disabled = false;
  elements.checkButton.disabled = false;
  elements.passButton.disabled = false;
  elements.voiceButton.disabled = !speechRecognition;
  elements.answerInput.value = "";
  elements.feedbackMessage.textContent = "";
  elements.feedbackMessage.className = "feedback";
  elements.answerRow.classList.remove("is-wrong");
  elements.deriveFoundList.replaceChildren();
  elements.deriveFoundCount.textContent = "0";
  configureMultiplayerStatus();
  updateDerivationInterface();
  playSound("start");
  if (gameSession === "multi") {
    startMultiplayerDerivationTurn();
    return;
  }
  scheduleVoiceRecognition(80);
  derivationTimer = window.setInterval(() => {
    derivationTimeLeft -= 1;
    if (derivationTimeLeft > 0 && derivationTimeLeft <= 10) playSound("hint");
    updateDerivationInterface();
    if (derivationTimeLeft <= 0) finishGame();
  }, 1000);
  focusAnswerInput();
}

function prepareDerivationRack() {
  const rack = createDerivationRack();
  derivationLetters = rack.letters;
  derivationValidWords = new Set(rack.words);
  derivationLongestWordLength = Math.max(0, ...rack.words.map(characterCount));
  derivationFoundWords = [];
  derivationRounds.push({ validWords: rack.words, foundWords: derivationFoundWords });
}

function configureDerivationInterface() {
  elements.derivationTurnSlot.append(elements.multiplayerStatus);
  elements.scoreLabel.textContent = "Puan";
  elements.questionCounter.textContent = "Süre";
  elements.scoreMaximum.textContent = "";
  elements.availableLabel.textContent = "En uzun kelime";
  elements.availableUnit.textContent = "harf";
  elements.hintTitle.textContent = "Kalan süre";
  elements.hintDescription.textContent = "Süre bitmeden yaz";
  elements.roundEyebrow.textContent = gameSession === "multi"
    ? `10 harf · El ${multiplayer.currentDerivationRound} / ${multiplayer.rounds}`
    : "10 harf";
  elements.roundHeading.textContent = "Türet";
  elements.wordLength.textContent = "10";
  elements.answerLabel.textContent = "Tahminin";
  elements.answerInput.placeholder = "Kelimeyi buraya yaz";
  elements.checkButtonLabel.textContent = "Ekle";
  elements.hintCopy.textContent = "Bu 10 harfi kullanarak en az 4 harfli Türkçe kelimeler türet. En uzun kelimeler çift puan getirir.";
  elements.keyboardHint.innerHTML = "<kbd>Enter</kbd> ile kelimeyi ekleyebilirsin";
  elements.deriveFoundSection.hidden = false;
  elements.passButton.hidden = gameSession !== "multi";
  elements.hintClock.classList.add("is-derivation-timer");
}

function updateDerivationInterface() {
  const longestFound = Math.max(0, ...derivationFoundWords.map(characterCount));
  elements.totalScore.textContent = gameSession === "multi"
    ? multiplayer.players.reduce((total, player) => total + player.score, 0)
    : derivationScore;
  elements.availableScore.textContent = longestFound || "—";
  const totalTime = gameSession === "multi" ? MULTIPLAYER_DERIVATION_SECONDS : DERIVATION_SECONDS;
  elements.progressFill.style.width = `${((totalTime - Math.max(0, derivationTimeLeft)) / totalTime) * 100}%`;
  elements.progressText.textContent = `${Math.max(0, derivationTimeLeft)} sn kaldı`;
  elements.countdownValue.textContent = Math.max(0, derivationTimeLeft);
  elements.hintClock.style.setProperty(
    "--timer-progress",
    String((Math.max(0, derivationTimeLeft) / totalTime) * 100)
  );
  elements.hintClock.classList.toggle("is-urgent", derivationTimeLeft > 0 && derivationTimeLeft <= 10);
  const totalFound = derivationRounds.reduce((total, round) => total + round.foundWords.length, 0);
  elements.footerDetail.innerHTML = gameSession === "multi"
    ? `Bu elde: <strong>${derivationFoundWords.length}</strong> · Toplam: <strong>${totalFound} kelime</strong>`
    : `Bulunan: <strong>${derivationFoundWords.length} kelime</strong>`;
}

function clearAnswerDeadline() {
  if (answerDeadlineTimer !== null) window.clearTimeout(answerDeadlineTimer);
  if (answerCountdownTimer !== null) window.clearInterval(answerCountdownTimer);
  answerDeadlineTimer = null;
  answerCountdownTimer = null;
  multiplayerAnswerSecondsLeft = 0;
  multiplayerVoiceDetected = false;
  elements.multiplayerAnswerCountdown.hidden = true;
  elements.multiplayerAnswerCountdown.classList.remove("is-grace");
  elements.multiplayerAnswerCaption.textContent = "CEVAP SÜRESİ";
}

function renderMultiplayerAnswerCountdown() {
  elements.multiplayerAnswerCountdown.hidden = false;
  elements.multiplayerAnswerSeconds.textContent = String(multiplayerAnswerSecondsLeft);
  elements.multiplayerAnswerCountdown.classList.remove("is-ticking");
  void elements.multiplayerAnswerCountdown.offsetWidth;
  elements.multiplayerAnswerCountdown.classList.add("is-ticking");
}

function handleMultiplayerAnswerDeadline(index) {
  if (multiplayer.buzzedPlayerIndex !== index || roundLocked) return;
  if (multiplayerVoiceDetected) {
    if (answerCountdownTimer !== null) window.clearInterval(answerCountdownTimer);
    answerCountdownTimer = null;
    elements.multiplayerAnswerSeconds.textContent = "…";
    elements.multiplayerAnswerCaption.textContent = "DİKTE TAMAMLANIYOR";
    elements.multiplayerAnswerCountdown.classList.add("is-grace");
    return;
  }
  handleMultiplayerIncorrect("Süre doldu.");
}

function configureMultiplayerStatus() {
  const isMulti = gameSession === "multi";
  elements.multiplayerStatus.hidden = !isMulti;
  elements.liveLeaderboard.hidden = !isMulti;
  elements.gameLayout.classList.toggle("is-multiplayer", isMulti);
  if (!isMulti) return;
  renderMultiplayerStatus();
}

function renderMultiplayerStatus(message) {
  if (gameSession !== "multi" || !multiplayer) return;
  const active = multiplayer.activePlayerIndex;
  const hasActiveTurn = gameMode === "derive" || multiplayer.buzzedPlayerIndex !== null;
  elements.multiplayerTurnLabel.textContent = message || (gameMode === "derive"
    ? `Sıra: ${multiplayer.players[active].name}`
    : multiplayer.buzzedPlayerIndex === null
      ? `Zil: ${multiplayer.players[0].name} Boşluk · ${multiplayer.players[1].name} Sayısal Enter`
      : `${multiplayer.players[active].name} cevaplıyor`);
  elements.multiplayerTurnLabel.classList.toggle("is-turn-active", hasActiveTurn);
  elements.multiplayerRoundLabel.textContent = gameMode === "derive"
    ? `El ${multiplayer.currentDerivationRound} / ${multiplayer.rounds} · Tur ${Math.floor(multiplayer.turnNumber / multiplayer.players.length) + 1} / ${MULTIPLAYER_DERIVATION_TURNS_PER_PLAYER}`
    : `El ${Math.floor(currentQuestionIndex / currentLevelConfig().lengths.length) + 1} / ${multiplayer.rounds}`;
  const oldPositions = new Map(
    [...elements.playerScoreboard.children].map((tag) => [tag.dataset.playerIndex, tag.getBoundingClientRect()])
  );
  const existingTags = new Map(
    [...elements.playerScoreboard.children].map((tag) => [tag.dataset.playerIndex, tag])
  );
  const ranking = multiplayer.players
    .map((player, index) => ({ player, index }))
    .sort((first, second) => second.player.score - first.player.score || first.index - second.index);
  const fragment = document.createDocumentFragment();
  ranking.forEach(({ player, index }, rankIndex) => {
    const tag = existingTags.get(String(index)) || document.createElement("article");
    tag.className = "player-score";
    tag.dataset.playerIndex = String(index);
    if (index === active && hasActiveTurn) tag.classList.add("is-active");
    if (multiplayer.lockedPlayerIndexes.has(index)) tag.classList.add("is-locked");
    const rank = document.createElement("span");
    rank.className = "player-score__rank";
    rank.textContent = `${rankIndex + 1}`;
    const name = document.createElement("strong");
    name.className = "player-score__name";
    name.textContent = player.name;
    const score = document.createElement("strong");
    score.className = "player-score__points";
    score.textContent = `${player.score} puan`;
    tag.replaceChildren(rank, name, score);
    if (gameMode === "unscramble") {
      const key = document.createElement("kbd");
      key.textContent = player.buzzButton.label;
      tag.appendChild(key);
    }
    fragment.appendChild(tag);
  });
  elements.playerScoreboard.replaceChildren(fragment);
  requestAnimationFrame(() => {
    [...elements.playerScoreboard.children].forEach((tag) => {
      const first = oldPositions.get(tag.dataset.playerIndex);
      if (!first) return;
      const last = tag.getBoundingClientRect();
      const deltaX = first.left - last.left;
      const deltaY = first.top - last.top;
      if (!deltaX && !deltaY) return;
      tag.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)`, zIndex: 2 },
          { transform: "translate(0, 0)", zIndex: 1 }
        ],
        { duration: 420, easing: "cubic-bezier(0.2, 0.82, 0.24, 1)" }
      );
    });
  });
}

function openMultiplayerBuzz(message = "Zile bas ve cevap hakkını al") {
  if (gameSession !== "multi" || gameMode !== "unscramble" || roundLocked) return;
  clearAnswerDeadline();
  multiplayer.buzzedPlayerIndex = null;
  elements.answerInput.disabled = true;
  elements.checkButton.disabled = true;
  elements.voiceButton.disabled = true;
  elements.passButton.disabled = true;
  renderMultiplayerStatus(message === "Zile bas ve cevap hakkını al" ? undefined : message);
}

function claimMultiplayerBuzz(index) {
  if (gameSession !== "multi" || gameMode !== "unscramble" || roundLocked) return;
  if (multiplayer.buzzedPlayerIndex !== null || multiplayer.lockedPlayerIndexes.has(index)) return;
  multiplayer.buzzedPlayerIndex = index;
  multiplayer.activePlayerIndex = index;
  elements.answerInput.disabled = false;
  elements.checkButton.disabled = false;
  elements.passButton.disabled = false;
  elements.voiceButton.disabled = !speechRecognition;
  elements.answerInput.value = "";
  renderMultiplayerStatus(`${multiplayer.players[index].name} cevaplıyor · ${MULTIPLAYER_ANSWER_SECONDS} sn`);
  playSound("buzz");
  focusAnswerInput();
  multiplayerAnswerSecondsLeft = MULTIPLAYER_ANSWER_SECONDS;
  multiplayerVoiceDetected = false;
  renderMultiplayerAnswerCountdown();
  answerCountdownTimer = window.setInterval(() => {
    multiplayerAnswerSecondsLeft -= 1;
    if (multiplayerAnswerSecondsLeft > 0) renderMultiplayerAnswerCountdown();
  }, 1000);
  scheduleVoiceRecognition(120);
  answerDeadlineTimer = window.setTimeout(() => {
    handleMultiplayerAnswerDeadline(index);
  }, MULTIPLAYER_ANSWER_SECONDS * 1000);
}

function handleMultiplayerIncorrect(message) {
  const index = multiplayer.buzzedPlayerIndex;
  clearAnswerDeadline();
  stopVoiceRecognition();
  playSound("wrong");
  if (index !== null) {
    const penalty = characterCount(selectedQuestions[currentQuestionIndex]) * 10;
    multiplayer.players[index].score -= penalty;
    multiplayer.lockedPlayerIndexes.add(index);
    message = `${message} -${penalty} puan.`;
  }
  const remaining = multiplayer.players.some((_, playerIndex) => !multiplayer.lockedPlayerIndexes.has(playerIndex));
  if (!remaining) {
    handleFullyRevealed(selectedQuestions[currentQuestionIndex]);
    return;
  }
  elements.feedbackMessage.textContent = `${message} Diğer oyuncular için zil yeniden açıldı.`;
  elements.feedbackMessage.className = "feedback feedback--wrong";
  openMultiplayerBuzz("Diğer oyuncuların zili açık");
}

function startMultiplayerDerivationTurn() {
  if (!multiplayer) {
    finishGame();
    return;
  }
  if (multiplayer.turnNumber >= multiplayer.turnsPerDerivationRound) {
    if (multiplayer.currentDerivationRound >= multiplayer.rounds) {
      finishGame();
      return;
    }
    startNextMultiplayerDerivationRound();
    return;
  }
  clearAllTimers();
  clearAnswerDeadline();
  roundLocked = false;
  multiplayer.activePlayerIndex = multiplayer.turnNumber % multiplayer.players.length;
  derivationTimeLeft = MULTIPLAYER_DERIVATION_SECONDS;
  elements.answerInput.disabled = false;
  elements.checkButton.disabled = false;
  elements.passButton.disabled = false;
  elements.voiceButton.disabled = !speechRecognition;
  elements.answerInput.value = "";
  elements.feedbackMessage.textContent = "";
  updateDerivationInterface();
  renderMultiplayerStatus();
  playSound("turn");
  scheduleVoiceRecognition(120);
  derivationTimer = window.setInterval(() => {
    derivationTimeLeft -= 1;
    updateDerivationInterface();
    if (derivationTimeLeft <= 0) advanceMultiplayerDerivationTurn("Süre doldu.");
  }, 1000);
  focusAnswerInput();
}

function startNextMultiplayerDerivationRound() {
  clearAllTimers();
  clearAnswerDeadline();
  stopVoiceRecognition();
  multiplayer.currentDerivationRound += 1;
  multiplayer.turnNumber = 0;
  questionToken += 1;
  prepareDerivationRack();
  renderLetters(derivationLetters);
  elements.deriveFoundList.replaceChildren();
  elements.deriveFoundCount.textContent = "0";
  elements.feedbackMessage.textContent = "Yeni harf seti hazır.";
  elements.feedbackMessage.className = "feedback feedback--revealed";
  configureDerivationInterface();
  updateDerivationInterface();
  window.setTimeout(startMultiplayerDerivationTurn, 650);
}

function advanceMultiplayerDerivationTurn(message) {
  if (gameSession !== "multi" || gameMode !== "derive") return;
  clearAllTimers();
  stopVoiceRecognition();
  multiplayer.turnNumber += 1;
  elements.feedbackMessage.textContent = message;
  elements.feedbackMessage.className = "feedback feedback--revealed";
  window.setTimeout(() => startMultiplayerDerivationTurn(), 600);
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
  if (gameSession === "multi" && multiplayer) {
    multiplayer.lockedPlayerIndexes = new Set();
    multiplayer.buzzedPlayerIndex = null;
  }
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
  if (gameSession === "multi") {
    openMultiplayerBuzz();
  } else {
    scheduleVoiceRecognition(80);
  }

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

  elements.questionCounter.textContent = `Soru ${currentQuestionIndex + 1} / ${selectedQuestions.length}`;
  elements.totalScore.textContent = gameSession === "multi"
    ? multiplayer.players.reduce((total, player) => total + player.score, 0)
    : totalScore;
  elements.availableScore.textContent = available;
  elements.wordLength.textContent = length;
  elements.revealedCount.textContent = `${revealedLetterCount} / ${length}`;
  elements.progressFill.style.width = `${(completed / selectedQuestions.length) * 100}%`;
  elements.progressText.textContent = `${selectedQuestions.length - completed} soru kaldı`;
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
  clearAnswerDeadline();
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
    if (gameSession === "multi") {
      handleMultiplayerIncorrect(answer ? "Yanlış cevap." : "Cevap gelmedi.");
      return;
    }
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
    if (gameSession === "multi") {
      advanceMultiplayerDerivationTurn("Pas geçildi.");
      return;
    }
    elements.feedbackMessage.textContent = "Önce bir kelime yazmalısın.";
    elements.feedbackMessage.className = "feedback feedback--wrong";
    return;
  }
  if (characterCount(word) < DERIVATION_MIN_LENGTH) {
    if (gameSession === "multi") {
      showDerivationError("En az 4 harfli bir kelime gerekli.");
      return;
    }
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
  if (gameSession === "multi") multiplayer.players[multiplayer.activePlayerIndex].score += points;
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
  if (gameSession === "multi") {
    renderMultiplayerStatus(`${multiplayer.players[multiplayer.activePlayerIndex].name} · +${points} puan`);
    advanceMultiplayerDerivationTurn("Doğru kelime! Sıradaki oyuncuya geçiliyor.");
  }
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
  if (gameSession === "multi") advanceMultiplayerDerivationTurn(`${message} Sıradaki oyuncuya geçiliyor.`);
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
  if (gameSession === "multi") advanceMultiplayerDerivationTurn(`“${word}” zaten bulundu.`);
}

function handleCorrectAnswer(word) {
  roundLocked = true;
  stopVoiceRecognition();
  clearAllTimers();
  clearAnswerDeadline();
  const earned = Math.max(0, characterCount(word) * 10 - revealedLetterCount * 10);
  if (gameSession === "multi") {
    multiplayer.players[multiplayer.activePlayerIndex].score += earned;
    renderMultiplayerStatus(`${multiplayer.players[multiplayer.activePlayerIndex].name} doğru bildi · +${earned}`);
  } else {
    totalScore += earned;
  }
  elements.totalScore.textContent = gameSession === "multi"
    ? multiplayer.players.reduce((total, player) => total + player.score, 0)
    : totalScore;
  elements.answerInput.disabled = true;
  elements.checkButton.disabled = true;
  elements.voiceButton.disabled = true;
  elements.answerInput.value = word;
  elements.answerInput.classList.add("is-correct-answer");
  elements.feedbackMessage.textContent = `${gameSession === "multi" ? `${multiplayer.players[multiplayer.activePlayerIndex].name}: ` : ""}Doğru! +${earned} puan · ${word}`;
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

function passCurrentRound() {
  ensureAudioContext();
  if (!gameMode) return;
  if (gameMode === "derive") {
    if (gameSession === "multi") advanceMultiplayerDerivationTurn("Pas geçildi.");
    else {
      elements.answerInput.value = "";
      elements.feedbackMessage.textContent = "Türet modunda süre devam ediyor.";
      elements.feedbackMessage.className = "feedback feedback--revealed";
    }
    return;
  }
  if (roundLocked) return;
  if (gameSession === "multi" && multiplayer.buzzedPlayerIndex !== null) {
    handleMultiplayerIncorrect("Pas geçildi.");
    return;
  }
  const word = selectedQuestions[currentQuestionIndex];
  roundLocked = true;
  clearAllTimers();
  clearAnswerDeadline();
  stopVoiceRecognition();
  elements.answerInput.disabled = true;
  elements.checkButton.disabled = true;
  elements.voiceButton.disabled = true;
  elements.passButton.disabled = true;
  elements.feedbackMessage.textContent = `Pas geçildi: ${word}. Sıradaki kelimeye geçiliyor…`;
  elements.feedbackMessage.className = "feedback feedback--revealed";
  const tokenAtPass = questionToken;
  window.setTimeout(() => {
    if (tokenAtPass !== questionToken) return;
    currentQuestionIndex += 1;
    if (currentQuestionIndex >= selectedQuestions.length) finishGame();
    else startQuestion();
  }, 1200);
}

function finishGame() {
  stopVoiceRecognition();
  clearAllTimers();
  questionToken += 1;
  roundLocked = true;
  const isDerivationGame = gameMode === "derive";
  const derivationFoundTotal = derivationRounds.reduce((total, round) => total + round.foundWords.length, 0);
  const derivationPossibleTotal = derivationRounds.reduce((total, round) => total + round.validWords.length, 0);
  const derivationLongestFound = Math.max(
    0,
    ...derivationRounds.flatMap((round) => round.foundWords).map(characterCount)
  );
  const rate = isDerivationGame
    ? Math.min(100, Math.round((derivationFoundTotal / Math.max(1, derivationPossibleTotal)) * 100))
    : Math.round((totalScore / maxScoreForQuestions(selectedQuestions)) * 100);

  elements.gameLayout.hidden = true;
  elements.endPanel.hidden = false;
  elements.endPanel.classList.toggle("end-panel--derivation", isDerivationGame);
  const multiplayerTotal = gameSession === "multi"
    ? multiplayer.players.reduce((total, player) => total + player.score, 0)
    : null;
  elements.finalScore.textContent = gameSession === "multi" ? multiplayerTotal : isDerivationGame ? derivationScore : totalScore;
  elements.finalScoreSuffix.textContent = gameSession === "multi" || isDerivationGame ? "puan" : `/ ${maxScoreForQuestions(selectedQuestions)} puan`;
  elements.endTitle.textContent = gameSession === "multi" ? "Oyun tamamlandı." : isDerivationGame ? "Süre doldu." : `${selectedQuestions.length} kelimeyi de tamamladın.`;
  elements.endSummary.innerHTML = isDerivationGame
    ? `Bulunan: <strong>${derivationFoundTotal}</strong> · Kaçırılan: <strong>${Math.max(0, derivationPossibleTotal - derivationFoundTotal)}</strong> · Başarı: <strong>%${rate}</strong> · En uzun: <strong>${derivationLongestFound || "—"} harf</strong>`
    : gameSession === "multi" ? "Oyuncu puanları aşağıda." : `Başarı oranı: <strong id="successRate">%${rate}</strong>`;
  elements.deriveResults.hidden = !isDerivationGame;
  if (isDerivationGame) renderDerivationResults();
  elements.multiplayerResults.hidden = gameSession !== "multi";
  if (gameSession === "multi") renderMultiplayerResults();
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

function renderMultiplayerResults() {
  const ranking = [...multiplayer.players].sort((first, second) => second.score - first.score || first.name.localeCompare(second.name, "tr-TR"));
  const bestScore = ranking[0]?.score ?? 0;
  const fragment = document.createDocumentFragment();
  ranking.forEach((player, index) => {
    const item = document.createElement("article");
    item.className = "multiplayer-result-card";
    if (player.score === bestScore) item.classList.add("is-winner");
    item.setAttribute("aria-label", `${index + 1}. ${player.name}, ${player.score} puan`);

    const rank = document.createElement("span");
    rank.className = "multiplayer-result-card__rank";
    rank.textContent = player.score === bestScore ? "KAZANAN" : `${index + 1}. SIRA`;

    const name = document.createElement("strong");
    name.className = "multiplayer-result-card__name";
    name.textContent = player.name;

    const score = document.createElement("span");
    score.className = "multiplayer-result-card__score";
    score.innerHTML = `<strong>${player.score}</strong><small>PUAN</small>`;

    item.append(rank, name, score);
    fragment.appendChild(item);
  });
  elements.multiplayerResultsList.replaceChildren(fragment);
}

function renderDerivationResults() {
  const allValidWords = derivationRounds.flatMap((round) => round.validWords);
  const allFoundWords = new Set(derivationRounds.flatMap((round) => round.foundWords));
  const byLength = new Map();
  allValidWords
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
      item.className = allFoundWords.has(word)
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

function tone({ frequency, endFrequency = frequency, duration = 0.12, type = "sine", gain = 0.065, delay = 0, peakGain = 0.35 }) {
  const context = ensureAudioContext();
  if (!context) return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(Math.min(gain * VOLUME_BOOST, peakGain), start + 0.018);
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
  if (kind === "buzz") {
    playRecordedSound("buzz");
  } else if (kind === "cheer") {
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
  } else if (kind === "turn") {
    tone({ frequency: 520, endFrequency: 560, duration: 0.07, gain: 0.081, peakGain: 0.5 });
    tone({ frequency: 660, endFrequency: 700, duration: 0.09, gain: 0.063, delay: 0.09, peakGain: 0.5 });
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

function isSpokenPassCommand(value) {
  // Tek başına "pas" bir kelimenin başlangıcı olabilir (ör. pasaport).
  // Bu yüzden sesli komut için açıkça "pas geç" denmesini istiyoruz.
  const words = normalizeTurkish(value)
    .replace(/[^A-ZÇĞİÖŞÜ]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .map(normalizeSpokenCommand);

  return words[0] === "PAS" && words[1]?.startsWith("GEC");
}

function gameModeFromSpokenCommand(value) {
  const command = normalizeSpokenCommand(value);
  // Mobil tanıma çoğu zaman komutu "çözüm" veya "türetme" gibi eklerle
  // döndürür. Başlangıç ekranında yalnızca iki geçerli komut olduğu için
  // kök eşleşmesi burada güvenli ve daha affedicidir.
  if (command.includes("TURET") || command.includes("KELIMETURET")) return "derive";
  if (command.includes("COZ") || command.includes("KELIMEBUL") || command.includes("KARISIKKELIME")) return "unscramble";
  return null;
}

function levelFromSpokenCommand(value) {
  const command = normalizeSpokenCommand(value);
  const matches = [
    [1, ["BIRINCI", "BIR", "ILK", "COCUK"]],
    [2, ["IKINCI", "IKI", "BASLANGIC"]],
    [3, ["UCUNCU", "UC", "ORTA"]],
    [4, ["DORDUNCU", "DORT", "ILERI"]],
    [5, ["BESINCI", "BES", "USTA"]]
  ];
  return matches.find(([, phrases]) => phrases.some((phrase) => command.includes(phrase)))?.[0] ?? null;
}

function isSpokenReplayCommand(value) {
  return normalizeSpokenCommand(value).startsWith("TEKRAR");
}

function voiceCommandHint() {
  if (!elements.endPanel.hidden) return "Aynı ayarlarla yeniden oynamak için “tekrar” diyebilirsin";
  if (menuState === "difficulty") return "“Birinci seviye” ile “beşinci seviye” arasında seçim yapabilirsin";
  if (menuState === "multiplayer") return "Oyuncuları hazırlayıp oyunu başlatabilirsin";
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

  elements.answerRow.classList.remove("is-voice-only");
  elements.answerInput.readOnly = false;
  elements.answerInput.inputMode = "text";
  elements.answerInput.tabIndex = 0;
  elements.answerInput.setAttribute("aria-readonly", "false");
}

function setVoiceStatus(message) {
  const statusElement = !elements.startPanel.hidden
    ? elements.startVoiceStatus
    : !elements.endPanel.hidden
      ? elements.endVoiceStatus
      : elements.voiceStatus;
  statusElement.textContent = message;
}

function clearVoiceProcessingTimeout() {
  if (voiceProcessingTimer !== null) window.clearTimeout(voiceProcessingTimer);
  voiceProcessingTimer = null;
}

function startVoiceProcessingTimeout() {
  clearVoiceProcessingTimeout();
  const tokenAtSpeechStart = questionToken;
  voiceProcessingTimer = window.setTimeout(() => {
    voiceProcessingTimer = null;
    const isCurrentSinglePlayerSolve = gameSession === "single"
      && gameMode === "unscramble"
      && voiceListeningContext === "game"
      && tokenAtSpeechStart === questionToken
      && !roundLocked;
    if (!isCurrentSinglePlayerSolve) return;
    stopVoiceRecognition();
    setVoiceStatus("Ses çözümlenemedi, tekrar dinliyorum…");
    scheduleVoiceRecognition(VOICE_RESTART_DELAY);
  }, VOICE_PROCESSING_TIMEOUT);
}

function stopVoiceRecognition() {
  clearVoiceProcessingTimeout();
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
  // Android'deki bazı Web Speech uygulamaları continuous modunda hiç sonuç
  // üretmeyebiliyor. Mobilde her sonuçtan sonra hızlıca yeni oturum açmak,
  // masaüstünde ise kesintisiz dinlemek daha güvenilir.
  speechRecognition.continuous = !usesTouchInput();
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
      if (gameSession === "single" && gameMode === "unscramble") {
        startVoiceProcessingTimeout();
      }
      if (gameSession === "multi" && gameMode === "unscramble" && multiplayer?.buzzedPlayerIndex !== null) {
        multiplayerVoiceDetected = true;
      }
    }
  };

  speechRecognition.onresult = (event) => {
    if (voiceListeningContext === "command") {
      const result = event.results[event.resultIndex];
      const transcripts = Array.from({ length: result.length }, (_, index) => result[index].transcript);
      if (!elements.endPanel.hidden && transcripts.some(isSpokenReplayCommand)) {
        replayCurrentGame();
        return;
      }
      const selectedLevelFromVoice = transcripts.map(levelFromSpokenCommand).find(Boolean);
      if (menuState === "difficulty" && selectedLevelFromVoice) {
        selectedLevel = selectedLevelFromVoice;
        hideDifficultyChooser();
        startUnscrambleGame();
        return;
      }
      const selectedMode = transcripts.map(gameModeFromSpokenCommand).find(Boolean);

      // Başlangıç komutu duyulur duyulmaz oyunu aç. Bazı Android sürümleri
      // sonucu "final" yapmadan oturumu kapatabiliyor.
      if (selectedMode) {
        userHasInteracted = true;
        ensureAudioContext();
        startGameMode(selectedMode);
      } else if (result.isFinal) {
        setVoiceStatus(voiceCommandHint());
      }
      return;
    }

    // Önceki kelimeyi gönderdikten sonra gecikmeli gelen sonuçlar ikinci kez
    // işlenmesin. Bu özellikle Android'in ara/final sonuç sıralamasında olur.
    if (!voiceListening || voiceQuestionToken !== questionToken || roundLocked) return;
    const result = event.results[event.resultIndex];
    const transcripts = Array.from({ length: result.length }, (_, index) => result[index].transcript);
    if (result.isFinal && transcripts.some(isSpokenPassCommand)) {
      stopVoiceRecognition();
      passCurrentRound();
      return;
    }
    const alternatives = transcripts.map(normalizeSpokenWord).filter(Boolean);
    if (!alternatives.length) return;

    const bestCandidate = gameMode === "derive"
      ? alternatives.find((candidate) => derivationValidWords.has(candidate))
        || alternatives.find((candidate) => characterCount(candidate) >= DERIVATION_MIN_LENGTH)
        || alternatives[0]
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

    // Türet modunda geçerli bir kelime ara sonuç olarak bile duyulduğunda
    // hemen kaydet. Bazı Android tarayıcıları son "final" olayını hiç
    // göndermeyebiliyor. Çöz'de de hedef kelime ara sonuçta birebir duyulduysa
    // beklemeden gönder; böylece süre, zaten anlaşılmış doğru yanıtı kesmez.
    const isKnownDerivationWord = gameMode === "derive" && derivationValidWords.has(bestCandidate);
    const isKnownUnscrambleAnswer = gameMode === "unscramble"
      && bestCandidate === selectedQuestions[currentQuestionIndex];
    if (result.isFinal || isKnownDerivationWord || isKnownUnscrambleAnswer) submitSpokenGuess(bestCandidate);
  };

  speechRecognition.onerror = (event) => {
    clearVoiceProcessingTimeout();
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
    clearVoiceProcessingTimeout();
    if (voiceListeningContext === "game" && !roundLocked) {
      setVoiceStatus("Ses algılandı ama kelime anlaşılamadı; dinlemeye devam ediyorum");
    }
  };

  speechRecognition.onend = () => {
    clearVoiceProcessingTimeout();
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
  showDifficultyChooser();
});
elements.startDerivationButton.addEventListener("click", () => {
  userHasInteracted = true;
  ensureAudioContext();
  startDerivationGame();
});
elements.singlePlayerButton.addEventListener("click", () => setGameType("single"));
elements.multiPlayerButton.addEventListener("click", () => setGameType("multi"));
elements.backToModesButton.addEventListener("click", hideDifficultyChooser);
elements.levelGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-level]");
  if (!button) return;
  userHasInteracted = true;
  selectedLevel = Number(button.dataset.level);
  hideDifficultyChooser();
  startUnscrambleGame();
});
elements.addPlayerButton.addEventListener("click", () => addPlayerInput());
elements.playerInputs.querySelectorAll(".player-name-input").forEach(preparePlayerNameInput);
elements.multiplayerModeSelect.addEventListener("change", updateMultiplayerLevelVisibility);
elements.startMultiplayerButton.addEventListener("click", () => {
  userHasInteracted = true;
  ensureAudioContext();
  startMultiplayerFromSetup();
});
elements.answerInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  userHasInteracted = true;
  elements.answerForm.requestSubmit();
});
elements.passButton.addEventListener("click", passCurrentRound);
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
  (event) => {
    userHasInteracted = true;
    if (gameSession === "multi" && gameMode === "unscramble" && !roundLocked) {
      const playerIndex = multiplayer?.players.findIndex((player) => player.buzzButton?.code === event.code);
      if (playerIndex >= 0) {
        event.preventDefault();
        claimMultiplayerBuzz(playerIndex);
        return;
      }
    }
    if (event.key.toLocaleLowerCase("tr-TR") === "p" && !elements.answerInput.matches(":focus")) {
      event.preventDefault();
      passCurrentRound();
    }
  },
  { passive: false }
);

updateSoundControls();
setupSpeechRecognition();
loadWords();
