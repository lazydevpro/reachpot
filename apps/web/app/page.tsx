import { BuiltOn } from '@/components/landing/built-on';
import { CtaTunnel } from '@/components/landing/cta-tunnel';
import { ScrollStory } from '@/components/landing/scroll-story';

/** Marketing landing page. Static: no request-time APIs, so it prerenders under Cache Components. */
export default function Home() {
  return (
    <>
      <ScrollStory />
      <BuiltOn />
      <CtaTunnel />
    </>
  );
}
