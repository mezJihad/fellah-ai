import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ Spotify token HTTP ${res.status}:`, text.slice(0, 300));
    throw new Error(`Spotify token error: ${res.status}`);
  }
  const data = await res.json();
  if (!data.access_token) {
    console.error('❌ Spotify token manquant dans la réponse:', JSON.stringify(data));
    throw new Error('No access token');
  }
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  console.log('✅ Spotify token obtenu');
  return cachedToken!;
}

async function searchTrack(spotifyToken: string, query: string) {
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${spotifyToken}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ Spotify search HTTP ${res.status}:`, text.slice(0, 300));
    return null;
  }
  const data = await res.json();
  return data.tracks?.items?.[0] ?? null;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { error } = await supabase.auth.getUser(token);
  if (error) return NextResponse.json({ error: 'Token invalide' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const artist = searchParams.get('artist') ?? '';
  const title = searchParams.get('title') ?? '';
  if (!artist && !title) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });

  try {
    const spotifyToken = await getSpotifyToken();

    // Essai 1 : requête précise avec champs
    let track = await searchTrack(spotifyToken, `track:${title} artist:${artist}`);

    // Essai 2 : requête libre artiste + titre
    if (!track) track = await searchTrack(spotifyToken, `${artist} ${title}`);

    // Essai 3 : titre seul
    if (!track) track = await searchTrack(spotifyToken, title);

    if (!track) {
      console.warn(`🎵 Spotify introuvable : "${title}" — "${artist}"`);
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    }

    console.log(`🎵 Spotify trouvé : ${track.name} — ${track.artists[0]?.name} [${track.id}]`);
    return NextResponse.json({
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name ?? artist,
      albumArt: track.album?.images?.[1]?.url ?? track.album?.images?.[0]?.url ?? null,
      spotifyUrl: track.external_urls?.spotify ?? null,
    });
  } catch (e) {
    console.error('❌ Erreur Spotify search:', e);
    return NextResponse.json({ error: 'Erreur Spotify' }, { status: 500 });
  }
}
