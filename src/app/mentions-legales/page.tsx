import Link from 'next/link';
import '../../app/globals.css';

export default function MentionsLegales() {
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
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Mentions Légales</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '0.875rem' }}>Dernière mise à jour : juin 2026</p>

          {[
            {
              title: 'Éditeur de la plateforme',
              lines: [
                'Nom de la plateforme : Mgoun AI',
                'Site web : mgounai.com',
                'Pays : Maroc',
                'Contact : via la page Contact du site',
              ],
            },
            {
              title: 'Hébergement',
              lines: [
                'Hébergeur : Hetzner Online GmbH',
                'Adresse : Industriestr. 25, 91710 Gunzenhausen, Allemagne',
                'Site : hetzner.com',
                'Type : Serveur privé virtuel (VPS)',
              ],
            },
            {
              title: 'Propriété intellectuelle',
              lines: [
                `L'ensemble des contenus présents sur mgounai.com (textes, logos, interface, marque "Mgoun AI") sont protégés par le droit d'auteur et appartiennent à leurs créateurs. Toute reproduction, même partielle, est strictement interdite sans autorisation écrite préalable.`,
              ],
            },
            {
              title: 'Responsabilité',
              lines: [
                `Les informations fournies par les experts IA de Mgoun AI sont à titre informatif uniquement. Elles ne constituent pas des conseils médicaux, juridiques, financiers ou professionnels certifiés. Mgoun AI ne saurait être tenu responsable des décisions prises sur la base de ces informations.`,
              ],
            },
            {
              title: 'Données personnelles',
              lines: [
                `Le traitement des données personnelles est régi par notre Politique de confidentialité, conformément à la loi marocaine 09-08 relative à la protection des données personnelles.`,
              ],
            },
            {
              title: 'Droit applicable',
              lines: [
                `Les présentes mentions légales sont soumises au droit marocain. Tout litige sera soumis aux tribunaux compétents du Royaume du Maroc.`,
              ],
            },
          ].map(({ title, lines }) => (
            <div key={title} style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.6rem' }}>{title}</h2>
              {lines.map((line, i) => (
                <p key={i} style={{ lineHeight: 1.75, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{line}</p>
              ))}
            </div>
          ))}

          <p style={{ marginTop: '2.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Pour toute question : <Link href="/contact" style={{ color: 'var(--primary)' }}>contactez-nous</Link>.
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
