import { NextResponse } from 'next/server';
import { dbOperations } from '@/lib/server-database';

export async function GET() {
  try {
    const partnerBanks = dbOperations.getAllPartnerBanks();
    return NextResponse.json(partnerBanks);
  } catch (error) {
    console.error('Partner Banks API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}