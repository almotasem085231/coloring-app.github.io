// script.js

// Remove the alert, as it's not professional for a web app.
// alert("مرحبًا بك في لعبة التلوين!");

const canvas = document.getElementById('draw');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const brushSizeInput = document.getElementById('brushSize');
const brushSizeValueSpan = document.getElementById('brushSizeValue');
const clearButton = document.getElementById('clear');
const eraserButton = document.getElementById('eraser');
const undoButton = document.getElementById('undo');
const redoButton = document.getElementById('redo');
const saveButton = document.getElementById('save');
const newToolButton = document.getElementById('newToolButton'); // Get the new button


let painting = false;
let currentTool = 'brush'; // 'brush' or 'eraser'
let history = []; // Stores canvas states for undo/redo
let historyPointer = -1;

// --- Initial Setup ---
function initializeCanvas() {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round'; // Improves corners
  ctx.strokeStyle = colorPicker.value;
  ctx.lineWidth = brushSizeInput.value;
  brushSizeValueSpan.textContent = brushSizeInput.value;
  saveState(); // Save initial blank state
}

// --- Event Listeners ---
// Mouse Events
canvas.addEventListener('mousedown', startPosition);
canvas.addEventListener('mouseup', endPosition);
canvas.addEventListener('mouseleave', endPosition);
canvas.addEventListener('mousemove', draw);

// Touch Events
canvas.addEventListener('touchstart', startPosition);
canvas.addEventListener('touchend', endPosition);
canvas.addEventListener('touchcancel', endPosition); // Handle interruptions
canvas.addEventListener('touchmove', draw);


colorPicker.addEventListener('input', (e) => {
  ctx.strokeStyle = e.target.value;
  if (currentTool === 'eraser') { // If currently in eraser mode, switch back to brush
    currentTool = 'brush';
    eraserButton.classList.remove('active'); // Remove active state from eraser button
  }
});

brushSizeInput.addEventListener('input', (e) => {
  brushSizeValueSpan.textContent = e.target.value;
  ctx.lineWidth = e.target.value;
});

clearButton.addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  saveState(); // Save cleared state
});

eraserButton.addEventListener('click', () => {
  currentTool = 'eraser';
  ctx.strokeStyle = '#FFFFFF'; // Set to white for erasing (assuming white background)
  eraserButton.classList.add('active'); // Add a class for styling
});

undoButton.addEventListener('click', undo);
redoButton.addEventListener('click', redo);
saveButton.addEventListener('click', saveCanvasAsPNG);

// NEW BUTTON EVENT LISTENER
newToolButton.addEventListener('click', () => {
    alert("You clicked the New Tool button! Implement its functionality here.");
    // Example: Toggle a grid on/off
    // You would add your specific logic here.
});
// ----------------------------


// --- Drawing Functions ---
// Unified function to get coordinates from mouse or touch events
function getCoordinates(e) {
    let x, y;
    if (e.touches && e.touches.length > 0) {
        // For touch events, use the first touch point
        const rect = canvas.getBoundingClientRect(); // Get canvas position
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
        e.preventDefault(); // Prevent scrolling/zooming on touch move
    } else {
        // For mouse events
        x = e.offsetX;
        y = e.offsetY;
    }
    return { x, y };
}

function startPosition(e) {
  painting = true;
  const { x, y } = getCoordinates(e);
  // Always begin a new path on mousedown/touchstart to prevent connected lines
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function endPosition(e) {
  if (!painting) return; // Only save state if a stroke was actually drawn
  painting = false;
  saveState(); // Save the state after each stroke
}

function draw(e) {
  if (!painting) return;

  const { x, y } = getCoordinates(e);

  // Set stroke style based on current tool
  if (currentTool === 'brush') {
    ctx.strokeStyle = colorPicker.value;
  } else if (currentTool === 'eraser') {
    ctx.strokeStyle = '#FFFFFF'; // Eraser uses background color
  }

  ctx.lineWidth = brushSizeInput.value;

  ctx.lineTo(x, y);
  ctx.stroke();
  // No need for ctx.beginPath() and ctx.moveTo() here as it connects segments of the same stroke
}


// --- Undo/Redo Functions ---
function saveState() {
  // Clear any redo states if a new action is performed
  if (historyPointer < history.length - 1) {
    history = history.slice(0, historyPointer + 1);
  }
  history.push(canvas.toDataURL()); // Save current canvas as data URL
  historyPointer = history.length - 1;
  updateUndoRedoButtons();
}

function restoreState(index) {
  if (index < 0 || index >= history.length) return;
  const img = new Image();
  img.src = history[index];
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear current
    ctx.drawImage(img, 0, 0); // Draw saved state
  };
}

