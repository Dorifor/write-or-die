
const header = document.querySelector('header');
const area = document.querySelector('textarea');
const blocker = document.querySelector('#blocker');
const killTimerLabel = document.querySelector('#kill-timer');
const objectiveTimerLabel = document.querySelector('#objective-timer');
const objectiveCharLabel = document.querySelector('#objective-char-count');
const objectiveWordLabel = document.querySelector('#objective-word-count');
const objectiveContainer = document.querySelector('#objective');
const saveButton = document.querySelector('#save');
const copyButton = document.querySelector('#copy');
const settingsButton = document.querySelector('#settings');
const settingsDialog = document.querySelector('#settings-dialog');

// Settings
const gameModeInput = document.querySelector('#game-mode');
const timeObjectiveInput = document.querySelector('#time-objective');
const charObjectiveInput = document.querySelector('#char-objective');
const wordObjectiveInput = document.querySelector('#word-objective');
const killTimeInput = document.querySelector('#kill-time');
const mercyTimeInput = document.querySelector('#kill-timer-offset');
const forwardOnlyInput = document.querySelector('#forward-only');
const settingsCancelButton = document.querySelector('#settings-dialog button.cancel');
const settingsApplyButton = document.querySelector('#settings-dialog button.apply');

// settings
let s = {
    gameMode: 'time', // 'time', 'word' or 'char'
    isForwardOnly: false,
    killTime: 5,
    killTimeStartOffset: 1,
    focusTime: 10, // gameMode == 'time'
    charCountObjective: 5000, // gameMode == 'char'
    wordCountObjective: 800, // gameMode == 'word'
};

const killTimer = {
    hours: 0,
    minutes: 0,
    seconds: 5,
    showHours: false
};

const objectiveTimer = {
    hours: 0,
    minutes: 10,
    seconds: 0,
    showHours: false
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

saveButton.addEventListener('click', downloadText);
settingsButton.addEventListener('click', openSettings);
gameModeInput.addEventListener('change', updateSettingsDialogGameMode);
settingsCancelButton.addEventListener('click', closeSettings);
settingsApplyButton.addEventListener('click', applySettings);

function updateSettingsDialogGameMode() {
    settingsDialog.classList.remove('time');
    settingsDialog.classList.remove('char');
    settingsDialog.classList.remove('word');
    settingsDialog.classList.add(gameModeInput.value);
}

function openSettings() {
    settingsDialog.showModal();
}

function closeSettings() {
    closeDialog(settingsDialog);
}

function closeDialog(dialog) {
    dialog.classList.add('closing');
    setTimeout(() => {
        dialog.close();
        dialog.classList.remove('closing');
    }, 200);
}

function blockUserActions(e) {
    const isSaveAction = e.ctrlKey && e.key == 's';
    if (session.objectiveReached && isSaveAction)
        downloadText();

    const isCopyAction = e.ctrlKey && e.key == 'c';
    if (session.objectiveReached && isCopyAction)
        copyText();

    const isCTRLAction = e.ctrlKey && 'cvxspwuaz'.indexOf(e.key) !== -1;
    const isNavigation = ['arrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp'].includes(e.key);
    if (isCTRLAction || (s.isForwardOnly && isNavigation)) {
        e.preventDefault();
    }

    if (e.key == "Tab") {
        e.preventDefault();
        area.value += '  '; // make this config ?
    }
}

function updateSettingsInputs(settings) {
    gameModeInput.value = settings.gameMode;
    forwardOnlyInput.checked = settings.isForwardOnly;
    killTimeInput.value = settings.killTime;
    mercyTimeInput.value = settings.killTimeStartOffset;
    timeObjectiveInput.value = settings.focusTime;
    charObjectiveInput.value = settings.charCountObjective;
    wordObjectiveInput.value = settings.wordCountObjective;
    updateSettingsDialogGameMode();
}

function applySettings() {
    s.gameMode = gameModeInput.value;
    s.isForwardOnly = forwardOnlyInput.checked;
    s.killTime = killTimeInput.value;
    s.killTimeStartOffset = mercyTimeInput.value;
    s.focusTime = timeObjectiveInput.value;
    s.charCountObjective = charObjectiveInput.value;
    s.wordCountObjective = wordObjectiveInput.value;

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
    saveSettings();
    closeSettings();
}

function saveSettings() {
    localStorage.setItem('settings', JSON.stringify(s));
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
    let hoursLabel = "00";

    if (timer.seconds < 10)
        secondsLabel = `0${timer.seconds}`;
    else
        secondsLabel = timer.seconds;

    if (timer.minutes < 10)
        minutesLabel = `0${timer.minutes}`;
    else
        minutesLabel = timer.minutes;

    if (timer.hours < 10)
        hoursLabel = `0${timer.hours}`;
    else
        hoursLabel = timer.hours;

    timerLabel.textContent = `${minutesLabel}:${secondsLabel}`;
    if (timer.showHours)
        timerLabel.textContent = hoursLabel + ':' + timerLabel.textContent;
}

function resetKillTimer() {
    const timerMinutes = Math.floor(s.killTime / 60);
    const timerSeconds = Math.floor(s.killTime % 60);

    killTimer.minutes = timerMinutes;
    killTimer.seconds = timerSeconds;
}

function resetObjectiveTimer() {
    objectiveTimer.hours = Math.floor(s.focusTime / 60)
    objectiveTimer.minutes = Math.floor(s.focusTime % 60);
    objectiveTimer.seconds = 0;

    objectiveTimer.showHours = objectiveTimer.hours > 0;
}

function updateTimerValue(timer) {
    timer.seconds--;
    if (timer.seconds < 0) {
        timer.minutes--;
        if (timer.minutes < 0) {
            timer.hours--;
            if (timer.hours <= 0 && timer.minutes <= 0 && timer.seconds <= 0) {
                timer.seconds = 0;
                timer.minutes = 0;
                timer.hours = 0;
                onTimerTimeout(timer);
                return;
            }
            timer.minutes = 59;
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

    if (e.data == ' ' && ![' ', '', null, undefined].includes(session.lastChar))
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
    saveButton.disabled = false;
}

function downloadText() {
    if (area.value.length <= 0) return;
    const textFile = new File([area.value], 'write_or_die.txt', {
        type: 'text/plain'
    });

    const url = URL.createObjectURL(textFile)

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', textFile.name);
    link.setAttribute('target', '_blank');
    link.setAttribute('parent', document.body);

    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
}

function copyText() {
    copyButton.click();
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


let savedSettings = localStorage.getItem('settings');
if (savedSettings)
    s = JSON.parse(savedSettings);

updateSettingsInputs(s);
applySettings();

area.value = '';
area.focus();
updateTimerLabel(killTimerLabel, killTimer);

new ClipboardJS('#copy');
