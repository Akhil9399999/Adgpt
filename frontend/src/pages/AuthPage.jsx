import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function AuthPage() {
    const [tab, setTab] = useState('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { currentUser, userProfile, profileLoading, login, signup } = useAuth();

    // If already logged in, redirect based on role
    if (currentUser) {
        // Wait for profile to load before deciding redirect target
        if (profileLoading || !userProfile) {
            return (
                <div className="auth-bg">
                    <div className="auth-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
                        <div className="spinner" style={{ width: 40, height: 40, borderTopColor: '#a855f7', borderColor: '#e5e7eb', margin: '0 auto 20px' }}></div>
                        <p style={{ color: '#6b21a8', fontWeight: 700 }}>Signing you in...</p>
                    </div>
                </div>
            );
        }
        const target = userProfile.role === 'admin' ? '/admin-dashboard' : '/ad-generator';
        return <Navigate to={target} replace />;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            let result;
            if (tab === 'login') {
                result = await login(email, password);
            } else {
                if (!name.trim()) { setError('Please enter your name'); setLoading(false); return; }
                result = await signup(name.trim(), email, password);
            }
            // Read role directly from Firestore and do a HARD redirect
            // window.location.href bypasses all React Router race conditions
            const snap = await getDoc(doc(db, 'users', result.user.uid));
            const role = snap.exists() ? snap.data().role : 'user';
            window.location.href = role === 'admin' ? '/admin-dashboard' : '/ad-generator';
        } catch (err) {
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
                setError('Invalid email or password.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('Email already in use. Try logging in.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password must be at least 6 characters.');
            } else {
                setError(err.message || 'Something went wrong. Try again.');
            }
            setLoading(false);
        }
    }

    return (
        <div className="auth-bg">
            <div className="auth-card">
                <div className="auth-logo">
                    <h1>✨ AdGPT</h1>
                    <p>AI-Powered Social Media Content Generator</p>
                </div>

                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
                        onClick={() => { setTab('login'); setError(''); }}
                    >Login</button>
                    <button
                        className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
                        onClick={() => { setTab('signup'); setError(''); }}
                    >Sign Up</button>
                </div>

                {error && <div className="error-msg">⚠️ {error}</div>}

                <form onSubmit={handleSubmit}>
                    {tab === 'signup' && (
                        <div className="form-group">
                            <label>Name</label>
                            <input
                                type="text"
                                placeholder="Enter your name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>
                    )}
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button className="btn-primary" type="submit" disabled={loading}>
                        {loading ? '⏳ Please wait...' : tab === 'login' ? '🚀 Login' : '✨ Sign Up'}
                    </button>
                </form>

                <div className="auth-switch">
                    {tab === 'login'
                        ? <>Don't have an account? <a onClick={() => setTab('signup')}>Sign up</a></>
                        : <>Already have an account? <a onClick={() => setTab('login')}>Login</a></>
                    }
                </div>
            </div>
        </div>
    );
}