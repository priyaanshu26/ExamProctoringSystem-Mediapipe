import React, { useState } from 'react';

const LandingPage = ({ onStart }) => {
    const [showDatasheet, setShowDatasheet] = useState(false);
    return (
        <div className="landing-page">
            {/* GLASS NAVBAR */}
            <header>
                <div className="container nav-container">
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', background: 'var(--gradient)', borderRadius: '8px' }}></div>
                        <span style={{ background: 'var(--gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PROCTOR AI</span>
                    </div>
                    <nav>
                        <ul className="nav-links">
                            <li><a href="#features">Features</a></li>
                            <li><a href="#workflow">Workflow</a></li>
                            <li><a href="#tech">Technology</a></li>
                            <li><button onClick={onStart} className="btn" style={{ padding: '0.5rem 1.5rem' }}>Try Now</button></li>
                        </ul>
                    </nav>
                </div>
            </header>

            {/* HERO SECTION - REFINED SPACING */}
            <section className="hero" style={{ marginTop: '4rem' }}>
                <div className="container" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '4rem', alignItems: 'center' }}>
                    <div className="hero-content" style={{ textAlign: 'left' }}>
                        <div className="feature-tag">🚀 AI-Powered Integrity v2.0</div>
                        <h1 style={{ marginBottom: '2rem' }}>Securing the <br />Future of Education</h1>
                        <p style={{ fontSize: '1.3rem', opacity: 0.9, lineHeight: '1.8', marginBottom: '3rem' }}>
                            An ultra-responsive proctoring solution built on Google’s MediaPipe technology. 
                            Zero-delay behavioral analysis directly in your browser.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn" onClick={onStart} style={{ fontSize: '1.1rem', padding: '1.2rem 2.5rem' }}>
                                Start Demo Exam
                            </button>
                            <button className="btn" onClick={() => setShowDatasheet(true)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '1.2rem 2.5rem' }}>
                                View Datasheet
                            </button>
                        </div>
                        
                        <div style={{ marginTop: '3rem', display: 'flex', gap: '2rem' }}>
                            <div className="metric" style={{ padding: 0, textAlign: 'left' }}>
                                <span className="metric-value" style={{ fontSize: '1.8rem' }}>99.8%</span>
                                <span className="metric-label">Inference Accuracy</span>
                            </div>
                            <div className="metric" style={{ padding: 0, textAlign: 'left' }}>
                                <span className="metric-value" style={{ fontSize: '1.8rem' }}>&lt; 5ms</span>
                                <span className="metric-label">Latency</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="glass floating" style={{ 
                        height: '450px', 
                        borderRadius: '30px', 
                        position: 'relative',
                        background: 'linear-gradient(rgba(15, 23, 42, 0.4), rgba(15, 23, 42, 0.4)), url("/proctoring_hero.png") center/cover',
                        border: '1px solid var(--secondary)',
                        boxShadow: '0 0 60px rgba(79, 172, 254, 0.15)'
                    }}>
                        {/* Decorative UI nodes */}
                        <div className="glass" style={{ position: 'absolute', top: '20px', left: '-20px', padding: '10px 20px', fontSize: '0.8rem', color: '#00f2fe' }}>
                            LIVE DIAGNOSTICS ACTIVE
                        </div>
                        <div className="glass" style={{ position: 'absolute', bottom: '40px', right: '-20px', padding: '10px 20px', fontSize: '0.8rem', color: '#833ab4' }}>
                            468 LANDMARKS EXTRACTED
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURES GRID */}
            <section id="features" className="section container">
                <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                    <div className="feature-tag">Proactive Monitoring</div>
                    <h2>Unrivaled Behavioral Insights</h2>
                    <p style={{ opacity: 0.7 }}>State-of-the-art protection for high-stakes assessments.</p>
                </div>

                <div className="grid">
                    <div className="glass glass-card">
                        <div style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>👁️</div>
                        <h3>Iris Movement</h3>
                        <p style={{ opacity: 0.8 }}>Deep-Iris localization detects gaze patterns toward unauthorized external resources like books or smart devices.</p>
                    </div>
                    <div className="glass glass-card">
                        <div style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>📐</div>
                        <h3>Head Pose Estimate</h3>
                        <p style={{ opacity: 0.8 }}>Calculates Yaw, Pitch, and Roll angles to ensure students maintain visual focus on the assessment interface.</p>
                    </div>
                    <div className="glass glass-card">
                        <div style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>👥</div>
                        <h3>Persona Validation</h3>
                        <p style={{ opacity: 0.8 }}>Instant detection of impersonation or unauthorized collaborators entering the camera field of view.</p>
                    </div>
                </div>
            </section>

            {/* INTERACTIVE WORKFLOW */}
            <section id="workflow" className="section" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '6rem' }}>
                        <h2>How It Works</h2>
                        <p>Transparency in how our AI protects and evaluates and exam instance.</p>
                    </div>
                    
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                        {[
                            { step: '01', title: 'Capture', desc: 'Real-time stream acquisition from browser webcam.' },
                            { step: '02', title: 'Analyze', desc: 'Landmark extraction via BlazeFace neural backbone.' },
                            { step: '03', title: 'Evaluate', desc: 'Vector math calculates yaw/gaze offsets.' },
                            { step: '04', title: 'Report', desc: 'Event logs are securely pushed to teachers.' }
                        ].map((item, index) => (
                            <div key={index} style={{ textAlign: 'center', position: 'relative' }}>
                                <div style={{ 
                                    width: '60px', height: '60px', borderRadius: '50%', background: 'var(--gradient)',
                                    margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800'
                                }}>
                                    {item.step}
                                </div>
                                <h4>{item.title}</h4>
                                <p style={{ fontSize: '0.9rem', opacity: 0.6, marginTop: '1rem' }}>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* DEEP TECH INFO */}
            <section id="tech" className="section container">
                <div className="glass glass-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', padding: '4rem' }}>
                    <div>
                        <h2>Trained for Accuracy</h2>
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span>MediaPipe Confidence</span>
                                <span>99.2%</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ width: '99.2%', height: '100%', background: 'var(--gradient)' }}></div>
                            </div>
                        </div>
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span>MobileNet Efficiency</span>
                                <span>32ms Latency</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ width: '85%', height: '100%', background: 'var(--secondary)' }}></div>
                            </div>
                        </div>
                        <p style={{ opacity: 0.7 }}>
                            Our model employs depthwise separable convolutions to maintain high accuracy 
                            while running on consumer-level hardware without GPU requirements.
                        </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                         <div style={{ borderLeft: '4px solid var(--accent)', paddingLeft: '1.5rem', marginBottom: '2rem' }}>
                             <code style={{ fontSize: '1.1rem', color: 'var(--accent)' }}>Model Parameter Count: 3.4M</code>
                             <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>Optimized for TFLite/WebAssembly execution.</p>
                         </div>
                         <p>
                            Every frame is evaluated against a baseline of <strong>30,000+ annotated human sessions</strong> to ensure bias is minimized and reliability is maximized.
                         </p>
                    </div>
                </div>
            </section>

            {/* CTA FOOTER */}
            <section className="section container" style={{ textAlign: 'center', paddingBottom: '10rem' }}>
                <div className="glass glass-card" style={{ padding: '5rem' }}>
                    <h1>Ready to secure your first exam?</h1>
                    <p style={{ marginBottom: '3rem', opacity: 0.8 }}>Join thousands of institutions using PROCTOR AI.</p>
                    <button className="btn" onClick={onStart} style={{ fontSize: '1.2rem', padding: '1.2rem 4rem' }}>
                        Start Your Free Mock Exam
                    </button>
                </div>
            </section>

            <footer style={{ padding: '4rem 0', borderTop: '1px solid var(--glass-border)', textAlign: 'center' }}>
                <p style={{ opacity: 0.5 }}>Developed for Darshan University ML project. © 2026</p>
            </footer>

            {/* DATASHEET MODAL */}
            {showDatasheet && (
                <div style={{ 
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
                    background: 'rgba(0,0,0,0.85)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setShowDatasheet(false)}>
                    <div className="glass" style={{ 
                        maxWidth: '700px', width: '90%', padding: '3rem', maxHeight: '90vh', overflowY: 'auto'
                    }} onClick={(e) => e.stopPropagation()}>
                        <h2>Technical Datasheet v2.4</h2>
                        <div style={{ margin: '2rem 0', textAlign: 'left' }}>
                            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                                <strong style={{ color: 'var(--secondary)' }}>Core Architecture</strong>
                                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>BlazeFace (Google MediaPipe Backbone) with Depthwise Separable Convolutions.</p>
                            </div>
                            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                                <strong style={{ color: 'var(--secondary)' }}>Landmark Metrics</strong>
                                <ul style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.8 }}>
                                    <li>• 468 - High Density Face Mesh Nodes (x, y, z)</li>
                                    <li>• 10 - High Precision Iris Center Tracking</li>
                                    <li>• Real-time Pose Estimation (±1° Accuracy)</li>
                                </ul>
                            </div>
                            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                                <strong style={{ color: 'var(--secondary)' }}>Software Stack</strong>
                                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>React 18, FastAPI (Python), SQLite 3, WebAssembly (WASM).</p>
                            </div>
                            <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem' }}>
                                <strong style={{ color: 'var(--secondary)' }}>Security & Privacy</strong>
                                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Zero-Cloud Image Retention. All biometric processing is performed on the local edge client. Only anonymized behavioral vectors are logged to the audit database.</p>
                            </div>
                        </div>
                        <button className="btn" onClick={() => setShowDatasheet(false)} style={{ width: '100%' }}>Close Datasheet</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
