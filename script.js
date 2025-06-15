// script.js

// --- DOM Elements ---
const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const brushSizeInput = document.getElementById('brushSize');
const brushSizeValueSpan = document.getElementById('brushSizeValue');
const clearButton = document.getElementById('clearButton');
const undoButton = document.getElementById('undoButton');
const redoButton = document.getElementById('redoButton');
const saveButton = document.getElementById('saveButton');

// Tool buttons (from HTML)
const toolButtons = document.querySelectorAll('.tool-button'); // Get all buttons for active state
const brushToolBtn = document.getElementById('brushTool');
const eraserToolBtn = document.getElementById('eraserTool');
const lineToolBtn = document.getElementById('lineTool');
const rectToolBtn = document.getElementById('rectTool');
const circleToolBtn = document.getElementById('circleTool');
const fillToolBtn = document.getElementById('fillTool');

// Telegram Mini App Elements
const telegramMiniAppControls = document.getElementById('telegramMiniAppControls');
const telegramShareButton = document.getElementById('telegramShareButton');


// --- State Variables ---
let painting = false;
let currentTool = 'brush'; // Default tool
let history = []; // Stores canvas states as Data URLs for undo/redo
let historyPointer = -1;
let startX, startY; // For shape tools (line, rect, circle)
let previewImage = new Image(); // To hold the canvas state before drawing a preview shape


// --- Initialization ---
function initializeCanvas() {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = colorPicker.value;
  ctx.lineWidth = brushSizeInput.value;
  brushSizeValueSpan.textContent = brushSizeInput.value;

  // Set initial canvas background to white (important for eraser)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  saveState(); // Save initial blank state
  updateToolActiveState(currentTool + 'Tool'); // Set initial active tool button
  checkTelegramWebApp(); // Check for Telegram Mini App environment
}

// --- Event Handlers ---

// Unified mouse/touch coordinate getter
function getCoordinates(e) {
    let x, y;
    // Check for touch events first
    if (e.touches && e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect(); // Get canvas position
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
        e.preventDefault(); // Prevent default touch actions like scrolling
    } else {
        // Fallback for mouse events
        x = e.offsetX;
        y = e.offsetY;
    }
    return { x, y };
}

function startDrawing(e) {
    painting = true;
    const { x, y } = getCoordinates(e);
    startX = x;
    startY = y;

    // For shape tools, capture the current canvas state before drawing the preview
    if (currentTool === 'line' || currentTool === 'rect' || currentTool === 'circle') {
        previewImage.src = canvas.toDataURL(); // Save current canvas image
    } else if (currentTool === 'brush' || currentTool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(x, y);
    }
}

function draw(e) {
    if (!painting) return;

    const { x, y } = getCoordinates(e);

    // Dynamic styling based on tool
    ctx.lineWidth = brushSizeInput.value;
    if (currentTool === 'eraser') {
        ctx.strokeStyle = '#FFFFFF'; // Eraser "paints" with white
    } else {
        ctx.strokeStyle = colorPicker.value;
    }

    if (currentTool === 'brush' || currentTool === 'eraser') {
        ctx.lineTo(x, y);
        ctx.stroke();
    } else if (currentTool === 'line') {
        drawPreviewShape(() => {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(x, y);
            ctx.stroke();
        });
    } else if (currentTool === 'rect') {
        drawPreviewShape(() => {
            ctx.beginPath();
            ctx.rect(startX, startY, x - startX, y - startY);
            ctx.stroke();
        });
    } else if (currentTool === 'circle') {
        drawPreviewShape(() => {
            // Draw an ellipse, which can be a circle
            const radiusX = Math.abs(x - startX) / 2;
            const radiusY = Math.abs(y - startY) / 2;
            const centerX = startX + (x - startX) / 2;
            const centerY = startY + (y - startY) / 2;

            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.stroke();
        });
    }
}

function endDrawing(e) {
    if (!painting) return;
    painting = false;

    // For shape tools, draw the final shape and save state
    if (currentTool === 'line' || currentTool === 'rect' || currentTool === 'circle') {
        // Redraw on clean canvas (from previewImage) to commit final shape
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear to original state
        ctx.drawImage(previewImage, 0, 0); // Redraw original state

        // Re-call draw to render the final, committed shape
        draw(e);
    }
    saveState(); // Save the state after each completed action
}


