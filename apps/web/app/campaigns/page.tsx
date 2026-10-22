import type { Metadata } from 'next';
import { CampaignExplorer } from '@/components/campaign/explorer';

export const metadata: Metadata = { title: 'Campaigns' };

export default function CampaignsPage() {
  return <CampaignExplorer />;
}
