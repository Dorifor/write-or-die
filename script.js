
const header = document.querySelector('header');
const area = document.querySelector('textarea');
const blocker = document.querySelector('#blocker');
const toast = document.querySelector('#toast');
const killTimerLabel = document.querySelector('#kill-timer');
const objectiveTimerLabel = document.querySelector('#objective-timer');
const objectiveCharLabel = document.querySelector('#objective-char-count');
const objectiveWordLabel = document.querySelector('#objective-word-count');
const objectiveContainer = document.querySelector('#objective');
const saveButton = document.querySelector('#save');
const copyButton = document.querySelector('#copy');
const settingsButton = document.querySelector('#settings');
const settingsForm = document.querySelector('#settings-form');
const restartButton = document.querySelector('#restart');

// Settings
const gameModeInput = document.querySelector('#game-mode');
const timeObjectiveInput = document.querySelector('#time-objective');
const charObjectiveInput = document.querySelector('#char-objective');
const wordObjectiveInput = document.querySelector('#word-objective');
const killTimeInput = document.querySelector('#kill-time');
const mercyTimeInput = document.querySelector('#kill-timer-offset');
const forwardOnlyInput = document.querySelector('#forward-only');
settingsInputs = settingsForm.querySelectorAll('input');
// const settingsCancelButton = document.querySelector('#settings-dialog button.cancel');
// const settingsApplyButton = document.querySelector('#settings-dialog button.apply');

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

let toastTimeout;

// document.addEventListener('keydown', () => area.focus());
document.addEventListener('contextmenu', e => e.preventDefault())

blocker.addEventListener('click', () => area.focus());

area.addEventListener('input', onInput);
area.addEventListener('keydown', blockUserActions);

saveButton.addEventListener('click', downloadText);
settingsButton.addEventListener('click', toggleSettings);
gameModeInput.addEventListener('change', updateSettingsGameMode);
restartButton.addEventListener('click', restartSession);

settingsInputs.forEach(input => input.addEventListener('change', applySettings));


function updateSettingsGameMode() {
    settingsForm.classList.remove('time');
    settingsForm.classList.remove('char');
    settingsForm.classList.remove('word');
    settingsForm.classList.add(gameModeInput.value);
    applySettings();
}

function toggleSettings() {
    settingsForm.classList.toggle('show');
    if (settingsForm.classList.contains('show'))
        settingsButton.classList.add('toggled');
    else
        settingsButton.classList.remove('toggled');
}

function closeSettings() {
    settingsForm.classList.remove('show');
    settingsButton.classList.remove('toggled');
}

function closeDialog(dialog) {
    dialog.classList.add('closing');
    setTimeout(() => {
        dialog.close();
        dialog.classList.remove('closing');
    }, 200);
}

function areaHasSelectedText() {
    return area. Math.abs(area.selectionEnd - area.selectionStart) > 0;
}

