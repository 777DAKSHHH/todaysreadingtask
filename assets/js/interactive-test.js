// Premium IELTS Reading Interactive Testing Engine

document.addEventListener('DOMContentLoaded', function() {
  
  // --- State Variables ---
  let currentTestId = localStorage.getItem('ielts-selected-test') || 'cam6';
  let isUnlocked = localStorage.getItem('ielts-prep-unlocked') === 'true';
  let currentMode = 'practice'; // 'practice' or 'exam'
  let examTimer = null;
  let examTimeRemaining = 3600; // 60 minutes in seconds
  let examTimeSpent = 0;
  let testAnswers = {}; // Holds correct answer keys loaded from readingData

  // --- DOM Elements ---
  const authOverlay = document.getElementById('auth-overlay');
  const passwordInput = document.getElementById('password-input');
  const btnLogin = document.getElementById('btn-login');
  const loginError = document.getElementById('login-error');

  const panelsWrapper = document.getElementById('panels-wrapper');
  const toolbarTitle = document.getElementById('toolbar-test-title');
  const timerDisplay = document.getElementById('timer-display');
  const examControls = document.getElementById('exam-controls');
  const btnSubmitExam = document.getElementById('btn-submit-exam');
  const examResultsContainer = document.getElementById('exam-results-container');

  // --- 1. Password Verification ---
  function initSecurity() {
    if (isUnlocked) {
      if (authOverlay) authOverlay.remove();
      initTest();
    } else {
      if (authOverlay) {
        authOverlay.classList.remove('d-none');
        authOverlay.classList.add('lock-screen-overlay');
      }
    }
  }

  function handleLogin() {
    if (passwordInput && passwordInput.value === "VII I MMVI") {
      localStorage.setItem('ielts-prep-unlocked', 'true');
      isUnlocked = true;
      if (authOverlay) authOverlay.remove();
      initTest();
    } else {
      if (loginError) loginError.classList.remove('d-none');
    }
  }

  if (btnLogin) btnLogin.addEventListener('click', handleLogin);
  if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  }

  // --- 2. Initialize Selected Test ---
  function initTest() {
    // Show only the selected test content
    const allTests = document.querySelectorAll('.test-content');
    allTests.forEach(el => {
      if (el.id === `test-${currentTestId}`) {
        el.classList.remove('d-none');
      } else {
        el.classList.add('d-none');
      }
    });

    // Update Toolbar Title
    const testNames = {
      'cam6': 'Cambridge 6 • Reading Test 2',
      'ontrack': 'IELTS On Track • Reading Test 2',
      'cam16': 'Cambridge 16 • Reading Test 1'
    };
    if (toolbarTitle) toolbarTitle.textContent = testNames[currentTestId] || 'IELTS Practice';

    // Retrieve active answers from readingData (defined in reading-data.js)
    if (typeof readingData !== 'undefined') {
      testAnswers = readingData;
    }

    // Set initial preferences
    initPreferences();
    
    // Bind interaction event listeners
    bindInterfaceEvents();
    
    // Setup Mobile Navigation
    initMobileNav();
  }

  // --- 3. Preferences & Reading Toolbar ---
  function initPreferences() {
    // Reading Theme
    const savedReadingTheme = localStorage.getItem('ielts-reading-theme') || 'light';
    setReadingTheme(savedReadingTheme);

    const themeButtons = document.querySelectorAll('[data-reading-theme-btn]');
    themeButtons.forEach(btn => {
      if (btn.getAttribute('data-reading-theme-btn') === savedReadingTheme) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', function() {
        themeButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const theme = this.getAttribute('data-reading-theme-btn');
        setReadingTheme(theme);
      });
    });

    // Font Size
    const savedFontSize = localStorage.getItem('ielts-font-size') || 'md';
    setFontSize(savedFontSize);

    const fontSizeButtons = document.querySelectorAll('[data-font-size-btn]');
    fontSizeButtons.forEach(btn => {
      if (btn.getAttribute('data-font-size-btn') === savedFontSize) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', function() {
        fontSizeButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const size = this.getAttribute('data-font-size-btn');
        setFontSize(size);
      });
    });

    // Mode Toggle (Practice vs Exam)
    const modeButtons = document.querySelectorAll('[data-mode-btn]');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        modeButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        setMode(this.getAttribute('data-mode-btn'));
      });
    });
  }

  function setReadingTheme(theme) {
    document.documentElement.setAttribute('data-reading-theme', theme);
    localStorage.setItem('ielts-reading-theme', theme);
  }

  function setFontSize(size) {
    if (panelsWrapper) {
      panelsWrapper.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg');
      panelsWrapper.classList.add(`font-size-${size}`);
    }
    localStorage.setItem('ielts-font-size', size);
  }

  // --- 4. Practice vs Exam Mode Toggle ---
  function setMode(mode) {
    currentMode = mode;
    resetTestUI();

    if (mode === 'exam') {
      // Setup Exam Environment
      if (examControls) examControls.classList.remove('d-none');
      if (timerDisplay) timerDisplay.classList.remove('d-none');
      
      // Hide all answers & explanations
      document.querySelectorAll('.explanation-block').forEach(el => el.remove());
      
      // Hide immediate feedback action buttons
      document.querySelectorAll('.btn-check-q, .q-btn-toggle').forEach(el => el.classList.add('d-none'));

      // Start countdown
      startExamTimer();
    } else {
      // Setup Practice Environment
      if (examControls) examControls.classList.add('d-none');
      if (timerDisplay) timerDisplay.classList.add('d-none');
      if (examResultsContainer) examResultsContainer.innerHTML = '';
      
      // Stop timer
      stopExamTimer();

      // Show immediate feedback buttons
      document.querySelectorAll('.btn-check-q, .q-btn-toggle').forEach(el => el.classList.remove('d-none'));
    }
  }

  function resetTestUI() {
    // Reset all inputs
    document.querySelectorAll('.ielts-dropdown').forEach(select => {
      select.value = "";
      select.disabled = false;
      select.classList.remove('correct', 'incorrect');
    });

    document.querySelectorAll('.ielts-input-blank').forEach(input => {
      input.value = "";
      input.disabled = false;
      input.classList.remove('correct', 'incorrect');
    });

    document.querySelectorAll('.tfng-btn input').forEach(radio => {
      radio.checked = false;
      radio.disabled = false;
    });

    document.querySelectorAll('.interactive-q-item').forEach(item => {
      item.classList.remove('correct', 'incorrect');
      const feedback = item.querySelector('.explanation-block');
      if (feedback) feedback.remove();
    });
  }

  // --- 5. Exam Timer ---
  function startExamTimer() {
    stopExamTimer();
    examTimeRemaining = 3600;
    examTimeSpent = 0;
    updateTimerDisplay();

    examTimer = setInterval(() => {
      examTimeRemaining--;
      examTimeSpent++;
      updateTimerDisplay();

      if (examTimeRemaining <= 300) { // 5 minutes warning
        timerDisplay.classList.add('warning');
      }

      if (examTimeRemaining <= 0) {
        clearInterval(examTimer);
        alert('Time is up! Your IELTS exam is being submitted automatically.');
        submitExam();
      }
    }, 1000);
  }

  function stopExamTimer() {
    if (examTimer) {
      clearInterval(examTimer);
      examTimer = null;
    }
    if (timerDisplay) timerDisplay.classList.remove('warning');
  }

  function updateTimerDisplay() {
    if (!timerDisplay) return;
    const hours = Math.floor(examTimeRemaining / 3600);
    const minutes = Math.floor((examTimeRemaining % 3600) / 60);
    const seconds = examTimeRemaining % 60;
    
    const formatted = [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');

    timerDisplay.innerHTML = `<i class="bi bi-clock"></i> ${formatted}`;
  }

  // --- 6. Event Listeners & Interactive Input Handling ---
  function bindInterfaceEvents() {
    // 1. Text Highlighting listener on passage columns
    const passages = document.querySelectorAll('.panel-passage');
    passages.forEach(passage => {
      passage.addEventListener('mouseup', handleTextSelection);
    });

    // Close highlighter on clicking anywhere else
    document.addEventListener('mousedown', function(e) {
      const tooltip = document.getElementById('highlighter-tooltip');
      if (tooltip && !tooltip.contains(e.target)) {
        tooltip.remove();
      }
    });

    // 2. Click Handler for individual Question Checks (Practice Mode)
    document.addEventListener('click', function(e) {
      // Toggle button (number circles or check buttons)
      if (e.target.classList.contains('q-btn-toggle') || e.target.classList.contains('btn-check-q')) {
        const qId = e.target.getAttribute('data-id');
        if (currentMode === 'practice') {
          gradeIndividualQuestion(qId);
        }
      }
    });

    // 3. Submit Exam click handler
    if (btnSubmitExam) {
      btnSubmitExam.addEventListener('click', submitExam);
    }
  }

  // --- 7. Grading Logic ---
  function gradeIndividualQuestion(qId) {
    const parentItem = document.querySelector(`.interactive-q-item[data-q-id="${qId}"]`);
    if (!parentItem) return;

    // Remove existing feedback
    const oldFeedback = parentItem.querySelector('.explanation-block');
    if (oldFeedback) oldFeedback.remove();

    const isCorrect = verifyAnswer(qId);

    // Apply color class to card
    parentItem.classList.remove('correct', 'incorrect');
    parentItem.classList.add(isCorrect ? 'correct' : 'incorrect');

    // Toggle input styling
    highlightIndividualInputs(qId, isCorrect);

    // Create explanation block
    const explanationText = testAnswers[qId] ? testAnswers[qId].explanation : 'No explanation available.';
    const explanationDiv = document.createElement('div');
    explanationDiv.className = 'explanation-block mt-3 animate-fade-in';
    explanationDiv.innerHTML = `
      <div class="fw-bold mb-2 ${isCorrect ? 'text-success' : 'text-danger'}">
        <i class="bi ${isCorrect ? 'bi-check-circle' : 'bi-x-circle'}"></i> 
        ${isCorrect ? 'Correct!' : 'Incorrect'}
      </div>
      <div>${explanationText.replace(/\n/g, '<br>')}</div>
    `;
    parentItem.appendChild(explanationDiv);

    // Highlight passage reference anchor
    highlightPassageReference(qId);
  }

  const ieltsAnswerKeys = {
    "cam6": {
      "1": "ii", "2": "vii", "3": "iv", "4": "i", "5": "iii",
      "6": "FALSE", "7": "TRUE", "8": "NOT GIVEN", "9": "FALSE", "10": "TRUE",
      "11": "F", "12": "D", "13": "C",
      "14": "B", "15": "I", "16": "F", "17": "M", "18": "J", "19": "N", "20": "K", "21": "G", "22": "A",
      "23": "G", "24": "E", "25": "H", "26": "C",
      "27": "B", "28": "E", "29": "A", "30": "C", "31": "G",
      "32": "TRUE", "33": "FALSE", "34": "TRUE", "35": "FALSE", "36": "TRUE", "37": "TRUE", "38": "FALSE", "39": "TRUE", "40": "NOT GIVEN"
    },
    "ontrack": {
      "1": "D", "2": "A", "3": "C", "4": "D", "5": "D", "6": "A", "7": "B",
      "8": "YES", "9": "YES", "10": "NO", "11": "NOT GIVEN", "12": "NO", "13": "NO",
      "14": "ix", "15": "ii", "16": "iv", "17": "v", "18": "i",
      "19": "tax on malt", "20": "Tea", "21": "waterborne diseases", "22": "boiled",
      "23": "C", "24": "D", "25": "B",
      "26": "Exceeds", "27": "Current", "28": "Employers", "29": "Financial", "30": "Activities", "31": "Candidates", "32": "Environment",
      "33": "NO", "34": "NO", "35": "NO", "36": "YES", "37": "NOT GIVEN",
      "38": "D", "39": "F", "40": "E"
    },
    "cam16": {
      "1": "FALSE", "2": "FALSE", "3": "NOT GIVEN", "4": "TRUE", "5": "TRUE", "6": "FALSE", "7": "TRUE",
      "8": "violent", "9": "tool", "10": "meat", "11": "photographer", "12": "game", "13": "frustration",
      "14": "iv", "15": "vii", "16": "ii", "17": "v", "18": "i", "19": "viii", "20": "vi",
      "21": "city", "22": "priests", "23": "trench", "24": "location", "25": "B", "26": "D",
      "27": "B", "28": "D", "29": "C", "30": "D",
      "31": "G", "32": "E", "33": "C", "34": "F",
      "35": "B", "36": "A", "37": "C", "38": "A", "39": "B", "40": "C"
    }
  };

  function verifyAnswer(qId) {
    const lookupKey = qId.replace('ot-', '').replace('c16-', '');
    const activeTestAnswers = ieltsAnswerKeys[currentTestId];
    if (!activeTestAnswers) return false;
    const expected = activeTestAnswers[lookupKey];
    if (!expected) return false;

    let userVal = getUserInputVal(qId);
    if (!userVal) return false;

    if (Array.isArray(expected)) {
      return expected.some(ans => cleanString(ans) === cleanString(userVal));
    } else {
      return cleanString(expected) === cleanString(userVal);
    }
  }

  function cleanString(str) {
    return str.toString().trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function getUserInputVal(qId) {
    // 1. Text fill-in-the-blank input
    const textInput = document.querySelector(`.ielts-input-blank[data-id="${qId}"]`);
    if (textInput) return textInput.value;

    // 2. Select dropdown
    const select = document.querySelector(`.ielts-dropdown[data-id="${qId}"]`);
    if (select) return select.value;

    // 3. Radio Buttons (True / False / Not Given or MCQs)
    const checkedRadio = document.querySelector(`input[name="q-${qId}"]:checked`);
    if (checkedRadio) return checkedRadio.value;

    return null;
  }

  function highlightIndividualInputs(qId, isCorrect) {
    const textInput = document.querySelector(`.ielts-input-blank[data-id="${qId}"]`);
    if (textInput) {
      textInput.classList.remove('correct', 'incorrect');
      textInput.classList.add(isCorrect ? 'correct' : 'incorrect');
    }

    const select = document.querySelector(`.ielts-dropdown[data-id="${qId}"]`);
    if (select) {
      select.classList.remove('correct', 'incorrect');
      select.classList.add(isCorrect ? 'correct' : 'incorrect');
    }
  }

  function highlightPassageReference(qId) {
    // Remove previous reference highlights
    document.querySelectorAll('.passage-highlight').forEach(el => el.classList.remove('passage-highlight'));

    // Try multiple possible element IDs matching different test formats:
    // e.g. "q1-ref", "qot-1-ref", "qc16-1-ref", "qot-ot-1-ref", "q-c16-1-ref"
    const lookupId = qId.toString().trim();
    const refElement = 
      document.getElementById(`q${lookupId}-ref`) || 
      document.getElementById(`q-${lookupId}-ref`) ||
      document.getElementById(`qot-${lookupId}-ref`) ||
      document.getElementById(`qc16-${lookupId}-ref`) ||
      document.getElementById(`q-${lookupId.replace('c16-', 'c16-')}-ref`) ||
      document.getElementById(`${lookupId}-ref`);
    
    if (refElement) {
      refElement.classList.add('passage-highlight');
      refElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }

  // --- 8. Submit Exam & Band Score Calculation ---
  function submitExam() {
    stopExamTimer();

    let correctCount = 0;
    const totalQuestions = 40;

    // Disable all inputs
    document.querySelectorAll('.ielts-input-blank, .ielts-dropdown').forEach(el => el.disabled = true);
    document.querySelectorAll('.tfng-btn input').forEach(el => el.disabled = true);

    // Grade all questions
    for (let i = 1; i <= totalQuestions; i++) {
      // Support prefix for different test questions
      const qKey = currentTestId === 'ontrack' ? `ot-${i}` : (currentTestId === 'cam16' ? `c16-${i}` : i.toString());
      const isCorrect = verifyAnswer(qKey);
      if (isCorrect) correctCount++;

      // Highlight input boxes
      highlightIndividualInputs(qKey, isCorrect);

      // Add small feedback classes to questions card container
      const parentItem = document.querySelector(`.interactive-q-item[data-q-id="${qKey}"]`);
      if (parentItem) {
        parentItem.classList.remove('correct', 'incorrect');
        parentItem.classList.add(isCorrect ? 'correct' : 'incorrect');
      }
    }

    const bandScore = calculateIELTSBand(correctCount);

    // Save attempt to localStorage
    const attempts = JSON.parse(localStorage.getItem('ielts-attempts') || '[]');
    attempts.push({
      testId: currentTestId,
      mode: 'exam',
      score: correctCount,
      band: bandScore,
      date: new Date().toISOString(),
      timeSpentSeconds: examTimeSpent
    });
    localStorage.setItem('ielts-attempts', JSON.stringify(attempts));

    // Show Results Card at top of questions pane
    const activeResultsContainer = document.getElementById(
      currentTestId === 'ontrack' ? 'ot-exam-results-container' : 
      (currentTestId === 'cam16' ? 'c16-exam-results-container' : 'exam-results-container')
    );

    if (activeResultsContainer) {
      activeResultsContainer.innerHTML = `
        <div class="exam-results-card animate-fade-in">
          <div class="results-circle">${bandScore}</div>
          <h4 class="mb-2">Exam Completed!</h4>
          <p class="text-secondary mb-3">You got <strong>${correctCount} out of 40</strong> questions correct, achieving an estimated IELTS Band Score of <strong>${bandScore}</strong>.</p>
          <div class="d-flex gap-2 justify-content-center">
            <a href="index.html" class="btn btn-primary btn-sm">Return to Dashboard</a>
            <button onclick="window.location.reload()" class="btn btn-outline-secondary btn-sm">Practice Answers Mode</button>
          </div>
        </div>
      `;
      activeResultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Hide float controls
    if (examControls) examControls.classList.add('d-none');
  }

  function calculateIELTSBand(correct) {
    if (correct >= 39) return 9.0;
    if (correct >= 37) return 8.5;
    if (correct >= 35) return 8.0;
    if (correct >= 32) return 7.5;
    if (correct >= 30) return 7.0;
    if (correct >= 27) return 6.5;
    if (correct >= 23) return 6.0;
    if (correct >= 19) return 5.5;
    if (correct >= 15) return 5.0;
    if (correct >= 13) return 4.5;
    if (correct >= 10) return 4.0;
    if (correct >= 8) return 3.5;
    if (correct >= 6) return 3.0;
    if (correct >= 4) return 2.5;
    return 1.0;
  }

  // --- 9. Highlighter Tooltip ---
  function handleTextSelection(e) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      showHighlighterTooltip(rect.left + window.scrollX, rect.top + window.scrollY - 45);
    }
  }

  function showHighlighterTooltip(x, y) {
    // Remove existing tooltip first
    const oldTooltip = document.getElementById('highlighter-tooltip');
    if (oldTooltip) oldTooltip.remove();

    const tooltip = document.createElement('div');
    tooltip.id = 'highlighter-tooltip';
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    
    tooltip.innerHTML = `
      <button class="tooltip-color-btn highlight-yellow" data-color="yellow" title="Highlight Yellow"></button>
      <button class="tooltip-color-btn highlight-green" data-color="green" title="Highlight Green"></button>
      <button class="tooltip-color-btn highlight-pink" data-color="pink" title="Highlight Pink"></button>
      <button class="btn btn-sm btn-light py-0 px-2 ms-1 border" style="font-size: 0.75rem; border-radius: 20px;" data-color="clear">
        <i class="bi bi-eraser-fill text-secondary"></i>
      </button>
    `;

    document.body.appendChild(tooltip);

    // Bind color click actions
    tooltip.querySelectorAll('[data-color]').forEach(btn => {
      btn.addEventListener('mousedown', function(e) {
        e.preventDefault(); // Prevents selection clearing on click
        const color = this.getAttribute('data-color');
        applyHighlight(color);
      });
    });
  }

  function applyHighlight(colorClass) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);

    if (colorClass === 'clear') {
      let container = range.commonAncestorContainer;
      if (container.nodeType === 3) container = container.parentNode;
      
      if (container.classList && (container.classList.contains('highlight-yellow') || container.classList.contains('highlight-green') || container.classList.contains('highlight-pink'))) {
        const parent = container.parentNode;
        while (container.firstChild) {
          parent.insertBefore(container.firstChild, container);
        }
        parent.removeChild(container);
      }
      
      const tooltip = document.getElementById('highlighter-tooltip');
      if (tooltip) tooltip.remove();
      selection.removeAllRanges();
      return;
    }

    const span = document.createElement('span');
    span.className = `highlight-${colorClass}`;
    
    try {
      range.surroundContents(span);
    } catch (e) {
      console.warn("Highlighter intersects block boundaries. Attempting sub-node mapping...", e);
    }

    const tooltip = document.getElementById('highlighter-tooltip');
    if (tooltip) tooltip.remove();
    selection.removeAllRanges();
  }

  // --- 10. Mobile Panel Navigation Toggle ---
  function initMobileNav() {
    const btnPassage = document.getElementById('mobile-btn-passage');
    const btnQuestions = document.getElementById('mobile-btn-questions');

    const passagePanel = document.querySelector(`.test-content:not(.d-none) .panel-passage`);
    const questionsPanel = document.querySelector(`.test-content:not(.d-none) .panel-questions`);

    if (!btnPassage || !btnQuestions) return;

    // Initial state: Passage active on mobile
    if (passagePanel) passagePanel.classList.add('active-mobile-panel');

    btnPassage.addEventListener('click', () => {
      btnPassage.classList.add('active');
      btnQuestions.classList.remove('active');
      
      const activePassage = document.querySelector(`.test-content:not(.d-none) .panel-passage`);
      const activeQuestions = document.querySelector(`.test-content:not(.d-none) .panel-questions`);
      
      if (activePassage) activePassage.classList.add('active-mobile-panel');
      if (activeQuestions) activeQuestions.classList.remove('active-mobile-panel');
    });

    btnQuestions.addEventListener('click', () => {
      btnQuestions.classList.add('active');
      btnPassage.classList.remove('active');
      
      const activePassage = document.querySelector(`.test-content:not(.d-none) .panel-passage`);
      const activeQuestions = document.querySelector(`.test-content:not(.d-none) .panel-questions`);
      
      if (activePassage) activePassage.classList.remove('active-mobile-panel');
      if (activeQuestions) activeQuestions.classList.add('active-mobile-panel');
    });
  }

  // Initialize Security Screen Check
  initSecurity();
});
