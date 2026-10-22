import type { Metadata } from 'next';
import { FundAdmin } from '@/components/tools/fund-admin';

export const metadata: Metadata = { title: 'Fund the admin' };

export default function FundPage() {
  return <FundAdmin />;
}