// Helper for drawing previews for shapes
function drawPreviewShape(drawFn) {
    // Clear canvas and redraw the saved preview image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(previewImage, 0, 0);

    // Set properties for the preview (e.g., dotted line)
    // For simplicity, we'll just use current strokeStyle and lineWidth for preview too.
    // ctx.setLineDash([5, 5]); // Optional: Dotted line for preview
    // ctx.strokeStyle = 'rgba(0,0,0,0.5)'; // Optional: Dim preview color

    drawFn(); // Execute the specific shape drawing function

    // ctx.setLineDash([]); // Reset line dash
    // ctx.strokeStyle = colorPicker.value; // Reset stroke style
}

// --- Tool Specific Logic ---

// Flood Fill (Bucket Tool)
function floodFill(x, y, fillColor) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const targetColor = getPixelColor(pixels, x, y, imageData.width);

    // If target color is already fill color, or outside canvas, do nothing
    if (colorsMatch(targetColor, hexToRgb(fillColor)) || !isValidPixel(x, y, imageData.width, imageData.height)) {
        return;
    }

    const stack = [{ x, y }];
    const visited = new Set(); // To avoid infinite loops and re-processing

    const width = imageData.width;
    const height = imageData.height;

    function getPixelIndex(px, py) {
        return (py * width + px) * 4;
    }

    function getPixelColor(data, px, py, w) {
        const i = (py * w + px) * 4;
        return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
    }

    function setPixelColor(data, px, py, w, colorRgb) {
        const i = (py * w + px) * 4;
        data[i] = colorRgb.r;
        data[i + 1] = colorRgb.g;
        data[i + 2] = colorRgb.b;
        data[i + 3] = 255; // Full opacity
    }

    function colorsMatch(c1, c2) {
        return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b && c1.a === c2.a;
    }

    function isValidPixel(px, py, w, h) {
        return px >= 0 && px < w && py >= 0 && py < h;
    }

    const fillColorRgb = hexToRgb(fillColor);
    fillColorRgb.a = 255; // Ensure fill color is opaque for comparison

    while (stack.length > 0) {
        const { x: currX, y: currY } = stack.pop();
        const key = `${currX},${currY}`;

        if (visited.has(key)) continue;
        visited.add(key);

        if (!isValidPixel(currX, currY, width, height)) continue;

        const currentColor = getPixelColor(pixels, currX, currY, width);

        if (colorsMatch(currentColor, targetColor)) {
            setPixelColor(pixels, currX, currY, width, fillColorRgb);

            stack.push({ x: currX + 1, y: currY });
            stack.push({ x: currX - 1, y: currY });
            stack.push({ x: currX, y: currY + 1 });
            stack.push({ x: currX, y: currY - 1 });
        }
    }
    ctx.putImageData(imageData, 0, 0);
    saveState();
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b, a: 255 }; // Assume opaque for fill target
}


// --- UI and State Management ---

