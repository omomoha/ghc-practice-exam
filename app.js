/* global QUESTION_BANK */
const setupSection = document.getElementById("setup");
const examSection = document.getElementById("exam");
const resultsSection = document.getElementById("results");

const examLengthInputs = document.querySelectorAll(
  "input[name='exam-length']"
);
const startButton = document.getElementById("start-btn");
const shuffleToggle = document.getElementById("shuffle");
const progressText = document.getElementById("progress-text");
const progressBar = document.getElementById("progress-bar");
const questionCount = document.getElementById("question-count");
const scorePreview = document.getElementById("score-preview");
const totalTimer = document.getElementById("total-timer");
const questionTimer = document.getElementById("question-timer");
const questionNav = document.getElementById("question-nav");

const questionText = document.getElementById("question-text");
const choicesContainer = document.getElementById("choices");
const feedback = document.getElementById("feedback");
const prevButton = document.getElementById("prev-btn");
const checkButton = document.getElementById("check-btn");
const nextButton = document.getElementById("next-btn");
const finishButton = document.getElementById("finish-btn");

const scoreSummary = document.getElementById("score-summary");
const reviewContainer = document.getElementById("review");
const restartButton = document.getElementById("restart-btn");
const attemptCount = document.getElementById("attempt-count");
const attemptCountWidget = document.getElementById("attempt-count-widget");
const questionBankCount = document.getElementById("question-bank-count");
const recommendedTime = document.getElementById("recommended-time");
const modeInputs = document.querySelectorAll("input[name='mode']");

let mode = "exam";
let examQuestions = [];
let currentIndex = 0;
let answers = [];
let checked = [];
let timerId = null;
let examStart = null;
let questionStart = null;
let totalSeconds = 0;
let perQuestionSeconds = 0;
let lastRenderedIndex = null;
let examCompleted = false;

const ATTEMPT_COUNT_KEY = "practiceExamAttempts";

const getAttemptCount = () =>
  Number.parseInt(localStorage.getItem(ATTEMPT_COUNT_KEY) || "0", 10);

const renderAttemptCount = () => {
  const count = getAttemptCount();
  if (attemptCount) {
    attemptCount.textContent = count;
  }
  if (attemptCountWidget) {
    attemptCountWidget.textContent = count;
  }
};

const incrementAttemptCount = () => {
  const nextCount = getAttemptCount() + 1;
  localStorage.setItem(ATTEMPT_COUNT_KEY, String(nextCount));
  renderAttemptCount();
};

const durationMap = {
  50: 40 * 60,
  100: 60 * 60,
  150: 90 * 60,
  200: 110 * 60,
};

const getMode = () =>
  document.querySelector("input[name='mode']:checked").value;

const getSelectedLength = () => {
  const checked = document.querySelector("input[name='exam-length']:checked");
  return checked ? Number(checked.value) : 50;
};

