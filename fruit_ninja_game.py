import cv2
import mediapipe as mp
import numpy as np
import time
import random
import os # Import os for path joining
import json # Import json for high scores

# Initialize MediaPipe Hands - Allow two hands, adjust confidences
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=2, min_detection_confidence=0.6, min_tracking_confidence=0.4)
mp_draw = mp.solutions.drawing_utils

# Initialize OpenCV VideoCapture
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("Error: Could not open webcam.")
    exit()

# --- Game States ---
STATE_TITLE_SCREEN = 0
STATE_SELECT_TIME = 1
STATE_COUNTDOWN = 2
STATE_SHOW_RESULTS = 3
STATE_GET_NAME = 4
STATE_LEADERBOARD = 5

# --- Constants ---
HIGH_SCORE_FILE = "high_scores.json"
MAX_HIGH_SCORES = 5 # Number of scores to keep per category
TIME_OPTIONS = {30: '1', 60: '2'} # Reduced time options (Key: duration, Value: display char)
KEY_TO_DURATION = {ord(v): k for k, v in TIME_OPTIONS.items()} # Map key code to duration
MAX_NAME_LENGTH = 10 # Max characters for high score name

# --- Game Variables ---
current_state = STATE_TITLE_SCREEN # Start at title screen
punch_count = 0
selected_duration = 0
start_time = 0
remaining_time = 0
final_score = 0
high_scores = {} # Loaded at start, format: {"30": [{"name": "ABC", "score": 10}, ...], "60": [...]}
new_high_score_achieved = False
current_name_input = "" # For name entry state
current_round_hits = 0 # Total hits in this round
target_damage_stage = 1 # Current face stage (1-6)

# Target variables
target_rect = None
target_size = 260 # Increased target size significantly
hit_display_duration = 0.3 # Keep for potential future use?

# Remove line variables
# line_y = None
# line_color = (0, 255, 255)
# punch_line_color = (255, 255, 255)

last_punch_time = [0, 0]
punch_cooldown = 0.2 # Restore cooldown to prevent counts when speed check is off
min_punch_speed = 8   # Lowered speed threshold further

# Store average fist positions now
prev_avg_pos = [None, None]
current_avg_pos = [None, None]
fist_visual_radius = 70 # Radius of the blue circle for visualization
fist_collision_radius = fist_visual_radius + 20 # Larger radius for hit detection
glove_size = 280 # Increased display size for glove images

# --- Load Assets ---
left_glove_img = cv2.imread(os.path.join('assets', 'leftglove.png'), cv2.IMREAD_UNCHANGED)
right_glove_img = cv2.imread(os.path.join('assets', 'rightglove.png'), cv2.IMREAD_UNCHANGED)

if left_glove_img is None or right_glove_img is None:
    print("Error: Could not load glove images from 'assets' folder.")
    print("Please ensure 'leftglove.png' and 'rightglove.png' exist in 'assets'.")
    # Optionally, create fallback colored circles if images fail
    left_glove_img = None # Indicate loading failure
    right_glove_img = None
else:
    left_glove_img = cv2.resize(left_glove_img, (glove_size, glove_size))
    right_glove_img = cv2.resize(right_glove_img, (glove_size, glove_size))

# Load Logo
logo_img = cv2.imread(os.path.join('assets', 'VibeBoxing.png'), cv2.IMREAD_UNCHANGED)
if logo_img is None:
    print("Warning: Could not load logo image 'assets/VibeBoxing.png'.")
    logo_img_resized = None
else:
    # Resize logo (adjust scale factor as needed)
    logo_scale = 0.6
    logo_w = int(logo_img.shape[1] * logo_scale)
    logo_h = int(logo_img.shape[0] * logo_scale)
    logo_img_resized = cv2.resize(logo_img, (logo_w, logo_h))

