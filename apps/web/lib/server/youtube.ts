// View source: YouTube Data API v3 (public stats + description, API key only) or a deterministic mock for local demos.
import { keccak256, toBytes } from 'viem';
import { serverEnv } from './env';

export interface VideoInfo {
  videoId: string;
  title: string;
  description: string;
  views: bigint;
  durationSec: number;
  publishedAt: Date;
  channelTitle: string;
}

/** Shorts are ≤ 3 minutes since Oct 2024. */
export const MAX_SHORT_SECONDS = 180;

function isoDurationSeconds(iso: string): number {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return Number.POSITIVE_INFINITY;
  const [, d, h, mi, s] = m.map((x) => Number(x ?? 0));
  return d * 86_400 + h * 3_600 + mi * 60 + s;
}

export async function fetchYouTube(ids: string[]): Promise<Map<string, VideoInfo>> {
  const key = serverEnv.youtubeApiKey;
  if (!key) throw new Error('YOUTUBE_API_KEY is not set');
  const out = new Map<string, VideoInfo>();
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${batch.join(',')}&key=${key}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`YouTube API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as {
      items?: {
        id: string;
        snippet: { title: string; description: string; publishedAt: string; channelTitle: string };
        statistics: { viewCount?: string };
        contentDetails: { duration: string };
      }[];
    };
    for (const it of json.items ?? []) {
      out.set(it.id, {
        videoId: it.id,
        title: it.snippet.title,
        description: it.snippet.description,
        views: BigInt(it.statistics.viewCount ?? '0'),
        durationSec: isoDurationSeconds(it.contentDetails.duration),
        publishedAt: new Date(it.snippet.publishedAt),
        channelTitle: it.snippet.channelTitle,
      });
    }
  }
  return out;
}

/** Deterministic synthetic views for local demos: each video has its own "virality" and grows over a few minutes. */
export function mockViews(videoId: string, submittedAt: Date, now = new Date()): bigint {
  const h = BigInt(keccak256(toBytes(videoId)));
  const ceiling = 800n + (h % 48_000n); // 800 … ~49K views
  const elapsed = Math.max(0, now.getTime() - submittedAt.getTime());
  const progress = Math.min(1, elapsed / 240_000); // reaches the ceiling after ~4 minutes
  const eased = 1 - (1 - progress) ** 2;
  return BigInt(Math.floor(Number(ceiling) * (0.08 + 0.92 * eased)));
}

export function mockTitle(videoId: string): string {
  const topics = ['unboxing', 'speedrun', 'reaction', 'tutorial', 'day in the life', 'challenge', 'review', 'behind the scenes'];
  const n = Number(BigInt(keccak256(toBytes(videoId))) % BigInt(topics.length));
  return `My ${topics[n]} Short`;
}