function blockUserActions(e) {
    const isSaveAction = e.ctrlKey && e.key == 's';
    if (session.objectiveReached && isSaveAction) {
        e.preventDefault();
        downloadText();
    }

    const isCopyAction = e.ctrlKey && e.key == 'c';
    if (session.objectiveReached && isCopyAction)
    {
        e.preventDefault();
        copyText();
    }

    const isRestartAction = e.ctrlKey && e.key == 'r';
    if (session.objectiveReached && isRestartAction)
    {
        e.preventDefault();
        restartSession();
    }

    if (e.key == "Tab") {
        e.preventDefault();
        area.value += '  '; // make this config ?
        session.lastChar = ' ';
    }

    if (session.objectiveReached)
        return;

    const isCTRLAction = e.ctrlKey && 'cvxspwuaz'.indexOf(e.key) !== -1;
    const isNavigation = ['arrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp'].includes(e.key);
    if (isCTRLAction || (s.isForwardOnly && isNavigation)) {
        e.preventDefault();
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
    updateSettingsGameMode();
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
    restartSession();

    updateTimerLabel(objectiveTimerLabel, objectiveTimer);
    updateTimerLabel(killTimerLabel, killTimer);
    objectiveCharLabel.textContent = `${session.charCount}/${s.charCountObjective}`;
    objectiveWordLabel.textContent = `${session.wordCount}/${s.wordCountObjective}`;
    saveSettings();
}

function saveSettings() {
    localStorage.setItem('settings', JSON.stringify(s));
}

function updateCharObjective(reset = false) {
    if (!reset)
        session.charCount++;
    objectiveCharLabel.textContent = `${session.charCount}/${s.charCountObjective}`;

    if (s.gameMode == 'char' && session.charCount == Math.floor(s.charCountObjective / 2))
        showToast('info', 'You\'re halfway done!');

    if (s.gameMode == 'char' && session.charCount == s.charCountObjective)
        onObjectiveReached();
}

function updateWordObjective(reset = false) {
    if (!reset)
        session.wordCount++;
    objectiveWordLabel.textContent = `${session.wordCount}/${s.wordCountObjective}`;
    
    if (s.gameMode == 'word' && session.wordCount == Math.floor(s.wordCountObjective / 2))
        showToast('info', 'You\'re halfway done!');
    
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
    if (!e.isCompositing && ['deleteContentBackward', 'deleteWordBackward'].includes(e.inputType) && s.isForwardOnly && session.running) {
        area.value = currentText;
        e.preventDefault();
        return;
    }

    currentText = area.value;
    session.lastInputTime = Date.now();
    if (killTimer.seconds < 3)
        showToast('info', 'That was close!');

    resetKillTimer();
    updateTimerLabel(killTimerLabel, killTimer);

    if (!session.running && !session.objectiveReached)
        startSession();

    if (!e.isCompositing)
        updateCharObjective();

    if (![' ', '', null, undefined].includes(e.data) && [' ', '', null, undefined].includes(session.lastChar))
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
        showToast('error', 'You died 💀');
        finishSession();
    } else {
        onObjectiveReached();
    }
}

function onObjectiveReached() {
    session.objectiveReached = true;
    objectiveContainer.classList.add('success');
    header.classList.remove('running');
    header.classList.add('objective');
    session.running = false;
    updateBlockerDanger(0);
    resetKillTimer();
    saveButton.disabled = false;
    showToast('objective', 'Good job!');
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
    showToast('info', 'Downloaded');
}

function copyText() {
    copyButton.click();
    showToast('info', 'Copied to Clipboard');
}

function showToast(type, text, duration = 2000) {
    toast.classList.add('show');
    toast.classList.remove('objective');
    toast.classList.remove('error');
    toast.classList.remove('info');
    toast.classList.add(type);
    toast.textContent = text;

    if (toastTimeout)
        clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

function resetSession() {
    session.charCount = 0;
    session.objectiveReached = false;
    session.wordCount = 0;
    resetObjectiveTimer();
    updateTimerLabel(objectiveTimerLabel, objectiveTimer);
    updateCharObjective(true);
    updateWordObjective(true);
    saveButton.disabled = true;
}

function restartSession() {
    resetSession();
    session.objectiveReached = false;
    header.classList.remove('objective');
    objectiveContainer.classList.remove('success');
    area.setSelectionRange(area.textLength, area.textLength);
}

function startSession() {
    session.running = true;
    updateBlockerDanger(0);
    updateTimerLabel(objectiveTimerLabel, objectiveTimer);

    header.classList.add('running');
    objectiveContainer.classList.remove('success');
    showToast('info', 'Go for it!');
    closeSettings();
}

function updateBlockerDanger(danger) {
    blocker.style.setProperty('--danger', `.${danger}`);
}

function tick() {
    if (!session.running) return;

    if (s.gameMode == 'time') {
        updateTimerValue(objectiveTimer);
        updateTimerLabel(objectiveTimerLabel, objectiveTimer);
        const minutesPassed = objectiveTimer.hours * 60 + objectiveTimer.minutes + objectiveTimer.seconds / 60;
        if (minutesPassed == s.focusTime / 2)
            showToast('info', 'You\'re halfway done!')
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

const clipboard = new ClipboardJS('#copy');
clipboard.on('success', e => {
    e.clearSelection();
    area.setSelectionRange(area.textLength, area.textLength);
});