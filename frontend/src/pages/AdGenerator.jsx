import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    collection, addDoc, getDocs, deleteDoc, doc,
    query, where, orderBy, serverTimestamp, updateDoc, increment
} from 'firebase/firestore';
import { db } from '../utils/firebase';

function CopyBtn({ text }) {
    const [copied, setCopied] = useState(false);
    function handleCopy() {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
    return (
        <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
            {copied ? '✅ Copied!' : '📋 Copy'}
        </button>
    );
}

export default function AdGenerator() {
    const { currentUser, userProfile, logout } = useAuth();
    const navigate = useNavigate();
    const [productName, setProductName] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [currentProduct, setCurrentProduct] = useState('');
    const [copyAllDone, setCopyAllDone] = useState(false);
    const [badgeHovered, setBadgeHovered] = useState(false);
    const contentRef = useRef(null);

    useEffect(() => { fetchHistory(); }, []);

    async function fetchHistory() {
        setHistoryLoading(true);
        try {
            const q = query(
                collection(db, 'generations'),
                where('uid', '==', currentUser.uid),
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
        }
        setHistoryLoading(false);
    }

    async function handleGenerate() {
        if (!productName.trim()) return;
        const product = productName.trim();
        setLoading(true);
        setError('');
        setResult(null);
        setProductName(''); // clear input immediately on generate

        try {
            const res = await fetch('http://localhost:5000/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productName: product })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Generation failed');

            setResult(data.data);
            setCurrentProduct(product);

            // Save to Firestore
            await addDoc(collection(db, 'generations'), {
                uid: currentUser.uid,
                productName: product,
                result: data.data,
                createdAt: serverTimestamp()
            });

            // Update user generation count
            await updateDoc(doc(db, 'users', currentUser.uid), {
                generations: increment(1)
            });

            fetchHistory();
        } catch (e) {
            setError(e.message);
        }
        setLoading(false);
    }

    async function handleDeleteHistory(id) {
        await deleteDoc(doc(db, 'generations', id));
        setHistory(prev => prev.filter(h => h.id !== id));
    }

    function loadFromHistory(item) {
        setResult(item.result);
        setCurrentProduct(item.productName);
        setProductName('');
    }

    function handleNewChat() {
        setResult(null);
        setProductName('');
        setCurrentProduct('');
        setError('');
    }

    async function handleLogout() {
        await logout();
        navigate('/login');
    }

    function copyAll() {
        if (!result) return;
        const hashtagsText = (tags) => Array.isArray(tags) ? tags.join(' ') : tags;
        const text = `Title: ${result.title}\n\nCaption:\n${result.caption}\n\nInstagram Hashtags:\n${hashtagsText(result.hashtags?.instagram)}\n\nTwitter Hashtags:\n${hashtagsText(result.hashtags?.twitter)}\n\nYouTube Hashtags:\n${hashtagsText(result.hashtags?.youtube)}`;
        navigator.clipboard.writeText(text);
        setCopyAllDone(true);
        setTimeout(() => setCopyAllDone(false), 2000);
    }

    function formatHashtags(tags) {
        if (!tags) return '';
        return Array.isArray(tags) ? tags.join(' ') : tags;
    }

    function formatDate(ts) {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    }

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <div className="sidebar">
                <div className="sidebar-title">
                    📋 History
                    <button className="sidebar-new-btn" onClick={handleNewChat} title="New">+</button>
                </div>

                {historyLoading ? (
                    <div className="loading-history">⏳ Loading history...</div>
                ) : history.length === 0 ? (
                    <div style={{ color: '#9ca3af', fontSize: '0.85rem', padding: '10px 4px' }}>
                        No history yet. Generate something!
                    </div>
                ) : (
                    history.map(item => (
                        <div
                            key={item.id}
                            className={`history-item ${currentProduct === item.productName ? 'active' : ''}`}
                            onClick={() => loadFromHistory(item)}
                        >
                            <div>
                                <div className="history-item-name">{item.productName}</div>
                                <div className="history-item-date">{formatDate(item.createdAt)}</div>
                            </div>
                            <button
                                className="history-delete-btn"
                                onClick={e => { e.stopPropagation(); handleDeleteHistory(item.id); }}
                            >🗑</button>
                        </div>
                    ))
                )}
            </div>

            {/* Main content */}
            <div className="main-content">
                {/* Topbar */}
                <div className="topbar">
                    <div className="topbar-logo">✨ AdGPT</div>
                    <div className="topbar-right">
                        {userProfile?.role === 'admin' && (
                            <button className="admin-nav-btn" onClick={() => navigate('/admin-dashboard')}>
                                🛡 Admin
                            </button>
                        )}
                        <div
                            className={`user-badge ${badgeHovered ? 'logout-hover' : ''}`}
                            title="Double-click to logout"
                            onMouseEnter={() => setBadgeHovered(true)}
                            onMouseLeave={() => setBadgeHovered(false)}
                            onDoubleClick={handleLogout}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                        >
                            {badgeHovered
                                ? <><span style={{ fontSize: '1rem' }}>🚪</span> Logout</>
                                : <><span style={{ fontSize: '1rem' }}>👤</span> {currentUser?.displayName || userProfile?.name || 'User'}</>
                            }
                        </div>
                    </div>
                </div>

                {/* Content area */}
                <div className="content-area" ref={contentRef}>
                    {!result && !loading && !error && (
                        <div className="welcome-screen">
                            <div className="welcome-icon">✨</div>
                            <h2>Welcome to AdGPT!</h2>
                            <p>Enter a product name below and generate ready-to-post social media content instantly.</p>
                        </div>
                    )}

                    {error && (
                        <div className="error-msg" style={{ marginBottom: 16 }}>⚠️ {error}</div>
                    )}

                    {result && (
                        <>
                            <div className="product-banner">
                                {currentProduct}
                            </div>
                            <div className="intro-banner">
                                ✨ Here's your ready-to-copy, trendy youth-style social media pack
                            </div>

                            {/* Title */}
                            <div className="content-card">
                                <div className="content-card-header">
                                    <div className="content-card-title">✨ Title</div>
                                    <CopyBtn text={result.title} />
                                </div>
                                <div className="content-text">🎯 {result.title}</div>
                            </div>

                            {/* Caption */}
                            <div className="content-card">
                                <div className="content-card-header">
                                    <div className="content-card-title">💬 Caption (3 lines)</div>
                                    <CopyBtn text={result.caption} />
                                </div>
                                <div className="content-text" style={{ whiteSpace: 'pre-line' }}>
                                    {result.caption}
                                </div>
                            </div>

                            {/* Instagram Hashtags */}
                            <div className="content-card">
                                <div className="content-card-header">
                                    <div className="content-card-title">📸 Instagram Hashtags</div>
                                    <CopyBtn text={formatHashtags(result.hashtags?.instagram)} />
                                </div>
                                <div className="hashtags-list">
                                    {result.hashtags?.instagram?.map((tag, i) => (
                                        <span key={i} className="hashtag-chip">{tag}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Twitter Hashtags */}
                            <div className="content-card">
                                <div className="content-card-header">
                                    <div className="content-card-title">🐦 Twitter Hashtags</div>
                                    <CopyBtn text={formatHashtags(result.hashtags?.twitter)} />
                                </div>
                                <div className="hashtags-list">
                                    {result.hashtags?.twitter?.map((tag, i) => (
                                        <span key={i} className="hashtag-chip">{tag}</span>
                                    ))}
                                </div>
                            </div>

                            {/* YouTube Hashtags */}
                            <div className="content-card">
                                <div className="content-card-header">
                                    <div className="content-card-title">▶️ YouTube Hashtags</div>
                                    <CopyBtn text={formatHashtags(result.hashtags?.youtube)} />
                                </div>
                                <div className="hashtags-list">
                                    {result.hashtags?.youtube?.map((tag, i) => (
                                        <span key={i} className="hashtag-chip">{tag}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Copy All */}
                            <button className={`copy-all-btn ${copyAllDone ? 'copied' : ''}`} onClick={copyAll}>
                                {copyAllDone ? '✅ All Copied!' : '📋 Copy All Content'}
                            </button>
                        </>
                    )}

                    {loading && (
                        <div className="welcome-screen">
                            <div className="spinner" style={{ width: 48, height: 48, marginBottom: 16 }}></div>
                            <p style={{ color: '#9ca3af' }}>Generating amazing content for <strong>{currentProduct || 'your product'}</strong>...</p>
                        </div>
                    )}
                </div>

                {/* Input area */}
                <div className="input-area">
                    <div className="product-input">
                        <span>✨</span>
                        <input
                            type="text"
                            placeholder="Enter product name..."
                            value={productName}
                            onChange={e => setProductName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !loading && handleGenerate()}
                        />
                    </div>
                    <button
                        className="generate-btn"
                        onClick={handleGenerate}
                        disabled={loading || !productName.trim()}
                    >
                        {loading ? <><span className="spinner"></span> Generating...</> : '✨ Generate Content'}
                    </button>
                </div>
            </div>
        </div>
    );
}