# Load Select Duration Image
select_duration_img = cv2.imread(os.path.join('assets', 'Selectduration.png'), cv2.IMREAD_UNCHANGED)
if select_duration_img is None:
    print("Warning: Could not load image 'assets/Selectduration.png'. Will use text fallback.")
    select_duration_img_resized = None
else:
    # Scale based on screen width (adjust scale factor as needed)
    select_duration_scale = 0.3 # Reduced scale further
    # Need width for scaling, get it later in the loop, so store original for now
    pass # Resize will happen in the loop once width is known

# Load Face Images (Stages 1-4)
def load_face_image(filename, size):
    img = cv2.imread(os.path.join('assets', filename), cv2.IMREAD_UNCHANGED)
    if img is None:
        print(f"Error: Could not load target image 'assets/{filename}'.")
        return None
    return cv2.resize(img, (size, size))

target_face_images = [
    load_face_image('Face1.png', target_size), # Stage 1 (index 0)
    load_face_image('Face2.png', target_size), # Stage 2 (index 1)
    load_face_image('Face3.png', target_size), # Stage 3 (index 2)
    load_face_image('Face4.png', target_size), # Stage 4 (index 3)
    load_face_image('Face5.png', target_size), # Stage 5 (index 4)
    load_face_image('Face6.png', target_size)  # Stage 6 (index 5)
]

# Check if base image loaded
if target_face_images[0] is None:
    print("CRITICAL ERROR: Base target image Face1.png failed to load. Exiting.")
    exit()

# --- Load/Save High Scores (Modified for List Structure) ---
def load_high_scores():
    """Loads high scores (list of dicts) from the JSON file."""
    default_scores = {str(duration): [] for duration in TIME_OPTIONS.keys()}
    if not os.path.exists(HIGH_SCORE_FILE):
        print("High score file not found, creating default.")
        return default_scores
    try:
        with open(HIGH_SCORE_FILE, 'r') as f:
            loaded_scores_str_keys = json.load(f)
            # Validate and convert keys back to int where needed for lookup, ensure lists exist
            scores = default_scores.copy()
            for duration_str, score_list in loaded_scores_str_keys.items():
                if duration_str in scores: # Check if it's a valid duration string ('30', '60')
                    if isinstance(score_list, list):
                        # Basic validation of list items
                        valid_entries = []
                        for entry in score_list:
                            if isinstance(entry, dict) and 'name' in entry and 'score' in entry:
                                try:
                                    # Ensure score is int
                                    entry['score'] = int(entry['score'])
                                    valid_entries.append(entry)
                                except (ValueError, TypeError):
                                    print(f"Warning: Invalid score format in entry {entry}")
                            else:
                                print(f"Warning: Invalid entry format {entry}")
                        # Sort and truncate loaded valid entries
                        valid_entries.sort(key=lambda x: x['score'], reverse=True)
                        scores[duration_str] = valid_entries[:MAX_HIGH_SCORES]
                    else:
                        print(f"Warning: Invalid data type for duration {duration_str} in high scores file.")
                else:
                    print(f"Warning: Unknown duration key '{duration_str}' in high scores file.")
            return scores # Return dict with string keys '30', '60'
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading high scores: {e}. Using defaults.")
        return default_scores

def save_high_scores(scores):
    """Saves high scores (list of dicts) to the JSON file."""
    try:
        # Ensure scores dict has string keys '30', '60'
        scores_to_save = {str(k): v for k, v in scores.items() if str(k) in ['30', '60']}
        with open(HIGH_SCORE_FILE, 'w') as f:
            json.dump(scores_to_save, f, indent=4)
        print("High scores saved.")
    except IOError as e:
        print(f"Error saving high scores: {e}")

# --- Helper Functions ---
def draw_text(img, text, pos, scale=1, color=(255, 255, 255), thickness=2):
    cv2.putText(img, text, pos, cv2.FONT_HERSHEY_SIMPLEX, scale, color, thickness, cv2.LINE_AA)

