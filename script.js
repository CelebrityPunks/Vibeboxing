import * as THREE from 'three';

// VibeBoxing Web Edition - JavaScript Entry Point
console.log("Script loaded.");

// --- Game States ---
const GameState = {
    TITLE: 'title',
    PLAYING: 'playing',
    GAME_OVER: 'game_over'
};
let currentGameState = GameState.TITLE;

// --- UI Elements ---
let uiContainer, titleScreen, hud, scoreElement,
    timerElement, gameOverScreen, finalScoreElement,
    durationButtons,
    shareScoreButton,
    goTitleButton;

// Get the video element
const videoElement = document.getElementById('input_video');
let scene, camera, renderer;
const landmarkSpheres = []; // Array to hold spheres for landmarks
const MAX_LANDMARKS = 21 * 2; // 21 landmarks per hand, max 2 hands

// --- ADJUSTED World Size ---
let WORLD_WIDTH = 18; // Increased further for more responsive mapping
let WORLD_HEIGHT; // Will be calculated based on aspect ratio
const DEPTH_SCALE = 20;  // How much to scale the Z coordinate

// --- Game State Variables ---
let score = 0;
let current_round_hits = 0;
let target_damage_stage = 1; // 1 to 6
const MAX_DAMAGE_STAGE = 6;
const HITS_PER_STAGE = 5;
const punch_cooldown = 200; // Milliseconds (0.2 seconds)
let last_punch_time = [0, 0]; // Timestamp for last hit [hand 0, hand 1]
let gameIsActive = false; // To control when hits are registered (TODO: Integrate later)

let targetMesh; // Variable to hold our target object
const textureLoader = new THREE.TextureLoader(); // Loader for textures
let fistMeshes = []; // For fist visuals
let gloveTextures = {}; // To store loaded glove textures
let faceTextures = []; // To store loaded face textures
let previousTargetPosition = new THREE.Vector2(); // Store previous position

// --- Constants for Boundaries ---
const TARGET_AREA_WIDTH_RATIO = 0.8; // Target moves within 80% of world width
const TARGET_AREA_HEIGHT_RATIO = 0.7; // Target moves within 70% of world height
const GLOVE_SIZE = 2.5; // Adjust size of the glove planes
const TARGET_SIZE = 2.0; // Match PlaneGeometry
const HIT_DISTANCE_THRESHOLD = 1.5; // Max distance between fist/target centers for a hit
const MIN_TARGET_MOVE_DISTANCE = 3.0; // Minimum distance target should move
const MAX_MOVE_ATTEMPTS = 10; // Prevent infinite loop

// Timer Variables
let selectedDuration = 0;
let remainingTime = 0; // In seconds
let gameTimerInterval = null;
let lastTickTime = 0;

let screenshotDataUrl = null; // Store screenshot data URL

// --- UI Management Functions
function showTitleScreen() {
    if (titleScreen) titleScreen.style.display = 'flex';
    if (hud) hud.style.display = 'none';
    if (gameOverScreen) gameOverScreen.style.display = 'none';
}

function showHUD() {
    if (titleScreen) titleScreen.style.display = 'none';
    if (hud) hud.style.display = 'flex';
    if (gameOverScreen) gameOverScreen.style.display = 'none';
}

function showGameOverScreen() {
    if (titleScreen) titleScreen.style.display = 'none';
    if (hud) hud.style.display = 'none';
    if (gameOverScreen) {
        finalScoreElement.textContent = `Final Score: ${score}`;
        gameOverScreen.style.display = 'flex';
        goTitleButton.style.display = 'block'; // Always show title button now

        // --- Capture Screenshot --- 
        try {
            // Ensure scene is rendered one last time with final score visible (might need adjustment)
            // A small delay might help ensure the DOM is updated if score display lags
            setTimeout(() => {
                 if (renderer) {
                    renderer.render(scene, camera); // Render the current frame
                    screenshotDataUrl = renderer.domElement.toDataURL('image/png');
                    console.log("Screenshot captured.");
                    if(shareScoreButton) shareScoreButton.disabled = false; // Enable share button
                 }
            }, 100); // 100ms delay, adjust if needed

            if(shareScoreButton) shareScoreButton.disabled = true; // Disable share button initially

        } catch (e) {
            console.error("Error capturing screenshot:", e);
            screenshotDataUrl = null; // Invalidate on error
            if(shareScoreButton) shareScoreButton.style.display = 'none'; // Hide button if capture fails
        }
    }
}

