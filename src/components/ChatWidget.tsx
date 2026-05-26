'use client';

import { useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase-browser';
import type { User } from '@supabase/supabase-js';
import styles from './ChatWidget.module.css';

const EXPERTS = [
  { id: 'agri', name: 'Mgoun AGRI', icon: '🌾', available: true },
  { id: 'soon1', name: 'Bientôt', icon: '🔬', available: false },
  { id: 'soon2', name: 'Bientôt', icon: '💡', available: false },
];

type Message = { role: 'user' | 'assistant'; text: string };
type AuthMode = 'login' | 'signup' | 'confirm';

export function ChatWidget() {
  const [supabase] = useState(() => createBrowserClient());
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeExpert, setActiveExpert] = useState('agri');
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, activeExpert]);

  function switchMode(mode: AuthMode) {
    setAuthMode(mode);
    setAuthError('');
    setPassword('');
    setConfirmPassword('');
  }

  async function login() {
    setAuthError('');
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError('Email ou mot de passe incorrect.');
    setAuthLoading(false);
  }

  async function signup() {
    setAuthError('');
    if (password !== confirmPassword) {
      setAuthError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setAuthLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setAuthError(error.message);
    } else {
      setAuthMode('confirm');
    }
    setAuthLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setMessages({});
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setInput('');
    setMessages(prev => ({
      ...prev,
      [activeExpert]: [...(prev[activeExpert] ?? []), { role: 'user', text }],
    }));
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ expertId: activeExpert, message: text }),
      });
      const data = await res.json();
      setMessages(prev => ({
        ...prev,
        [activeExpert]: [...(prev[activeExpert] ?? []), { role: 'assistant', text: data.reply ?? data.error }],
      }));
    } catch {
      setMessages(prev => ({
        ...prev,
        [activeExpert]: [...(prev[activeExpert] ?? []), { role: 'assistant', text: 'Erreur réseau. Veuillez réessayer.' }],
      }));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const currentMessages = messages[activeExpert] ?? [];
  const currentExpert = EXPERTS.find(e => e.id === activeExpert)!;

  return (
    <>
      {!open && (
        <button className={styles.fab} onClick={() => setOpen(true)} aria-label="Ouvrir le chat">
          💬
        </button>
      )}

      {open && (
        <div className={styles.panel}>
          {/* Header */}
          <div className={styles.header}>
            <span className={styles.headerTitle}>Mgoun AI</span>
            <div className={styles.headerActions}>
              {user && (
                <button className={styles.logoutBtn} onClick={logout}>Déconnexion</button>
              )}
              <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
            </div>
          </div>

          {!user ? (
            /* ── Auth ── */
            <div className={styles.loginPanel}>
              <div className={styles.loginIcon}>🌾</div>

              {authMode === 'confirm' ? (
                /* Email de confirmation envoyé */
                <>
                  <h2 className={styles.loginTitle}>Vérifiez votre email</h2>
                  <p className={styles.loginDesc}>
                    Un lien de confirmation a été envoyé à <strong>{email}</strong>.<br />
                    Cliquez dessus puis revenez ici pour vous connecter.
                  </p>
                  <button className={styles.switchBtn} onClick={() => switchMode('login')}>
                    Retour à la connexion
                  </button>
                </>
              ) : (
                <>
                  <h2 className={styles.loginTitle}>
                    {authMode === 'login' ? 'Connexion' : 'Créer un compte'}
                  </h2>
                  <p className={styles.loginDesc}>
                    {authMode === 'login'
                      ? 'Accédez à vos experts IA Mgoun AI'
                      : 'Créez votre compte pour discuter avec nos experts'}
                  </p>

                  <input
                    className={styles.authInput}
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <input
                    className={styles.authInput}
                    type="password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    onKeyDown={e => authMode === 'login' && e.key === 'Enter' && login()}
                  />
                  {authMode === 'signup' && (
                    <input
                      className={styles.authInput}
                      type="password"
                      placeholder="Confirmer le mot de passe"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      onKeyDown={e => e.key === 'Enter' && signup()}
                    />
                  )}

                  {authError && <p className={styles.authError}>{authError}</p>}

                  <button
                    className={styles.loginBtn}
                    onClick={authMode === 'login' ? login : signup}
                    disabled={authLoading || !email || !password}
                  >
                    {authLoading
                      ? '…'
                      : authMode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                  </button>

                  <p className={styles.switchText}>
                    {authMode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}
                    {' '}
                    <button
                      className={styles.switchBtn}
                      onClick={() => switchMode(authMode === 'login' ? 'signup' : 'login')}
                    >
                      {authMode === 'login' ? 'Créer un compte' : 'Se connecter'}
                    </button>
                  </p>
                </>
              )}
            </div>
          ) : (
            /* ── Chat ── */
            <>
              <div className={styles.tabs}>
                {EXPERTS.map(expert => (
                  <button
                    key={expert.id}
                    className={`${styles.tab} ${activeExpert === expert.id ? styles.tabActive : ''} ${!expert.available ? styles.tabDisabled : ''}`}
                    onClick={() => expert.available && setActiveExpert(expert.id)}
                    disabled={!expert.available}
                    title={expert.available ? expert.name : 'Bientôt disponible'}
                  >
                    <span>{expert.icon}</span>
                    <span className={styles.tabName}>{expert.name}</span>
                  </button>
                ))}
              </div>

              <div className={styles.messages}>
                {currentMessages.length === 0 && (
                  <div className={styles.empty}>
                    <span className={styles.emptyIcon}>{currentExpert.icon}</span>
                    <p>Posez votre première question à <strong>{currentExpert.name}</strong></p>
                    <p className={styles.emptyHint}>En français, arabe, darija ou anglais</p>
                  </div>
                )}
                {currentMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`${styles.bubble} ${msg.role === 'user' ? styles.user : styles.assistant}`}
                  >
                    <pre className={styles.bubbleText}>{msg.text}</pre>
                  </div>
                ))}
                {loading && (
                  <div className={`${styles.bubble} ${styles.assistant}`}>
                    <span className={styles.typing}>···</span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className={styles.inputArea}>
                <textarea
                  ref={inputRef}
                  className={styles.input}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Votre message… (Entrée pour envoyer)"
                  rows={1}
                  disabled={loading}
                />
                <button
                  className={styles.sendBtn}
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                >
                  ↑
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
