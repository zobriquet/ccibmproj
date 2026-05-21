let socket;
let telescopeCamera;

// =========================================================================
// CONFIGURATION SETTINGS 
// =========================================================================

// camera Mode Toggle 'BUILTIN' for laptop webcam testing or 'STREAMCAM' for external
const ACTIVE_CAMERA_MODE = 'STREAMCAM';

// Hardware 
const TOTAL_ARTEFACTS = 2;   // how many physical scenes we have
const NARRATIVES_PER_OBJ = 3; // how many text blocks each object contains

// Blur Tuning
const BLUR_MAX_SIZE = 35;     // peak blur (higher = blurrier)
const BLUR_WOBBLE_SPEED = 0.2; // how fast the distortion oscillates
const BLUR_WOBBLE_FORCE = 0.3; // how violently the out-of-focus image distorts

const LEFT_SWEET_SPOT = 300;  // crisp footage zone boundary for Artefact 1 (0 to this value)
const RIGHT_SWEET_SPOT = 600; // crisp footage zone boundary for Artefact 2 (this value to 1023)

// text arrays with narratives we can maybe distort and stuff later
const exhibitionText = {
  0: [
    "Artefact 1 - Memory A: This object holds a deeply contested colonial past.",
    "Artefact 1 - Memory B: It makes me wonder who held it first.",
    "Artefact 1 - Memory C: The craftsmanship survived to this day."
  ],
  1: [
    "Artefact 2 - Thought A: Traces of wear show it was handled daily.",
    "Artefact 2 - Thought B: This reminds me of my own upbringing.",
    "Artefact 2 - Thought C: These objects should be returned."
  ]
};

// =========================================================================
// STUFF FOR GETTING SERIAL DATA
// =========================================================================

let artefactPot = 0;
let focusPot = 0;    

let activeScene = 0;     
let activeNarrative = 0; // variables to end math in celan intergers

let targetBlur = 0;
let currentBlur = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noCursor(); 

  // serial node.js connection stuff
  socket = new WebSocket('ws://localhost:8081');
  socket.onmessage = (event) => {
    let incomingText = String(event.data).trim();
    let sensors = incomingText.split(',');
    
    if (sensors.length >= 2) {
      // parse strings into integers
      artefactPot = parseInt(sensors[0], 10); 
      focusPot = parseInt(sensors[1], 10);    
    }
  };

  // launch video stream
  if (ACTIVE_CAMERA_MODE === 'BUILTIN') {
    telescopeCamera = createCapture(VIDEO); 
    telescopeCamera.size(1920, 1080);
    telescopeCamera.hide(); 
  } else {
    // external camera stuff
    navigator.mediaDevices.enumerateDevices().then(devices => {
      let videoCameras = devices.filter(d => d.kind === 'videoinput');
      let selectedCamera = videoCameras[0]; //safety default

      for (let i = 0; i < videoCameras.length; i++) {
        let cameraName = videoCameras[i].label.toLowerCase();
        if (cameraName.includes('logitech streamcam') || cameraName.includes('streamcam')) {
          selectedCamera = videoCameras[i];
          break; 
        }
      }

      telescopeCamera = createCapture({
        video: {
          deviceId: { exact: selectedCamera.deviceId },
          width: { ideal: 1920 }, 
          height: { ideal: 1080 }
        }
      });
      telescopeCamera.hide();
    }).catch(err => console.error("Camera system configuration error: ", err));
  }
}

function draw() {
  background(0);

// =======================================================================
// BLUR STUFF
// =======================================================================

  // distance relative to  sweet spots
  let distToLeft = artefactPot;
  let distToRight = 1023 - artefactPot;
  let shortestDistance = min(distToLeft, distToRight);

  // focus logic
  if (artefactPot <= LEFT_SWEET_SPOT || artefactPot >= RIGHT_SWEET_SPOT) {
    targetBlur = 0; // Completely locked inside a valid focus zone
  } else {
    // map out of focus zones to continuous blur scales
    targetBlur = map(shortestDistance, LEFT_SWEET_SPOT, 512, 2, BLUR_MAX_SIZE);
  }

  // lens distortion
  let wobble = 0;
  if (targetBlur > 2) {
    wobble = sin(frameCount * BLUR_WOBBLE_SPEED) * (targetBlur * BLUR_WOBBLE_FORCE);
  }

  // smooth out blur 
  currentBlur = lerp(currentBlur, targetBlur + wobble, 0.1);

  // divide potentiometer scopes into clean integers to select things
  activeScene = int(artefactPot / (1024 / TOTAL_ARTEFACTS));
  activeNarrative = int(focusPot / (1024 / NARRATIVES_PER_OBJ));

  // safety stuf
  activeScene = constrain(activeScene, 0, TOTAL_ARTEFACTS - 1);
  activeNarrative = constrain(activeNarrative, 0, NARRATIVES_PER_OBJ - 1);

  // ======================================================================
  // VIDEO RENDERING STUFF
  // =======================================================================

  if (telescopeCamera) {
    image(telescopeCamera, 0, 0, width, height);
  }

  // apply defocus filter
  if (currentBlur > 0.5) {
    filter(BLUR, currentBlur);
  }

  // render the overlays (graphics and text)
  renderVisualOverlays();
  renderTypographyUI();
}

// =========================================================================
// SCENE VISUALS ZONE (DROP IN IMAGES/GRAPHICS HERE LATER)
// =========================================================================

function renderVisualOverlays() {
  noFill();
  stroke(0, 255, 150);
  strokeWeight(5);
  rectMode(CENTER);

  if (activeScene === 0) {
    // artefact 1
    rect(width / 2, height / 2, 300, 300); 

  } else if (activeScene === 1) {
    // artefact 2
    circle(width / 2, height / 2, 350); 

  }
}

// =========================================================================
// TEXT STUFF
// =========================================================================

function renderTypographyUI() {
 
  let textToDisplay = exhibitionText[activeScene][activeNarrative];

 
  fill(0, 0, 0, 180);
  noStroke();
  rect(width / 2, height - 120, width - 400, 100, 15);


  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(24);
  text(textToDisplay, width / 2, height - 120);

// =========================================================================
// HARDWARE CHECK STUFF
// =========================================================================

  fill(0, 255, 150);
  textSize(16);
  textAlign(LEFT, TOP);
  noStroke();
  text(`[POT VALUES]`, 20, 20);
  fill(255);
  text(`• Telescope angle pot: ${artefactPot} ---> Current Target Scene: [ ${activeScene} ]`, 20, 45);
  text(`• Focus ring pot: ${focusPot} ---> Current Target Text: [ ${activeNarrative} ]`, 20, 70);
  text(`• Lens Defocus: ${currentBlur.toFixed(1)} px`, 20, 95);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
