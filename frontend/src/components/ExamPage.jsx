import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { FaceMesh } from '@mediapipe/face_mesh'

const ExamPage = ({ studentId }) => {
    const [questions, setQuestions] = useState([])
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
    const THRESHOLD = 30 // Auto-submit if penalties exceed 30


    useEffect(() => {
        const logExamEvent = (type) => {
            // Apply penalty locally
            if (PENALTIES[type]) {
                setPenaltyScore(prev => prev + PENALTIES[type])
            }

            axios.post('http://localhost:8000/log-event', {
                student_id: studentId,
                event_type: type,
                timestamp: new Date().toISOString(),
                confidence: 1.0
            }).catch(err => console.error("Error logging event:", err));
        };

        axios.get('http://localhost:8000/questions')
            .then(res => setQuestions(res.data))
            .catch(err => console.error("Error fetching questions:", err))

        navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
            .then(stream => {
                streamRef.current = stream
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                }
            })
            .catch(err => {
                console.error("Webcam access denied:", err)
                setPermissionDenied(true)
            })

        const faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });

        faceMesh.setOptions({
            maxNumFaces: 2,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        const lastLogTimeRef = {
            NO_FACE: 0,
            MULTIPLE_FACES: 0,
            LOOKING_AWAY: 0,
            GAZE_AWAY: 0
        };

        const throttledLog = (type) => {
            const now = Date.now();
            if (now - lastLogTimeRef[type] > 5000) {
                logExamEvent(type);
                lastLogTimeRef[type] = now;
            }
        };

        const gazeStartRef = { time: null, direction: null };

        faceMesh.onResults((results) => {
            if (canvasRef.current && videoRef.current) {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                
                // Set canvas internal dimensions once to match stream
                if (canvas.width !== videoRef.current.videoWidth) {
                    canvas.width = videoRef.current.videoWidth || 640;
                    canvas.height = videoRef.current.videoHeight || 480;
                }

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                    // Draw face mesh
                    ctx.fillStyle = "#00FF00";
                    results.multiFaceLandmarks.forEach(landmarks => {
                        landmarks.forEach(landmark => {
                            const x = landmark.x * canvas.width;
                            const y = landmark.y * canvas.height;
                            ctx.beginPath();
                            ctx.arc(x, y, 1.5, 0, 2 * Math.PI); // Solid circles for better visibility
                            ctx.fill();
                        });
                    });
                }
            }

            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                const landmarks = results.multiFaceLandmarks[0];

                // 1. Head Pose (Yaw) Estimation
                const nose = landmarks[1];
                const leftEyeOuter = landmarks[33];
                const rightEyeOuter = landmarks[263];
                const leftDist = Math.abs(nose.x - leftEyeOuter.x);
                const rightDist = Math.abs(nose.x - rightEyeOuter.x);
                const yaw = (leftDist / rightDist - 1) * 100;

                // 2. Gaze Detection (Iris Tracking)
                const leftIris = landmarks[468];
                const leftInner = landmarks[133];
                const rightIris = landmarks[473];
                const rightInner = landmarks[362];

                const leftEyeWidth = Math.abs(leftEyeOuter.x - leftInner.x);
                const leftIrisPos = Math.abs(leftIris.x - leftInner.x) / leftEyeWidth;

                const rightEyeWidth = Math.abs(rightEyeOuter.x - rightInner.x);
                const rightIrisPos = Math.abs(rightIris.x - rightInner.x) / rightEyeWidth;

                let currentGazeDirection = "CENTER";
                if (leftIrisPos > sensitivity.gaze && rightIrisPos < (1 - sensitivity.gaze)) {
                    currentGazeDirection = "LEFT";
                }
                // If left iris is near inner AND right is near outer -> looking subject's right
                else if (leftIrisPos < (1 - sensitivity.gaze) && rightIrisPos > sensitivity.gaze) {
                    currentGazeDirection = "RIGHT";
                }

                // 3. Sustained Gaze Logic (Dynamic Sensitivity)
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

                // 4. Combined Suspicious Pattern (Head + Gaze)
                let isHeadAway = false;
                if (Math.abs(yaw) > sensitivity.yaw) { 
                    if (!lookAwayStartRef.current) {
                        lookAwayStartRef.current = Date.now();
                    } else if (Date.now() - lookAwayStartRef.current > sensitivity.time) {
                        isHeadAway = true;
                        throttledLog("LOOKING_AWAY");
                    }
                } else {
                    lookAwayStartRef.current = null;
                }

                // Visual Status Update
                if (results.multiFaceLandmarks.length > 1) {
                    setProctoringStatus({ type: "MULTIPLE_FACES", count: results.multiFaceLandmarks.length });
                    throttledLog("MULTIPLE_FACES");
                } else if (isHeadAway) {
                    setProctoringStatus({ type: "LOOKING_AWAY", count: 1 });
                } else if (isGazeAway) {
                    setProctoringStatus({ type: "GAZE_AWAY", count: 1 });
                } else {
                    setProctoringStatus({ type: null, count: 0 });
                }

            } else {
                setProctoringStatus({ type: "NO_FACE", count: 0 });
                throttledLog("NO_FACE");
            }
        });

        faceMeshRef.current = faceMesh;

        const processVideo = async () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
                await faceMeshRef.current.send({ image: videoRef.current });
            }
            requestRef.current = requestAnimationFrame(processVideo);
        };
        requestRef.current = requestAnimationFrame(processVideo);

        const interval = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(interval)
                    handleSubmit()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => {
            clearInterval(interval)
            cancelAnimationFrame(requestRef.current)
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
            }
            if (faceMeshRef.current) {
                faceMeshRef.current.close();
            }
        }
    }, [])

    const handleOptionSelect = (optionIndex) => {
        if (results) return
        setAnswers({
            ...answers,
            [questions[currentQuestionIndex].id]: optionIndex
        })
    }


    const handleSubmit = (flagged = false) => {
        if (results) return
        axios.post('http://localhost:8000/submit', {
            student_id: studentId,
            answers: answers,
            is_flagged: flagged
        })
            .then(res => {
                setResults(res.data)
                cancelAnimationFrame(requestRef.current)
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop())
                }
            })
            .catch(err => console.error('Error submitting exam:', err))
    }

    useEffect(() => {
        if (penaltyScore >= sensitivity.threshold && !isFlagged) {
            setIsFlagged(true)
            handleSubmit(true)
        }
    }, [penaltyScore, sensitivity.threshold])

    if (permissionDenied) {
        return (
            <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
                <div className="glass glass-card" style={{ maxWidth: '600px', margin: '0 auto', border: '1px solid #ff4757' }}>
                    <h1 style={{ color: '#ff4757', background: 'none', WebkitTextFillColor: '#ff4757' }}>Access Blocked</h1>
                    <p>Webcam permission is required for AI proctoring.</p>
                    <button className="btn" onClick={() => window.location.reload()} style={{ marginTop: '2rem' }}>Grant & Retry</button>
                </div>
            </div>
        )
    }

    if (results) {
        return (
            <div className="container" style={{ padding: '4rem 0' }}>
                <div className="glass glass-card results-view" style={{ textAlign: 'left', maxWidth: '900px', margin: '0 auto' }}>
                    <h1 style={{ textAlign: 'center' }}>Session Summary</h1>
                    <div className="glass" style={{
                        textAlign: 'center',
                        padding: '2rem',
                        background: results.is_flagged ? 'rgba(255, 71, 87, 0.1)' : 'rgba(79, 172, 254, 0.1)',
                        borderRadius: '16px',
                        marginBottom: '3rem',
                        border: results.is_flagged ? '1px solid #ff4757' : '1px solid var(--secondary)'
                    }}>
                        {results.is_flagged && <h2 style={{ color: '#ff4757', background: 'none', WebkitTextFillColor: '#ff4757', marginBottom: '0.5rem' }}>⚠️ ACADEMIC INTEGRITY VIOLATION</h2>}
                        <h2 style={{ margin: 0, background: 'none', WebkitTextFillColor: 'white' }}>Score: {results.score} / {results.total}</h2>
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
                                        let style = { 
                                            padding: '0.8rem 1rem', 
                                            borderRadius: '8px', 
                                            marginBottom: '0.5rem', 
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid var(--glass-border)',
                                            opacity: 0.8
                                        }
                                        let label = ""
                                        if (optIdx === res.correct_option) {
                                            style.borderColor = '#2ed573'
                                            style.background = 'rgba(46, 213, 115, 0.1)'
                                            label = " ✅"
                                        }
                                        if (optIdx === res.user_choice) {
                                            if (!res.is_correct) {
                                                style.borderColor = '#ff4757'
                                                style.background = 'rgba(255, 71, 87, 0.1)'
                                                label = " ❌ (Your Choice)"
                                            } else {
                                                label = " ✅ (Your Choice)"
                                            }
                                        }

                                        return (
                                            <li key={optIdx} style={style}>
                                                {opt} {label}
                                            </li>
                                        )
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

    if (questions.length === 0) return <div className="container" style={{ padding: '10rem 0', textAlign: 'center' }}><h3>Initializing Secured Environment...</h3></div>

    const currentQuestion = questions[currentQuestionIndex]
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`
    }

    return (
        <div className="container exam-container">
            {/* PROCTORING SYSTEM OVERLAY */}
            {proctoringStatus.type && (
                <div className="glass" style={{
                    position: 'fixed',
                    top: '30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(255, 71, 87, 0.9)',
                    color: 'white',
                    padding: '1rem 3rem',
                    borderRadius: '50px',
                    zIndex: 2000,
                    fontWeight: '800',
                    fontSize: '1.2rem',
                    boxShadow: '0 0 40px rgba(255, 71, 87, 0.6)',
                    animation: 'pulse 1.5s infinite',
                    textAlign: 'center'
                }}>
                    ⚠️ {proctoringStatus.type === "NO_FACE" ? "SESSION PAUSED: NO FACE DETECTED" :
                        proctoringStatus.type === "MULTIPLE_FACES" ? "SECURITY ALERT: MULTIPLE FACES DETECTED" :
                            "WARNING: LOOK AT THE SCREEN"}
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>INTEGRITY VIOLATION DETECTED</div>
                </div>
            )}

            <div className="glass" style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 2rem', alignItems: 'center', marginBottom: '3rem' }}>
                <div className="timer-box">TIME LEFT: {formatTime(timer)}</div>
                
                {/* SENSITIVITY CONTROLS PANEL */}
                <div className="glass" style={{ 
                    padding: '1rem', 
                    borderRadius: '12px', 
                    fontSize: '0.8rem', 
                    textAlign: 'left',
                    minWidth: '250px'
                }}>
                    <strong style={{ color: 'var(--secondary)', display: 'block', marginBottom: '0.5rem' }}>AI Sensitivity Tuning</strong>
                    
                    <div style={{ marginBottom: '0.5rem' }}>
                        Yaw (Head Range): {sensitivity.yaw}°
                        <input 
                            type="range" min="10" max="60" 
                            value={sensitivity.yaw} 
                            onChange={(e) => setSensitivity({...sensitivity, yaw: Number(e.target.value)})}
                            style={{ width: '100%' }}
                        />
                    </div>
                    
                    <div style={{ marginBottom: '0.5rem' }}>
                        Iris Detection: {Math.round(sensitivity.gaze * 100)}%
                        <input 
                            type="range" min="0.4" max="0.8" step="0.05"
                            value={sensitivity.gaze} 
                            onChange={(e) => setSensitivity({...sensitivity, gaze: Number(e.target.value)})}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div>
                        Violation Time: {sensitivity.time}ms
                        <input 
                            type="range" min="500" max="5000" step="500"
                            value={sensitivity.time} 
                            onChange={(e) => setSensitivity({...sensitivity, time: Number(e.target.value)})}
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase' }}>Integrity Penalty</div>
                    <div style={{ color: penaltyScore > (sensitivity.threshold / 2) ? '#ff4757' : '#ffa502', fontWeight: '800', fontSize: '1.2rem' }}>
                        {penaltyScore} / {sensitivity.threshold}
                    </div>
                </div>
            </div>

            <div className="glass glass-card question-card">
                <div className="feature-tag">Question {currentQuestionIndex + 1} of {questions.length}</div>
                <h3 style={{ WebkitTextFillColor: 'white', background: 'none', marginBottom: '2rem' }}>{currentQuestion.text}</h3>
                
                <div className="options-list">
                    {currentQuestion.options.map((option, index) => (
                        <div
                            key={index}
                            className={`option-item ${answers[currentQuestion.id] === index ? 'selected' : ''}`}
                            onClick={() => handleOptionSelect(index)}
                        >
                            {option}
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
                    <button
                        className="btn"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}
                        disabled={currentQuestionIndex === 0}
                        onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                    >
                        Previous
                    </button>
                    {currentQuestionIndex === questions.length - 1 ? (
                        <button className="btn" onClick={() => handleSubmit(false)} style={{ background: 'var(--accent)', color: 'black' }}>Submit Exam</button>
                    ) : (
                        <button className="btn" onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>Next Question</button>
                    )}
                </div>
            </div>

            {/* WEBCAM PIP */}
            <div className="webcam-container">
                <video ref={videoRef} autoPlay muted playsInline />
                <canvas ref={canvasRef} />
            </div>
        </div>
    )
}

export default ExamPage