# Helper to overlay transparent PNG
def overlay_transparent(background, overlay, x, y):
    # Check if overlay image is valid
    if overlay is None or overlay.shape[2] < 4: # Ensure it has alpha channel
        return background

    h, w, _ = overlay.shape
    bg_h, bg_w, _ = background.shape

    # Calculate ROI boundaries, handling edge cases
    x1, x2 = max(0, x), min(bg_w, x + w)
    y1, y2 = max(0, y), min(bg_h, y + h)

    overlay_x1 = max(0, -x)
    overlay_y1 = max(0, -y)
    overlay_x2 = overlay_x1 + (x2 - x1)
    overlay_y2 = overlay_y1 + (y2 - y1)

    # Ensure dimensions match
    if (y2 - y1) <= 0 or (x2 - x1) <= 0:
        return background # No overlap

    # Get ROI
    roi = background[y1:y2, x1:x2]
    overlay_crop = overlay[overlay_y1:overlay_y2, overlay_x1:overlay_x2]

    # Extract alpha channel and create masks
    alpha = overlay_crop[:, :, 3] / 255.0
    alpha_inv = 1.0 - alpha

    # Blend images
    for c in range(0, 3):
        roi[:, :, c] = (alpha * overlay_crop[:, :, c] +
                        alpha_inv * roi[:, :, c])

    background[y1:y2, x1:x2] = roi
    return background

# Helper for Circle-Rectangle Intersection (Using this again)
def check_circle_rect_collision(circle_center, circle_radius, rect_x, rect_y, rect_w, rect_h):
    if circle_center is None:
        return False
    cx, cy = circle_center
    # Find the closest point to the circle within the rectangle
    closest_x = np.clip(cx, rect_x, rect_x + rect_w)
    closest_y = np.clip(cy, rect_y, rect_y + rect_h)
    # Calculate the distance between the circle's center and this closest point
    distance_x = cx - closest_x
    distance_y = cy - closest_y
    # If the distance is less than the circle's radius, an overlap occurs
    distance_squared = (distance_x ** 2) + (distance_y ** 2)
    return distance_squared < (circle_radius ** 2)

# --- New Helpers for Line Segment Intersection ---
def on_segment(p, q, r):
    """Check if point q lies on segment pr"""
    return (q[0] <= max(p[0], r[0]) and q[0] >= min(p[0], r[0]) and
            q[1] <= max(p[1], r[1]) and q[1] >= min(p[1], r[1]))

def orientation(p, q, r):
    """Find orientation of ordered triplet (p, q, r)."""
    val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1])
    if val == 0: return 0  # Collinear
    return 1 if val > 0 else 2  # Clockwise or Counterclockwise

def intersect(p1, q1, p2, q2):
    """Check if line segment 'p1q1' and 'p2q2' intersect."""
    if p1 is None or q1 is None or p2 is None or q2 is None:
        return False

    o1 = orientation(p1, q1, p2)
    o2 = orientation(p1, q1, q2)
    o3 = orientation(p2, q2, p1)
    o4 = orientation(p2, q2, q1)

    # General case
    if o1 != o2 and o3 != o4:
        return True

    # Special Cases (points are collinear)
    if o1 == 0 and on_segment(p1, p2, q1): return True
    if o2 == 0 and on_segment(p1, q2, q1): return True
    if o3 == 0 and on_segment(p2, p1, q2): return True
    if o4 == 0 and on_segment(p2, q1, q2): return True

    return False # Doesn't intersect
# --- End New Helpers ---

def move_target(width, height):
    """Moves the target to a new random location."""
    global target_rect
    # Ensure target stays fully within screen bounds
    max_x = width - target_size
    max_y = height - target_size
    new_x = random.randint(0, max_x)
    new_y = random.randint(0, max_y)
    target_rect = (new_x, new_y, target_size, target_size)
    print(f"Target moved to: ({new_x}, {new_y})")

