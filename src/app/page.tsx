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
    description: 'Briefing quotidien de l\'actualité marocaine — Bourse de Casablanca, économie, politique, sport, divertissements. En français, arabe ou darija.',
  },
  {
    id: 'agri',
    icon: '🌾',
    name: 'Mgoun AGRI',
    description: 'Expert en agriculture marocaine. Traitements, engrais, irrigation, variétés locales et calendriers agricoles — en Darija, français ou arabe.',
  },
  {
    id: 'invest',
    icon: '📈',
    name: 'Mgoun Invest',
    description: 'Mentor stratégique en investissement et entrepreneuriat au Maroc. Success stories locales, financement, analyse de secteurs et feuilles de route concrètes.',
  },
  {
    id: 'equilibre',
    icon: '🧘',
    name: 'Mgoun Equilibre',
    description: 'Master Coach en développement personnel et équilibre de vie. Questions puissantes, gestion du stress, productivité et prise de décision.',
  },
  {
    id: 'nutri',
    icon: '🥗',
    name: 'Mgoun Nutri',
    description: 'Expert en nutrition adapté au quotidien marocain. Rééquilibrage alimentaire, conseils restaurant, anti-gaspi et cuisine familiale saine.',
  },
  {
    id: 'eveil',
    icon: '🌱',
    name: 'Mgoun Éveil',
    description: 'Expert petite enfance (2-3 ans). Activités Montessori avec objets du quotidien, parentalité bienveillante et alternatives aux écrans.',
  },
  {
    id: 'evasion',
    icon: '🌍',
    name: 'Mgoun Évasion',
    description: 'Travel Planner IA depuis le Maroc. Itinéraires sur mesure, slow travel, conseils visas, liaisons aériennes et voyages en famille.',
  },
  {
    id: 'hikaya',
    icon: '🌙',
    name: 'Mgoun Hikaya',
    description: 'Conteur marocain pour enfants. Histoires apaisantes pour le coucher, décors naturels du Maroc, animaux attachants et phrases rythmées.',
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
