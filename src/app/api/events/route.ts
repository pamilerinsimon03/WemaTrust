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

  request.signal.addEventListener('abort', () => {
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
