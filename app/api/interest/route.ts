/** POST /api/interest — "Notify me" on a pre-launch product. PRD §FR5. */
import { logEvent } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { storeId, productId } = await req.json() as {
      storeId: string; productId: string;
    };
    await logEvent(storeId, 'interest_registered', { product_id: productId });
  } catch { /* never fail the visitor's page over an analytics write */ }
  return Response.json({ ok: true });
}
