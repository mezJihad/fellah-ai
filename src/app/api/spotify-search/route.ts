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
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken!;
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
    const q = encodeURIComponent(`track:${title} artist:${artist}`);
    const res = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1&market=MA`, {
      headers: { Authorization: `Bearer ${spotifyToken}` },
    });
    const data = await res.json();
    const track = data.tracks?.items?.[0];
    if (!track) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    return NextResponse.json({
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name ?? artist,
      albumArt: track.album?.images?.[1]?.url ?? track.album?.images?.[0]?.url ?? null,
      spotifyUrl: track.external_urls?.spotify ?? null,
    });
  } catch {
    return NextResponse.json({ error: 'Erreur Spotify' }, { status: 500 });
  }
}
