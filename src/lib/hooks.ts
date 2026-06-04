import { useEffect, useState } from 'react';
import * as api from './dataSource';

interface UseQueryState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export type MarketplaceBundle = {
  assets: api.PhysicalAsset[];
  summaries: Record<string, api.MarketplaceSummary>;
};

export function useAssets() {
  const [state, setState] = useState<UseQueryState<MarketplaceBundle>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getAssets();
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    })();
  }, []);

  return state;
}

export function useAssetById(id: string | null) {
  const [state, setState] = useState<UseQueryState<api.PhysicalAsset>>({
    data: null,
    loading: !id,
    error: null,
  });

  useEffect(() => {
    if (!id) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    (async () => {
      try {
        const data = await api.getAssetById(id);
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    })();
  }, [id]);

  return state;
}

export function useAssetValuation(assetId: string | null) {
  const [state, setState] = useState<UseQueryState<api.Valuation>>({
    data: null,
    loading: !assetId,
    error: null,
  });

  useEffect(() => {
    if (!assetId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    (async () => {
      try {
        const data = await api.getAssetValuation(assetId);
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    })();
  }, [assetId]);

  return state;
}

export function useAssetRiskScore(assetId: string | null) {
  const [state, setState] = useState<UseQueryState<api.RiskScore>>({
    data: null,
    loading: !assetId,
    error: null,
  });

  useEffect(() => {
    if (!assetId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    (async () => {
      try {
        const data = await api.getAssetRiskScore(assetId);
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    })();
  }, [assetId]);

  return state;
}

export function useSecurityTokens() {
  const [state, setState] = useState<UseQueryState<api.SecurityToken[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getSecurityTokens();
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    })();
  }, []);

  return state;
}

export function useTokenOffering(tokenId: string | null) {
  const [state, setState] = useState<UseQueryState<api.TokenOffering>>({
    data: null,
    loading: !tokenId,
    error: null,
  });

  useEffect(() => {
    if (!tokenId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    (async () => {
      try {
        const data = await api.getTokenOffering(tokenId);
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    })();
  }, [tokenId]);

  return state;
}

export function useProposals(tokenId?: string | null) {
  const [state, setState] = useState<UseQueryState<api.GovernanceProposal[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getProposals(tokenId ?? undefined);
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    })();
  }, [tokenId]);

  return state;
}

export function useGovernanceVotes(voterWallet: string | null) {
  const [state, setState] = useState<UseQueryState<api.GovernanceVote[]>>({
    data: null,
    loading: !voterWallet,
    error: null,
  });

  useEffect(() => {
    if (!voterWallet) {
      setState({ data: [], loading: false, error: null });
      return;
    }

    (async () => {
      try {
        const data = await api.getGovernanceVotes({ voterWallet });
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: [], loading: false, error: error as Error });
      }
    })();
  }, [voterWallet]);

  return state;
}

export function useDistributions(tokenId: string | null) {
  const [state, setState] = useState<UseQueryState<api.IncomeDistribution[]>>({
    data: null,
    loading: !tokenId,
    error: null,
  });

  useEffect(() => {
    if (!tokenId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    (async () => {
      try {
        const data = await api.getDistributions(tokenId);
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    })();
  }, [tokenId]);

  return state;
}

export function useKYCStatus(wallet: string | null) {
  const [state, setState] = useState<UseQueryState<api.KYCRecord>>({
    data: null,
    loading: !wallet,
    error: null,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!wallet) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    (async () => {
      setState((s) => ({ ...s, loading: true }));
      try {
        const data = await api.getKYCStatus(wallet);
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    })();
  }, [wallet, tick]);

  return {
    ...state,
    refetch: () => setTick((t) => t + 1),
  };
}
