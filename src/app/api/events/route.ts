import { type NextRequest } from 'next/server';
import sseEmitter from '@/lib/events';
import type { ServerEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = (event: ServerEvent) => {
    try {
      writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    } catch (e) {
      console.error('SSE write error:', e);
    }
  };

  sseEmitter.on('event', sendEvent);

  // Set up timeout to prevent Vercel timeout (25 seconds to be safe)
  const timeout = setTimeout(() => {
    sseEmitter.removeListener('event', sendEvent);
    try {
      writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'timeout', data: { message: 'Connection timeout' } })}\n\n`));
      writer.close();
    } catch (e) {
      console.error('SSE timeout close error:', e);
    }
  }, 25000); // 25 seconds

  request.signal.addEventListener('abort', () => {
    clearTimeout(timeout);
    sseEmitter.removeListener('event', sendEvent);
    try {
      writer.close();
    } catch (e) {
       console.error('SSE close error:', e);
    }
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
