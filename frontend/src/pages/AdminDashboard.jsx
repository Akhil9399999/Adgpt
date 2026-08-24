import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function AdminDashboard() {
    const { currentUser, userProfile, logout } = useAuth();
    const navigate = useNavigate();
    const [adminBadgeHovered, setAdminBadgeHovered] = useState(false);
    const [users, setUsers] = useState([]);
    const [generations, setGenerations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const usersSnap = await getDocs(collection(db, 'users'));
            const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setUsers(usersData);

            const genSnap = await getDocs(collection(db, 'generations'));
            setGenerations(genSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }

    async function handleDelete(userId) {
        if (!window.confirm('Delete this user from database?')) return;
        await deleteDoc(doc(db, 'users', userId));
        setUsers(prev => prev.filter(u => u.id !== userId));
    }

    function formatDate(ts) {
        if (!ts) return '-';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        const now = new Date();
        const diff = now - d;
        if (diff < 86400000) return 'Today';
        if (diff < 172800000) return 'Yesterday';
        return Math.floor(diff / 86400000) + 'd ago';
    }

    function getTodayUsers() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return users.filter(u => {
            if (!u.createdAt) return false;
            const d = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
            return d >= today;
        }).length;
    }

    function getActiveToday() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return users.filter(u => {
            if (!u.lastLogin) return false;
            const d = u.lastLogin.toDate ? u.lastLogin.toDate() : new Date(u.lastLogin);
            return d >= today;
        }).length;
    }

    function downloadPDF() {
        const rows = users.map(u =>
            `${u.email} | ${u.name} | ${u.generations || 0} generations | ${u.role || 'user'} | ${u.status || 'active'}`
        ).join('\n');
        const content = `AdGPT Users Report\nGenerated: ${new Date().toLocaleString()}\n\n${rows}`;
        const blob = new Blob([content], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'adgpt-users.txt';
        a.click();
    }

    async function handleLogout() {
        await logout();
        navigate('/login');
    }

    return (
        <div className="admin-layout">
            <div className="admin-topbar">
                <div className="admin-logo">
                    ✨ AdGPT Admin
                    <span className="admin-badge">👑 Admin Dashboard</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div
                        className={`user-badge ${adminBadgeHovered ? 'logout-hover' : ''}`}
                        title="Double-click to logout"
                        onMouseEnter={() => setAdminBadgeHovered(true)}
                        onMouseLeave={() => setAdminBadgeHovered(false)}
                        onDoubleClick={handleLogout}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                        {adminBadgeHovered
                            ? <><span style={{ fontSize: '1rem' }}>🚪</span> Logout</>
                            : <><span style={{ fontSize: '1rem' }}>👑</span> {userProfile?.name || 'Admin'}</>
                        }
                    </div>
                </div>
            </div>

            <div className="admin-content">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
                        <div className="spinner" style={{ width: 40, height: 40, borderTopColor: '#a855f7', borderColor: '#e5e7eb', margin: '0 auto 16px' }}></div>
                        Loading dashboard...
                    </div>
                ) : (
                    <>
                        {/* Stats */}
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-icon">👥</div>
                                <div>
                                    <div className="stat-number">{users.length}</div>
                                    <div className="stat-label">Total Users</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">✨</div>
                                <div>
                                    <div className="stat-number">{generations.length}</div>
                                    <div className="stat-label">Total Generations</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">🔥</div>
                                <div>
                                    <div className="stat-number">{getActiveToday()}</div>
                                    <div className="stat-label">Active Today</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">🎉</div>
                                <div>
                                    <div className="stat-number">{getTodayUsers()}</div>
                                    <div className="stat-label">New Users Today</div>
                                </div>
                            </div>
                        </div>

                        {/* Users Table */}
                        <div className="users-section">
                            <div className="users-header">
                                <h2>👥 Users Management</h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <span className="total-count">{users.length} total users</span>
                                    <button className="download-btn" onClick={downloadPDF}>
                                        📄 Download as PDF
                                    </button>
                                </div>
                            </div>

                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>Email</th>
                                        <th>Name</th>
                                        <th>Generations</th>
                                        <th>Joined</th>
                                        <th>Last Login</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id}>
                                            <td>
                                                {user.email}
                                                {user.role === 'admin' && (
                                                    <span className="role-badge" style={{ marginLeft: 8 }}>👑 Admin</span>
                                                )}
                                            </td>
                                            <td>{user.name}</td>
                                            <td>
                                                <span className="gen-badge">{user.generations || 0}</span>
                                            </td>
                                            <td>{formatDate(user.createdAt)}</td>
                                            <td>{formatDate(user.lastLogin)}</td>
                                            <td>
                                                <span className="status-badge">✅ Active</span>
                                            </td>
                                            <td>
                                                {user.role !== 'admin' && (
                                                    <button className="delete-btn" onClick={() => handleDelete(user.id)}>
                                                        🗑 Delete
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}