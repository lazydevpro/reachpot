import type { Metadata } from 'next';
import { CreatorDashboard } from '@/components/creator/dashboard';

export const metadata: Metadata = { title: 'Creator dashboard' };

export default function MePage() {
  return <CreatorDashboard />;
}
