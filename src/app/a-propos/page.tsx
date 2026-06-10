import Link from 'next/link';
import '../../app/globals.css';

export default function APropos() {
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
        <div className="container" style={{ maxWidth: '720px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>À propos de Mgoun AI</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>La plateforme marocaine d&apos;experts IA spécialisés</p>

          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', marginTop: '2rem' }}>Notre mission</h2>
          <p style={{ lineHeight: 1.75, color: 'var(--text-secondary)' }}>
            Mgoun AI a pour mission de rendre l&apos;intelligence artificielle utile, accessible et ancrée dans le quotidien marocain.
            Nous croyons que chaque citoyen mérite d&apos;avoir accès à un conseiller expert — en nutrition, en investissement, en voyage, en agriculture ou en culture — dans sa propre langue, sans barrière technique.
          </p>

          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', marginTop: '2rem' }}>Ce que nous proposons</h2>
          <p style={{ lineHeight: 1.75, color: 'var(--text-secondary)' }}>
            Mgoun AI regroupe des assistants intelligents spécialisés, chacun conçu pour un domaine précis : actualité marocaine et internationale, équilibre personnel, musique, nutrition, voyages, famille, agriculture et investissement. Chaque expert est entraîné pour répondre de façon contextualisée à la réalité marocaine — en Darija, en français ou en arabe.
          </p>

          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', marginTop: '2rem' }}>Nos experts</h2>
          <ul style={{ lineHeight: 2, color: 'var(--text-secondary)', paddingLeft: '1.25rem' }}>
            <li>📰 <strong>Mgoun News</strong> — Briefing quotidien de l&apos;actualité marocaine et internationale</li>
            <li>🧘 <strong>Mgoun Equilibre</strong> — Coaching en développement personnel et équilibre de vie</li>
            <li>🎵 <strong>Mgoun Musique</strong> — Recommandations musicales personnalisées</li>
            <li>🥗 <strong>Mgoun Nutri</strong> — Nutrition et rééquilibrage alimentaire</li>
            <li>🌍 <strong>Mgoun Évasion</strong> — Travel planning depuis le Maroc</li>
            <li>🏡 <strong>Mgoun Famille</strong> — Activités enfants et histoires du soir</li>
            <li>🌾 <strong>Mgoun AGRI</strong> — Expert en agriculture marocaine</li>
            <li>📈 <strong>Mgoun Invest</strong> — Investissement et entrepreneuriat au Maroc</li>
          </ul>

          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', marginTop: '2rem' }}>Technologie</h2>
          <p style={{ lineHeight: 1.75, color: 'var(--text-secondary)' }}>
            Mgoun AI s&apos;appuie sur les modèles de langage les plus avancés, associés à une base de connaissances locale et à une recherche en temps réel pour fournir des réponses précises, actualisées et adaptées au contexte marocain.
          </p>

          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', marginTop: '2rem' }}>Contact</h2>
          <p style={{ lineHeight: 1.75, color: 'var(--text-secondary)' }}>
            Pour toute question, suggestion ou partenariat : <Link href="/contact" style={{ color: 'var(--primary)' }}>contactez-nous</Link>.
          </p>
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
