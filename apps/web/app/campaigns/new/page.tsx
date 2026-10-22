import type { Metadata } from 'next';
import { CreateCampaign } from '@/components/campaign/create-campaign';

export const metadata: Metadata = { title: 'Start a campaign' };

export default function NewCampaignPage() {
  return <CreateCampaign />;
}