# --- State Reset/Setup (Modified) ---
def setup_state(new_state, duration=0):
    global current_state, punch_count, selected_duration, start_time, remaining_time
    global prev_avg_pos, current_avg_pos, final_score, last_punch_time, target_rect
    global new_high_score_achieved, current_name_input
    global current_round_hits, target_damage_stage # Add new vars

    # Reset flags/inputs relevant to multiple states
    new_high_score_achieved = False
    current_name_input = "" # Clear name input buffer

    # Logic specific to the *target* state
    if new_state == STATE_SHOW_RESULTS:
        final_score = punch_count
        print(f"Time's up! Final Score: {final_score}")
        # Check if it qualifies for high score list
        duration_key = str(selected_duration)
        score_list = high_scores.get(duration_key, [])
        # Qualifies if list is not full OR score is higher than the lowest score
        if len(score_list) < MAX_HIGH_SCORES or final_score > score_list[-1]['score']:
            new_high_score_achieved = True
            print(f"High score potentially achieved for {selected_duration}s!")
        # Transition is handled after results display based on new_high_score_achieved

    elif new_state == STATE_GET_NAME:
        print("Entering name for high score.")
        # No other setup needed, score is in final_score

    elif new_state == STATE_COUNTDOWN:
        punch_count = 0
        selected_duration = duration # Store selected duration
        start_time = time.time()
        remaining_time = selected_duration
        prev_avg_pos = [None, None]
        current_avg_pos = [None, None]
        last_punch_time = [0, 0]
        target_rect = None # Ensure target resets position
        current_round_hits = 0 # Reset round hits
        target_damage_stage = 1 # Reset damage stage
        print(f"Starting {duration}s countdown...")

    elif new_state == STATE_SELECT_TIME:
        punch_count = 0
        selected_duration = 0
        final_score = 0
        print("Select timer duration.")

    elif new_state == STATE_LEADERBOARD:
        print("Viewing Leaderboard.")

    elif new_state == STATE_TITLE_SCREEN:
        print("Returning to Title Screen.")
        punch_count = 0
        selected_duration = 0
        final_score = 0

    # Set the new state
    current_state = new_state
    prev_avg_pos = [None, None]
    current_avg_pos = [None, None]
    last_punch_time = [0, 0]
    target_rect = None
    current_round_hits = 0 # Reset round hits
    target_damage_stage = 1 # Reset damage stage

# --- Initial Setup ---
high_scores = load_high_scores()
# Start in Title Screen state directly
setup_state(STATE_TITLE_SCREEN)
print("VibeBoxing. Press 'q' to quit.")

