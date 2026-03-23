import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'

// We use dynamic imports and Fallbacks for MediaPipe to support both local and cloud environments
let GlobalFaceMesh = null;

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const FALLBACK_QUESTIONS = [
    { id: 999, text: "Wait! The Cloud Server is still waking up...", options: ["I will wait (Click to Retry)", "Check your Render Dashboard", "Check Vercel ENV settings", "Run locally instead"], correct_option: 0, description: "Render free-tier servers sleep after 15 mins of inactivity. They take ~30s to wake up on the first request." }
];

const ExamPage = ({ studentId }) => {
    const [questions, setQuestions] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState(false)
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState({})
    const [timer, setTimer] = useState(1800)
    const [permissionDenied, setPermissionDenied] = useState(false)
    const [results, setResults] = useState(null)
    const [proctoringStatus, setProctoringStatus] = useState({ type: null, count: 0 })
    const [penaltyScore, setPenaltyScore] = useState(0)
    const [isFlagged, setIsFlagged] = useState(false)
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)
    const faceMeshRef = useRef(null)
    const requestRef = useRef(null)
    const lookAwayStartRef = useRef(null)

    // DYNAMIC SENSITIVITY CONFIG
    const [sensitivity, setSensitivity] = useState({
        yaw: 25,        // Head rotation threshold
        gaze: 0.60,      // Eye iris threshold
        time: 1500,     // Required duration for violation in ms
        threshold: 30   // System point threshold
    });

    // PROCTORING PENALTIES
    const PENALTIES = {
        NO_FACE: 5,
        MULTIPLE_FACES: 10,
        LOOKING_AWAY: 3,
        GAZE_AWAY: 2
    }

    useEffect(() => {
        const logExamEvent = (type) => {
            if (PENALTIES[type]) {
                setPenaltyScore(prev => prev + PENALTIES[type])
            }
            axios.post(`${API_BASE_URL}/log-event`, {
                student_id: studentId,
                event_type: type,
                timestamp: new Date().toISOString(),
                confidence: 1.0
            }).catch(err => console.error("Error logging event:", err));
        };

        const lastLogTimeRef = { NO_FACE: 0, MULTIPLE_FACES: 0, LOOKING_AWAY: 0, GAZE_AWAY: 0 };
        const throttledLog = (type) => {
            const now = Date.now();
            if (now - lastLogTimeRef[type] > 5000) {
                logExamEvent(type);
                lastLogTimeRef[type] = now;
            }
        };

        const gazeStartRef = { time: null, direction: null };

        const onResults = (results) => {
            if (canvasRef.current && videoRef.current) {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                if (canvas.width !== videoRef.current.videoWidth) {
                    canvas.width = videoRef.current.videoWidth || 640;
                    canvas.height = videoRef.current.videoHeight || 480;
                }
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                    ctx.fillStyle = "#00FF00";
                    results.multiFaceLandmarks.forEach(landmarks => {
                        landmarks.forEach(landmark => {
                            ctx.beginPath();
                            ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 1.5, 0, 2 * Math.PI);
                            ctx.fill();
                        });
                    });
                }
            }

            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                const landmarks = results.multiFaceLandmarks[0];
                const yaw = (Math.abs(landmarks[1].x - landmarks[33].x) / Math.abs(landmarks[1].x - landmarks[263].x) - 1) * 100;
                const leftIrisPos = Math.abs(landmarks[468].x - landmarks[133].x) / Math.abs(landmarks[33].x - landmarks[133].x);
                const rightIrisPos = Math.abs(landmarks[473].x - landmarks[362].x) / Math.abs(landmarks[263].x - landmarks[362].x);

                let currentGazeDirection = "CENTER";
                if (leftIrisPos > sensitivity.gaze && rightIrisPos < (1 - sensitivity.gaze)) currentGazeDirection = "LEFT";
                else if (leftIrisPos < (1 - sensitivity.gaze) && rightIrisPos > sensitivity.gaze) currentGazeDirection = "RIGHT";

                let isGazeAway = false;
                if (currentGazeDirection !== "CENTER") {
                    if (gazeStartRef.direction !== currentGazeDirection) {
                        gazeStartRef.time = Date.now();
                        gazeStartRef.direction = currentGazeDirection;
                    } else if (Date.now() - gazeStartRef.time > sensitivity.time) {
                        isGazeAway = true;
                        throttledLog("GAZE_AWAY");
                    }
                } else {
                    gazeStartRef.time = null;
                    gazeStartRef.direction = null;
                }

                let isHeadAway = false;
                if (Math.abs(yaw) > sensitivity.yaw) { 
                    if (!lookAwayStartRef.current) lookAwayStartRef.current = Date.now();
                    else if (Date.now() - lookAwayStartRef.current > sensitivity.time) {
                        isHeadAway = true;
                        throttledLog("LOOKING_AWAY");
                    }
                } else {
                    lookAwayStartRef.current = null;
                }

                if (results.multiFaceLandmarks.length > 1) {
                    setProctoringStatus({ type: "MULTIPLE_FACES", count: results.multiFaceLandmarks.length });
                    throttledLog("MULTIPLE_FACES");
                } else if (isHeadAway) setProctoringStatus({ type: "LOOKING_AWAY", count: 1 });
                else if (isGazeAway) setProctoringStatus({ type: "GAZE_AWAY", count: 1 });
                else setProctoringStatus({ type: null, count: 0 });

            } else {
                setProctoringStatus({ type: "NO_FACE", count: 0 });
                throttledLog("NO_FACE");
            }
        };

        const initProcess = async () => {
            // 1. Get Questions
            axios.get(`${API_BASE_URL}/questions`)
                .then(res => { setQuestions(res.data); setIsLoading(false); })
                .catch(() => setQuestions(FALLBACK_QUESTIONS));

            // 2. Camera
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (err) { setPermissionDenied(true); }

            // 3. AI Engine Fallback loading
            try {
                if (window.FaceMesh) {
                    GlobalFaceMesh = window.FaceMesh;
                } else {
                    const script = document.createElement('script');
                    script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js";
                    document.head.appendChild(script);
                    await new Promise(r => script.onload = r);
                    GlobalFaceMesh = window.FaceMesh;
                }

                if (!GlobalFaceMesh) throw new Error("AI Engine Failed");

                faceMeshRef.current = new GlobalFaceMesh({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
                });
                faceMeshRef.current.setOptions({ maxNumFaces: 2, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
                faceMeshRef.current.onResults(onResults);

                const processVideo = async () => {
                   if (videoRef.current && videoRef.current.readyState >= 2 && faceMeshRef.current) {
                       await faceMeshRef.current.send({ image: videoRef.current });
                   }
                   requestRef.current = requestAnimationFrame(processVideo);
                };
                requestRef.current = requestAnimationFrame(processVideo);
            } catch (err) { console.error(err); setLoadError(true); }
        };

        initProcess();

        const interval = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) { clearInterval(interval); handleSubmit(); return 0; }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearInterval(interval);
            cancelAnimationFrame(requestRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (faceMeshRef.current) faceMeshRef.current.close();
        };
    }, []);

    const handleOptionSelect = (optionIndex) => {
        if (results) return;
        setAnswers({ ...answers, [questions[currentQuestionIndex].id]: optionIndex });
    };

    const handleSubmit = (flagged = false) => {
        if (results) return;
        axios.post(`${API_BASE_URL}/submit`, {
            student_id: studentId,
            answers: answers,
            is_flagged: flagged || penaltyScore >= sensitivity.threshold
        }).then(res => setResults(res.data)).catch(err => console.error(err));
    };

    useEffect(() => {
        if (penaltyScore >= sensitivity.threshold && !isFlagged) {
            setIsFlagged(true);
            handleSubmit(true);
        }
    }, [penaltyScore]);

    if (results) {
        return (
            <div className="container" style={{ padding: '6rem 0' }}>
                <div className="glass glass-card results-container" style={{ padding: '4rem', animation: 'fadeIn 0.8s ease-out' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <h2 className="gradient-text" style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>Exam Performance Analysis</h2>
                        <div className={`status-badge ${results.is_flagged ? 'flagged' : 'success'}`} style={{ display: 'inline-block', padding: '0.8rem 2.5rem', borderRadius: '50px', fontWeight: '800', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
                            {results.is_flagged ? "DISQUALIFIED: INTEGRITY BREACH" : "Valid Session Completed"}
                        </div>
                    </div>

                    <div className="score-overview glass" style={{ padding: '3rem', borderRadius: '24px', textAlign: 'center', marginBottom: '4rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                        <div className="score-circle" style={{ width: '180px', height: '180px', borderRadius: '50%', border: '8px solid var(--accent)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', margin: '0 auto 2rem', boxShadow: '0 0 50px rgba(79, 172, 254, 0.3)' }}>
                            <span style={{ fontSize: '3.5rem', fontWeight: '900', color: 'var(--accent)' }}>{results.score}</span>
                            <span style={{ fontSize: '1rem', opacity: 0.6 }}>OF {results.total}</span>
                        </div>
                        <span className="metric-label" style={{ marginTop: '1rem', display: 'block' }}>
                            {results.is_flagged ? "Flagged: Violation Threshold Exceeded" : `${Math.round((results.score / results.total) * 100)}% Proficiency Achieved`}
                        </span>
                    </div>

                    <div className="results-list">
                        {results.detailed_results.map((res, index) => (
                            <div key={res.id} className="result-item" style={{ marginBottom: '2.5rem', padding: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                                <h4 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>{index + 1}. {res.text}</h4>
                                <ul className="options-list">
                                    {res.options.map((opt, optIdx) => {
                                        let style = { padding: '0.8rem 1rem', borderRadius: '8px', marginBottom: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', opacity: 0.8 }
                                        let label = ""
                                        if (optIdx === res.correct_option) { style.borderColor = '#2ed573'; style.background = 'rgba(46, 213, 115, 0.1)'; label = " ✅"; }
                                        if (optIdx === res.user_choice) {
                                            if (!res.is_correct) { style.borderColor = '#ff4757'; style.background = 'rgba(255, 71, 87, 0.1)'; label = " ❌ (Your Choice)"; }
                                            else label = " ✅ (Your Choice)";
                                        }
                                        return <li key={optIdx} style={style}>{opt} {label}</li>
                                    })}
                                </ul>
                                <div className="description" style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(79, 172, 254, 0.1)', borderRadius: '12px', borderLeft: '4px solid var(--secondary)', fontSize: '0.9rem' }}>
                                    <strong style={{ color: 'var(--secondary)' }}>Analysis:</strong> {res.description}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                        <button className="btn" onClick={() => window.location.reload()}>Exit Session</button>
                    </div>
                </div>
            </div>
        )
    }

    if (isLoading && questions.length === 0) {
        return (
            <div className="container" style={{ padding: '10rem 0', textAlign: 'center' }}>
                <div className="glass glass-card" style={{ padding: '4rem' }}>
                    <div className="loader" style={{ marginBottom: '2rem' }}></div>
                    <h2 style={{ color: 'var(--secondary)' }}>Establishing Secure Connection...</h2>
                    <p style={{ opacity: 0.7 }}>The AI Cloud Engine is waking up (This may take 30-40 seconds on first run).</p>
                </div>
            </div>
        )
    }

    if (loadError && questions[0]?.id === 999) {
        return (
            <div className="container" style={{ padding: '10rem 0', textAlign: 'center' }}>
                <div className="glass glass-card" style={{ padding: '4rem', border: '1px solid #ff4757' }}>
                    <h2 style={{ color: '#ff4757' }}>⚠️ Cloud Connection Delayed</h2>
                    <p style={{ opacity: 0.8, marginBottom: '2rem' }}>Your AI engine or backend is taking too long to respond.</p>
                    <button className="btn" onClick={() => window.location.reload()} style={{ background: 'var(--secondary)', color: 'white' }}>Retry Connection</button>
                </div>
            </div>
        )
    }

    const currentQuestion = questions[currentQuestionIndex]
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`
    }

    return (
        <div className="container exam-container">
            {proctoringStatus.type && (
                <div className="glass" style={{ position: 'fixed', top: '30px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(255, 71, 87, 0.9)', color: 'white', padding: '1rem 3rem', borderRadius: '50px', zIndex: 2000, fontWeight: '800', fontSize: '1.2rem', boxShadow: '0 0 40px rgba(255, 71, 87, 0.6)', animation: 'pulse 1.5s infinite', textAlign: 'center' }}>
                    ⚠️ {proctoringStatus.type === "NO_FACE" ? "SESSION PAUSED: NO FACE DETECTED" : proctoringStatus.type === "MULTIPLE_FACES" ? "SECURITY ALERT: MULTIPLE FACES DETECTED" : "WARNING: LOOK AT THE SCREEN"}
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>INTEGRITY VIOLATION DETECTED</div>
                </div>
            )}

            <div className="glass" style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 2rem', alignItems: 'center', marginBottom: '3rem' }}>
                <div className="timer-box">TIME LEFT: {formatTime(timer)}</div>
                <div className="glass" style={{ padding: '1rem', borderRadius: '12px', fontSize: '0.8rem', textAlign: 'left', minWidth: '250px' }}>
                    <strong style={{ color: 'var(--secondary)', display: 'block', marginBottom: '0.5rem' }}>AI Sensitivity Tuning</strong>
                    <div style={{ marginBottom: '0.5rem' }}>Yaw: {sensitivity.yaw}° <input type="range" min="10" max="60" value={sensitivity.yaw} onChange={(e) => setSensitivity({...sensitivity, yaw: Number(e.target.value)})} style={{ width: '100%' }} /></div>
                    <div style={{ marginBottom: '0.5rem' }}>Iris: {Math.round(sensitivity.gaze * 100)}% <input type="range" min="0.4" max="0.8" step="0.05" value={sensitivity.gaze} onChange={(e) => setSensitivity({...sensitivity, gaze: Number(e.target.value)})} style={{ width: '100%' }} /></div>
                    <div>Wait: {sensitivity.time}ms <input type="range" min="500" max="5000" step="500" value={sensitivity.time} onChange={(e) => setSensitivity({...sensitivity, time: Number(e.target.value)})} style={{ width: '100%' }} /></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase' }}>Integrity Penalty</div>
                    <div style={{ color: penaltyScore > (sensitivity.threshold / 2) ? '#ff4757' : '#ffa502', fontWeight: '800', fontSize: '1.2rem' }}>{penaltyScore} / {sensitivity.threshold}</div>
                </div>
            </div>

            <div className="glass glass-card question-card">
                <div className="feature-tag">Question {currentQuestionIndex + 1} of {questions.length}</div>
                <h3 style={{ WebkitTextFillColor: 'white', background: 'none', marginBottom: '2rem' }}>{currentQuestion?.text}</h3>
                <div className="options-list">
                    {currentQuestion?.options.map((option, index) => (
                        <div key={index} className={`option-item ${answers[currentQuestion.id] === index ? 'selected' : ''}`} onClick={() => handleOptionSelect(index)}>{option}</div>
                    ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
                    <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }} disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(prev => prev - 1)}>Previous</button>
                    {currentQuestionIndex === questions.length - 1 ? (
                        <button className="btn" onClick={() => handleSubmit(false)} style={{ background: 'var(--accent)', color: 'black' }}>Submit Exam</button>
                    ) : (
                        <button className="btn" onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>Next Question</button>
                    )}
                </div>
            </div>

            <div className="webcam-container">
                <video ref={videoRef} autoPlay muted playsInline />
                <canvas ref={canvasRef} />
            </div>
        </div>
    )
}

export default ExamPage
