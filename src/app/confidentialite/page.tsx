import Link from 'next/link';
import '../../app/globals.css';

export default function Confidentialite() {
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
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Politique de Confidentialité</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '0.875rem' }}>Dernière mise à jour : juin 2026</p>

          {[
            {
              title: '1. Responsable du traitement',
              text: `Mgoun AI est responsable du traitement des données personnelles collectées via la plateforme mgounai.com.`,
            },
            {
              title: '2. Données collectées',
              text: `Nous collectons les données suivantes : adresse email (lors de la création de compte), historique des conversations avec les experts IA, et données techniques de navigation (adresse IP, type de navigateur). Aucune donnée de carte bancaire n'est collectée ni stockée sur nos serveurs.`,
            },
            {
              title: '3. Finalité du traitement',
              text: `Les données sont collectées pour : permettre l'accès au service et la persistance de vos conversations, améliorer la qualité des réponses des experts IA, envoyer des communications liées au service (avec votre accord), et assurer la sécurité et le bon fonctionnement de la plateforme.`,
            },
            {
              title: '4. Conservation des données',
              text: `Vos données de compte et vos conversations sont conservées pendant toute la durée de votre utilisation active du service. En cas de suppression de compte, vos données sont effacées dans un délai de 30 jours, sauf obligation légale contraire.`,
            },
            {
              title: '5. Sous-traitants et transferts de données',
              text: `Vos données ne sont pas vendues ni cédées à des tiers à des fins commerciales. Pour générer les réponses des experts IA, le contenu de vos conversations est transmis à Google LLC (service Gemini AI), société établie aux États-Unis, en tant que sous-traitant technique. Ce transfert vers un pays tiers est encadré par les clauses contractuelles types (Standard Contractual Clauses) de Google et par son accord de traitement des données (DPA). Conformément aux conditions d'utilisation de l'API Gemini, vos données ne sont pas utilisées pour entraîner les modèles de Google. Aucune autre donnée personnelle identifiable n'est partagée avec des tiers. Pour toute information sur les garanties applicables à ce transfert : policies.google.com/privacy.`,
            },
            {
              title: '6. Sécurité',
              text: `Nous appliquons des mesures de sécurité adaptées : chiffrement des données en transit (TLS/SSL), chiffrement au repos au niveau infrastructure, contrôle d'accès par authentification, et politiques de sécurité au niveau base de données (Row Level Security).`,
            },
            {
              title: '7. Vos droits',
              text: `Conformément à la loi marocaine 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel, vous disposez d'un droit d'accès, de rectification, d'effacement et d'opposition au traitement de vos données. Pour exercer ces droits, contactez-nous via notre page Contact.`,
            },
            {
              title: '8. Cookies',
              text: `La plateforme utilise des cookies de session nécessaires au fonctionnement du service (authentification). Aucun cookie publicitaire ou de tracking n'est utilisé.`,
            },
          ].map(({ title, text }) => (
            <div key={title} style={{ marginBottom: '1.75rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</h2>
              <p style={{ lineHeight: 1.75, color: 'var(--text-secondary)' }}>{text}</p>
            </div>
          ))}

          <p style={{ marginTop: '2.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Pour toute demande relative à vos données : <Link href="/contact" style={{ color: 'var(--primary)' }}>contactez-nous</Link>.
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
