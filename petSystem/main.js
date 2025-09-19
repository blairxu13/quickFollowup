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

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
