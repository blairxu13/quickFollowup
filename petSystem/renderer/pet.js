
console.log("here is in pet.js")
const bubble = document.getElementById('bubble');

if (!bubble) { console.log("no bubble is here") }
const TEST_SECONDS = 0;

const LINES = {
    happy: "I’m happy",
    sad: "mehhhhh…",
    hungry: "I’m hungry…",
    sleep: "zzz…",
    thirsty: "I need a beer"
};


const moodKeys = Object.keys(LINES);

let mood = moodKeys[0];                 // start at first valid mood
let nextChangeAt = computeNextDeadline();


function computeNextDeadline(fromMs = Date.now()) {
    if (TEST_SECONDS > 0) return fromMs + TEST_SECONDS * 1000;
    // const d = new Date(fromMs); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1);
    return fromMs + 60 * 1000; // change by minute
}

function pickNextMood(current) {
    const choices = moodKeys.filter(k => k !== current);
    return choices[(Math.random() * choices.length) | 0];
}

function setMood(newMood) {
    if (!LINES[newMood] || newMood === mood) return;
    mood = newMood;
    const bubble = document.getElementById('bubble');
    if (bubble) bubble.textContent = LINES[mood];
}


let timerId = null;
function scheduleNextFlip() {
    clearTimeout(timerId);
    const now = Date.now();
    if (!nextChangeAt || nextChangeAt <= now) nextChangeAt = computeNextDeadline(now);
    timerId = setTimeout(() => {
        setMood(pickNextMood(mood));
        nextChangeAt = computeNextDeadline();
        scheduleNextFlip();
    }, Math.max(0, nextChangeAt - now));
}

(function boot() {
    setMood(mood);        // show initial line
    scheduleNextFlip();   // start hourly flips
})();