// --- Game Logic Functions ---
function startGame(duration) { // Accept duration
    console.log(`Starting game with duration: ${duration}s`);
    selectedDuration = duration;
    remainingTime = duration;
    lastTickTime = Date.now(); // Initialize last tick time
    score = 0;
    current_round_hits = 0;
    target_damage_stage = 1;
    updateTargetTexture(); // Reset target texture
    moveTarget(); // Place target initially
    scoreElement.textContent = `Score: ${score}`;
    timerElement.textContent = `Time: ${remainingTime.toFixed(1)}`; // Show initial time
    last_punch_time = [0, 0]; // Reset cooldowns
    currentGameState = GameState.PLAYING;

    // Clear previous timer if any
    if (gameTimerInterval) clearInterval(gameTimerInterval);

    // Start the game timer - check every 100ms for smoother display update
    gameTimerInterval = setInterval(tickTimer, 100);

    showHUD();
}

function tickTimer() {
    if (currentGameState !== GameState.PLAYING) return; // Should not happen if interval cleared

    const now = Date.now();
    const deltaTime = (now - lastTickTime) / 1000; // Time passed in seconds
    lastTickTime = now;

    remainingTime -= deltaTime;

    if (remainingTime <= 0) {
        remainingTime = 0;
        timerElement.textContent = `Time: ${remainingTime.toFixed(1)}`;
        endGame();
    } else {
        timerElement.textContent = `Time: ${remainingTime.toFixed(1)}`;
    }
}

function endGame() {
    console.log("Game Over! Final Score:", score);
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    gameTimerInterval = null;
    currentGameState = GameState.GAME_OVER;
    showGameOverScreen();
    // TODO: Add high score logic later
}

// --- Preload Textures ---
function preloadAssets() {
    return new Promise((resolve, reject) => {
        let loadedCount = 0;
        const totalAssets = 2 + MAX_DAMAGE_STAGE; // 2 gloves + 6 faces

        const onAssetLoad = () => {
            loadedCount++;
            console.log(`Loaded assets: ${loadedCount}/${totalAssets}`);
            if (loadedCount === totalAssets) {
                console.log("All assets preloaded.");
                resolve();
            }
        };
        const onAssetError = (url) => {
            console.error(`Error loading asset: ${url}`);
            onAssetLoad(); // Allow continuing even if an asset fails for now
        };

        // Load Gloves
        textureLoader.load('assets/leftglove.png', (tex) => { gloveTextures.left = tex; onAssetLoad(); }, undefined, () => onAssetError('assets/leftglove.png'));
        textureLoader.load('assets/rightglove.png', (tex) => { gloveTextures.right = tex; onAssetLoad(); }, undefined, () => onAssetError('assets/rightglove.png'));

        // Load Faces
        for (let i = 1; i <= MAX_DAMAGE_STAGE; i++) {
            const url = `assets/Face${i}.png`;
            textureLoader.load(url, (tex) => { faceTextures[i - 1] = tex; onAssetLoad(); }, undefined, () => onAssetError(url));
        }
    });
}

