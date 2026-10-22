import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/campaign/skeleton';
import { SubmitShort } from '@/components/creator/submit-short';

export const metadata: Metadata = { title: 'Submit your Short' };

export default function SubmitPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SubmitShort />
    </Suspense>
  );
}
