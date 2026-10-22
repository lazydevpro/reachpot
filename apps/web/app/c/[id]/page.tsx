import { Suspense } from 'react';
import { CampaignView } from '@/components/campaign/campaign-view';
import { PageSkeleton } from '@/components/campaign/skeleton';

export default function CampaignPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CampaignView />
    </Suspense>
  );
}
