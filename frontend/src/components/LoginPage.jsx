import React, { useState } from 'react'

const LoginPage = ({ onLogin }) => {
    const [id, setId] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        if (id.trim()) {
            onLogin(id)
        }
    }

    return (
        <div className="glass glass-card login-container" style={{ width: '100%', maxWidth: '450px', margin: '0 auto', textAlign: 'center' }}>
            <h2>Student Access</h2>
            <p style={{ opacity: 0.7, marginBottom: '2rem' }}>Please enter your credentials to begin the secured examination session.</p>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <input
                        type="text"
                        placeholder="Enter Student ID (e.g., STU001)"
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                        style={{ 
                            padding: '1rem', 
                            borderRadius: '12px', 
                            border: '1px solid var(--glass-border)', 
                            background: 'rgba(255,255,255,0.05)',
                            color: 'white',
                            width: '100%', 
                            boxSizing: 'border-box',
                            fontSize: '1.1rem',
                            outline: 'none',
                            transition: 'border-color 0.3s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--secondary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                    />
                </div>
                <button type="submit" style={{ width: '100%', fontSize: '1.2rem', padding: '1rem' }}>
                    Verify & Start Exam
                </button>
            </form>
            <div style={{ marginTop: '2rem', fontSize: '0.8rem', opacity: 0.5 }}>
                ⚠️ By logging in, you agree to real-time AI monitoring for exam integrity.
            </div>
        </div>
    )
}

export default LoginPage
