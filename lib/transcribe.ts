/**
 * Stage 3 — media to text. PRD §FR2.
 *
 * Spike measurements: a 2.8MB reel downloads in ~2.4s and transcribes in
 * ~3.8s; three reels cost ~31s end to end. Deepgram nova-3 with
 * language=multi handled Gujarati at 0.998 confidence and Hindi/English
 * code-switching cleanly.
 *
 * Downloaded media is discarded once its text is extracted (PRD §FR2,
 * §Guardrails/Data). Nothing is written to disk: bytes go straight from
 * the fetch to Deepgram and are dropped when the function returns.
 */
import { callStage } from './llm';
import { z } from 'zod';

const DG_URL = 'https://api.deepgram.com/v1/listen';

/** Reels beyond this are skipped; Deepgram 504s past ~10 min of processing. */
export const MAX_AUDIO_BYTES = 40 * 1024 * 1024;

export class TranscribeError extends Error {
  constructor(message: string, readonly kind: 'config' | 'download' | 'upstream' | 'too_large') {
    super(message);
    this.name = 'TranscribeError';
  }
}

export interface TranscriptResult {
  text: string;
  confidence: number;
  detectedLanguage: string | null;
  durationSec: number | null;
}

/**
 * Download a reel and transcribe it. Returns empty text for a music-only
 * reel rather than throwing: the caller falls back to the caption and
 * marks the post low signal.
 */
export async function transcribeVideo(videoUrl: string): Promise<TranscriptResult> {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new TranscribeError('DEEPGRAM_API_KEY is not set', 'config');

  let bytes: ArrayBuffer;
  try {
    // Instagram CDN URLs are signed and expire in hours, so this must run
    // in the same job as the scrape.
    const res = await fetch(videoUrl, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new TranscribeError(`media fetch ${res.status}`, 'download');
    bytes = await res.arrayBuffer();
  } catch (err) {
    if (err instanceof TranscribeError) throw err;
    throw new TranscribeError(`media download failed: ${(err as Error).message}`, 'download');
  }

  if (bytes.byteLength > MAX_AUDIO_BYTES) {
    throw new TranscribeError('media too large', 'too_large');
  }

  const params = new URLSearchParams({
    model: 'nova-3',
    language: 'multi',
    smart_format: 'true',
    punctuate: 'true',
  });

  let res: Response;
  try {
    res = await fetch(`${DG_URL}?${params}`, {
      method: 'POST',
      headers: { Authorization: `Token ${key}`, 'Content-Type': 'video/mp4' },
      body: bytes,
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    throw new TranscribeError(`deepgram request failed: ${(err as Error).message}`, 'upstream');
  }
  if (!res.ok) throw new TranscribeError(`deepgram returned ${res.status}`, 'upstream');

  const j = await res.json() as {
    metadata?: { duration?: number };
    results?: { channels?: Array<{
      detected_language?: string;
      alternatives?: Array<{ transcript?: string; confidence?: number }>;
    }> };
  };

  const channel = j.results?.channels?.[0];
  const alt = channel?.alternatives?.[0];
  return {
    text: (alt?.transcript ?? '').trim(),
    confidence: alt?.confidence ?? 0,
    detectedLanguage: channel?.detected_language ?? null,
    durationSec: j.metadata?.duration ?? null,
  };
}

const ImageTextSchema = z.object({
  visible_text: z.string().describe('All text visible in the image, verbatim. Empty string if none.'),
  describes_teaching: z.boolean().describe('True if the image teaches or explains something'),
});

/**
 * Image and carousel text. PRD: a vision-capable model through the same
 * gateway, so there is no separate OCR service to run.
 */
export async function extractImageText(imageUrls: string[]): Promise<string> {
  const urls = imageUrls.filter(Boolean).slice(0, 3);
  if (!urls.length) return '';
  try {
    const r = await callStage({
      stage: 'image_text',
      system: 'You read text out of images. Return exactly what is written, verbatim. Do not describe the picture or add commentary.',
      user: `Read all visible text from these images and return it.\n${urls.map((u, i) => `Image ${i + 1}: ${u}`).join('\n')}`,
      schema: ImageTextSchema,
      schemaName: 'image_text',
      temperature: 0,
      maxTokens: 800,
    });
    return r.data.visible_text.trim();
  } catch {
    // Image text is a bonus, never a blocker: the caption still carries signal.
    return '';
  }
}
