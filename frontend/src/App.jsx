import React, { useState } from 'react'
import LoginPage from './components/LoginPage'
import ExamPage from './components/ExamPage'

function App() {
    const [studentId, setStudentId] = useState(null)

    const handleLogin = (id) => {
        setStudentId(id)
    }

    return (
        <div className="App">
            {!studentId ? (
                <LoginPage onLogin={handleLogin} />
            ) : (
                <ExamPage studentId={studentId} />
            )}
        </div>
    )
}

export default App
