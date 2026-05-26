'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import styles from './chat.module.css';

const EXPERTS: Record<string, { name: string; icon: string; description: string }> = {
  agri: {
    name: 'Mgoun AGRI',
    icon: '🌾',
    description: 'Expert en agriculture marocaine',
  },
};

type Message = { role: 'user' | 'assistant'; text: string };

function getSessionId(expertId: string): string {
  const key = `mgoun_session_${expertId}`;
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function ChatPage() {
  const { expert: expertId } = useParams<{ expert: string }>();
  const expert = EXPERTS[expertId];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sessionId = useRef<string>('');

  useEffect(() => {
    if (expert) sessionId.current = getSessionId(expertId);
  }, [expertId, expert]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!expert) return notFound();

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId, sessionId: sessionId.current, message: text }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply || data.error }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Erreur réseau. Veuillez réessayer.' }]);
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

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <span className={styles.headerIcon}>{expert.icon}</span>
        <div>
          <div className={styles.headerName}>{expert.name}</div>
          <div className={styles.headerDesc}>{expert.description}</div>
        </div>
      </header>

      <main className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>{expert.icon}</span>
            <p>Posez votre première question à {expert.name}</p>
            <p className={styles.emptyHint}>En français, arabe, darija ou anglais</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`${styles.bubble} ${msg.role === 'user' ? styles.user : styles.assistant}`}>
            <pre className={styles.bubbleText}>{msg.text}</pre>
          </div>
        ))}
        {loading && (
          <div className={`${styles.bubble} ${styles.assistant}`}>
            <span className={styles.typing}>···</span>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <footer className={styles.inputArea}>
        <textarea
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez votre message… (Entrée pour envoyer)"
          rows={1}
          disabled={loading}
        />
        <button className={styles.sendBtn} onClick={sendMessage} disabled={loading || !input.trim()}>
          ↑
        </button>
      </footer>
    </div>
  );
}
