'use client';

import { ChevronDown, FlaskConical, LogOut, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { shortAddr } from '@reachpot/core';
import { Button } from '@/components/ui/button';
import { Menu, MenuItem, MenuLabel } from '@/components/ui/menu';
import { publicConfig } from '@/lib/config';
import { DEV_BRANDS, useEvmWallet } from '@/lib/client/evm-wallet';
import { useNativeWallet } from '@/lib/client/native-wallet';

/** Brand wallet (EVM). */
export function EvmConnect({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const w = useEvmWallet();
  const address = w.address;
  if (address) {
    return (
      <Menu
        trigger={(_, toggle) => (
          <Button variant="secondary" size={size} onClick={toggle} icon={<span className="size-2 rounded-full bg-good" />}>
            {shortAddr(address)} <ChevronDown className="size-3.5 text-faint" />
          </Button>
        )}
      >
        {(close) => (
          <>
            <MenuLabel>{w.label}</MenuLabel>
            <MenuItem icon={<LogOut className="size-4" />} onClick={() => (w.disconnect(), close())}>
              Disconnect
            </MenuItem>
          </>
        )}
      </Menu>
    );
  }
  return (
    <Menu
      trigger={(_, toggle) => (
        <Button size={size} onClick={toggle} loading={w.connecting} icon={<Wallet className="size-4" />}>
          Connect brand wallet
        </Button>
      )}
    >
      {(close) => (
        <>
          <MenuLabel>EVM wallet on {publicConfig.network.label}</MenuLabel>
          <MenuItem
            icon={<Wallet className="size-4" />}
            hint={w.hasInjected ? 'MetaMask, Talisman, SubWallet' : 'No browser wallet detected'}
            onClick={() => {
              close();
              w.connectInjected().catch((e) => toast.error((e as Error).message));
            }}
          >
            Browser wallet
          </MenuItem>
          {publicConfig.devWallets &&
            DEV_BRANDS.map((d, i) => (
              <MenuItem key={d.name} icon={<FlaskConical className="size-4" />} hint="Local dev account, pre-funded" onClick={() => (w.connectDev(i), close())}>
                {d.name}
              </MenuItem>
            ))}
        </>
      )}
    </Menu>
  );
}

/** Creator wallet (native Portaldot account). */
export function NativeConnect({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const w = useNativeWallet();
  const account = w.account;
  if (account) {
    return (
      <Menu
        trigger={(_, toggle) => (
          <Button variant="secondary" size={size} onClick={toggle} icon={<span className="size-2 rounded-full bg-good" />}>
            {account.name} · {shortAddr(account.address, 5, 4)} <ChevronDown className="size-3.5 text-faint" />
          </Button>
        )}
      >
        {(close) => (
          <>
            <MenuLabel>Switch account</MenuLabel>
            <div className="max-h-72 overflow-y-auto">
              {w.accounts.map((a) => (
                <MenuItem key={a.address} hint={shortAddr(a.address, 8, 6)} onClick={() => (w.select(a.address), close())}>
                  {a.name} {a.address === account.address && '✓'}
                </MenuItem>
              ))}
            </div>
            <MenuItem icon={<LogOut className="size-4" />} onClick={() => (w.disconnect(), close())}>
              Disconnect
            </MenuItem>
          </>
        )}
      </Menu>
    );
  }
  return (
    <Menu
      trigger={(_, toggle) => (
        <Button size={size} onClick={toggle} loading={w.connecting} icon={<Wallet className="size-4" />}>
          Connect Portaldot wallet
        </Button>
      )}
    >
      {(close) => (
        <>
          <MenuLabel>Native account on {publicConfig.network.label}</MenuLabel>
          <MenuItem
            icon={<Wallet className="size-4" />}
            hint="Talisman, SubWallet, polkadot{.js}"
            onClick={() => {
              close();
              w.connectExtension().catch((e) => toast.error((e as Error).message));
            }}
          >
            Wallet extension
          </MenuItem>
          {publicConfig.devWallets && (
            <MenuItem icon={<FlaskConical className="size-4" />} hint="Bob, Charlie, Dave, Eve, Ferdie" onClick={() => (w.connectDev(), close())}>
              Demo creator accounts
            </MenuItem>
          )}
        </>
      )}
    </Menu>
  );
}
