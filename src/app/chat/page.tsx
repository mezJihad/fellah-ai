'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
      "Livre du Jour 📚",
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
    id: 'musique',
    name: 'Mgoun Musique',
    icon: '🎵',
    description: 'Expert musical marocain et international — recommandations en Pop, Rock, Jazz, Gnawa, Chaâbi, Rap marocain, musique andalouse et fusion.',
    available: true,
    welcomeMessage: "Salam ! 🎵 Je suis Mgoun Musique, ton guide musical. Tu veux qu'on explore un genre précis, une humeur particulière… ou tu me laisses les commandes ?",
    quickReplies: ["Surprends-moi 🎲", "Matin & Café ☕", "Motivation & Sport 💪", "Soirée Marocaine 🌙", "Nostalgie 🎞️", "Road Trip 🚗", "Détente & Zen 🧘", "Concentration 📚"],
  },
  {
    id: 'nutri',
    name: 'Mgoun Nutri',
    icon: '🥗',
    description: 'Expert en nutrition et rééquilibrage alimentaire — gastronomie marocaine, anti-gaspi, conseils restaurant, cuisine familiale.',
    available: true,
    welcomeMessage: "Salam ! Parlons de vos habitudes alimentaires. Par où voulez-vous commencer ?",
    quickReplies: ["Dîner en couple 🍷", "Batch cooking semaine 📦", "Sport & récupération 💪", "Dîner express 20 min ⚡", "Lunch box bureau 💼", "Réduire le sucre 🍬"],
  },
  {
    id: 'evasion',
    name: 'Mgoun Évasion',
    icon: '🌍',
    description: 'Travel Planner IA — itinéraires sur mesure depuis le Maroc, slow travel, familles, visas, liaisons aériennes réelles.',
    available: true,
    welcomeMessage: "Bonjour ! Parlons de votre prochain voyage. Où rêvez-vous d'aller ?",
    quickReplies: ["Plages & Côtes 🏖️", "Nature & randonnées 🌿", "Road trip Maroc 🗺️", "Villes impériales 🕌", "Itinéraires Europe ✈️", "Lune de miel 💑", "Famille all-inclusive 👨‍👩‍👧", "Aventure & exotisme 🌍"],
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
    quickReplies: ["J'ai 10.000 DH 💡", "Immobilier locatif 🏠", "Agri-business rentable 🌱", "Business digital 📱", "Bourse de Casablanca 📈", "Franchise locale 🏪", "Décryptage success story 🚀", "Investir à plusieurs 🤝"],
  },
];

type MusicTrack = { artist: string; title: string };
type Message = { role: 'user' | 'assistant'; text: string; imageUrl?: string; tracks?: MusicTrack[] };
type AuthMode = 'login' | 'signup' | 'confirm';

function parseMusicBlock(text: string): { cleanText: string; tracks: MusicTrack[] } {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  if (!match) return { cleanText: text, tracks: [] };
  try {
    const json = JSON.parse(match[1].trim());
    if (json.type === 'music_recommendation' && Array.isArray(json.tracks)) {
      return { cleanText: text.replace(/```json\s*[\s\S]*?```/, '').trim(), tracks: json.tracks };
    }
  } catch { /* invalid JSON */ }
  return { cleanText: text, tracks: [] };
}

