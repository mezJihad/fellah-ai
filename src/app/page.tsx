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
            Mgoun AI regroupe 8 assistants intelligents spécialisés, accessibles directement via WhatsApp ou sur le web — en Darija, français ou arabe.
          </p>
          <Link href="/chat" className="btn-start">
            {isLoggedIn ? 'Retour au chat →' : 'Discuter avec un expert →'}
          </Link>
        </div>
      </section>

      {/* EXPERTS GRID */}
      <section className="experts-section">
        <div className="container">
          <h2 className="section-title animate-fade-in">Nos 8 experts</h2>
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
          <p>© 2026 Mgoun AI · Maroc</p>
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