const shuffleArray = (items) => {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const shuffleChoices = (question) => {
  const indexedChoices = question.choices.map((choice, index) => ({
    choice,
    index,
  }));
  const shuffled = shuffleArray(indexedChoices);
  const newAnswerIndex = shuffled.findIndex(
    (item) => item.index === question.answerIndex
  );
  return {
    ...question,
    choices: shuffled.map((item) => item.choice),
    answerIndex: newAnswerIndex,
  };
};

const renderQuestionBankCount = () => {
  if (!questionBankCount) {
    return;
  }
  const selectedLength = getSelectedLength();
  questionBankCount.textContent = Number.isNaN(selectedLength)
    ? QUESTION_BANK.length
    : Math.min(selectedLength, QUESTION_BANK.length);
};

const renderRecommendedTime = () => {
  if (!recommendedTime) {
    return;
  }
  const selectedLength = getSelectedLength();
  const seconds = durationMap[selectedLength];
  const minutes = seconds ? Math.round(seconds / 60) : 0;
  recommendedTime.textContent = minutes ? `${minutes} min` : "--";
};

const startExam = () => {
  mode = getMode();
  const length = getSelectedLength();
  const baseQuestions = shuffleToggle.checked
    ? shuffleArray(QUESTION_BANK)
    : [...QUESTION_BANK];

  const randomizedQuestions = baseQuestions.map((question) =>
    shuffleChoices(question)
  );

  totalSeconds = durationMap[length] || 90 * 60;
  perQuestionSeconds = totalSeconds / length;

  examQuestions = randomizedQuestions.slice(0, length);
  answers = Array(examQuestions.length).fill(null);
  checked = Array(examQuestions.length).fill(false);
  currentIndex = 0;
  examStart = Date.now();
  questionStart = Date.now();
  lastRenderedIndex = null;
  examCompleted = false;

  setupSection.classList.add("is-hidden");
  resultsSection.classList.add("is-hidden");
  examSection.classList.remove("is-hidden");
  startTimer();
  renderQuestionNav();
  renderQuestion();
};

const renderQuestion = () => {
  const current = examQuestions[currentIndex];
  if (!current) {
    return;
  }

  progressText.textContent = `Question ${currentIndex + 1} of ${
    examQuestions.length
  }`;
  progressBar.style.width = `${
    ((currentIndex + 1) / examQuestions.length) * 100
  }%`;
  questionCount.textContent = `Question ${currentIndex + 1} of ${
    examQuestions.length
  }`;
  scorePreview.textContent =
    mode === "study"
      ? `Score so far: ${calculateScore()} / ${examQuestions.length}`
      : "";

  questionText.textContent = current.question;
  choicesContainer.innerHTML = "";
  feedback.innerHTML = "";

  current.choices.forEach((choice, index) => {
    const label = document.createElement("label");
    label.className = "choice";
    label.innerHTML = `
      <input type="radio" name="choice" value="${index}">
      <span>${choice}</span>
    `;

    const input = label.querySelector("input");
    input.checked = answers[currentIndex] === index;
    if (input.checked) {
      label.classList.add("is-selected");
    }

    input.addEventListener("change", () => handleAnswer(index));
    choicesContainer.appendChild(label);
  });

  prevButton.disabled = currentIndex === 0;
  const isLast = currentIndex === examQuestions.length - 1;
  nextButton.classList.toggle("is-hidden", isLast);
  finishButton.classList.toggle("is-hidden", !isLast);
  checkButton.classList.add("is-hidden");

  if (lastRenderedIndex !== currentIndex) {
    questionStart = Date.now();
    lastRenderedIndex = currentIndex;
  }

  if (mode === "study" && checked[currentIndex]) {
    showPracticeFeedback();
  } else {
    feedback.innerHTML = "";
  }
  renderQuestionNav();
};

const handleAnswer = (choiceIndex) => {
  answers[currentIndex] = choiceIndex;
  if (mode === "study") {
    checked[currentIndex] = true;
  }
  renderQuestion();
};

const showPracticeFeedback = () => {
  const current = examQuestions[currentIndex];
  const selected = answers[currentIndex];
  if (selected === null) {
    return;
  }

  const choiceLabels = choicesContainer.querySelectorAll(".choice");
  choiceLabels.forEach((label, index) => {
    label.classList.remove("is-selected", "is-correct", "is-wrong");
    if (index === selected) {
      label.classList.add("is-selected");
    }
    if (index === current.answerIndex) {
      label.classList.add("is-correct");
    }
    if (index === selected && selected !== current.answerIndex) {
      label.classList.add("is-wrong");
    }
  });

  const correctText =
    selected === current.answerIndex ? "Correct!" : "Not quite.";
  const statusClass = selected === current.answerIndex ? "correct" : "wrong";

  feedback.innerHTML = `
    <p class="${statusClass}">${correctText}</p>
    <p>${current.explanation}</p>
  `;
};

const calculateScore = () =>
  answers.filter(
    (answer, index) => answer === examQuestions[index].answerIndex
  ).length;

const formatHMS = (total) => {
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;
};

const formatMS = (total) => {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
};

const startTimer = () => {
  if (timerId) {
    clearInterval(timerId);
  }
  const tick = () => {
    const elapsed = Math.floor((Date.now() - examStart) / 1000);
    const totalRemaining = Math.max(0, totalSeconds - elapsed);

    const questionElapsed = Math.floor((Date.now() - questionStart) / 1000);
    const questionBudget = Math.ceil(perQuestionSeconds);
    const questionRemaining = Math.max(0, questionBudget - questionElapsed);

    totalTimer.textContent = formatHMS(totalRemaining);
    questionTimer.textContent = formatMS(
      Math.min(questionRemaining, totalRemaining)
    );

    if (totalRemaining === 0) {
      clearInterval(timerId);
      timerId = null;
      finishExam();
    }
  };

  tick();
  timerId = setInterval(tick, 1000);
};

const renderQuestionNav = () => {
  if (!questionNav) {
    return;
  }
  questionNav.innerHTML = "";
  examQuestions.forEach((_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nav-item";
    button.textContent = index + 1;
    if (index === currentIndex) {
      button.classList.add("is-current");
    } else if (answers[index] !== null) {
      button.classList.add("is-answered");
    }
    button.addEventListener("click", () => {
      currentIndex = index;
      renderQuestion();
    });
    questionNav.appendChild(button);
  });
};

const updateOptionSelection = () => {
  document.querySelectorAll(".option").forEach((label) => {
    const input = label.querySelector("input");
    label.classList.toggle("is-selected", Boolean(input && input.checked));
  });
};

const updateModeSelection = () => {
  document.querySelectorAll(".mode-card").forEach((label) => {
    const input = label.querySelector("input");
    label.classList.toggle("is-selected", Boolean(input && input.checked));
  });
};

const goNext = () => {
  if (currentIndex < examQuestions.length - 1) {
    currentIndex += 1;
    renderQuestion();
  }
};

const goPrev = () => {
  if (currentIndex > 0) {
    currentIndex -= 1;
    renderQuestion();
  }
};

const checkAnswer = () => {
  if (answers[currentIndex] === null) {
    feedback.innerHTML =
      "<p class=\"wrong\">Select an answer to check.</p>";
    return;
  }
  checked[currentIndex] = true;
  showPracticeFeedback();
};

const finishExam = () => {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  if (!examCompleted) {
    incrementAttemptCount();
    examCompleted = true;
  }
  examSection.classList.add("is-hidden");
  resultsSection.classList.remove("is-hidden");

  const score = calculateScore();
  scoreSummary.textContent = `Your score: ${score} / ${examQuestions.length}`;

  reviewContainer.innerHTML = "";
  examQuestions.forEach((question, index) => {
    const userAnswerIndex = answers[index];
    const userAnswer =
      userAnswerIndex === null
        ? "No answer"
        : question.choices[userAnswerIndex];
    const correctAnswer = question.choices[question.answerIndex];
    const isCorrect = userAnswerIndex === question.answerIndex;

    const item = document.createElement("div");
    item.className = "review__item";
    item.innerHTML = `
      <h3>Question ${index + 1}</h3>
      <p><strong>Prompt:</strong> ${question.question}</p>
      <p><strong>Your answer:</strong> ${userAnswer}</p>
      <p><strong>Correct answer:</strong> ${correctAnswer}</p>
      <p><strong>Result:</strong> ${isCorrect ? "Correct" : "Incorrect"}</p>
      <p><strong>Why:</strong> ${question.explanation}</p>
    `;
    reviewContainer.appendChild(item);
  });
};

const restartExam = () => {
  setupSection.classList.remove("is-hidden");
  resultsSection.classList.add("is-hidden");
  examSection.classList.add("is-hidden");
  answers = [];
  checked = [];
  examQuestions = [];
  currentIndex = 0;
  totalSeconds = 0;
  perQuestionSeconds = 0;
  examStart = null;
  questionStart = null;
  totalTimer.textContent = "--:--:--";
  questionTimer.textContent = "--:--";
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
};

startButton.addEventListener("click", startExam);
examLengthInputs.forEach((input) => {
  input.addEventListener("change", renderQuestionBankCount);
  input.addEventListener("change", renderRecommendedTime);
  input.addEventListener("change", updateOptionSelection);
});
modeInputs.forEach((input) => {
  input.addEventListener("change", updateModeSelection);
});
nextButton.addEventListener("click", goNext);
prevButton.addEventListener("click", goPrev);
checkButton.addEventListener("click", checkAnswer);
finishButton.addEventListener("click", finishExam);
restartButton.addEventListener("click", restartExam);

renderAttemptCount();
renderQuestionBankCount();
renderRecommendedTime();
updateOptionSelection();
updateModeSelection();
