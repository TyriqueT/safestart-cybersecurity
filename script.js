
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEYS = {
    checklist: "safestart-checklist-v1",
    quizBest: "safestart-best-score-v1",
    labBest: "safestart-lab-best-score-v1",
    achievements: "safestart-achievements-v1"
  };

  // Safely read and save progress in this browser.
  function readStorage(key, fallback) {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? fallback : JSON.parse(saved);
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // The dashboard remains usable if storage is unavailable.
    }
  }

  function getElement(id) {
    return document.getElementById(id);
  }

  function showFeedback(element, message, type) {
    if (!element) return;

    element.textContent = message;
    element.classList.remove("success", "error");

    if (type) {
      element.classList.add(type);
    }

    element.hidden = false;
  }

  function hideElement(element) {
    if (element) element.hidden = true;
  }

  // ----------------------------------------
  // 1. SECURITY CHECKLIST
  // ----------------------------------------

  const checklistItems = Array.from(
    document.querySelectorAll(".security-check")
  );

  const checklistCount = getElement("checklist-count");
  const checklistPercentage = getElement("checklist-percentage");
  const checklistProgress = getElement("checklist-progress");

  const savedChecklist = readStorage(
    STORAGE_KEYS.checklist,
    {}
  );

  checklistItems.forEach((checkbox) => {
    checkbox.checked = Boolean(savedChecklist[checkbox.value]);

    checkbox.addEventListener("change", () => {
      const current = readStorage(STORAGE_KEYS.checklist, {});

      current[checkbox.value] = checkbox.checked;

      writeStorage(STORAGE_KEYS.checklist, current);
      updateChecklist();
      updateAchievements();
    });
  });

  function updateChecklist() {
    const completed = checklistItems.filter(
      (checkbox) => checkbox.checked
    ).length;

    const total = checklistItems.length;

    const percentage = total === 0
      ? 0
      : Math.round((completed / total) * 100);

    if (checklistCount) {
      checklistCount.textContent = `${completed} / ${total}`;
    }

    if (checklistPercentage) {
      checklistPercentage.textContent = `${percentage}%`;
    }

    if (checklistProgress) {
      checklistProgress.style.width = `${percentage}%`;
      checklistProgress.setAttribute(
        "aria-valuenow",
        String(percentage)
      );
    }
  }

  // ----------------------------------------
  // 2. KNOWLEDGE QUIZ
  // ----------------------------------------

  const quizForm = getElement("quiz-form");
  const quizFeedback = getElement("quiz-feedback");
  const retryQuizButton = getElement("retry-quiz");
  const bestScoreElement = getElement("best-score");

  let quizBestScore = Number(
    readStorage(STORAGE_KEYS.quizBest, 0)
  );

  function updateBestQuizScore() {
    if (bestScoreElement) {
      bestScoreElement.textContent = `${quizBestScore}%`;
    }
  }

  if (quizForm) {
    quizForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const selected = quizForm.querySelector(
        'input[name="answer"]:checked'
      );

      if (!selected) {
        showFeedback(
          quizFeedback,
          "Choose an answer before checking your response.",
          "error"
        );
        return;
      }

      // The correct answer in this quiz is option B.
      const isCorrect = selected.value === "b";
      const score = isCorrect ? 100 : 0;

      if (score > quizBestScore) {
        quizBestScore = score;

        writeStorage(
          STORAGE_KEYS.quizBest,
          quizBestScore
        );

        updateBestQuizScore();
      }

      if (isCorrect) {
        showFeedback(
          quizFeedback,
          "Correct! Multi-factor authentication (MFA) adds another layer of protection beyond your password.",
          "success"
        );
      } else {
        showFeedback(
          quizFeedback,
          "Not quite. The best answer is multi-factor authentication (MFA), which adds another verification step.",
          "error"
        );
      }

      if (retryQuizButton) {
        retryQuizButton.hidden = false;
      }

      updateAchievements();
    });
  }

  if (retryQuizButton) {
    retryQuizButton.addEventListener("click", () => {
      if (quizForm) quizForm.reset();

      hideElement(quizFeedback);
      retryQuizButton.hidden = true;
    });
  }

  // ----------------------------------------
  // 3. INTERACTIVE PHISHING LAB
  // ----------------------------------------

  const scenarios = [
    {
      sender: "Account Security Team <security-alert@example.invalid>",
      subject: "URGENT: Your account will be suspended",
      message:
        "Your account will be disabled in 30 minutes. Use the link provided in this message to verify your password immediately.",
      clue:
        "Warning signs: extreme urgency, a request to verify your password, and a link you did not independently request.",
      answer: "suspicious",
      explanation:
        "Correct. Unexpected urgency and requests for credentials are strong phishing warning signs. Visit the official website yourself instead of using a link in the message."
    },
    {
      sender: "Package Delivery <delivery-notice@example.invalid>",
      subject: "Delivery fee required",
      message:
        "Your package is waiting. Pay a small unexpected fee using the link in this message to release it.",
      clue:
        "Warning signs: an unexpected fee and a payment link you have not verified.",
      answer: "suspicious",
      explanation:
        "Correct. Unexpected delivery fees can be used in phishing scams. Check your shipment through the delivery company's official website or app."
    },
    {
      sender: "Campus Facilities <facilities@example.invalid>",
      subject: "Scheduled building maintenance notice",
      message:
        "Facilities has announced a planned maintenance window. Check the campus notice board or official portal for the confirmed schedule.",
      clue:
        "This message does not demand credentials or payment. Verify the announcement through a known official campus channel.",
      answer: "legitimate",
      explanation:
        "Correct. This example directs readers to an official channel without demanding payment or credentials. Always independently verify the sender and announcement."
    }
  ];

  const labProgress = getElement("lab-progress");
  const scenarioSender = getElement("scenario-sender");
  const scenarioSubject = getElement("scenario-subject");
  const scenarioMessage = getElement("scenario-message");
  const scenarioClue = getElement("scenario-clue");
  const labOptions = getElement("lab-options");
  const submitLabButton = getElement("submit-lab-answer");
  const labFeedback = getElement("lab-feedback");
  const nextScenarioButton = getElement("next-scenario");
  const labResults = getElement("lab-results");
  const labFinalScore = getElement("lab-final-score");
  const restartLabButton = getElement("restart-lab");

  let scenarioIndex = 0;
  let labScore = 0;
  let scenarioAnswered = false;

  let labBestScore = Number(
    readStorage(STORAGE_KEYS.labBest, 0)
  );

  function getLabAnswer() {
    return document.querySelector(
      'input[name="lab-answer"]:checked'
    );
  }

  function renderScenario() {
    const scenario = scenarios[scenarioIndex];

    if (!scenario) return;

    if (labProgress) {
      labProgress.textContent =
        `Scenario ${scenarioIndex + 1} of ${scenarios.length}`;
    }

    if (scenarioSender) {
      scenarioSender.textContent = scenario.sender;
    }

    if (scenarioSubject) {
      scenarioSubject.textContent = scenario.subject;
    }

    if (scenarioMessage) {
      scenarioMessage.textContent = scenario.message;
    }

    if (scenarioClue) {
      scenarioClue.textContent = scenario.clue;
    }

    if (labOptions) {
      labOptions
        .querySelectorAll('input[name="lab-answer"]')
        .forEach((input) => {
          input.checked = false;
          input.disabled = false;
        });
    }

    scenarioAnswered = false;

    if (submitLabButton) {
      submitLabButton.hidden = false;
      submitLabButton.disabled = false;
    }

    hideElement(labFeedback);
    hideElement(nextScenarioButton);
    hideElement(labResults);
  }

  function finishLab() {
    const percentage = Math.round(
      (labScore / scenarios.length) * 100
    );

    if (percentage > labBestScore) {
      labBestScore = percentage;

      writeStorage(
        STORAGE_KEYS.labBest,
        labBestScore
      );
    }

    if (labFinalScore) {
      labFinalScore.textContent =
        `${labScore} / ${scenarios.length} (${percentage}%)`;
    }

    hideElement(submitLabButton);
    hideElement(nextScenarioButton);

    if (labResults) {
      labResults.hidden = false;
    }

    updateAchievements();
  }

  if (submitLabButton) {
    submitLabButton.addEventListener("click", () => {
      if (scenarioAnswered) return;

      const selected = getLabAnswer();

      if (!selected) {
        showFeedback(
          labFeedback,
          "Choose whether the message is suspicious or legitimate first.",
          "error"
        );
        return;
      }

      const scenario = scenarios[scenarioIndex];
      scenarioAnswered = true;

      if (selected.value === scenario.answer) {
        labScore += 1;

        showFeedback(
          labFeedback,
          scenario.explanation,
          "success"
        );
      } else {
        const correctLabel =
          scenario.answer === "suspicious"
            ? "Suspicious"
            : "Legitimate";

        showFeedback(
          labFeedback,
          `Not quite. The correct classification is "${correctLabel}." ${scenario.explanation}`,
          "error"
        );
      }

      if (labOptions) {
        labOptions
          .querySelectorAll('input[name="lab-answer"]')
          .forEach((input) => {
            input.disabled = true;
          });
      }

      submitLabButton.hidden = true;

      if (nextScenarioButton) {
        nextScenarioButton.textContent =
          scenarioIndex < scenarios.length - 1
            ? "Next scenario"
            : "View results";

        nextScenarioButton.hidden = false;
      }
    });
  }

  if (nextScenarioButton) {
    nextScenarioButton.addEventListener("click", () => {
      if (!scenarioAnswered) return;

      if (scenarioIndex < scenarios.length - 1) {
        scenarioIndex += 1;
        renderScenario();
      } else {
        finishLab();
      }
    });
  }

  if (restartLabButton) {
    restartLabButton.addEventListener("click", () => {
      scenarioIndex = 0;
      labScore = 0;
      renderScenario();
    });
  }

  // ----------------------------------------
  // 4. ACHIEVEMENTS
  // ----------------------------------------

  const badgeCount = getElement("badge-count");

  const achievements = [
    {
      card: "badge-security",
      status: "badge-security-status",
      isUnlocked: () =>
        checklistItems.length > 0 &&
        checklistItems.every((checkbox) => checkbox.checked)
    },
    {
      card: "badge-phishing",
      status: "badge-phishing-status",
      isUnlocked: () => labBestScore === 100
    },
    {
      card: "badge-learner",
      status: "badge-learner-status",
      isUnlocked: () => quizBestScore === 100
    }
  ];

  function updateAchievements() {
    let unlockedCount = 0;
    const unlockedState = {};

    achievements.forEach((achievement) => {
      const unlocked = achievement.isUnlocked();

      unlockedState[achievement.card] = unlocked;

      const card = getElement(achievement.card);
      const status = getElement(achievement.status);

      if (card) {
        card.classList.toggle("unlocked", unlocked);
      }

      if (status) {
        status.textContent = unlocked ? "Unlocked" : "Locked";
      }

      if (unlocked) {
        unlockedCount += 1;
      }
    });

    if (badgeCount) {
      badgeCount.textContent = String(unlockedCount);
    }

    writeStorage(
      STORAGE_KEYS.achievements,
      unlockedState
    );
  }

  // ----------------------------------------
  // 5. INITIALIZE THE DASHBOARD
  // ----------------------------------------

  updateChecklist();
  updateBestQuizScore();
  renderScenario();
  updateAchievements();
});
