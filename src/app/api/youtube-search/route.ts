import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

  const apiKey = process.env.YOUTUBE_API_KEY!;

  // Essai 1 : artiste + titre + "official"
  // Essai 2 : artiste + titre seuls
  const queries = [
    `${artist} ${title} official audio`,
    `${artist} ${title}`,
  ];

  try {
    for (const q of queries) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=id,snippet&q=${encodeURIComponent(q)}&type=video&videoCategoryId=10&maxResults=1&key=${apiKey}`
      );
      if (!res.ok) {
        const text = await res.text();
        console.error(`❌ YouTube search HTTP ${res.status}:`, text.slice(0, 300));
        return NextResponse.json({ error: 'Erreur YouTube API' }, { status: 500 });
      }
      const data = await res.json();
      const item = data.items?.[0];
      if (item?.id?.videoId) {
        const videoId = item.id.videoId;
        console.log(`🎵 YouTube trouvé : "${item.snippet?.title}" [${videoId}]`);
        return NextResponse.json({
          videoId,
          title: item.snippet?.title ?? title,
          channel: item.snippet?.channelTitle ?? artist,
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        });
      }
    }
    console.warn(`🎵 YouTube introuvable : "${title}" — "${artist}"`);
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  } catch (e) {
    console.error('❌ Erreur YouTube search:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
