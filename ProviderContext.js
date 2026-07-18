import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export const DEMO_PROVIDER_ID = 'provider-demo-001';
export const DEMO_PROVIDER_EMAIL = 'auterioapp@gmail.com';

const DEFAULT_PROVIDER = {
  id: DEMO_PROVIDER_ID,
  name: 'Alex',
  company: 'Auterio Provider',
  initials: 'AP',
  phone: '+15551234567',
  rating: 4.9,
  eta: '18-25 min',
};

const ProviderContext = createContext(null);

export function ProviderContextProvider({ children }) {
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [isDemo, setIsDemo] = useState(false);

  // Merge-update one or more fields at once, e.g. updateProvider({ company, initials }).
  const updateProvider = useCallback((partial) => {
    setProvider(prev => ({ ...prev, ...partial }));
  }, []);

  // Back to defaults — call on logout and before applying a freshly registered account.
  const resetProvider = useCallback(() => {
    setProvider(DEFAULT_PROVIDER);
    setIsDemo(false);
  }, []);

  // Mirrors the old App.js applyProviderUser(): derive id/company/name/initials/phone
  // from a login/register response. isDemo is tracked explicitly from the account's
  // email, not guessed from PROVIDER.id — that ambiguity was the root cause of several
  // bugs (stale demo data, forced "Verified" badge) fixed in this codebase.
  const applyProviderUser = useCallback((user) => {
    if (!user) return;
    const demo = (user.email || '').toLowerCase() === DEMO_PROVIDER_EMAIL;
    setIsDemo(demo);
    if (demo) return;
    setProvider(prev => {
      const company = user.companyName || prev.company;
      const name = user.name || prev.name;
      return {
        ...prev,
        id: user._id || prev.id,
        company,
        name,
        initials: (company || name || 'P').slice(0, 2).toUpperCase(),
        phone: user.phone || prev.phone,
      };
    });
  }, []);

  const value = useMemo(() => ({
    provider,
    isDemo,
    updateProvider,
    resetProvider,
    applyProviderUser,
  }), [provider, isDemo, updateProvider, resetProvider, applyProviderUser]);

  return <ProviderContext.Provider value={value}>{children}</ProviderContext.Provider>;
}

export function useProvider() {
  const ctx = useContext(ProviderContext);
  if (!ctx) throw new Error('useProvider must be used within a ProviderContextProvider');
  return ctx;
}
