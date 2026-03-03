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

    // PROCTORING PENALTIES
    const PENALTIES = {
        NO_FACE: 5,
        MULTIPLE_FACES: 15,
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
            // Drawing Overlay logic
            if (canvasRef.current && videoRef.current) {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (results.multiFaceLandmarks) {
                    for (const landmarks of results.multiFaceLandmarks) {
                        ctx.fillStyle = "#00FF00";
                        for (const landmark of landmarks) {
                            const x = landmark.x * canvas.width;
                            const y = landmark.y * canvas.height;
                            ctx.fillRect(x, y, 2, 2); // Tiny boxes
                        }
                    }
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
                // Left Eye: Outer (33), Inner (133), Iris Center (468)
                // Right Eye: Inner (362), Outer (263), Iris Center (473)
                const leftIris = landmarks[468];
                const leftInner = landmarks[133];
                const rightIris = landmarks[473];
                const rightInner = landmarks[362];

                // Calculate ratio: (Iris.x - Outer.x) / (Inner.x - Outer.x)
                // Note: Landmarks are normalized [0,1]. Left eye outer is smaller X than inner.
                const leftGazeRatio = (leftIris.x - leftEyeOuter.x) / (leftInner.x - leftEyeOuter.x);
                const rightGazeRatio = (rightIris.x - rightInner.x) / (rightEyeOuter.x - rightInner.x);
                const avgGazeRatio = (leftGazeRatio + rightGazeRatio) / 2;

                let currentGazeDirection = "CENTER";
                if (avgGazeRatio < 0.35) currentGazeDirection = "LEFT";
                else if (avgGazeRatio > 0.65) currentGazeDirection = "RIGHT";

                // 3. Sustained Gaze Logic (2 Seconds)
                if (currentGazeDirection !== "CENTER") {
                    if (gazeStartRef.direction !== currentGazeDirection) {
                        gazeStartRef.time = Date.now();
                        gazeStartRef.direction = currentGazeDirection;
                    } else if (Date.now() - gazeStartRef.time > 2000) {
                        console.warn(`EVENT: GAZE_AWAY (${currentGazeDirection}) detected!`);
                        throttledLog("GAZE_AWAY");
                    }
                } else {
                    gazeStartRef.time = null;
                    gazeStartRef.direction = null;
                }

                // 4. Combined Suspicious Pattern (Head + Gaze)
                if (Math.abs(yaw) > 30) {
                    if (!lookAwayStartRef.current) {
                        lookAwayStartRef.current = Date.now();
                    } else if (Date.now() - lookAwayStartRef.current > 3000) {
                        console.warn("EVENT: LOOKING_AWAY (Head Rotation) detected!");
                        setProctoringStatus({ type: "LOOKING_AWAY", count: 1 });
                        throttledLog("LOOKING_AWAY");
                    }
                } else {
                    lookAwayStartRef.current = null;
                }

                if (results.multiFaceLandmarks.length > 1) {
                    setProctoringStatus({ type: "MULTIPLE_FACES", count: results.multiFaceLandmarks.length });
                    throttledLog("MULTIPLE_FACES");
                } else if (Math.abs(yaw) <= 30 && currentGazeDirection === "CENTER") {
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
        if (penaltyScore >= THRESHOLD && !isFlagged) {
            setIsFlagged(true)
            console.error("PENALTY THRESHOLD EXCEEDED. AUTO-SUBMITTING.")
            handleSubmit(true)
        }
    }, [penaltyScore])

    if (permissionDenied) {
        return (
            <div className="exam-container">
                <h1 style={{ color: 'red' }}>Access Blocked</h1>
                <p>You must grant webcam permission to take the exam.</p>
                <button onClick={() => window.location.reload()}>Try Again</button>
            </div>
        )
    }

    if (results) {
        return (
            <div className="exam-container results-view" style={{ textAlign: 'left', maxWidth: '800px', margin: '0 auto' }}>
                <h1 style={{ textAlign: 'center' }}>Exam Results</h1>
                <div className="score-card" style={{
                    textAlign: 'center',
                    padding: '1.5rem',
                    background: results.is_flagged ? '#ff4757' : '#444',
                    borderRadius: '8px',
                    marginBottom: '2rem'
                }}>
                    {results.is_flagged && <h2 style={{ color: 'white', marginBottom: '0.5rem' }}>⚠️ EXAM FLAGGED</h2>}
                    <h2 style={{ margin: 0 }}>Your Score: {results.score} / {results.total}</h2>
                    <p style={{ margin: '0.5rem 0 0' }}>{results.is_flagged ? "Auto-submitted with 0 marks due to violations." : `${Math.round((results.score / results.total) * 100)}% Accuracy`}</p>
                </div>

                <div className="results-list">
                    {results.detailed_results.map((res, index) => (
                        <div key={res.id} className="result-item" style={{ marginBottom: '2rem', padding: '1rem', borderBottom: '1px solid #555' }}>
                            <h4 style={{ margin: '0 0 1rem' }}>{index + 1}. {res.text}</h4>
                            <ul className="options-list">
                                {res.options.map((opt, optIdx) => {
                                    let className = "option-item "
                                    let label = ""
                                    if (optIdx === res.correct_option) {
                                        className += "correct "
                                        label = " (Correct Answer)"
                                    }
                                    if (optIdx === res.user_choice) {
                                        className += res.is_correct ? "user-correct " : "user-wrong "
                                        if (!res.is_correct) label = " (Your Choice - Incorrect)"
                                        else label = " (Your Choice - Correct)"
                                    }

                                    return (
                                        <li key={optIdx} className={className} style={{ cursor: 'default', pointerEvents: 'none' }}>
                                            {opt} {label}
                                        </li>
                                    )
                                })}
                            </ul>
                            <div className="description" style={{ marginTop: '1rem', padding: '0.8rem', background: '#222', borderRadius: '4px', borderLeft: '4px solid #646cff' }}>
                                <strong>Explanation:</strong> {res.description}
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button onClick={() => window.location.reload()}>Back to Login</button>
                </div>
            </div>
        )
    }

    if (questions.length === 0) return <div>Loading questions...</div>

    const currentQuestion = questions[currentQuestionIndex]
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`
    }

    return (
        <div className="exam-container">
            {proctoringStatus.type && (
                <div className="proctoring-warning" style={{
                    position: 'fixed',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#ff4757',
                    color: 'white',
                    padding: '1rem 2rem',
                    borderRadius: '50px',
                    zIndex: 2000,
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(255, 71, 87, 0.5)',
                    animation: 'pulse 1.5s infinite'
                }}>
                    ⚠️ WARNING: {proctoringStatus.type === "NO_FACE" ? "NO FACE DETECTED" :
                        proctoringStatus.type === "MULTIPLE_FACES" ? "MULTIPLE FACES DETECTED" :
                            "PLEASE LOOK AT THE SCREEN"}
                </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div className="timer">Time Remaining: {formatTime(timer)}</div>
                <div className="penalty-indicator" style={{
                    color: penaltyScore > 15 ? '#ff4757' : '#ffa502',
                    fontWeight: 'bold'
                }}>
                    Penalty Points: {penaltyScore} / {THRESHOLD}
                </div>
            </div>

            <div className="question-card">
                <h3>Question {currentQuestionIndex + 1} of {questions.length}</h3>
                <p>{currentQuestion.text}</p>
                <ul className="options-list">
                    {currentQuestion.options.map((option, index) => (
                        <li
                            key={index}
                            className={`option-item ${answers[currentQuestion.id] === index ? 'selected' : ''}`}
                            onClick={() => handleOptionSelect(index)}
                        >
                            {option}
                        </li>
                    ))}
                </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <button
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                >
                    Previous
                </button>
                {currentQuestionIndex === questions.length - 1 ? (
                    <button onClick={() => handleSubmit(false)} style={{ background: '#2ed573' }}>Submit Exam</button>
                ) : (
                    <button onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>Next</button>
                )}
            </div>

            <div className="webcam-container">
                <video ref={videoRef} autoPlay muted playsInline />
                <canvas ref={canvasRef} />
            </div>
        </div>
    )
}

export default ExamPage
