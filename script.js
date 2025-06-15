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
canvas.addEventListener('mousedown', startPosition);
canvas.addEventListener('mouseup', endPosition);
canvas.addEventListener('mouseleave', endPosition); // Important for continuous strokes
canvas.addEventListener('mousemove', draw);

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


// --- Drawing Functions ---
function startPosition(e) {
  painting = true;
  // Always begin a new path on mousedown to prevent connected lines
  ctx.beginPath();
  ctx.moveTo(e.offsetX, e.offsetY);
}

function endPosition() {
  if (!painting) return; // Only save state if a stroke was actually drawn
  painting = false;
  saveState(); // Save the state after each stroke
}

function draw(e) {
  if (!painting) return;

  // Set stroke style based on current tool
  if (currentTool === 'brush') {
    ctx.strokeStyle = colorPicker.value;
  } else if (currentTool === 'eraser') {
    ctx.strokeStyle = '#FFFFFF'; // Eraser uses background color
  }

  ctx.lineWidth = brushSizeInput.value;

  ctx.lineTo(e.offsetX, e.offsetY);
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
