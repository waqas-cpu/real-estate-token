import { getSupabaseAdmin } from '../supabase.js';

export interface CreateProposalInput {
  tokenId: string;
  proposerId: string;
  title: string;
  description?: string;
  proposalType: 'MANAGER_CHANGE' | 'CAPEX' | 'SALE' | 'EMERGENCY';
  timelockDays?: number;
}

export class GovernanceService {
  async list(tokenId?: string) {
    let q = getSupabaseAdmin().from('governance_proposals').select('*');
    if (tokenId) q = q.eq('token_id', tokenId);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async create(input: CreateProposalInput) {
    const timelockDays = input.timelockDays ?? 2;
    const timelockUntil = new Date(Date.now() + timelockDays * 24 * 60 * 60 * 1000);

    const { data, error } = await getSupabaseAdmin()
      .from('governance_proposals')
      .insert({
        token_id: input.tokenId,
        proposer: input.proposerId,
        title: input.title,
        description: input.description ?? null,
        proposal_type: input.proposalType,
        status: 'PENDING',
        timelock_until: timelockUntil.toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async activate(proposalId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from('governance_proposals')
      .update({ status: 'ACTIVE' })
      .eq('id', proposalId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /** Quadratic voting: power = sqrt(token_balance) — balance passed as wei string */
  async listVotes(opts?: { voterWallet?: string; proposalId?: string }) {
    let q = getSupabaseAdmin().from('governance_votes').select('*');
    if (opts?.voterWallet) q = q.eq('voter_wallet', opts.voterWallet);
    if (opts?.proposalId) q = q.eq('proposal_id', opts.proposalId);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async castVote(
    proposalId: string,
    voterWallet: string,
    support: boolean,
    tokenBalanceWei: string
  ) {
    const balance = BigInt(tokenBalanceWei);
    const votingPower = BigInt(Math.floor(Math.sqrt(Number(balance / BigInt(1e18))))) || 1n;

    const { data, error } = await getSupabaseAdmin()
      .from('governance_votes')
      .upsert(
        {
          proposal_id: proposalId,
          voter_wallet: voterWallet,
          support,
          voting_power: votingPower.toString(),
        },
        { onConflict: 'proposal_id,voter_wallet' }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
