import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

export const AuthModal: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login, signup, isAuthenticated, error, clearError } = useAuthStore();

    // Clear error when switching modes
    useEffect(() => {
        clearError();
    }, [isLogin, clearError]);

    if (isAuthenticated) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLogin) {
            await login(email, password);
        } else {
            await signup(username, email, password);
        }
    };

    return (
        <div className="auth-modal">
            <div className="auth-container">
                <div className="auth-header">
                    <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                    <p>{isLogin ? 'Sign in to access AI features' : 'Join to start coding with AI'}</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="johndoe"
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="user@example.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            minLength={8}
                            required
                        />
                        {!isLogin && <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Min. 8 characters</small>}
                    </div>

                    {error && (
                        <div style={{
                            color: 'var(--error-color)',
                            fontSize: '12px',
                            padding: '8px',
                            background: 'rgba(241, 76, 76, 0.1)',
                            borderRadius: '4px',
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}

                    <div className="auth-actions" style={{ flexDirection: 'column', marginTop: '12px' }}>
                        <button type="submit" className="auth-btn primary" style={{ width: '100%' }}>
                            {isLogin ? 'Sign In' : 'Create Account'}
                        </button>

                        <button
                            type="button"
                            className="auth-btn secondary"
                            onClick={() => setIsLogin(!isLogin)}
                            style={{ width: '100%', background: 'transparent', border: 'none' }}
                        >
                            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