function updateToolActiveState(activeButtonId) {
    toolButtons.forEach(button => {
        button.classList.remove('active');
    });
    const activeButton = document.getElementById(activeButtonId);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// Set active tool and update UI
function selectTool(toolName, buttonId) {
    currentTool = toolName;
    updateToolActiveState(buttonId);
    // Change cursor based on tool (optional but nice)
    if (toolName === 'fill') {
        canvas.style.cursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'><path fill=\'%23000000\' d=\'M24.7 12.3l-12-12c-.4-.4-1-.4-1.4 0s-.4 1 0 1.4l12 12c.4.4 1 .4 1.4 0s.4-1 0-1.4z\'/><path fill=\'%23000000\' d=\'M22 17.5c0 .3-.1.6-.3.8l-8.7 8.7c-.4.4-1 .4-1.4 0s-.4-1 0-1.4l8.7-8.7c.4-.4 1-.4 1.4 0s.4 1 0 1.4z\'/><path fill=\'%23000000\' d=\'M25 21.5c0 .3-.1.6-.3.8l-8.7 8.7c-.4.4-1 .4-1.4 0s-.4-1 0-1.4l8.7-8.7c.4-.4 1-.4 1.4 0s.4 1 0 1.4z\'/><path fill=\'%23000000\' d=\'M28 25.5c0 .3-.1.6-.3.8l-8.7 8.7c-.4.4-1 .4-1.4 0s-.4-1 0-1.4l8.7-8.7c.4-.4 1-.4 1.4 0s.4 1 0 1.4z\'/><path fill=\'%23000000\' d=\'M31 29.5c0 .3-.1.6-.3.8l-8.7 8.7c-.4.4-1 .4-1.4 0s-.4-1 0-1.4l8.7-8.7c.4-.4 1-.4 1.4 0s.4 1 0 1.4z\'/></svg>") 16 16, auto';
    } else {
        canvas.style.cursor = 'crosshair';
    }
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

// --- Save/Clear Functions ---
function saveCanvasAsPNG() {
  const dataURL = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = 'prodraw_sketch.png';
  link.href = dataURL;
  document.body.appendChild(link); // Required for Firefox
  link.click();
  document.body.removeChild(link); // Clean up
}

function clearCanvas() {
    // Fill canvas with white before clearing to ensure a white background for new drawings/erasures
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState(); // Save cleared state
}

// --- Event Listeners Registration ---

// Canvas drawing events (unified for mouse and touch)
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mouseup', endDrawing);
canvas.addEventListener('mouseleave', endDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchend', endDrawing);
canvas.addEventListener('touchcancel', endDrawing);
canvas.addEventListener('touchmove', draw);

// Tool property inputs
colorPicker.addEventListener('input', (e) => {
    // If eraser was active, switch back to brush when color is changed
    if (currentTool === 'eraser') {
        selectTool('brush', 'brushTool');
    }
    // No need to set ctx.strokeStyle here, it's set in `draw` based on `currentTool`
});

brushSizeInput.addEventListener('input', (e) => {
  brushSizeValueSpan.textContent = e.target.value;
});

// Action buttons
clearButton.addEventListener('click', clearCanvas);
undoButton.addEventListener('click', undo);
redoButton.addEventListener('click', redo);
saveButton.addEventListener('click', saveCanvasAsPNG);

// Tool selection buttons
brushToolBtn.addEventListener('click', () => selectTool('brush', 'brushTool'));
eraserToolBtn.addEventListener('click', () => selectTool('eraser', 'eraserTool'));
lineToolBtn.addEventListener('click', () => selectTool('line', 'lineTool'));
rectToolBtn.addEventListener('click', () => selectTool('rect', 'rectTool'));
circleToolBtn.addEventListener('click', () => selectTool('circle', 'circleTool'));
fillToolBtn.addEventListener('click', (e) => {
    selectTool('fill', 'fillTool');
    // For fill tool, the action happens on click/touchdown on the canvas, not drag
    // So we can attach a one-time listener or modify startDrawing to handle it.
    // For simplicity, we'll make fillTool active and expect a canvas click to trigger it.
});

// Listener for fill tool (since it's a click, not a drag)
canvas.addEventListener('click', (e) => {
    if (currentTool === 'fill' && !painting) { // Ensure not during a drag for other tools
        const { x, y } = getCoordinates(e);
        const fillColor = colorPicker.value;
        floodFill(Math.floor(x), Math.floor(y), fillColor);
    }
});


// --- Telegram Mini App Integration (Conceptual) ---
// This section demonstrates how you would interact with the Telegram Web App SDK.
// For full functionality, you would need to set up a Telegram Bot and integrate with its API.
function checkTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        Telegram.WebApp.ready();
        telegramMiniAppControls.style.display = 'flex'; // Show controls
        console.log("Running in Telegram Web App environment.");

        // Optional: Get user info if needed
        // const user = Telegram.WebApp.initDataUnsafe.user;
        // console.log("Telegram User:", user);

        telegramShareButton.addEventListener('click', () => {
            if (Telegram.WebApp.isClosed) {
                alert("Telegram Mini App is closed. Cannot send data.");
                return;
            }

            // Get image data
            const imageData = canvas.toDataURL('image/png'); // Consider data size limits

            // Send data to the bot. This is conceptual.
            // For large images, you might need to upload to a service and send the URL.
            Telegram.WebApp.sendData(JSON.stringify({
                action: 'drawing_shared',
                image_data_url: imageData.substring(0, 100) + '...' // Truncate for log, actual data sent
            }));

            alert("Drawing data sent to Telegram (conceptually). Your bot needs a backend to process this data).");
            // Telegram.WebApp.close(); // Optional: Close app after sending
        });

        // Set Telegram app theme colors to match your app
        try {
            const bodyBgColor = getComputedStyle(document.body).getPropertyValue('--background-light');
            if (bodyBgColor) Telegram.WebApp.setBackgroundColor(bodyBgColor);

            const headerColor = getComputedStyle(document.querySelector('header')).getPropertyValue('--primary-color');
            if (headerColor) Telegram.WebApp.setHeaderColor(headerColor);
        } catch (e) {
            console.warn("Could not set Telegram Web App colors. Ensure CSS variables are defined and elements exist.", e);
        }

    } else {
        telegramMiniAppControls.style.display = 'none'; // Hide controls if not in Telegram
        console.log("Not running in Telegram Web App environment.");
    }
}

// Initial setup call
initializeCanvas();
