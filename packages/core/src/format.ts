/** Fixed-point bigint → human string, trimmed. `fmtUnits(1234500n, 6) === '1.2345'`. */
export function fmtUnits(amount: bigint, decimals: number, maxFraction = 4): string {
  const neg = amount < 0n;
  const abs = neg ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const whole = (abs / base).toLocaleString('en-US');
  const frac = (abs % base).toString().padStart(decimals, '0').slice(0, maxFraction).replace(/0+$/, '');
  return `${neg ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`;
}

/** Human string → fixed-point bigint. Throws on more fractional digits than `decimals`. */
export function parseUnitsStrict(value: string, decimals: number): bigint {
  const v = value.trim().replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(v)) throw new Error(`not a number: "${value}"`);
  const [whole, frac = ''] = v.split('.');
  if (frac.length > decimals) throw new Error(`at most ${decimals} decimals`);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, '0') || '0');
}

export function compact(n: bigint | number): string {
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n));
}

export function shortAddr(a: string, head = 6, tail = 4): string {
  return a.length <= head + tail + 1 ? a : `${a.slice(0, head)}…${a.slice(-tail)}`;
}