function undo() {
  if (historyPointer > 0) {
    historyPointer--;
    restoreState(historyPointer);
    updateUndoRedoButtons();
  }
}

function redo() {
  if (historyPointer < history.length - 1) {
    historyPointer++;
    restoreState(historyPointer);
    updateUndoRedoButtons();
  }
}

function updateUndoRedoButtons() {
  undoButton.disabled = (historyPointer <= 0);
  redoButton.disabled = (historyPointer >= history.length - 1);
}

// --- Save Function ---
function saveCanvasAsPNG() {
  const dataURL = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = 'my-drawing.png';
  link.href = dataURL;
  document.body.appendChild(link); // Required for Firefox
  link.click();
  document.body.removeChild(link); // Clean up
}

// Initialize on load
initializeCanvas();


// --- Telegram Mini App Integration (Conceptual) ---
// This section demonstrates how you would interact with the Telegram Web App SDK.
// For full functionality, you would need to set up a Telegram Bot and integrate with its API.
if (window.Telegram && window.Telegram.WebApp) {
    Telegram.WebApp.ready();

    // You can get user info:
    // const user = Telegram.WebApp.initDataUnsafe.user;
    // console.log("Telegram User:", user);

    // Example: Add a button to share the drawing back to Telegram
    // This is highly conceptual and depends on what your bot should do
    const shareButton = document.createElement('button');
    shareButton.textContent = 'Share to Telegram';
    shareButton.className = 'tool-button';
    shareButton.style.marginLeft = '15px'; // Add some spacing for the new button
    // Append the share button to the toolbar.
    // Ensure the toolbar is available in the DOM when this script runs.
    const toolbar = document.querySelector('.toolbar');
    if (toolbar) {
        toolbar.appendChild(shareButton);
    } else {
        console.error("Toolbar element not found. Share to Telegram button not added.");
    }

    shareButton.addEventListener('click', () => {
        if (Telegram.WebApp.isClosed) {
            alert("Telegram Mini App is closed. Cannot send data.");
            return;
        }

        const imageData = canvas.toDataURL('image/png'); // Get image data

        // Option 1: Send as a base64 string directly to the bot (might be too large for text messages)
        // Telegram.WebApp.sendData(imageData);

        // Option 2: Inform the bot and let the bot request the image (more robust)
        // If you have a backend, you could upload the image there and send a URL to the bot.
        // For a simple demo, you could send a command and then the bot could
        // prompt the user to save the image manually from the web app before closing.
        // A more advanced approach involves the bot API to send photos.

        // Example of sending simple data to the bot
        // Be aware of data size limits for sendData. Large images as Data URLs can exceed limits.
        Telegram.WebApp.sendData(JSON.stringify({
            action: 'drawing_shared',
            image_data_url: imageData
        }));

        // Close the web app after sending (optional)
        // Telegram.WebApp.close();
        alert("Drawing data sent to Telegram (conceptually).");
    });

    // Set the background color of the Telegram Mini App to match your app
    // Ensure that --background-color and --primary-color are defined in your CSS :root
    try {
        const bodyBgColor = getComputedStyle(document.body).getPropertyValue('--background-color');
        if (bodyBgColor) Telegram.WebApp.setBackgroundColor(bodyBgColor);

        const headerColor = getComputedStyle(document.querySelector('header')).getPropertyValue('--primary-color');
        if (headerColor) Telegram.WebApp.setHeaderColor(headerColor);
    } catch (e) {
        console.warn("Could not set Telegram Web App colors. Ensure CSS variables are defined and elements exist.", e);
    }

} else {
    console.log("Not running in Telegram Web App environment.");
}