// --- Target Movement Function ---
function moveTarget() {
    if (!targetMesh) return;

    // Store the current position before moving
    previousTargetPosition.set(targetMesh.position.x, targetMesh.position.y);

    // Calculate overall boundaries
    const targetAreaWidth = WORLD_WIDTH * TARGET_AREA_WIDTH_RATIO;
    const targetAreaHeight = WORLD_HEIGHT * TARGET_AREA_HEIGHT_RATIO;
    const minXOverall = -targetAreaWidth / 2 + TARGET_SIZE / 2;
    const maxXOverall = targetAreaWidth / 2 - TARGET_SIZE / 2;
    const minY = -targetAreaHeight / 2 + TARGET_SIZE / 2;
    const maxY = targetAreaHeight / 2 - TARGET_SIZE / 2;

    // Define the excluded center zone
    const centerExclusion = targetAreaWidth * 0.25;
    const leftMaxX = -centerExclusion / 2;
    const rightMinX = centerExclusion / 2;

    let randomX, randomY;
    let attempts = 0;
    let distance = 0;

    // Loop to find a position far enough away
    do {
        // Randomly choose left (0) or right (1) side
        if (Math.random() < 0.5) {
            // Spawn on Left Side
            const minXLeft = minXOverall;
            const maxXLeft = Math.min(maxXOverall, leftMaxX - TARGET_SIZE / 2);
            if (maxXLeft > minXLeft) {
                randomX = Math.random() * (maxXLeft - minXLeft) + minXLeft;
            } else {
                 randomX = Math.random() * (leftMaxX - minXOverall) + minXOverall; // Fallback
            }
        } else {
            // Spawn on Right Side
            const minXRight = Math.max(minXOverall, rightMinX + TARGET_SIZE / 2);
            const maxXRight = maxXOverall;
             if (maxXRight > minXRight) {
                randomX = Math.random() * (maxXRight - minXRight) + minXRight;
             } else {
                 randomX = Math.random() * (maxXOverall - rightMinX) + rightMinX; // Fallback
             }
        }

        // Generate random Y within the full vertical range
        randomY = Math.random() * (maxY - minY) + minY;

        // Calculate distance from previous position
        const dx = randomX - previousTargetPosition.x;
        const dy = randomY - previousTargetPosition.y;
        distance = Math.sqrt(dx * dx + dy * dy);

        attempts++;

    } while (distance < MIN_TARGET_MOVE_DISTANCE && attempts < MAX_MOVE_ATTEMPTS);

    if (attempts >= MAX_MOVE_ATTEMPTS) {
        console.warn(`Could not find target position > ${MIN_TARGET_MOVE_DISTANCE} away after ${attempts} attempts.`);
    }

    targetMesh.position.set(randomX, randomY, targetMesh.position.z);
    // console.log(`Target moved to side: (${randomX.toFixed(2)}, ${randomY.toFixed(2)}) Dist: ${distance.toFixed(2)}`);
}

// --- Update Target Texture Function ---
function updateTargetTexture() {
    const stageIndex = Math.max(0, target_damage_stage - 1);
    if (targetMesh && faceTextures[stageIndex]) {
        targetMesh.material.map = faceTextures[stageIndex];
        targetMesh.material.needsUpdate = true; // Important!
        // console.log(`Target texture updated to stage ${target_damage_stage}`);
    } else {
        console.warn(`Could not update target texture to stage ${target_damage_stage}. Missing mesh or texture index ${stageIndex}`);
    }
}

// --- Three.js Setup ---
async function setupThreeJS() {
    await preloadAssets();

    // Get UI Elements (Ensure correct IDs and variable names)
    uiContainer = document.getElementById('ui-container');
    titleScreen = document.getElementById('title-screen');
    hud = document.getElementById('hud');
    scoreElement = document.getElementById('score');
    timerElement = document.getElementById('timer');
    gameOverScreen = document.getElementById('game-over-screen');
    finalScoreElement = document.getElementById('final-score');
    // Correctly assign goTitleButton using its ID
    goTitleButton = document.getElementById('go-title-button');
    shareScoreButton = document.getElementById('share-score-button'); // Get share button
    durationButtons = document.querySelectorAll('.duration-button');

    // Add Event Listeners
    durationButtons.forEach(button => {
        button.addEventListener('click', () => {
            const duration = parseInt(button.getAttribute('data-duration'), 10);
            startGame(duration);
        });
    });
    // Use the correct variable for the listener
    if(goTitleButton) {
        goTitleButton.addEventListener('click', showTitleScreen);
    } else { console.error("Go Title button not found!"); }
    if(shareScoreButton) { shareScoreButton.addEventListener('click', shareScoreAction); } else { console.error("Share Score button not found!"); }

    scene = new THREE.Scene();
    // --- Use video texture for background ---
    const videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    // --- SET TEXTURE COLOR SPACE ---
    videoTexture.colorSpace = THREE.SRGBColorSpace;

    // Flip the background video texture horizontally
    videoTexture.wrapS = THREE.RepeatWrapping;
    videoTexture.repeat.x = -1;

    scene.background = videoTexture;

    // Camera & World Size Calculation
    const aspect = window.innerWidth / window.innerHeight;
    WORLD_HEIGHT = WORLD_WIDTH / aspect; // Calculate height based on new width and aspect ratio
    console.log(`World dimensions: ${WORLD_WIDTH.toFixed(2)} x ${WORLD_HEIGHT.toFixed(2)}`);

    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.z = 6; // Pull back slightly more for wider view?

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // --- SET RENDERER OUTPUT COLOR SPACE ---
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Match texture color space for output
    document.body.appendChild(renderer.domElement);

    // Create Landmark Spheres (Optional visualization)
    const sphereGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    for (let i = 0; i < MAX_LANDMARKS; i++) {
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.visible = false;
        landmarkSpheres.push(sphere);
        scene.add(sphere);
    }
    // console.log(`Created ${MAX_LANDMARKS} landmark spheres.`);

    // Create Target Object
    const targetGeometry = new THREE.PlaneGeometry(TARGET_SIZE, TARGET_SIZE);
    const targetMaterial = new THREE.MeshBasicMaterial({
        map: faceTextures[0], // Index 0 is Face1
        transparent: true // Use transparency from PNG
    });
    targetMesh = new THREE.Mesh(targetGeometry, targetMaterial);
    // targetMesh.position.set(0, 0, 0); // Position set by moveTarget now
    scene.add(targetMesh);
    // console.log("Target mesh created and added to scene.");
    moveTarget(); // Move target to initial random position

    // Create Fist Visuals (Glove Planes)
    const gloveGeometry = new THREE.PlaneGeometry(GLOVE_SIZE, GLOVE_SIZE);
    // Use basic materials initially, textures assigned in onHandResults
    const defaultGloveMaterial = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, side: THREE.DoubleSide });
    for (let i = 0; i < 2; i++) {
        // Clone material so each glove can have a different texture later
        const gloveMaterial = defaultGloveMaterial.clone();
        const glovePlane = new THREE.Mesh(gloveGeometry, gloveMaterial);
        glovePlane.visible = false;
        fistMeshes.push(glovePlane);
        scene.add(glovePlane);
    }
    // console.log("Created 2 glove plane meshes.");

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Start animation loop
    animate();

    console.log("Three.js setup complete.");
    gameIsActive = true; // Allow hits after setup (TODO: Link to game state later)
}

