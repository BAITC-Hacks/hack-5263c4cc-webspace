import {useState, type ReactNode} from 'react';
import {QueryClientProvider} from '@tanstack/react-query';
import {createAppQueryClient} from '../shared/api/query';

export function Providers({children}: {children: ReactNode}) {
  const [client] = useState(createAppQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
