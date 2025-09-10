import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbOperations } from '@/lib/database';
import { createTransaction } from '@/lib/store';

const transactionQuerySchema = z.object({
  userId: z.string().optional(),
  txnRef: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const txnRef = searchParams.get('txnRef');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (txnRef) {
      const transaction = dbOperations.getTransactionByRef(txnRef);
      if (!transaction) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
      }
      return NextResponse.json(transaction);
    }

    if (userId) {
      const transactions = dbOperations.getTransactionsByUser(userId);
      const paginatedTransactions = transactions.slice(offset, offset + limit);
      
      return NextResponse.json({
        transactions: paginatedTransactions,
        total: transactions.length,
        limit: limit,
        offset: offset,
      });
    }

    return NextResponse.json({ error: 'userId or txnRef is required' }, { status: 400 });
  } catch (error) {
    console.error('Transaction API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

const createTransactionSchema = z.object({
  userId: z.string().min(1),
  txnRef: z.string().min(1),
  type: z.enum(['debit', 'credit']),
  toAccount: z.string().optional(),
  fromBank: z.string().optional(),
  amount: z.number().positive(),
  status: z.enum(['pending', 'success', 'failed']),
  note: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = createTransactionSchema.parse(body);

    // Check if transaction reference already exists
    const existingTransaction = dbOperations.getTransactionByRef(validatedData.txnRef);
    if (existingTransaction) {
      return NextResponse.json({ error: 'Transaction reference already exists' }, { status: 409 });
    }

    const newTransaction = createTransaction({
      userId: validatedData.userId,
      txn_ref: validatedData.txnRef,
      type: validatedData.type,
      to_account: validatedData.toAccount,
      from_bank: validatedData.fromBank,
      amount: validatedData.amount,
      status: validatedData.status,
      note: validatedData.note,
    });

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Create Transaction Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
