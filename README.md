# 🚀 Next-Gen AI Proctoring System (MediaPipe-Powered)

A state-of-the-art, real-time proctoring solution designed for high-stakes online examinations. This system leverages **Computer Vision** and **Deep Learning** to ensure academic integrity without compromising student privacy.

## 💎 Core Features
*   **👁️ Iris Movement Tracking**: Precise tracking of pupil position to detect gazes toward unauthorized materials (books, phones).
*   **📐 Head Pose Estimation**: Calculations of **Yaw, Pitch, and Roll** to ensure the student remains focused on the screen.
*   **👥 Multi-Face & Absence Detection**: Instant alerts if more than one face or no face is detected in the video stream.
*   **⚖️ Dynamic Sensitivity Tuning**: A real-time configuration panel to adjust AI strictness (thresholds, timings, and angles).
*   **✨ Premium Glassmorphism UI**: A high-end, responsive interface with a detailed technical landing page and proctoring HUD.
*   **📊 Detailed Session Analytics**: Post-exam summary with flagged violations and explanation-based results.

## 🛠️ Technology Stack
### Frontend
*   **React 18 & Vite**: For a high-performance, responsive UI.
*   **Google MediaPipe FaceMesh**: Real-time extraction of 468 3D landmarks.
*   **Axios**: For secure API communication.
*   **Vanilla CSS**: Custom glassmorphism design system.

### Backend
*   **FastAPI**: High-performance Python framework for asynchronus API handling.
*   **SQLAlchemy & SQLite**: Reliable local database for exam logs and student results.
*   **MediaPipe Backend**: Specialized Python scripts for behavioral model training.

## 🏗️ Project Structure
```bash
├── backend/            # FastAPI Server & SQLite Database
│   ├── main.py         # Entry point & API routes
│   ├── database.py     # SQL Connection logic
│   ├── models.py       # Database Schemas (Students, Exams, Events)
│   └── requirements.txt
├── frontend/           # React Web Application
│   ├── src/
│   │   ├── components/ # Landing, Login, ExamPage, etc.
│   │   ├── App.jsx     # Navigation & Routing
│   │   └── index.css   # Glassmorphism Design System
│   └── public/         # High-resolution AI-generated assets
└── training/           # ML Workspace
    ├── train_classifier.py  # Python script to train behavior models
    └── training_guide.md    # Guide on data collection & fine-tuning
```

## 🚀 Getting Started

### 1. Prerequisites
*   **Node.js** (v18+)
*   **Python** (v3.9+)

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python main.py
```
*The server will start at `http://localhost:8000`*

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:5173` in your browser.*

## 📈 Testing & Sensitivity
During the exam, use the **AI Settings Panel** next to the timer to live-tune the proctoring engine:
*   **Yaw**: Head rotation tolerance.
*   **Gaze**: Pupil movement threshold.
*   **Violation Time**: How long a suspicious action must last before being logged.

## 🔒 Security & Privacy
The system follows a **Privacy-First (No-Cloud)** policy. 
1. No video frames or images are ever sent to a server.
2. All biometric processing is done locally on the student's device using **WebAssembly**.
3. Only anonymized behavioral vectors and violation event metadata are stored in the database.

---
Developed for Darshan University - Machine Learning Project.
© 2026 AI Proctoring Solutions.