# --- Main Loop ---
while True:
    success, frame = cap.read()
    if not success:
        print("Ignoring empty camera frame.")
        continue

    frame = cv2.flip(frame, 1)
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    height, width, _ = frame.shape

    # Define target rectangle on first frame of countdown state
    if current_state == STATE_COUNTDOWN and target_rect is None:
        move_target(width, height)

    # --- State Handling ---
    # Process key input non-blockingly for most states
    key = -1
    if current_state not in [STATE_SHOW_RESULTS, STATE_GET_NAME]: # Don't wait in results/name entry initially
        key = cv2.waitKey(5) & 0xFF

    if key == ord('q'):
        break

    # --- TITLE SCREEN State ---
    if current_state == STATE_TITLE_SCREEN:
        # Draw Logo
        if logo_img_resized is not None:
            logo_x = (width - logo_img_resized.shape[1]) // 2
            logo_y = height // 4 # Position near top
            frame = overlay_transparent(frame, logo_img_resized, logo_x, logo_y)
        else:
            draw_text(frame, "VibeBoxing", (width // 2 - 150, height // 3), 2)

        # Draw Buttons (Adjust Y positions and Colors)
        button_y_start = logo_y + logo_h + 60
        start_color = (64, 198, 251) # BGR for #FBC640
        leaderboard_color = (64, 198, 251) # BGR for #FBC640
        draw_text(frame, "Start Game (S)", (width // 2 - 150, button_y_start), 1.2, start_color)
        draw_text(frame, "Leaderboard (L)", (width // 2 - 170, button_y_start + 60), 1.2, leaderboard_color)

        if key == ord('s'):
            setup_state(STATE_SELECT_TIME)
        elif key == ord('l'):
            setup_state(STATE_LEADERBOARD)

    # --- LEADERBOARD State ---
    elif current_state == STATE_LEADERBOARD:
        # Define layout parameters
        column_width = int(width * 0.35) # Width of each column background
        gap = int(width * 0.1)       # Gap between columns
        total_content_width = 2 * column_width + gap
        margin = (width - total_content_width) // 2

        header_y = 100
        lb_text_color = (0, 255, 255) # Yellow text
        border_color = (255, 255, 255) # White border
        border_thickness = 2

        # --- Calculate Column Bounds ---
        # Column 1 (30s)
        lb1_x = margin
        lb1_w = column_width
        col1_x = lb1_x + 30 # Text start position inside column 1 (padding)

        # Column 2 (60s)
        lb2_x = margin + column_width + gap
        lb2_w = column_width
        col2_x = lb2_x + 30 # Text start position inside column 2 (padding)

        # Common Y and Height
        lb_y = header_y - 40 # Top margin
        lb_h = header_y + (MAX_HIGH_SCORES * 40) + 20 - lb_y # Height

        # --- Draw Backgrounds ---
        overlay = frame.copy()
        lb_bg_color = (0, 79, 139) # BGR for #8B4F00
        alpha = 0.6 # Transparency factor
        cv2.rectangle(overlay, (lb1_x, lb_y), (lb1_x + lb1_w, lb_y + lb_h), lb_bg_color, -1) # BG Col 1
        cv2.rectangle(overlay, (lb2_x, lb_y), (lb2_x + lb2_w, lb_y + lb_h), lb_bg_color, -1) # BG Col 2
        frame = cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0)

        # --- Draw Borders (AFTER blending background) ---
        cv2.rectangle(frame, (lb1_x, lb_y), (lb1_x + lb1_w, lb_y + lb_h), border_color, border_thickness) # Border Col 1
        cv2.rectangle(frame, (lb2_x, lb_y), (lb2_x + lb2_w, lb_y + lb_h), border_color, border_thickness) # Border Col 2

        # --- Draw Text Content ---
        # Headers
        # Adjust header text position slightly to center better over text area
        header1_x = col1_x + (lb1_w - 2*30) // 2 - int(cv2.getTextSize("30 Seconds", cv2.FONT_HERSHEY_SIMPLEX, 1.2, 2)[0][0] / 2)
        header2_x = col2_x + (lb2_w - 2*30) // 2 - int(cv2.getTextSize("60 Seconds", cv2.FONT_HERSHEY_SIMPLEX, 1.2, 2)[0][0] / 2)
        draw_text(frame, "30 Seconds", (header1_x, header_y), 1.2, lb_text_color)
        draw_text(frame, "60 Seconds", (header2_x, header_y), 1.2, lb_text_color)

        # Scores
        y_offset = 60
        for i in range(MAX_HIGH_SCORES):
            # 30s column (using col1_x for text)
            score_list_30 = high_scores.get('30', [])
            if i < len(score_list_30):
                entry = score_list_30[i]
                text = f"{i+1}. {entry['name']} - {entry['score']}"
                draw_text(frame, text, (col1_x, header_y + y_offset), 1, lb_text_color)
            else:
                text = f"{i+1}. ---"
                draw_text(frame, text, (col1_x, header_y + y_offset), 1, (180, 180, 180))

            # 60s column (using col2_x for text)
            score_list_60 = high_scores.get('60', [])
            if i < len(score_list_60):
                entry = score_list_60[i]
                text = f"{i+1}. {entry['name']} - {entry['score']}"
                draw_text(frame, text, (col2_x, header_y + y_offset), 1, lb_text_color)
            else:
                text = f"{i+1}. ---"
                draw_text(frame, text, (col2_x, header_y + y_offset), 1, (180, 180, 180))

            y_offset += 40

        # Draw Back button with yellow color
        draw_text(frame, "Back (B)", (50, height - 50), 1, lb_text_color)
        if key == ord('b'):
            setup_state(STATE_TITLE_SCREEN)

    # --- SELECT TIME State ---
    elif current_state == STATE_SELECT_TIME:
        # Draw the Select Duration image instead of text
        if select_duration_img is not None:
            # Resize only once or if window size changes (if that's handled)
            # For simplicity, resize each time here based on current frame width
            select_duration_w = int(width * select_duration_scale)
            select_duration_h = int(select_duration_img.shape[0] * (select_duration_w / select_duration_img.shape[1]))
            select_duration_img_resized = cv2.resize(select_duration_img, (select_duration_w, select_duration_h))

            img_x = (width - select_duration_w) // 2
            img_y = (height - select_duration_h) // 2 # Center vertically
            frame = overlay_transparent(frame, select_duration_img_resized, img_x, img_y)
        else:
            # Fallback text if image failed to load
            select_time_color = (0, 255, 255) # Yellow text
            draw_text(frame, "Select Duration:", (width // 2 - 250, height // 2 - 100), 1.2, select_time_color)
            y_offset = -20
            for duration, key_char in TIME_OPTIONS.items():
                text = f"({key_char}) {duration}s"
                draw_text(frame, text, (width // 2 - 100, height // 2 + y_offset), 1, select_time_color)
                y_offset += 60

        if key in KEY_TO_DURATION:
            setup_state(STATE_COUNTDOWN, duration=KEY_TO_DURATION[key])

    # --- COUNTDOWN State ---
    elif current_state == STATE_COUNTDOWN:
        elapsed_time = time.time() - start_time
        remaining_time = max(0, selected_duration - elapsed_time)

        # --- Draw Target First ---
        if target_rect:
            tx, ty, tw, th = target_rect
            # Select face image based on damage stage (adjust for 0-based index)
            stage_index = max(0, target_damage_stage - 1)
            img_to_draw = None
            if stage_index < len(target_face_images) and target_face_images[stage_index] is not None:
                 img_to_draw = target_face_images[stage_index]
            else:
                 # Fallback drawing
                 for fallback_index in range(stage_index - 1, -2, -1):
                     if fallback_index == -1:
                          break
                     if fallback_index < len(target_face_images) and target_face_images[fallback_index] is not None:
                         img_to_draw = target_face_images[fallback_index]
                         break

            # Draw the selected face image or fallback rect
            if img_to_draw is not None:
                frame = overlay_transparent(frame, img_to_draw, tx, ty)
            else:
                cv2.rectangle(frame, (tx, ty), (tx + tw, ty + th), (0, 0, 255), -1)

        # --- Hand Detection & Glove Drawing (AFTER Target) ---
        results = hands.process(frame_rgb)
        prev_avg_pos[0] = current_avg_pos[0]
        prev_avg_pos[1] = current_avg_pos[1]
        current_avg_pos = [None, None]

        if results and results.multi_hand_landmarks:
            for hand_idx, hand_landmarks in enumerate(results.multi_hand_landmarks[:2]):
                # Determine Handedness (Left/Right)
                hand_label = 'Unknown'
                if results.multi_handedness and hand_idx < len(results.multi_handedness):
                    hand_label = results.multi_handedness[hand_idx].classification[0].label

                # Get landmarks for fist calculation (MCP joints)
                landmarks_for_fist = [
                    mp_hands.HandLandmark.INDEX_FINGER_MCP,
                    mp_hands.HandLandmark.MIDDLE_FINGER_MCP,
                    mp_hands.HandLandmark.RING_FINGER_MCP,
                    mp_hands.HandLandmark.PINKY_MCP
                ]
                fist_points = []
                valid_points = True
                for lm_idx in landmarks_for_fist:
                    lm = hand_landmarks.landmark[lm_idx]
                    if lm:
                         fist_points.append((int(lm.x * width), int(lm.y * height)))
                    else:
                         valid_points = False
                         break

                # Calculate average position
                avg_pos_this_hand = None
                if valid_points and len(fist_points) > 0:
                    avg_x = int(np.mean([p[0] for p in fist_points]))
                    avg_y = int(np.mean([p[1] for p in fist_points]))
                    avg_pos_this_hand = (avg_x, avg_y)
                else:
                    # Fallback if points missing
                    middle_knuckle = hand_landmarks.landmark[mp_hands.HandLandmark.MIDDLE_FINGER_MCP]
                    if middle_knuckle:
                        cx_hit, cy_hit = int(middle_knuckle.x * width), int(middle_knuckle.y * height)
                        avg_pos_this_hand = (cx_hit, cy_hit) # Use middle knuckle as fallback avg

                # Assign position and draw glove based on handedness
                if avg_pos_this_hand is not None:
                    glove_to_draw = None
                    # Remember: Frame is flipped, so user's Right hand is on the Left screen side
                    if hand_label == 'Right':
                        current_avg_pos[0] = avg_pos_this_hand # Index 0 for Right Hand
                        glove_to_draw = right_glove_img
                    elif hand_label == 'Left':
                        current_avg_pos[1] = avg_pos_this_hand # Index 1 for Left Hand
                        glove_to_draw = left_glove_img

                    # Draw the selected glove or fallback circle
                    if glove_to_draw is not None:
                        glove_x = avg_pos_this_hand[0] - glove_size // 2
                        glove_y = avg_pos_this_hand[1] - glove_size // 2
                        frame = overlay_transparent(frame, glove_to_draw, glove_x, glove_y)
                    else:
                        # Fallback circle if glove image missing or hand unknown
                        cv2.circle(frame, avg_pos_this_hand, fist_visual_radius, (255, 0, 0), cv2.FILLED)

        # --- Target Hit Detection & Movement (Forgiving Circle Collision) ---
        if target_rect: # Ensure target exists
            tx, ty, tw, th = target_rect
            current_time = time.time()
            for i in range(2):
                # Check cooldown and if current avg pos is valid
                if current_avg_pos[i] and \
                   (current_time - last_punch_time[i] > punch_cooldown):

                    # Use circle-rect collision with the LARGER collision radius
                    collision = check_circle_rect_collision(current_avg_pos[i], fist_collision_radius, tx, ty, tw, th)

                    if collision:
                        print(f"Target hit by hand {i} (Forgiving Collision)!")
                        punch_count += 1
                        current_round_hits += 1 # Increment round hits
                        last_punch_time[i] = current_time # Mark hit time for cooldown

                        # Update damage stage (every 5 hits, cap at 6)
                        new_stage = min(6, 1 + current_round_hits // 5)
                        if new_stage != target_damage_stage:
                            target_damage_stage = new_stage
                            print(f"Target entering damage stage {target_damage_stage}")

                        move_target(width, height) # Move target immediately
                        break # Only one hit per frame moves the target

        # --- Display HUD ---
        draw_text(frame, f"Time: {remaining_time:.1f}s", (10, 40), 1.2)
        draw_text(frame, f"Targets Hit: {punch_count}", (width - 300, 40), 1.2) # Updated label

        # --- Check for Time Up ---
        if remaining_time <= 0:
            setup_state(STATE_SHOW_RESULTS)

    # --- SHOW RESULTS State ---
    elif current_state == STATE_SHOW_RESULTS:
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (width, height), (0, 0, 0), -1)
        alpha = 0.7
        frame = cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0)

        draw_text(frame, "Time's Up!", (width // 2 - 150, height // 2 - 120), 2, (0, 165, 255))
        draw_text(frame, f"Score: {final_score}", (width // 2 - 180, height // 2 - 40), 1.5)
        current_high = 0
        if str(selected_duration) in high_scores:
             score_list = high_scores[str(selected_duration)]
             if score_list: # Check if list not empty
                 current_high = score_list[0]['score'] # Highest is first
        draw_text(frame, f"High Score ({selected_duration}s): {current_high}", (width // 2 - 220, height // 2 + 10), 1.2)

        if new_high_score_achieved:
            draw_text(frame, "NEW HIGH SCORE!", (width // 2 - 200, height // 2 + 60), 1.2, (0, 255, 0))
            draw_text(frame, "Press Enter to Save / (R) Restart", (width // 2 - 290, height // 2 + 110), 1)
        else:
            draw_text(frame, "Press Enter to Continue / (R) Restart", (width // 2 - 310, height // 2 + 110), 1)

        # Display the frame *before* blocking waitKey
        cv2.imshow('VibeBoxing Target Practice', frame)

        # Wait for Enter key press (using blocking waitKey again)
        key = cv2.waitKey(0) & 0xFF # BLOCKING - wait here until key pressed

        if key == 13: # ASCII for Enter
            if new_high_score_achieved:
                setup_state(STATE_GET_NAME)
            else:
                setup_state(STATE_TITLE_SCREEN)
        elif key == ord('r'): # Restart same duration
            setup_state(STATE_COUNTDOWN, duration=selected_duration)
        elif key == ord('q'): # Allow quit from results screen
             break

    # --- GET NAME State ---
    elif current_state == STATE_GET_NAME:
        # Draw prompt
        draw_text(frame, "New High Score!", (width // 2 - 220, height // 2 - 100), 1.5, (0, 255, 0))
        draw_text(frame, f"Score: {final_score}", (width // 2 - 150, height // 2 - 40), 1.2)
        prompt_text = f"Enter Name: {current_name_input}"
        # Add simple blinking cursor effect (optional)
        if int(time.time() * 2) % 2 == 0:
            prompt_text += "_"
        draw_text(frame, prompt_text, (width // 2 - 250, height // 2 + 20), 1.2)
        draw_text(frame, f"({len(current_name_input)}/{MAX_NAME_LENGTH} chars, Enter to save)", (width // 2 - 250, height // 2 + 70), 0.8)

        # Display frame *before* blocking waitKey
        cv2.imshow('VibeBoxing Target Practice', frame)

        # Get keyboard input (blocking waitKey needed here)
        name_key = cv2.waitKey(0) & 0xFF

        if name_key == 13: # Enter key
            if len(current_name_input) > 0:
                # Add to high scores
                duration_key = str(selected_duration)
                new_entry = {"name": current_name_input, "score": final_score}
                score_list = high_scores.get(duration_key, [])
                score_list.append(new_entry)
                score_list.sort(key=lambda x: x['score'], reverse=True)
                high_scores[duration_key] = score_list[:MAX_HIGH_SCORES] # Keep top N
                save_high_scores(high_scores)
                setup_state(STATE_LEADERBOARD) # Go to leaderboard after saving
            else:
                print("Name cannot be empty. Returning to title.")
                setup_state(STATE_TITLE_SCREEN)

        elif name_key == 8: # Backspace
            current_name_input = current_name_input[:-1]
        elif 32 <= name_key <= 126: # Printable ASCII characters
            if len(current_name_input) < MAX_NAME_LENGTH:
                current_name_input += chr(name_key)
        elif name_key == ord('q'): # Allow quit from name entry too
             break

    # --- Display Frame (for non-blocking states) ---
    # We need to display the frame outside the blocking states too
    if current_state not in [STATE_SHOW_RESULTS, STATE_GET_NAME]:
        cv2.imshow('VibeBoxing Target Practice', frame)

    # Break condition moved inside states where applicable

# --- Cleanup ---
cap.release()
cv2.destroyAllWindows()
hands.close()
print("Application exited.") 