import React, { useState } from 'react'
import LandingPage from './components/LandingPage'
import LoginPage from './components/LoginPage'
import ExamPage from './components/ExamPage'

function App() {
    // Navigation state: 'landing', 'login', 'exam'
    const [view, setView] = useState('landing')
    const [studentId, setStudentId] = useState(null)

    const handleStart = () => {
        setView('login')
    }

    const handleLogin = (id) => {
        setStudentId(id)
        setView('exam')
    }

    const renderView = () => {
        switch (view) {
            case 'landing':
                return <LandingPage onStart={handleStart} />
            case 'login':
                return (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%' }}>
                        <LoginPage onLogin={handleLogin} />
                    </div>
                )
            case 'exam':
                return <ExamPage studentId={studentId} />
            default:
                return <LandingPage onStart={handleStart} />
        }
    }

    return (
        <div className="App">
            {renderView()}
        </div>
    )
}

export default App
