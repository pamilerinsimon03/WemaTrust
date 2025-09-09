import { NextResponse } from 'next/server';
import { z } from 'zod';
import { processNipEvent } from '@/lib/store';

const nipSchema = z.object({
  txn_ref: z.string(),
  amount: z.number().positive(),
  status: z.enum(['pending', 'success', 'failed']),
  to_account: z.string(),
  // These fields are included in the prompt but not used in the logic.
  // Adding them to the schema for completeness.
  from_bank: z.string().optional(),
  note: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = nipSchema.parse(body);

    processNipEvent(payload);

    return NextResponse.json({ message: 'NIP event processed' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('NIP Event Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
