import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbOperations } from '@/lib/database';
import type { ShadowEntryStatus } from '@/lib/types';

const shadowEntryQuerySchema = z.object({
  accountId: z.string().optional(),
  txnRef: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = shadowEntryQuerySchema.parse({
      accountId: searchParams.get('accountId'),
      txnRef: searchParams.get('txnRef'),
    });

    if (query.txnRef) {
      const shadowEntry = dbOperations.getShadowEntryByRef(query.txnRef);
      if (!shadowEntry) {
        return NextResponse.json({ error: 'Shadow entry not found' }, { status: 404 });
      }
      return NextResponse.json(shadowEntry);
    }

    if (query.accountId) {
      const account = dbOperations.getAccount(query.accountId);
      if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
      return NextResponse.json(account.shadowEntries);
    }

    return NextResponse.json({ error: 'accountId or txnRef is required' }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Shadow Entry API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

const createShadowEntrySchema = z.object({
  accountId: z.string().min(1),
  txnRef: z.string().min(1),
  amount: z.number().positive(),
  status: z.enum(['pending', 'cleared', 'failed']).default('pending'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = createShadowEntrySchema.parse(body);

    // Check if account exists
    const account = dbOperations.getAccount(validatedData.accountId);
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check if shadow entry already exists for this transaction reference
    const existingEntry = dbOperations.getShadowEntryByRef(validatedData.txnRef);
    if (existingEntry) {
      return NextResponse.json({ error: 'Shadow entry already exists for this transaction reference' }, { status: 409 });
    }

    const newShadowEntry = dbOperations.createShadowEntry({
      accountId: validatedData.accountId,
      txn_ref: validatedData.txnRef,
      amount: validatedData.amount,
      status: validatedData.status,
    });

    return NextResponse.json(newShadowEntry, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Create Shadow Entry Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

const updateShadowEntryStatusSchema = z.object({
  status: z.enum(['pending', 'cleared', 'failed']),
});

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shadowEntryId = searchParams.get('id');
    
    if (!shadowEntryId) {
      return NextResponse.json({ error: 'Shadow entry ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateShadowEntryStatusSchema.parse(body);

    const updatedShadowEntry = dbOperations.updateShadowEntryStatus(
      shadowEntryId,
      validatedData.status as ShadowEntryStatus
    );

    if (!updatedShadowEntry) {
      return NextResponse.json({ error: 'Shadow entry not found' }, { status: 404 });
    }

    return NextResponse.json(updatedShadowEntry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Update Shadow Entry Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
