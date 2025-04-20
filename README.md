# VibeBoxing Target Practice

    A simple webcam-based boxing target practice game built with Python, OpenCV, and MediaPipe. Hit the targets with your fists!

![Gameplay Demo](placeholder.gif) // TODO: Replace with an actual GIF or screenshot

## Features

*   Real-time hand tracking using MediaPipe.
*   Boxing glove overlays for visual feedback.
*   Moving target with progressive visual "damage" based on hits.
*   Timed rounds (30s, 60s).
*   Persistent high score leaderboard for each time category.
*   Title screen and leaderboard display.

## Technologies Used

*   Python 3
*   OpenCV (`opencv-python`) - For camera access, image manipulation, and display.
*   MediaPipe (`mediapipe`) - For hand tracking.
*   NumPy (`numpy`) - For numerical operations (used by OpenCV/MediaPipe and some calculations).

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd <repository-folder>
    ```
2.  **Create a virtual environment (Recommended):**
    ```bash
    python3 -m venv venv
    source venv/bin/activate # On Windows use `venv\Scripts\activate`
    ```
3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Ensure Assets:** Make sure the `assets` folder containing all required images (`VibeBoxing.png`, `leftglove.png`, `rightglove.png`, `Face1.png` - `Face6.png`) is present in the project directory.

## How to Run

```bash
python3 fruit_ninja_game.py
```

Grant camera permissions if prompted by your operating system.

## How to Play

1.  **Title Screen:** Press 'S' to Start or 'L' to view the Leaderboard.
2.  **Select Duration:** Press '1' for 30 seconds or '2' for 60 seconds.
3.  **Gameplay:**
    *   Punch the target face with your fists (represented by gloves).
    *   The target moves and shows progressive damage after every 5 hits.
    *   The timer counts down.
4.  **Results:** Your score and the high score are displayed.
    *   If you get a high score, you'll be prompted to enter your name (max 10 chars, Enter to save).
    *   Press 'R' to restart the same duration immediately.
    *   Press Enter (or 'R') to return to the title screen.
5.  **Leaderboard:** Shows the top 5 scores for each duration. Press 'B' to go back to the title screen.
6.  **Quit:** Press 'Q' at almost any time to exit. 