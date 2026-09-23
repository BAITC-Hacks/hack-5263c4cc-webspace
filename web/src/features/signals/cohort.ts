import {isGid} from '../../shared/api/types.ts';
import type {Gid} from '../../shared/api/types.ts';

export function parseCohort(text: string, existing: Gid[]): Gid[] {
  const tokens = text.trim().split(/[\s,;]+/).filter(Boolean);
  const incoming = tokens.map(token => {
    if (!/^\d+$/.test(token)) throw new Error('Enter whole-number entity IDs, separated by commas.');
    const gid = token.replace(/^0+(?=\d)/, '');
    if (!isGid(gid)) throw new Error('Enter entity IDs within the supported 64-bit integer range.');
    return gid;
  });
  const next = [...new Set([...existing, ...incoming])];
  if (next.length > 5) throw new Error('Choose up to five entities for this bounded comparison.');
  return next;
}
