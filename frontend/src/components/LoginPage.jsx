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
        <div className="login-container">
            <h1>Student Login</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <input
                        type="text"
                        placeholder="Enter Student ID"
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                        style={{ padding: '0.8rem', borderRadius: '4px', border: '1px solid #555', width: '100%', boxSizing: 'border-box' }}
                    />
                </div>
                <button type="submit">Start Exam</button>
            </form>
        </div>
    )
}

export default LoginPage
