import { ArrowLeftRight, BadgeCheck, Database, FileCode2 } from 'lucide-react';
import { Card, Eyebrow } from '@/components/ui/card';

const PIECES = [
  {
    icon: FileCode2,
    title: 'Revive EVM',
    body: 'The campaign escrow is a Solidity contract on pallet-revive, moving native assets through precompiles.',
    tag: 'pallet_revive',
  },
  {
    icon: ArrowLeftRight,
    title: 'AssetConversion DEX',
    body: 'One-tap cash out from any pot token to POT on Portaldot’s native DEX.',
    tag: 'pallet_asset_conversion',
  },
  {
    icon: Database,
    title: 'TransactionStorage',
    body: 'Every view snapshot is published on-chain; its Merkle root anchors each payout.',
    tag: 'pallet_transaction_storage',
  },
  {
    icon: BadgeCheck,
    title: 'Nfts',
    body: 'Soulbound creator badges whose attributes form an on-chain résumé.',
    tag: 'pallet_nfts',
  },
];

/** Slim "how it's built" strip: four Portaldot primitives, no bridges. */
export function BuiltOn() {
  return (
    <section aria-labelledby="reachpot-built-title" className="mx-auto max-w-[1200px] px-5 pt-28 sm:px-8 min-[900px]:pt-24">
      <div className="max-w-[620px]">
        <Eyebrow>How it’s built</Eyebrow>
        <h2 id="reachpot-built-title" className="mt-3 text-[clamp(30px,3.2vw,41px)] leading-[1.06]">
          Native to Portaldot, end to end
        </h2>
        <p className="mt-4 text-[17px] leading-[1.6] tracking-[-0.025em]">
          Four chain primitives do the heavy lifting — no bridges, no off-chain escrow, nothing to take on trust.
        </p>
      </div>
      <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PIECES.map(({ icon: Icon, title, body, tag }) => (
          <li key={title}>
            <Card className="flex h-full flex-col p-6">
              <span className="grid size-10 place-items-center rounded-[12px] bg-sunken text-ink-2 ring-1 ring-line">
                <Icon className="size-[18px]" strokeWidth={2} aria-hidden />
              </span>
              <h3 className="mt-5 text-[17px] tracking-[-0.03em]">{title}</h3>
              <p className="mt-1.5 text-[14.5px] leading-[1.55] tracking-[-0.015em]">{body}</p>
              <p className="mt-auto pt-5 font-mono text-[11.5px] text-faint">{tag}</p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
