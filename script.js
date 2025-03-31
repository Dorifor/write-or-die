const area = document.querySelector('textarea');
const blocker = document.querySelector('#blocker');
const killTimerLabel = document.querySelector('#kill-timer');
const objectiveTimerLabel = document.querySelector('#objective-timer');
const objectiveCharLabel = document.querySelector('#objective-char-count');
const objectiveWordLabel = document.querySelector('#objective-word-count');
const objectiveContainer = document.querySelector('#objective');
const header = document.querySelector('header');

// settings
let s = {
    gameMode: 'time', // 'time', 'word' or 'char'
    isForwardOnly: true,
    killTime: 5,
    killTimeStartOffset: 1,
    focusTime: 30, // gameMode == 'time'
    charCountObjective: 50, // gameMode == 'char'
    wordCountObjective: 8, // gameMode == 'word'
};

const killTimer = {
    minutes: 0,
    seconds: 5
};

const objectiveTimer = {
    minutes: 10,
    seconds: 0
}

let session = {
    currentText: '',
    running: false,
    lastInputTime: Date.now(),
    charCount: 0,
    wordCount: 0,
    lastChar: '',
    objectiveReached: false
};

document.addEventListener('keydown', () => area.focus());
document.addEventListener('contextmenu', e => e.preventDefault())

blocker.addEventListener('click', () => area.focus());

area.addEventListener('input', onInput);
area.addEventListener('keydown', blockUserActions);

function blockUserActions(e) {
    const isCTRLAction = e.ctrlKey && 'cvxspwuaz'.indexOf(e.key) !== -1;
    const isNavigation = ['arrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp'].includes(e.key);
    if (isCTRLAction || (s.isForwardOnly && isNavigation)) {
        e.preventDefault();
    }
}

function applySettings() {
    header.classList.remove('char');
    header.classList.remove('time');
    header.classList.remove('word');
    header.classList.add(s.gameMode);

    resetKillTimer();
    resetObjectiveTimer();

    updateTimerLabel(objectiveTimerLabel, objectiveTimer);
    updateTimerLabel(killTimerLabel, killTimer);
    objectiveCharLabel.textContent = `${session.charCount}/${s.charCountObjective}`;
    objectiveWordLabel.textContent = `${session.wordCount}/${s.wordCountObjective}`;
}

function saveSettings() {
    localStorage.setItem('settings', s);
}

function updateCharObjective() {
    session.charCount++;
    objectiveCharLabel.textContent = `${session.charCount}/${s.charCountObjective}`;
    if (s.gameMode == 'char' && session.charCount == s.charCountObjective)
        onObjectiveReached();
}

function updateWordObjective() {
    session.wordCount++;
    objectiveWordLabel.textContent = `${session.wordCount}/${s.wordCountObjective}`;
    if (s.gameMode == 'word' && session.wordCount == s.wordCountObjective)
        onObjectiveReached();
}

function updateTimerLabel(timerLabel, timer) {
    let secondsLabel = "00";
    let minutesLabel = "00";
    if (timer.seconds < 10)
        secondsLabel = `0${timer.seconds}`;
    else
        secondsLabel = timer.seconds;

    if (timer.minutes < 10)
        minutesLabel = `0${timer.minutes}`;
    else
        minutesLabel = timer.minutes;

    timerLabel.textContent = `${minutesLabel}:${secondsLabel}`;
}

function resetKillTimer() {
    const timerMinutes = Math.floor(s.killTime / 60);
    const timerSeconds = Math.floor(s.killTime % 60);

    killTimer.minutes = timerMinutes;
    killTimer.seconds = timerSeconds;
}

function resetObjectiveTimer() {
    objectiveTimer.minutes = Math.floor(s.focusTime / 60);
    objectiveTimer.seconds = Math.floor(s.focusTime % 60);
}

function updateTimerValue(timer) {
    timer.seconds--;
    if (timer.seconds < 0) {
        timer.minutes--;
        if (timer.minutes <= 0 && timer.seconds <= 0) {
            timer.seconds = 0;
            timer.minutes = 0;
            onTimerTimeout(timer);
            return;
        }
        timer.seconds = 59
    }
}

function onInput(e) {
    if (!e.isCompositing && ['deleteContentBackward', 'deleteWordBackward'].includes(e.inputType) && s.isForwardOnly) {
        area.value = currentText;
        e.preventDefault();
        return;
    }

    currentText = area.value;
    session.lastInputTime = Date.now();
    resetKillTimer();
    updateTimerLabel(killTimerLabel, killTimer);

    if (!session.running && !session.objectiveReached)
        startSession();

    if (!e.isCompositing)
        updateCharObjective();

    if (e.data == ' ' && ![' ', ''].includes(session.lastChar))
        updateWordObjective();

    updateBlockerDanger(0);
    header.classList.add('writing');
    header.classList.remove('waiting');
    session.lastChar = e.data;
}

function onTimerTimeout(timer) {
    if (timer == killTimer) {
        updateTimerLabel(killTimerLabel, killTimer);
        currentText = '';
        area.value = '';
        finishSession();
    } else {
        onObjectiveReached();
    }
}

function onObjectiveReached() {
    session.objectiveReached = true;
    objectiveContainer.classList.add('success');
    header.classList.remove('running');
    session.running = false;
    updateBlockerDanger(0);
    resetKillTimer();
}

function startSession() {
    session.running = true;
    updateBlockerDanger(0);
    updateTimerLabel(objectiveTimerLabel, objectiveTimer);

    header.classList.add('running');
    objectiveContainer.classList.remove('success');
}

function updateBlockerDanger(danger) {
    blocker.style.setProperty('--danger', `.${danger}`);
}

function tick() {
    if (!session.running) return;

    if (s.gameMode == 'time') {
        updateTimerValue(objectiveTimer);
        updateTimerLabel(objectiveTimerLabel, objectiveTimer);
    }

    if (killTimer.seconds <= 5) {
        let danger = 5 - killTimer.seconds;
        updateBlockerDanger(danger);
    }

    if (Date.now() - session.lastInputTime <= s.killTimeStartOffset * 1000)
        return;

    header.classList.remove('writing');
    header.classList.add('waiting');

    updateTimerValue(killTimer);
    updateTimerLabel(killTimerLabel, killTimer);
}

function finishSession() {
    session.running = false;
    resetKillTimer();
    resetObjectiveTimer();

    session = {
        currentText: '',
        running: false,
        lastInputTime: Date.now(),
        charCount: 0,
        wordCount: 0,
        lastChar: '',
        objectiveReached: false
    }

    header.classList.remove('running');
}

setInterval(() => {
    tick();
}, 1000);

settings = localStorage.getItem('settings');
if (settings)
    s = settings;

applySettings();

area.value = '';
area.focus();
updateTimerLabel(killTimerLabel, killTimer);