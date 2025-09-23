// main.js — minimal, safe
const { app, BrowserWindow } = require('electron');
const path = require('path');

let win; // keep a global ref so it won't get GC'd

function createWindow() {
    win = new BrowserWindow({
        width: 300,
        height: 300,
        frame: false,
        transparent: true,
        // alwaysOnTop: true, // add back later
        // resizable: false,  // add back later
        show: false,
    });

    // Load your renderer page
    win.loadFile(path.join(__dirname, 'renderer', 'pet.html'));

    win.once('ready-to-show', () => {
        win.show();
    });
}

async function fetchPet(uid) {
    const res = await fetch(`http://localhost:8000/pet/current?user_id=${uid}`);
    const pet = await res.json();
    document.getElementById("pet-name").textContent = pet.pet_name;
    document.getElementById("pet-image").src = pet.pet_image_url;
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

app.on("second-instance", (_event, argv) => {
    const deep = argv.find(a => a.startsWith("quickfollowup://"));
    if (deep) {
        const url = new URL(deep);
        currentUserId = url.searchParams.get("user_id");
        win.webContents.send("set-user", currentUserId);
        fetchPet(currentUserId);

    }
});
