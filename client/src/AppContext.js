import { createContext } from 'react';

export const AppContext = createContext({
    appConfig: {
        domains: {
            Mission: { color: '#14364F', displayItems: [] },
            Scenario: { color: '#14364F', displayItems: [] },
            Requirements: { color: '#14364F', displayItems: [] },
            Parameter: { color: '#14364F', displayItems: [] },
            Functions: { color: '#14364F', displayItems: [] }
        }
    },
    setAppConfig: () => {}
}); 