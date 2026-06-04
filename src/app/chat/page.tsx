'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createBrowserClient } from '@/lib/supabase-browser';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import styles from '../page.module.css';

const EXPERTS = [
  {
    id: 'news',
    name: 'Mgoun News',
    icon: '📰',
    description: 'Briefing quotidien de l\'actualité marocaine et internationale — Bourse de Casablanca, MASI, économie, politique, tech.',
    available: true,
    welcomeMessage: "Bonjour ! Voici votre briefing Mgoun News 📰. Que souhaitez-vous approfondir ?",
    quickReplies: [
      "Briefing du jour 📰",
      "Politique & Société 🏛️",
      "L'Essentiel International 🌐",
      "Botola & Lions de l'Atlas ⚽",
      "Planète Sport 🏟️",
      "Divertissements & Culture 🎬",
      "Marocains du Monde 🌍",
      "Tech & Innovation 💡",
      "Économie & Bourse 📈",
    ],
  },
  {
    id: 'equilibre',
    name: 'Mgoun Equilibre',
    icon: '🧘',
    description: 'Master Coach en développement personnel, leadership et équilibre de vie — questions puissantes, baby steps, ancrage marocain.',
    available: true,
    welcomeMessage: "Bonjour. Qu'est-ce qui vous préoccupe en ce moment — pro ou perso ?",
    quickReplies: ["Gérer mon stress", "Mieux organiser mon temps", "Trouver l'équilibre pro/perso", "Prendre une grande décision"],
  },
  {
    id: 'nutri',
    name: 'Mgoun Nutri',
    icon: '🥗',
    description: 'Expert en nutrition et rééquilibrage alimentaire — gastronomie marocaine, anti-gaspi, conseils restaurant, cuisine familiale.',
    available: true,
    welcomeMessage: "Salam ! Parlons de vos habitudes alimentaires. Par où voulez-vous commencer ?",
    quickReplies: ["Rééquilibrer mon alimentation", "Conseils pour le couscous du vendredi", "Manger sainement au restaurant", "Menu famille anti-gaspi"],
  },
  {
    id: 'evasion',
    name: 'Mgoun Évasion',
    icon: '🌍',
    description: 'Travel Planner IA — itinéraires sur mesure depuis le Maroc, slow travel, familles, visas, liaisons aériennes réelles.',
    available: true,
    welcomeMessage: "Bonjour ! Parlons de votre prochain voyage. Où rêvez-vous d'aller ?",
    quickReplies: ["Voyage famille au Maroc", "Europe sans visa", "Destination exotique", "Slow travel pas cher"],
  },
  {
    id: 'famille',
    name: 'Mgoun Famille',
    icon: '🏡',
    description: 'Expert famille — activités Montessori pour enfants 2-3 ans, parentalité bienveillante, et histoires du soir apaisantes au décor marocain.',
    available: true,
    welcomeMessage: "Bonjour ! Je suis Mgoun Famille 🏡. Je peux vous aider avec des activités pour votre enfant ou lui raconter une belle histoire du soir. Par quoi commençons-nous ?",
    quickReplies: ["Activité pour mon enfant 🌱", "Histoire du soir 🌙"],
  },
  {
    id: 'agri',
    name: 'Mgoun AGRI',
    icon: '🌾',
    description: 'Expert en agriculture marocaine — traitements, engrais, irrigation, variétés locales, calendriers agricoles. Posez vos questions en Darija, français ou arabe.',
    available: true,
    welcomeMessage: "Salam ! Je suis Mgoun AGRI 🌾, votre expert en agriculture marocaine. Que puis-je faire pour vous aujourd'hui ?",
    quickReplies: ["Traitement d'une maladie", "Calendrier d'irrigation", "Engrais recommandés", "Prix du marché"],
  },
  {
    id: 'invest',
    name: 'Mgoun Invest',
    icon: '📈',
    description: 'Mentor stratégique en investissement et entrepreneuriat au Maroc — success stories locales, feuilles de route concrètes, réalités du marché marocain.',
    available: true,
    welcomeMessage: "Bonjour. Quelle est votre priorité actuelle pour vos projets au Maroc ?",
    quickReplies: ["Financement & Subventions", "Analyser un secteur", "Inspiration & Success Stories", "Lancer une startup"],
  },
];

type Message = { role: 'user' | 'assistant'; text: string; imageUrl?: string };
type AuthMode = 'login' | 'signup' | 'confirm';

