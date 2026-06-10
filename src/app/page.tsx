'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase-browser';

const EXPERTS = [
  {
    id: 'news',
    icon: '📰',
    name: 'Mgoun News',
    description: 'Briefing quotidien de l\'actualité marocaine et internationale — politique, économie, Bourse de Casablanca, sport, culture et livre du jour.',
  },
  {
    id: 'equilibre',
    icon: '🧘',
    name: 'Mgoun Equilibre',
    description: 'Master Coach en développement personnel, leadership et équilibre de vie — questions puissantes, baby steps, ancrage marocain.',
  },
  {
    id: 'musique',
    icon: '🎵',
    name: 'Mgoun Musique',
    description: 'Expert musical marocain et international — playlists personnalisées en Pop, Rock, Jazz, Gnawa, Chaâbi, Rap marocain et musique andalouse.',
  },
  {
    id: 'nutri',
    icon: '🥗',
    name: 'Mgoun Nutri',
    description: 'Expert en nutrition et rééquilibrage alimentaire — dîner en couple, batch cooking, sport & récupération, lunch box bureau, gastronomie marocaine.',
  },
  {
    id: 'evasion',
    icon: '🌍',
    name: 'Mgoun Évasion',
    description: 'Travel Planner IA depuis le Maroc — plages & côtes, nature & randonnées, road trip, villes impériales, itinéraires Europe et destinations exotiques.',
  },
  {
    id: 'famille',
    icon: '🏡',
    name: 'Mgoun Famille',
    description: 'Expert famille — activités Montessori par âge, parentalité bienveillante, et histoires du soir apaisantes au décor marocain.',
  },
  {
    id: 'agri',
    icon: '🌾',
    name: 'Mgoun AGRI',
    description: 'Expert en agriculture marocaine — traitements, engrais, irrigation, variétés locales et calendriers agricoles. En Darija, français ou arabe.',
  },
  {
    id: 'invest',
    icon: '📈',
    name: 'Mgoun Invest',
    description: 'Mentor stratégique en investissement au Maroc — idées concrètes à partir de 10.000 DH, immobilier, agri-business, bourse, digital et success stories locales.',
  },
];

function LandingPageInner() {
  const searchParams = useSearchParams();
  // ?home=1 means the user is authenticated but explicitly navigated here
  const isAuthenticatedVisit = searchParams.get('home') === '1';
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticatedVisit);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getSession().then((result: { data: { session: import('@supabase/supabase-js').Session | null } }) => {
      setIsLoggedIn(!!result.data.session);
    });
  }, []);

  return (
    <main>
      {/* NAV */}
      <nav className="navbar">
        <div className="container navbar-inner">
          <span className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.svg" alt="" width={28} height={28} style={{ borderRadius: '6px' }} />
            Mgoun <span>AI</span>
          </span>
          <Link href="/chat" className="btn-chat-nav">
            {isLoggedIn ? 'Retour au chat →' : 'Commencer →'}
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-section">
        <div className="container hero-inner animate-fade-in">
          <div className="badge">🤖 Plateforme d&apos;experts IA marocains</div>
          <h1 className="hero-title">
            Des experts IA <br />
            <span>dans votre poche</span>
          </h1>
          <p className="hero-description">
            Mgoun AI regroupe des assistants intelligents spécialisés, accessibles directement via WhatsApp ou sur le web — en Darija, français ou arabe.
          </p>
          <Link href="/chat" className="btn-start">
            {isLoggedIn ? 'Retour au chat →' : 'Discuter avec un expert →'}
          </Link>
        </div>
      </section>

      {/* EXPERTS GRID */}
      <section className="experts-section">
        <div className="container">
          <h2 className="section-title animate-fade-in">Nos experts</h2>
          <div className="experts-grid">
            {EXPERTS.map((expert, i) => (
              <div
                key={expert.id}
                className={`expert-card available animate-fade-in${i > 0 ? ` delay-${Math.min(i, 5) * 100}` : ''}`}
              >
                <div className="expert-card-header">
                  <div className="expert-icon">{expert.icon}</div>
                  <span className="expert-badge available-badge">Disponible</span>
                </div>
                <h3 className="expert-name">{expert.name}</h3>
                <p className="expert-description">{expert.description}</p>
                <Link href={`/chat?expert=${expert.id}`} className="btn-whatsapp" style={{ textDecoration: 'none', justifyContent: 'center' }}>
                  Discuter →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">

            {/* Colonne 1 — Marque */}
            <div>
              <div className="footer-brand-logo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/favicon.svg" alt="Mgoun AI" width={22} height={22} style={{ borderRadius: 5 }} />
                Mgoun AI
              </div>
              <p className="footer-brand-desc">
                Plateforme marocaine d&apos;experts IA spécialisés, accessibles directement depuis votre navigateur ou votre mobile.
              </p>
              <div className="footer-social">
                {/* Instagram */}
                <a href="https://www.instagram.com/mgounai/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </a>
                {/* Facebook */}
                <a href="https://www.facebook.com/profile.php?id=61590647733785" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Colonne 2 — Experts */}
            <div>
              <div className="footer-col-title">Nos Experts</div>
              <ul className="footer-links">
                {EXPERTS.map(e => (
                  <li key={e.id}>
                    <Link href={`/chat?expert=${e.id}`}>{e.icon} {e.name}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Colonne 3 — Plateforme */}
            <div>
              <div className="footer-col-title">Plateforme</div>
              <ul className="footer-links">
                <li><Link href="/chat">💬 Démarrer une discussion</Link></li>
                <li><a href="https://www.instagram.com/mgounai/" target="_blank" rel="noopener noreferrer">📸 Instagram</a></li>
                <li><a href="https://www.facebook.com/profile.php?id=61590647733785" target="_blank" rel="noopener noreferrer">👥 Facebook</a></li>
              </ul>
            </div>

            {/* Colonne 4 — Légal */}
            <div>
              <div className="footer-col-title">Informations</div>
              <ul className="footer-links">
                <li><Link href="/a-propos">À propos</Link></li>
                <li><Link href="/contact">Contact</Link></li>
                <li><Link href="/cgu">Conditions d&apos;utilisation</Link></li>
                <li><Link href="/confidentialite">Politique de confidentialité</Link></li>
                <li><Link href="/mentions-legales">Mentions légales</Link></li>
              </ul>
            </div>

          </div>

          <div className="footer-bottom">
            © 2026 Mgoun AI · Maroc · Tous droits réservés
          </div>
        </div>
      </footer>
    </main>
  );
}

export default function LandingPage() {
  return (
    <Suspense>
      <LandingPageInner />
    </Suspense>
  );
}
