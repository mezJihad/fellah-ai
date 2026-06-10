'use client';

import Link from 'next/link';
import { useState } from 'react';
import '../../app/globals.css';

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mailto = `mailto:support@mgounai.com?subject=${encodeURIComponent(form.subject || 'Contact Mgoun AI')}&body=${encodeURIComponent(`Nom : ${form.name}\nEmail : ${form.email}\n\n${form.message}`)}`;
    window.location.href = mailto;
    setSent(true);
  }

  return (
    <main>
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link href="/" className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.svg" alt="" width={26} height={26} style={{ borderRadius: '6px' }} />
            Mgoun <span style={{ color: 'var(--primary)' }}>AI</span>
          </Link>
          <Link href="/chat" className="btn-chat-nav">Accéder →</Link>
        </div>
      </nav>

      <section style={{ padding: '4rem 0 5rem' }}>
        <div className="container" style={{ maxWidth: '600px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Contactez-nous</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>
            Une question, un partenariat, un retour sur l&apos;application ? Nous sommes à votre écoute.
          </p>

          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
            <a href="https://www.instagram.com/mgounai/" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem' }}>
              📸 @mgounai
            </a>
            <a href="https://www.facebook.com/profile.php?id=61590647733785" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem' }}>
              👥 Mgoun AI sur Facebook
            </a>
          </div>

          {sent ? (
            <div style={{ padding: '1.5rem', background: 'var(--surface-hover)', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✅</p>
              <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Votre client mail s&apos;est ouvert.</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Envoyez le message depuis votre client mail pour finaliser la demande.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nom</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Votre nom"
                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email</label>
                  <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="votre@email.com"
                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Sujet</label>
                <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Question, partenariat, retour…"
                  style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Message</label>
                <textarea required value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Décrivez votre demande…" rows={6}
                  style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <button type="submit" className="btn-start" style={{ alignSelf: 'flex-start' }}>
                Envoyer le message →
              </button>
            </form>
          )}
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-bottom">© 2026 Mgoun AI · Maroc · Tous droits réservés</div>
        </div>
      </footer>
    </main>
  );
}