function ChatPageInner() {
  const searchParams = useSearchParams();
  const expertParam = searchParams.get('expert');
  const initialExpert = EXPERTS.find(e => e.id === expertParam) ? expertParam! : 'news';

  const [supabase] = useState(() => createBrowserClient());

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // ── Chat ──────────────────────────────────────────────────────────────────
  const [selectedExpert, setSelectedExpert] = useState(initialExpert);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageData, setImageData] = useState<{ mimeType: string; base64: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [loadedExperts, setLoadedExperts] = useState<Set<string>>(new Set());
  const [hasMoreHistory, setHasMoreHistory] = useState<Record<string, boolean>>({});
  const [historyStartIndex, setHistoryStartIndex] = useState<Record<string, number>>({});
  const [loadingOlder, setLoadingOlder] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  // Only auto-focus the input on non-touch devices — on mobile it would open the keyboard unexpectedly
  function focusInput(delay = 50) {
    if (typeof window !== 'undefined' && !('ontouchstart' in window) && navigator.maxTouchPoints === 0) {
      setTimeout(() => inputRef.current?.focus(), delay);
    }
  }
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const singleLineHeightRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // Refs for scroll handler (avoids stale closures)
  const hasMoreHistoryRef = useRef<Record<string, boolean>>({});
  const historyStartIndexRef = useRef<Record<string, number>>({});
  const loadingOlderRef = useRef(false);
  const selectedExpertRef = useRef(initialExpert);

  // ── Pré-remplir email si l'utilisateur a déjà eu un compte ──────────────
  useEffect(() => {
    const lastEmail = localStorage.getItem('mgoun_last_email');
    if (lastEmail) {
      setEmail(lastEmail);
      setAuthMode('login');
    }
  }, []);

  // ── Auth listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then((result: { data: { session: Session | null } }) => {
      setUser(result.data.session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => { hasMoreHistoryRef.current = hasMoreHistory; }, [hasMoreHistory]);
  useEffect(() => { historyStartIndexRef.current = historyStartIndex; }, [historyStartIndex]);
  useEffect(() => { selectedExpertRef.current = selectedExpert; }, [selectedExpert]);

  useEffect(() => {
    if (user) loadHistory(selectedExpert);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (inputRef.current && singleLineHeightRef.current === 0) {
      singleLineHeightRef.current = inputRef.current.scrollHeight;
    }
  }, []);

  // Infinite scroll — load older messages when scrolling to top
  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    const onScroll = () => {
      const expert = selectedExpertRef.current;
      if (container.scrollTop < 80 && hasMoreHistoryRef.current[expert] && !loadingOlderRef.current) {
        loadOlderMessages(expert);
      }
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function login() {
    setAuthError('');
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError('Email ou mot de passe incorrect.');
    } else {
      localStorage.setItem('mgoun_last_email', email);
    }
    setAuthLoading(false);
  }

  async function signup() {
    setAuthError('');
    if (password !== confirmPassword) { setAuthError('Les mots de passe ne correspondent pas.'); return; }
    if (password.length < 6) { setAuthError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setAuthError(error.message); setAuthLoading(false); return; }
    localStorage.setItem('mgoun_last_email', email);
    if (!data.session) setAuthMode('confirm');
    setAuthLoading(false);
  }

  async function loadHistory(expertId: string) {
    if (loadedExperts.has(expertId)) return;
    setLoadedExperts(prev => new Set([...prev, expertId]));
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch(`/api/history?expertId=${expertId}&limit=30`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.messages?.length > 0) {
        setMessages(prev => ({ ...prev, [expertId]: data.messages }));
      }
      setHasMoreHistory(prev => ({ ...prev, [expertId]: data.hasMore ?? false }));
      setHistoryStartIndex(prev => ({ ...prev, [expertId]: data.startIndex ?? 0 }));
    } catch { /* non-blocking */ }
  }

  async function loadOlderMessages(expertId: string) {
    if (loadingOlderRef.current) return;
    const startIndex = historyStartIndexRef.current[expertId] ?? 0;
    if (startIndex === 0) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    const scrollHeightBefore = messagesRef.current?.scrollHeight ?? 0;

    try {
      const res = await fetch(`/api/history?expertId=${expertId}&limit=30&beforeIndex=${startIndex}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.messages?.length > 0) {
        setMessages(prev => ({ ...prev, [expertId]: [...data.messages, ...(prev[expertId] ?? [])] }));
        setHistoryStartIndex(prev => ({ ...prev, [expertId]: data.startIndex ?? 0 }));
        setHasMoreHistory(prev => ({ ...prev, [expertId]: data.hasMore ?? false }));
        requestAnimationFrame(() => {
          if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight - scrollHeightBefore;
          }
        });
      }
    } catch { /* non-blocking */ }
    finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setMessages({});
    setLoadedExperts(new Set());
    setHasMoreHistory({});
    setHistoryStartIndex({});
    setAuthMode('login');
    setPassword('');
    setConfirmPassword('');
    setAuthError('');
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
      if (inputRef.current) inputRef.current.style.height = singleLineHeightRef.current ? singleLineHeightRef.current + 'px' : 'auto';
      focusInput();
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
          focusInput();
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      alert('Impossible d\'accéder au microphone.');
    }
  }

  async function handleQuickReply(text: string) {
    if (loading) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setMessages(prev => ({
      ...prev,
      [selectedExpert]: [...(prev[selectedExpert] ?? []), { role: 'user', text }],
    }));
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ expertId: selectedExpert, message: text }),
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
      focusInput();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function selectExpert(id: string) {
    setSelectedExpert(id);
    setMobileView('chat');
    setInput('');
    if (id !== 'agri') {
      setImageData(null);
      setImagePreview(null);
      if (isRecording) mediaRecorderRef.current?.stop();
    }
    if (inputRef.current) inputRef.current.style.height = singleLineHeightRef.current ? singleLineHeightRef.current + 'px' : 'auto';
    loadHistory(id);
    focusInput(100);
  }

  // ── Dérivés ──────────────────────────────────────────────────────────────
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
          ) : (
            <>
              <p className={styles.authDesc}>
                {authMode === 'login' ? 'Connectez-vous pour discuter avec nos experts' : 'Créez votre compte gratuitement'}
              </p>
              <input className={styles.authInput} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              <input className={styles.authInput} type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} onKeyDown={e => authMode === 'login' && e.key === 'Enter' && login()} />
              {authMode === 'signup' && (
                <input className={styles.authInput} type="password" placeholder="Confirmer le mot de passe" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
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

          <Link href="/" className={styles.homeLink}>← Retour à l&apos;accueil</Link>
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
          <Link href="/?home=1" className={styles.logoLink}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.svg" alt="Mgoun AI" width={26} height={26} className={styles.logoIcon} />
            <span className={`${styles.logo} ${mobileView === 'chat' ? styles.logoHiddenMobile : ''}`}>Mgoun AI</span>
          </Link>
          {mobileView === 'chat' && (
            <span className={styles.expertNameMobile}>{expert.icon} {expert.name}</span>
          )}
        </div>
        <div className={styles.headerRight}>
          <span className={styles.userEmail}>{user.email}</span>
          <Link href="/?home=1" className={styles.homeBtn}>Accueil</Link>
          <button className={styles.logoutBtn} onClick={logout}>Déconnexion</button>
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
        <main className={`${styles.main} ${mobileView === 'chat' ? styles.mainVisible : ''}`}>

          {/* Messages */}
          <div className={styles.messages} ref={messagesRef}>
            {loadingOlder && (
              <div className={styles.loadingOlderIndicator}>···</div>
            )}
            {currentMessages.length === 0 ? (
              <div className={styles.welcome}>
                <div className={styles.welcomeIcon}>{expert.icon}</div>
                <h2 className={styles.welcomeName}>{expert.name}</h2>
                {expert.welcomeMessage && (
                  <div className={`${styles.bubble} ${styles.bubbleAssistant} ${styles.welcomeBubble}`}>
                    <div className={styles.bubbleText}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{expert.welcomeMessage}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              currentMessages.map((msg, i) => (
                <div key={i} className={`${styles.bubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}`}>
                  {msg.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={msg.imageUrl} alt="Image envoyée" className={styles.bubbleImage} />
                  )}
                  {msg.text && (
                    msg.role === 'user'
                      ? <p className={styles.bubbleText}>{msg.text}</p>
                      : <div className={styles.bubbleText}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                        </div>
                  )}
                </div>
              ))
            )}
            {/* Quick replies — toujours visibles comme menu de raccourcis */}
            {!loading && expert.quickReplies && expert.quickReplies.length > 0 && (
              <div className={styles.quickReplies}>
                {expert.quickReplies.map(reply => (
                  <button
                    key={reply}
                    className={styles.quickReplyBtn}
                    onClick={() => handleQuickReply(reply)}
                    disabled={loading}
                  >
                    {reply}
                  </button>
                ))}
              </div>
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
            {imagePreview && (
              <div className={styles.imagePreviewWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Aperçu" className={styles.imagePreviewThumb} />
                <button className={styles.imageRemoveBtn} onClick={() => { setImageData(null); setImagePreview(null); }} aria-label="Supprimer l'image">✕</button>
              </div>
            )}
            <div className={styles.inputRow}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div className={styles.inputPill}>
                {selectedExpert === 'agri' && (
                  <button
                    className={styles.attachBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    aria-label="Joindre une image"
                    title="Joindre une image"
                  >
                    📎
                  </button>
                )}

                <textarea
                  ref={inputRef}
                  className={styles.input}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    const el = e.target;
                    el.style.height = 'auto';
                    el.style.height = Math.max(singleLineHeightRef.current, el.scrollHeight) + 'px';
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message à ${expert.name}…`}
                  rows={1}
                  disabled={loading}
                />

                {selectedExpert === 'agri' && (
                  <button
                    className={`${styles.micBtn} ${isRecording ? styles.micBtnRecording : ''}`}
                    onClick={toggleRecording}
                    disabled={loading || isTranscribing}
                    aria-label={isRecording ? 'Arrêter l\'enregistrement' : 'Enregistrer un audio'}
                    title={isRecording ? 'Arrêter' : 'Enregistrer'}
                  >
                    {isTranscribing ? '…' : isRecording ? '⏹' : '🎤'}
                  </button>
                )}
              </div>

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

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageInner />
    </Suspense>
  );
}