type TrackState = 'idle' | 'loading' | 'loaded' | 'error';

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^[-*]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function MessageActions({ text, expertName }: { text: string; expertName: string }) {
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const plainText = stripMarkdown(text);
  const shareText = `${expertName} — Mgoun AI\n\n${plainText}`;

  useEffect(() => {
    if (!showShareMenu) return;
    function onClickOutside(e: MouseEvent) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [showShareMenu]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(plainText);
    } catch {
      const el = document.createElement('textarea');
      el.value = plainText;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (navigator.share) {
      try { await navigator.share({ title: `Mgoun AI — ${expertName}`, text: shareText }); } catch { /* annulé */ }
    } else {
      setShowShareMenu(v => !v);
    }
  }

  const enc = encodeURIComponent(shareText);
  const whatsappUrl = `https://wa.me/?text=${enc}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent('https://mgoun.ai')}&text=${enc}`;

  return (
    <div className={styles.msgActions}>
      <button
        className={`${styles.msgActionBtn} ${copied ? styles.msgActionBtnSuccess : ''}`}
        onClick={handleCopy}
        title="Copier la réponse"
      >
        {copied ? '✓ Copié' : '📋 Copier'}
      </button>
      <div className={styles.shareWrapper} ref={shareMenuRef}>
        <button className={styles.msgActionBtn} onClick={handleShare} title="Partager">
          ↗ Partager
        </button>
        {showShareMenu && (
          <div className={styles.shareMenu}>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={styles.shareMenuItem} onClick={() => setShowShareMenu(false)}>
              💬 WhatsApp
            </a>
            <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className={styles.shareMenuItem} onClick={() => setShowShareMenu(false)}>
              ✈️ Telegram
            </a>
            <button className={styles.shareMenuItem} onClick={() => { handleCopy(); setShowShareMenu(false); }}>
              📋 Copier le texte
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function isTouchDevice() {
  return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

// Opens a new tab immediately (required for iOS — popup must be opened synchronously
// in the user gesture, before any async work) and writes a loading page so iOS Safari
// does not kill the tab while we wait for the API response.
function openMobileTab(): Window | null {
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(
      '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<style>body{margin:0;background:#000;display:flex;align-items:center;' +
      'justify-content:center;height:100vh;color:#fff;font-family:sans-serif;font-size:1rem}' +
      '</style></head><body>Chargement…</body></html>'
    );
    win.document.close();
  }
  return win;
}

function TrackCard({ track, authToken }: { track: MusicTrack; authToken: string }) {
  const [state, setState] = useState<TrackState>('idle');
  const [videoId, setVideoId] = useState<string | null>(null);
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track.artist} ${track.title}`)}`;

  async function handlePlay() {
    if (state === 'loaded') { setState('idle'); return; }
    if (state === 'loading') return;
    setState('loading');
    const mobile = isTouchDevice();
    // Open synchronously in the user gesture, then write loading HTML so iOS
    // Safari keeps the tab alive while we wait for the API response.
    const win = mobile ? openMobileTab() : null;
    try {
      const res = await fetch(
        `/api/youtube-search?artist=${encodeURIComponent(track.artist)}&title=${encodeURIComponent(track.title)}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (mobile && win) {
        win.location.href = `https://www.youtube.com/watch?v=${data.videoId}`;
        setState('idle');
      } else {
        setVideoId(data.videoId);
        setState('loaded');
      }
    } catch {
      win?.close();
      setState('error');
    }
  }

  return (
    <div className={styles.trackCard}>
      <div className={styles.trackMeta}>
        <span className={styles.trackInfo}>🎵 <strong>{track.title}</strong> — {track.artist}</span>
        <div className={styles.trackActions}>
          <button
            className={`${styles.trackBtn} ${state === 'error' ? styles.trackBtnError : ''}`}
            onClick={handlePlay}
            disabled={state === 'loading' || state === 'error'}
          >
            {state === 'loading' ? '…' : state === 'loaded' ? '✕ Fermer' : state === 'error' ? 'Introuvable' : '▶ Écouter'}
          </button>
          <a href={searchUrl} target="_blank" rel="noopener noreferrer" className={styles.trackBtnSearch}>
            YouTube ↗
          </a>
        </div>
      </div>
      {state === 'loaded' && videoId && (
        <div className={styles.trackFrameWrap}>
          <iframe
            className={styles.trackFrame}
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title={`${track.title} - ${track.artist}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}

function TrackList({ tracks, supabase }: { tracks: MusicTrack[]; supabase: ReturnType<typeof import('@/lib/supabase-browser').createBrowserClient> }) {
  const [token, setToken] = useState<string | null>(null);
  const [playlistLoading, setPlaylistLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then((r: { data: { session: import('@supabase/supabase-js').Session | null } }) => setToken(r.data.session?.access_token ?? null));
  }, [supabase]);

  if (!token) return null;

  async function launchPlaylist() {
    if (!token) return;
    setPlaylistLoading(true);
    // Open synchronously in the user gesture and write loading HTML immediately —
    // iOS Safari kills blank popup tabs after ~1s if they receive no content.
    // Writing HTML keeps the tab alive while all 10 fetch calls complete.
    const mobile = isTouchDevice();
    const win = mobile ? openMobileTab() : window.open('', '_blank');
    const results = await Promise.all(
      tracks.map(t =>
        fetch(`/api/youtube-search?artist=${encodeURIComponent(t.artist)}&title=${encodeURIComponent(t.title)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    );
    const ids = results.filter((r): r is { videoId: string } => !!r?.videoId).map(r => r.videoId).join(',');
    if (ids && win) {
      win.location.href = `https://www.youtube.com/watch_videos?video_ids=${ids}`;
    } else {
      win?.close();
    }
    setPlaylistLoading(false);
  }

  return (
    <div className={styles.trackList}>
      {tracks.map((track, ti) => <TrackCard key={ti} track={track} authToken={token} />)}
      {tracks.length > 1 && (
        <button className={styles.playlistBtn} onClick={launchPlaylist} disabled={playlistLoading}>
          {playlistLoading ? 'Chargement…' : '▶ Lancer la playlist sur YouTube'}
        </button>
      )}
    </div>
  );
}

function toAssistantMessage(expertId: string, text: string): Message {
  if (expertId === 'musique') {
    const { cleanText, tracks } = parseMusicBlock(text);
    return { role: 'assistant', text: cleanText, tracks: tracks.length > 0 ? tracks : undefined };
  }
  return { role: 'assistant', text };
}

function ChatPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const expertParam = searchParams.get('expert');
  const initialExpert = EXPERTS.find(e => e.id === expertParam) ? expertParam! : 'news';

  const [supabase] = useState(() => createBrowserClient());

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // ── Chat ──────────────────────────────────────────────────────────────────
  const [selectedExpert, setSelectedExpert] = useState(initialExpert);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>(
    EXPERTS.find(e => e.id === expertParam) ? 'chat' : 'list'
  );
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
      setAuthReady(true);
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
    if (user) EXPERTS.forEach(exp => loadHistory(exp.id));
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

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

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
        const parsed = data.messages.map((m: Message) =>
          m.role === 'assistant' ? toAssistantMessage(expertId, m.text) : m
        );
        setMessages(prev => ({ ...prev, [expertId]: parsed }));
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
        const parsed = data.messages.map((m: Message) =>
          m.role === 'assistant' ? toAssistantMessage(expertId, m.text) : m
        );
        setMessages(prev => ({ ...prev, [expertId]: [...parsed, ...(prev[expertId] ?? [])] }));
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

  async function deleteAccount() {
    setDeleteLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setDeleteLoading(false); return; }
    const res = await fetch('/api/delete-account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      await supabase.auth.signOut();
      setShowDeleteConfirm(false);
      setMessages({});
      setLoadedExperts(new Set());
      localStorage.removeItem('mgoun_last_email');
      setAuthMode('signup');
      setEmail('');
    } else {
      setDeleteLoading(false);
      alert('Une erreur est survenue. Veuillez réessayer ou contacter le support.');
    }
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
        [selectedExpert]: [...(prev[selectedExpert] ?? []), toAssistantMessage(selectedExpert, data.reply ?? data.error)],
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
        [selectedExpert]: [...(prev[selectedExpert] ?? []), toAssistantMessage(selectedExpert, data.reply ?? data.error)],
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
    router.replace(`/chat?expert=${id}`, { scroll: false });
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
  if (!authReady) return null;
  if (!user) {
    return (
      <div className={styles.authLayout}>
        <div className={styles.authCard}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.svg" alt="Mgoun AI" width={48} height={48} className={styles.authLogo} />
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
            <button className={styles.backBtn} onClick={() => { setMobileView('list'); router.replace('/chat', { scroll: false }); }} aria-label="Retour">
              ←
            </button>
          )}
          <Link href="/?home=1" className={styles.logoLink}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.svg" alt="Mgoun AI" width={26} height={26} className={styles.logoIcon} />
            <span className={`${styles.logo} ${mobileView === 'chat' ? styles.logoHiddenMobile : ''}`}>Mgoun AI</span>
          </Link>
          {mobileView === 'chat' && (
            <span className={styles.expertNameMobile}>{expert.name}</span>
          )}
        </div>
        <div className={styles.headerRight}>
          <Link href="/?home=1" className={styles.homeBtn}>Accueil</Link>
          <div className={styles.userMenuWrapper} ref={userMenuRef}>
            <button
              className={styles.userAvatar}
              onClick={() => setShowUserMenu(v => !v)}
              aria-label="Mon compte"
              aria-expanded={showUserMenu}
            >
              {user.email?.[0].toUpperCase()}
            </button>
            {showUserMenu && (
              <div className={styles.userDropdown}>
                <div className={styles.userDropdownEmail}>{user.email}</div>
                <div className={styles.userDropdownDivider} />
                <Link href="/?home=1" className={styles.userDropdownItem} onClick={() => setShowUserMenu(false)}>
                  Accueil
                </Link>
                <div className={styles.userDropdownDivider} />
                <button className={styles.userDropdownItem} onClick={() => { setShowUserMenu(false); logout(); }}>
                  Déconnexion
                </button>
                <button className={`${styles.userDropdownItem} ${styles.userDropdownDanger}`} onClick={() => { setShowUserMenu(false); setShowDeleteConfirm(true); }}>
                  Supprimer mon compte
                </button>
              </div>
            )}
          </div>
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
                  {msg.tracks && msg.tracks.length > 0 && (
                    <TrackList tracks={msg.tracks} supabase={supabase} />
                  )}
                  {msg.role === 'assistant' && msg.text && (
                    <MessageActions text={msg.text} expertName={expert.name} />
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

      {/* ── Modal suppression de compte ── */}
      {showDeleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => !deleteLoading && setShowDeleteConfirm(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <p className={styles.modalTitle}>Supprimer mon compte</p>
            <p className={styles.modalDesc}>
              Cette action est <strong>irréversible</strong>. Toutes vos conversations et données seront supprimées définitivement. Votre compte ne pourra pas être récupéré.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setShowDeleteConfirm(false)} disabled={deleteLoading}>
                Annuler
              </button>
              <button className={styles.modalDeleteBtn} onClick={deleteAccount} disabled={deleteLoading}>
                {deleteLoading ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
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