function onWindowResize() {
    // Recalculate aspect and world height, update camera AND background texture
    const aspect = window.innerWidth / window.innerHeight;
    WORLD_HEIGHT = WORLD_WIDTH / aspect;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Update background texture aspect if needed (simple approach)
    if (scene.background instanceof THREE.VideoTexture) {
        // This doesn't automatically fix stretching perfectly if the video's
        // intrinsic aspect ratio differs greatly from the window aspect ratio,
        // but it's a starting point. Proper handling might involve adjusting
        // texture offsets/repeats or using a background plane.
    }

    console.log(`Resized - World dimensions: ${WORLD_WIDTH.toFixed(2)} x ${WORLD_HEIGHT.toFixed(2)}`);
}

function animate() {
    requestAnimationFrame(animate);

    // Add animations or updates here later

    // Render the scene
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// --- Webcam Setup ---
async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoElement.srcObject = stream;
        return new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                videoElement.play();
                resolve(videoElement);
            };
        });
    } catch (error) {
        console.error("Error accessing webcam:", error);
        alert("Could not access webcam. Please ensure permission is granted.");
        throw error; // Re-throw to stop execution if camera fails
    }
}

// --- MediaPipe Hands Setup ---
// Check if the global 'Hands' constructor is available
if (typeof Hands === 'undefined') {
    console.error("MediaPipe Hands library not loaded.");
} else {
    const hands = new Hands({
        locateFile: (file) => {
            // Make sure the path is correct based on the CDN URL
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`;
        }
    });

    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 0, // Use the lighter model (0 instead of 1)
        minDetectionConfidence: 0.6, // Lowered based on Python version
        minTrackingConfidence: 0.4,  // Lowered based on Python version
    });

    // Callback function when hand tracking results are available
    hands.onResults(onHandResults);

    function onHandResults(results) {
        // Only process visuals if game is playing or in name entry (to show background)
        const processVisuals = currentGameState === GameState.PLAYING;

        if (!processVisuals && currentGameState !== GameState.TITLE) {
            // If not processing visuals and not on title screen, something is wrong, maybe default to title
            // showTitleScreen(); // Avoid infinite loop if title screen itself fails
            return;
        }

         // Hide/show 3D elements based on state
        const show3D = currentGameState === GameState.PLAYING;
        if(targetMesh) targetMesh.visible = show3D;
        if(fistMeshes) fistMeshes.forEach(mesh => mesh.visible = show3D);


        if (processVisuals) { // Only update positions if needed
            let visibleLandmarkCount = 0; let visibleFistCount = 0; const detectedHands = [];
            if (results.multiHandLandmarks) { for (let handIndex = 0; handIndex < results.multiHandLandmarks.length; handIndex++) { const landmarks = results.multiHandLandmarks[handIndex]; detectedHands[handIndex] = { landmarks: landmarks, avgX: 0, avgY: 0, avgZ: 0, mcpCount: 0 }; const mcpIndices = [5, 9, 13, 17]; for (const index of mcpIndices) { if (landmarks[index]) { detectedHands[handIndex].avgX += landmarks[index].x; detectedHands[handIndex].avgY += landmarks[index].y; detectedHands[handIndex].avgZ += landmarks[index].z; detectedHands[handIndex].mcpCount++; } } if (detectedHands[handIndex].mcpCount > 0) { detectedHands[handIndex].avgX /= detectedHands[handIndex].mcpCount; detectedHands[handIndex].avgY /= detectedHands[handIndex].mcpCount; detectedHands[handIndex].avgZ /= detectedHands[handIndex].mcpCount; } for (let landmarkIndex = 0; landmarkIndex < landmarks.length; landmarkIndex++) { const landmark = landmarks[landmarkIndex]; const sphereIndex = handIndex * 21 + landmarkIndex; if (sphereIndex < landmarkSpheres.length) { const sphere = landmarkSpheres[sphereIndex]; const threeX = -(landmark.x - 0.5) * WORLD_WIDTH; const threeY = -(landmark.y - 0.5) * WORLD_HEIGHT; const threeZ = -landmark.z * DEPTH_SCALE; sphere.position.set(threeX, threeY, threeZ); sphere.visible = false; visibleLandmarkCount++; } } } }
            let physicalLeftHandDetectedIndex = -1; let physicalRightHandDetectedIndex = -1; if (detectedHands.length === 1 && detectedHands[0].mcpCount > 0) { physicalRightHandDetectedIndex = 0; } else if (detectedHands.length === 2 && detectedHands[0].mcpCount > 0 && detectedHands[1].mcpCount > 0) { if (detectedHands[0].avgX < detectedHands[1].avgX) { physicalRightHandDetectedIndex = 0; physicalLeftHandDetectedIndex = 1; } else { physicalRightHandDetectedIndex = 1; physicalLeftHandDetectedIndex = 0; } } for (let i = 0; i < 2; i++) { const fistMesh = fistMeshes[i]; let handData = null; let texture = null; if (i === 0 && physicalRightHandDetectedIndex !== -1) { handData = detectedHands[physicalRightHandDetectedIndex]; texture = gloveTextures.right; } else if (i === 1 && physicalLeftHandDetectedIndex !== -1) { handData = detectedHands[physicalLeftHandDetectedIndex]; texture = gloveTextures.left; } if (handData && handData.mcpCount > 0 && texture ) { const fistX = -(handData.avgX - 0.5) * WORLD_WIDTH; const fistY = -(handData.avgY - 0.5) * WORLD_HEIGHT; const fistZ = -handData.avgZ * DEPTH_SCALE + 0.1; fistMesh.position.set(fistX, fistY, fistZ); if (fistMesh.material.map !== texture) { fistMesh.material.map = texture; fistMesh.material.needsUpdate = true; } fistMesh.visible = show3D; // Only show if playing
                 if(show3D) visibleFistCount++;
             } else {
                 fistMesh.visible = false;
             }
         }
             // Hide unused landmark spheres
            for (let i = 0; i < landmarkSpheres.length; i++) { if (i >= visibleLandmarkCount) landmarkSpheres[i].visible = false; }
             // Hide unused fist meshes (already handled in loop above if not detected)
            // We need this additional check in case a hand is detected but processVisuals is false for that frame somehow
             for (let i = visibleFistCount; i < fistMeshes.length; i++) { if(fistMeshes[i]) fistMeshes[i].visible = false; }

        }


        // Collision Detection only if playing
        if (currentGameState === GameState.PLAYING && targetMesh && targetMesh.visible) {
            for (let i = 0; i < fistMeshes.length; i++) {
                const fistMesh = fistMeshes[i];
                if (fistMesh.visible) {
                    const currentTime = Date.now();
                    if (currentTime - last_punch_time[i] > punch_cooldown) {
                        const dx = fistMesh.position.x - targetMesh.position.x;
                        const dy = fistMesh.position.y - targetMesh.position.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < HIT_DISTANCE_THRESHOLD) {
                            score++;
                            scoreElement.textContent = `Score: ${score}`;
                            current_round_hits++;
                            last_punch_time[i] = currentTime;
                            moveTarget();
                            const new_stage = Math.min(MAX_DAMAGE_STAGE, 1 + Math.floor(current_round_hits / HITS_PER_STAGE));
                            if (new_stage !== target_damage_stage) {
                                target_damage_stage = new_stage;
                                updateTargetTexture();
                            }
                            break;
                        }
                    }
                }
            }
        }

    } // End onHandResults

    // --- Main Processing Loop ---
    async function startApp() {
        await setupThreeJS(); // Wait for assets and Three.js setup
        await setupCamera(); // Then setup camera
        console.log("Camera setup complete. MediaPipe loop starting.");
        animate(); // Start the animation loop
    }

    startApp(); // Start the application setup process
}

// --- Share Score Functionality ---
async function shareScoreAction() {
    if (!screenshotDataUrl) {
        console.error("No screenshot available to share.");
        alert("Could not generate score image.");
        return;
    }

    const shareText = `I scored ${score} in VibeBoxing (${selectedDuration}s)! Can you beat it? #VibeBoxing`;
    const shareUrl = "https://vibeboxing.netlify.app";

    try {
        // Convert data URL to Blob for sharing
        const response = await fetch(screenshotDataUrl);
        const blob = await response.blob();
        const file = new File([blob], `vibeboxing_score_${score}.png`, { type: 'image/png' });

        const shareData = {
            title: "VibeBoxing Score!",
            text: shareText,
            url: shareUrl, // Optional: include URL in text body too
            files: [file]
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            console.log("Attempting Web Share API...");
            await navigator.share(shareData);
            console.log("Score shared successfully!");
        } else {
            console.log("Web Share API not supported or cannot share data, falling back to download.");
            downloadScreenshot();
        }
    } catch (error) {
        console.error("Error sharing score:", error);
        // Fallback to download if sharing fails
        alert("Sharing failed. Downloading score image instead.");
        downloadScreenshot();
    }
}

function downloadScreenshot() {
    if (!screenshotDataUrl) return;
    const link = document.createElement('a');
    link.download = `vibeboxing_score_${score}.png`;
    link.href = screenshotDataUrl;
    link.click();
    link.remove();
    console.log("Screenshot download initiated.");
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Content Loaded. Initializing...");

    // Get UI elements
    uiContainer = document.getElementById('ui-container');
    titleScreen = document.getElementById('title-screen');
    hud = document.getElementById('hud');
    scoreElement = document.getElementById('score');
    timerElement = document.getElementById('timer');
    gameOverScreen = document.getElementById('game-over-screen');
    finalScoreElement = document.getElementById('final-score');
    goTitleButton = document.getElementById('go-title-button');
    shareScoreButton = document.getElementById('share-score-button'); // Get share button

    // Get duration buttons
    durationButtons = titleScreen.querySelectorAll('.duration-button');

    // Add event listeners for duration buttons
    durationButtons.forEach(button => {
        button.addEventListener('click', () => {
            const duration = parseInt(button.dataset.duration, 10);
            if (!isNaN(duration)) {
                startGame(duration);
            }
        });
    });

    // Add event listener for Back to Title button
    if (goTitleButton) {
        goTitleButton.addEventListener('click', () => {
             currentGameState = GameState.TITLE;
             showTitleScreen();
        });
    }

    // Add event listener for Share Score button
    if (shareScoreButton) {
        shareScoreButton.addEventListener('click', shareScoreAction);
        shareScoreButton.disabled = true; // Disable initially until screenshot is ready
    }

    // Show title screen initially
    showTitleScreen();

    try {
        await preloadAssets();
        await setupCamera(); // Setup camera first to get video dimensions
        await setupThreeJS(); // Then setup ThreeJS which depends on camera aspect
        setupMediaPipe(); // Then setup MediaPipe
        animate(); // Start the animation loop
    } catch (error) {
        console.error("Initialization failed:", error);
        // TODO: Display a user-friendly error message on the screen
        if(titleScreen) titleScreen.innerHTML = `<p style="color: red; font-size: 1.2em;">Initialization failed. Please ensure webcam access is allowed and refresh. Error: ${error.message}</p>`;
    }
}); 