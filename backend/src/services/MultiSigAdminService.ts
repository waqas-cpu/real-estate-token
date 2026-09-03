import { getSupabaseAdmin } from '../supabase.js';

export interface MultisigProposal {
  id: string;
  multisigContractAddress: string;
  destination: string;
  value: string;
  data: string;
  description: string;
  proposer: string;
  requiredConfirmations: number;
  confirmations: Array<{ signer: string; signature?: string; confirmedAt: string }>;
  status: 'PROPOSED' | 'CONFIRMED' | 'EXECUTED' | 'REJECTED' | 'CANCELLED';
  executionTxHash?: string;
  executedAt?: string;
  createdAt: string;
}

export class MultiSigAdminService {
  private inMemoryProposals: Map<string, MultisigProposal> = new Map();

  async propose(input: {
    multisigContractAddress: string;
    destination: string;
    value?: string;
    data?: string;
    description: string;
    proposer: string;
    requiredConfirmations?: number;
  }): Promise<MultisigProposal> {
    const id = `ms-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const reqConf = input.requiredConfirmations ?? 2;

    const proposal: MultisigProposal = {
      id,
      multisigContractAddress: input.multisigContractAddress.toLowerCase(),
      destination: input.destination.toLowerCase(),
      value: input.value ?? '0',
      data: input.data ?? '0x',
      description: input.description,
      proposer: input.proposer.toLowerCase(),
      requiredConfirmations: reqConf,
      confirmations: [
        {
          signer: input.proposer.toLowerCase(),
          confirmedAt: now,
        },
      ],
      status: reqConf <= 1 ? 'CONFIRMED' : 'PROPOSED',
      createdAt: now,
    };

    this.inMemoryProposals.set(id, proposal);

    try {
      const supabase = getSupabaseAdmin();
      await supabase.from('multisig_proposals').insert({
        id,
        multisig_contract_address: proposal.multisigContractAddress,
        destination: proposal.destination,
        value: proposal.value,
        data: proposal.data,
        description: proposal.description,
        proposer: proposal.proposer,
        required_confirmations: proposal.requiredConfirmations,
        confirmations: proposal.confirmations,
        status: proposal.status,
      });
    } catch {
      // test fallback
    }

    return proposal;
  }

  async confirm(
    proposalId: string,
    signerAddress: string,
    signature?: string
  ): Promise<MultisigProposal> {
    const proposal = this.inMemoryProposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Multisig proposal ${proposalId} not found`);
    }

    if (proposal.status === 'EXECUTED' || proposal.status === 'CANCELLED') {
      throw new Error(`Proposal is already ${proposal.status}`);
    }

    const signer = signerAddress.toLowerCase();
    const alreadyConfirmed = proposal.confirmations.some((c) => c.signer === signer);
    if (alreadyConfirmed) {
      throw new Error(`Signer ${signer} already confirmed this proposal`);
    }

    proposal.confirmations.push({
      signer,
      signature,
      confirmedAt: new Date().toISOString(),
    });

    if (proposal.confirmations.length >= proposal.requiredConfirmations) {
      proposal.status = 'CONFIRMED';
    }

    try {
      const supabase = getSupabaseAdmin();
      await supabase
        .from('multisig_proposals')
        .update({
          confirmations: proposal.confirmations,
          status: proposal.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposalId);
    } catch {
      // test fallback
    }

    return proposal;
  }

  async execute(proposalId: string, executorAddress: string): Promise<MultisigProposal> {
    const proposal = this.inMemoryProposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Multisig proposal ${proposalId} not found`);
    }

    if (proposal.confirmations.length < proposal.requiredConfirmations) {
      throw new Error(
        `Insufficient confirmations: ${proposal.confirmations.length}/${proposal.requiredConfirmations} required`
      );
    }

    if (proposal.status === 'EXECUTED') {
      throw new Error('Proposal has already been executed');
    }

    const txHash = `0x_msexec_${Date.now()}_${proposalId}`;
    proposal.status = 'EXECUTED';
    proposal.executionTxHash = txHash;
    proposal.executedAt = new Date().toISOString();

    try {
      const supabase = getSupabaseAdmin();
      await supabase
        .from('multisig_proposals')
        .update({
          status: 'EXECUTED',
          execution_tx_hash: txHash,
          executed_at: proposal.executedAt,
          updated_at: proposal.executedAt,
        })
        .eq('id', proposalId);
    } catch {
      // test fallback
    }

    return proposal;
  }

  async getProposal(proposalId: string): Promise<MultisigProposal | null> {
    return this.inMemoryProposals.get(proposalId) ?? null;
  }

  async listProposals(): Promise<MultisigProposal[]> {
    return Array.from(this.inMemoryProposals.values());
  }
}
