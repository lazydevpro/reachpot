import { connection } from 'next/server';
import { publicDeployment } from '@/lib/server/env';
import { handle } from '@/lib/server/http';

export async function GET() {
  await connection();
  return handle(async () => publicDeployment());
}
