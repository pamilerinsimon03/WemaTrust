import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbOperations } from '@/lib/database';

const accountQuerySchema = z.object({
  accountNumber: z.string().optional(),
  userId: z.string().optional(),
}).refine(
  (data) => data.accountNumber || data.userId || true, // Allow no parameters for getting all accounts
  {
    message: "Either accountNumber or userId must be provided, or no parameters for all accounts",
  }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('accountNumber');
    const userId = searchParams.get('userId');

    if (accountNumber) {
      const account = dbOperations.getAccountByNumber(accountNumber);
      if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
      return NextResponse.json(account);
    }

    if (userId) {
      const user = dbOperations.getUser(userId);
      if (!user || !user.accountId) {
        return NextResponse.json({ error: 'User account not found' }, { status: 404 });
      }
      const account = dbOperations.getAccount(user.accountId);
      if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
      return NextResponse.json(account);
    }

    // Return all accounts (admin only in production)
    const accounts = dbOperations.getAllAccounts();
    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Account API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

const createAccountSchema = z.object({
  name: z.string().min(1),
  accountNumber: z.string().length(10),
  initialBalance: z.number().min(0).default(0),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = createAccountSchema.parse(body);

    // Check if account number already exists
    const existingAccount = dbOperations.getAccountByNumber(validatedData.accountNumber);
    if (existingAccount) {
      return NextResponse.json({ error: 'Account number already exists' }, { status: 409 });
    }

    const newAccount = dbOperations.createAccount({
      name: validatedData.name,
      accountNumber: validatedData.accountNumber,
      balance: validatedData.initialBalance,
    });

    return NextResponse.json(newAccount, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Create Account Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
