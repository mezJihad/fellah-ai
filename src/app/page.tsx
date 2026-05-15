import Image from "next/image";

export default function Home() {
  return (
    <main>
      <div className="container">
        <section className="hero-section">
          
          <div className="hero-content animate-fade-in">
            <div className="badge">🌱 Première IA Agricole Marocaine</div>
            
            <h1 className="hero-title">
              Fellah AI <br />
              <span>Votre Expert Vocal</span>
            </h1>
            
            <p className="hero-description">
              Discutez en Darija avec une intelligence artificielle experte en agriculture marocaine. 
              Traitements, engrais, climat... Obtenez des réponses précises instantanément via une simple note vocale sur WhatsApp.
            </p>
            
            <div className="whatsapp-cta delay-200 animate-fade-in">
              <div className="qr-code-wrapper">
                {/* SVG placeholder for QR Code */}
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="10" y="10" width="30" height="30" stroke="#000" strokeWidth="8"/>
                  <rect x="60" y="10" width="30" height="30" stroke="#000" strokeWidth="8"/>
                  <rect x="10" y="60" width="30" height="30" stroke="#000" strokeWidth="8"/>
                  <rect x="65" y="65" width="20" height="20" fill="#000"/>
                  <path d="M45 10 h 10 v 10 h -10 z M10 45 h 10 v 10 h -10 z M80 45 h 10 v 10 h -10 z M45 80 h 10 v 10 h -10 z M45 45 h 10 v 10 h -10 z" fill="#000"/>
                </svg>
              </div>
              <div className="cta-text">
                <h3>Essayez maintenant</h3>
                <p>Scannez le QR Code ou cliquez ci-dessous pour démarrer.</p>
                <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                  </svg>
                  Discuter sur WhatsApp
                </a>
              </div>
            </div>
            
          </div>
          
          <div className="hero-image-wrapper delay-300 animate-fade-in">
            <Image 
              src="/hero-image.png" 
              alt="Agriculteur marocain utilisant Fellah AI" 
              width={500} 
              height={500} 
              className="hero-image"
              priority
            />
          </div>
          
        </section>
      </div>
    </main>
  );
}
