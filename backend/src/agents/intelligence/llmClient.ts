import { config } from '../../config.js';
import type { AgentStepRecord } from './types.js';

/**
 * Optional LLM synthesis — uses OpenAI-compatible API when OPENAI_API_KEY is set.
 */
export async function synthesizeAgentSummary(
  assetId: string,
  steps: AgentStepRecord[],
  proposedFmv: number,
  compositeRisk: number
): Promise<{ summary: string; model: string | null }> {
  if (!config.openaiApiKey) {
    const toolList = steps.map((s) => s.toolName).join(' → ');
    return {
      summary: `Agentic intelligence run for asset ${assetId}: executed tools [${toolList}]. Proposed FMV ${proposedFmv} USD, composite risk ${compositeRisk}/100. Human approval required before SECURITY gate.`,
      model: null,
    };
  }

  const stepDigest = steps
    .map(
      (s) =>
        `Step ${s.stepIndex} ${s.toolName}: ${s.reasoning} | output keys: ${Object.keys(s.toolOutput).join(',')}`
    )
    .join('\n');

  const res = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: config.openaiModel,
      temperature: 0.2,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content:
            'You are an RWA real-estate intelligence agent. Summarize valuation and risk conclusions in 3-5 sentences for a compliance officer. Be factual; cite tools used.',
        },
        {
          role: 'user',
          content: `Asset ${assetId}\nProposed FMV: ${proposedFmv}\nComposite risk: ${compositeRisk}\n\nTool trace:\n${stepDigest}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return {
      summary: `LLM synthesis failed (${res.status}): ${err.slice(0, 200)}. Fallback: FMV ${proposedFmv}, risk ${compositeRisk}.`,
      model: null,
    };
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content?.trim();
  return {
    summary: content ?? `FMV ${proposedFmv}, risk ${compositeRisk}.`,
    model: config.openaiModel,
  };
}
