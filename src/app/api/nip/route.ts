import { NextResponse } from 'next/server';
import { z } from 'zod';
import { nipSimulation } from '@/lib/nip-simulation';

const nipSchema = z.object({
  txn_ref: z.string(),
  amount: z.number().positive(),
  status: z.enum(['pending', 'success', 'failed']).optional(),
  to_account: z.string(),
  from_bank: z.string().optional(),
  note: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = nipSchema.parse(body);

    // If status is provided, process immediately (for testing)
    if (payload.status) {
      const { nipSimulation } = await import('@/lib/nip-simulation');
      await nipSimulation.simulateNipTransfer(payload);
    } else {
      // Simulate the full NIP process
      await nipSimulation.simulateNipTransfer(payload);
    }

    return NextResponse.json({ 
      message: 'NIP event processed',
      txn_ref: payload.txn_ref,
      status: 'processing'
    }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('NIP Event Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// GET endpoint for simulation status and statistics
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        const statistics = nipSimulation.getStatistics();
        const pendingTransactions = nipSimulation.getPendingTransactions();
        return NextResponse.json({
          statistics,
          pendingTransactions,
        });

      case 'simulate-outage':
        const bankId = searchParams.get('bankId');
        const duration = parseInt(searchParams.get('duration') || '60000');
        
        if (!bankId) {
          return NextResponse.json({ error: 'bankId is required' }, { status: 400 });
        }

        await nipSimulation.simulateBankOutage(bankId, duration);
        return NextResponse.json({ 
          message: `Simulating outage for ${bankId} for ${duration}ms` 
        });

      case 'simulate-system-issue':
        const issueDuration = parseInt(searchParams.get('duration') || '30000');
        await nipSimulation.simulateSystemIssue(issueDuration);
        return NextResponse.json({ 
          message: `Simulating system issue for ${issueDuration}ms` 
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('NIP Status Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
