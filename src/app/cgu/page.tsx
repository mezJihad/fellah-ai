import Link from 'next/link';
import '../../app/globals.css';

export default function CGU() {
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
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Conditions Générales d&apos;Utilisation</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '0.875rem' }}>Dernière mise à jour : juin 2026</p>

          {[
            {
              title: '1. Objet',
              text: `Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme Mgoun AI, accessible à l'adresse mgounai.com. En accédant à la plateforme, l'utilisateur accepte sans réserve les présentes conditions.`,
            },
            {
              title: '2. Description du service',
              text: `Mgoun AI est une plateforme marocaine proposant des assistants intelligents spécialisés (actualité, nutrition, musique, voyage, famille, agriculture, investissement, développement personnel). Les réponses fournies sont générées par intelligence artificielle à titre informatif uniquement.`,
            },
            {
              title: '3. Accès au service',
              text: `L'accès à certaines fonctionnalités nécessite la création d'un compte avec une adresse email valide. L'utilisateur est responsable de la confidentialité de ses identifiants de connexion. Mgoun AI se réserve le droit de suspendre tout compte en cas d'utilisation abusive.`,
            },
            {
              title: '4. Utilisation acceptable',
              text: `L'utilisateur s'engage à utiliser la plateforme dans le respect des lois marocaines et internationales en vigueur. Sont notamment interdits : l'utilisation à des fins illicites, la diffusion de contenus offensants, la tentative de contournement des systèmes de sécurité, ou tout usage commercial non autorisé.`,
            },
            {
              title: '5. Limitation de responsabilité',
              text: `Les réponses des experts IA sont fournies à titre informatif et ne constituent pas des conseils médicaux, juridiques, financiers ou professionnels certifiés. Mgoun AI décline toute responsabilité quant aux décisions prises sur la base des informations fournies. L'utilisateur est invité à consulter des professionnels agréés pour tout besoin spécifique.`,
            },
            {
              title: '6. Propriété intellectuelle',
              text: `L'ensemble des éléments de la plateforme (logo, textes, interface, marque "Mgoun AI") sont la propriété exclusive de leurs auteurs. Toute reproduction, même partielle, est interdite sans autorisation écrite préalable.`,
            },
            {
              title: '7. Modification des CGU',
              text: `Mgoun AI se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des modifications substantielles. La poursuite de l'utilisation du service après modification vaut acceptation des nouvelles conditions.`,
            },
            {
              title: '8. Droit applicable',
              text: `Les présentes CGU sont soumises au droit marocain. Tout litige relatif à leur interprétation ou exécution sera soumis aux tribunaux compétents du Maroc.`,
            },
          ].map(({ title, text }) => (
            <div key={title} style={{ marginBottom: '1.75rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</h2>
              <p style={{ lineHeight: 1.75, color: 'var(--text-secondary)' }}>{text}</p>
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
