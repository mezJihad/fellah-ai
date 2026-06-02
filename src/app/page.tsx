'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase-browser';
import type { User } from '@supabase/supabase-js';
import styles from './page.module.css';

const EXPERTS = [
  {
    id: 'agri',
    name: 'Mgoun AGRI',
    icon: '🌾',
    description: 'Expert en agriculture marocaine — traitements, engrais, irrigation, variétés locales, calendriers agricoles. Posez vos questions en Darija, français ou arabe.',
    available: true,
  },
  {
    id: 'invest',
    name: 'Mgoun Invest',
    icon: '📈',
    description: 'Mentor stratégique en investissement et entrepreneuriat au Maroc — success stories locales, feuilles de route concrètes, réalités du marché marocain.',
    available: true,
  },
  { id: 'soon1', name: 'Bientôt', icon: '💡', description: '', available: false },
];

type Message = { role: 'user' | 'assistant'; text: string; imageUrl?: string };
type AuthMode = 'login' | 'signup' | 'confirm' | 'confirm-phone-change';

export default function ChatPage() {
  const [supabase] = useState(() => createBrowserClient());

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [pendingPhone, setPendingPhone] = useState('');
  const [currentPhone, setCurrentPhone] = useState('');
  const pendingPhoneRef = useRef('');

  // ── Chat ──────────────────────────────────────────────────────────────────
  const [selectedExpert, setSelectedExpert] = useState('agri');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageData, setImageData] = useState<{ mimeType: string; base64: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // ── Auth listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user && pendingPhoneRef.current) {
        const p = pendingPhoneRef.current;
        pendingPhoneRef.current = '';
        linkPhone(session.access_token, p);
      }
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, selectedExpert]);

  // ── Auth helpers ──────────────────────────────────────────────────────────
  function switchMode(mode: AuthMode) {
    setAuthMode(mode);
    setAuthError('');
    setPassword('');
    setConfirmPassword('');
  }

  async function linkPhone(accessToken: string, phoneToLink: string, confirmChange = false) {
    try {
      const res = await fetch('/api/auth/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ phone: phoneToLink, confirmChange }),
      });
      const data = await res.json();
      if (data.needsConfirmation) {
        setCurrentPhone(data.currentPhone);
        setPendingPhone(phoneToLink);
        setAuthMode('confirm-phone-change');
      } else if (data.error === 'number_taken') {
        setAuthError('Ce numéro est déjà utilisé par un autre compte.');
      }
    } catch { /* non-blocking */ }
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
    if (password !== confirmPassword) { setAuthError('Les mots de passe ne correspondent pas.'); return; }
    if (password.length < 6) { setAuthError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setAuthError(error.message); setAuthLoading(false); return; }
    const trimmedPhone = phone.trim();
    if (data.session) {
      if (trimmedPhone) await linkPhone(data.session.access_token, trimmedPhone);
    } else {
      if (trimmedPhone) pendingPhoneRef.current = trimmedPhone;
      setAuthMode('confirm');
    }
    setAuthLoading(false);
  }

  async function confirmPhoneChange() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await linkPhone(session.access_token, pendingPhone, true);
    setPendingPhone(''); setCurrentPhone(''); setAuthMode('login');
  }

  async function logout() {
    await supabase.auth.signOut();
    setMessages({});
  }

  // ── Chat helpers ──────────────────────────────────────────────────────────
  async function sendMessage() {
    const text = input.trim();
    if ((!text && !imageData) || loading) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const capturedImage = imageData;
    const capturedPreview = imagePreview;
    setInput('');
    setImageData(null);
    setImagePreview(null);
    setMessages(prev => ({
      ...prev,
      [selectedExpert]: [...(prev[selectedExpert] ?? []), { role: 'user', text: text || '', imageUrl: capturedPreview ?? undefined }],
    }));
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ expertId: selectedExpert, message: text || '', imageData: capturedImage ?? undefined }),
      });
      const data = await res.json();
      setMessages(prev => ({
        ...prev,
        [selectedExpert]: [...(prev[selectedExpert] ?? []), { role: 'assistant', text: data.reply ?? data.error }],
      }));
    } catch {
      setMessages(prev => ({
        ...prev,
        [selectedExpert]: [...(prev[selectedExpert] ?? []), { role: 'assistant', text: 'Erreur réseau. Veuillez réessayer.' }],
      }));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      setImageData({ mimeType: file.type, base64 });
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function toggleRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        setIsTranscribing(true);
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType });
          const ext = recorder.mimeType.includes('ogg') ? 'ogg' : 'webm';
          const audioFile = new File([blob], `audio.${ext}`, { type: blob.type });
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          const form = new FormData();
          form.append('audio', audioFile);
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: form,
          });
          const data = await res.json();
          if (data.text) setInput(prev => (prev ? prev + ' ' + data.text : data.text));
        } finally {
          setIsTranscribing(false);
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      alert('Impossible d\'accéder au microphone.');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function selectExpert(id: string) {
    setSelectedExpert(id);
    setMobileView('chat');
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  // ── Dérivés ───────────────────────────────────────────────────────────────
  const currentMessages = messages[selectedExpert] ?? [];
  const expert = EXPERTS.find(e => e.id === selectedExpert)!;

  // ══════════════════════════════════════════════════════════════════════════
  // AUTH GATE
  // ══════════════════════════════════════════════════════════════════════════
  if (!user) {
    return (
      <div className={styles.authLayout}>
        <div className={styles.authCard}>
          <div className={styles.authLogo}>🌾</div>
          <h1 className={styles.authTitle}>Mgoun AI</h1>

          {authMode === 'confirm' ? (
            <>
              <p className={styles.authDesc}>
                Un lien de confirmation a été envoyé à <strong>{email}</strong>.<br />
                Cliquez dessus puis revenez vous connecter.
              </p>
              <button className={styles.switchBtn} onClick={() => switchMode('login')}>
                Retour à la connexion
              </button>
            </>
          ) : authMode === 'confirm-phone-change' ? (
            <>
              <p className={styles.authDesc}>
                Ce compte est déjà lié au <strong>{currentPhone}</strong>.<br />
                Remplacer par <strong>{pendingPhone}</strong> ?
              </p>
              {authError && <p className={styles.authError}>{authError}</p>}
              <button className={styles.submitBtn} onClick={confirmPhoneChange}>Confirmer</button>
              <button className={styles.switchBtn} onClick={() => { setPendingPhone(''); setCurrentPhone(''); switchMode('login'); }}>Annuler</button>
            </>
          ) : (
            <>
              <p className={styles.authDesc}>
                {authMode === 'login' ? 'Connectez-vous pour discuter avec nos experts' : 'Créez votre compte gratuitement'}
              </p>
              <input className={styles.authInput} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              <input className={styles.authInput} type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} onKeyDown={e => authMode === 'login' && e.key === 'Enter' && login()} />
              {authMode === 'signup' && (
                <>
                  <input className={styles.authInput} type="password" placeholder="Confirmer le mot de passe" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                  <input className={styles.authInput} type="tel" placeholder="Numéro WhatsApp (facultatif) ex: +212612345678" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" onKeyDown={e => e.key === 'Enter' && signup()} />
                </>
              )}
              {authError && <p className={styles.authError}>{authError}</p>}
              <button className={styles.submitBtn} onClick={authMode === 'login' ? login : signup} disabled={authLoading || !email || !password}>
                {authLoading ? '…' : authMode === 'login' ? 'Se connecter' : 'Créer mon compte'}
              </button>
              <p className={styles.switchText}>
                {authMode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}
                {' '}
                <button className={styles.switchBtn} onClick={() => switchMode(authMode === 'login' ? 'signup' : 'login')}>
                  {authMode === 'login' ? 'Créer un compte' : 'Se connecter'}
                </button>
              </p>
            </>
          )}

          <Link href="/home" className={styles.homeLink}>Découvrir Mgoun AI →</Link>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHAT INTERFACE
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className={styles.layout}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {mobileView === 'chat' && (
            <button className={styles.backBtn} onClick={() => setMobileView('list')} aria-label="Retour">
              ←
            </button>
          )}
          <span className={styles.logo}>🌾 Mgoun AI</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.userEmail}>{user.email}</span>
          <button className={styles.logoutBtn} onClick={logout}>Déconnexion</button>
          <Link href="/home" className={styles.homeBtn}>À propos</Link>
        </div>
      </header>

      {/* ── Body ── */}
      <div className={styles.body}>

        {/* ── Sidebar experts ── */}
        <aside className={`${styles.sidebar} ${mobileView === 'chat' ? styles.hidden : ''}`}>
          <div className={styles.sidebarTitle}>Experts</div>
          {EXPERTS.map(exp => (
            <button
              key={exp.id}
              className={`${styles.expertItem} ${exp.id === selectedExpert ? styles.expertActive : ''} ${!exp.available ? styles.expertDisabled : ''}`}
              onClick={() => exp.available && selectExpert(exp.id)}
              disabled={!exp.available}
            >
              <span className={styles.expertItemIcon}>{exp.icon}</span>
              <div className={styles.expertItemInfo}>
                <span className={styles.expertItemName}>{exp.name}</span>
                {!exp.available && <span className={styles.expertItemSoon}>Bientôt disponible</span>}
                {exp.available && messages[exp.id]?.length > 0 && (
                  <span className={styles.expertItemPreview}>
                    {messages[exp.id][messages[exp.id].length - 1].text.slice(0, 40)}…
                  </span>
                )}
              </div>
              {exp.available && <span className={styles.chevron}>›</span>}
            </button>
          ))}
        </aside>

        {/* ── Main conversation ── */}
        <main className={`${styles.main} ${mobileView === 'list' ? styles.hidden : ''}`}>

          {/* Messages */}
          <div className={styles.messages}>
            {currentMessages.length === 0 ? (
              <div className={styles.welcome}>
                <div className={styles.welcomeIcon}>{expert.icon}</div>
                <h2 className={styles.welcomeName}>{expert.name}</h2>
                <p className={styles.welcomeDesc}>{expert.description}</p>
                <p className={styles.welcomeHint}>Posez votre première question ci-dessous</p>
              </div>
            ) : (
              currentMessages.map((msg, i) => (
                <div key={i} className={`${styles.bubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}`}>
                  {msg.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={msg.imageUrl} alt="Image envoyée" className={styles.bubbleImage} />
                  )}
                  {msg.text && <pre className={styles.bubbleText}>{msg.text}</pre>}
                </div>
              ))
            )}
            {loading && (
              <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>
                <span className={styles.typing}>···</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className={styles.inputArea}>
            {/* Image preview */}
            {imagePreview && (
              <div className={styles.imagePreviewWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Aperçu" className={styles.imagePreviewThumb} />
                <button className={styles.imageRemoveBtn} onClick={() => { setImageData(null); setImagePreview(null); }} aria-label="Supprimer l'image">✕</button>
              </div>
            )}
            <div className={styles.inputRow}>
              {/* File picker */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                className={styles.attachBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                aria-label="Joindre une image"
                title="Joindre une image"
              >
                📎
              </button>

              <textarea
                ref={inputRef}
                className={styles.input}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message à ${expert.name}… (Entrée pour envoyer)`}
                rows={1}
                disabled={loading}
              />

              {/* Mic button */}
              <button
                className={`${styles.micBtn} ${isRecording ? styles.micBtnRecording : ''}`}
                onClick={toggleRecording}
                disabled={loading || isTranscribing}
                aria-label={isRecording ? 'Arrêter l\'enregistrement' : 'Enregistrer un audio'}
                title={isRecording ? 'Arrêter' : 'Enregistrer'}
              >
                {isTranscribing ? '…' : isRecording ? '⏹' : '🎤'}
              </button>

              <button className={styles.sendBtn} onClick={sendMessage} disabled={loading || (!input.trim() && !imageData)}>
                ↑
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
