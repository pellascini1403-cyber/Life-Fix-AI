import Anthropic, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  RateLimitError,
} from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

import { ANALYSIS_TIMEOUT_MS, ANTHROPIC_MODEL, requireAnthropicApiKeyConfigured } from '../config';
import {
  invalidAIResponseError,
  providerNotConfiguredError,
  providerUnavailableError,
  rateLimitedError,
  timeoutError,
} from '../errors';
import { ProviderAnalysis, ProviderAnalysisSchema } from '../schema';
import { buildSystemPrompt } from './systemPrompt';
import { VisionAnalysisInput, VisionAnalysisProvider } from './VisionAnalysisProvider';

const OUTPUT_FORMAT = zodOutputFormat(ProviderAnalysisSchema);

/**
 * Real `VisionAnalysisProvider` backed by the Anthropic Messages API
 * (`@anthropic-ai/sdk`). This is the only file in the project that talks to
 * an AI provider directly, and it only ever runs on the server (see
 * `backend/config.ts` for the client/server boundary this depends on).
 *
 * Requires `ANTHROPIC_API_KEY` in the server environment — see
 * .env.example. Nothing here is reachable from, or bundled into, the
 * mobile app.
 */
export class AnthropicVisionProvider implements VisionAnalysisProvider {
  async analyze(input: VisionAnalysisInput): Promise<ProviderAnalysis> {
    requireAnthropicApiKeyConfigured();

    const client = new Anthropic();
    const userTextParts = [
      input.category ? `The user picked the category "${input.category}" for this problem.` : null,
      input.userContext ? `What the user told us: "${input.userContext}"` : 'The user gave no extra description — rely on the image alone.',
    ].filter((part): part is string => Boolean(part));

    try {
      const response = await client.messages.parse(
        {
          model: ANTHROPIC_MODEL,
          max_tokens: 4096,
          system: buildSystemPrompt(input.locale),
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: input.imageMimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                    data: input.imageBase64,
                  },
                },
                { type: 'text', text: userTextParts.join('\n') },
              ],
            },
          ],
          output_config: { format: OUTPUT_FORMAT },
        },
        { timeout: ANALYSIS_TIMEOUT_MS },
      );

      if (!response.parsed_output) {
        throw invalidAIResponseError(
          'Anthropic response did not include a parsed_output matching ProviderAnalysisSchema',
        );
      }

      return response.parsed_output;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw providerNotConfiguredError(`Anthropic rejected the API key: ${error.message}`);
      }
      if (error instanceof RateLimitError) {
        throw rateLimitedError(30);
      }
      if (error instanceof APIConnectionTimeoutError) {
        throw timeoutError(`Anthropic request timed out: ${error.message}`);
      }
      if (error instanceof APIConnectionError) {
        throw providerUnavailableError(`Could not reach Anthropic: ${error.message}`);
      }
      if (error instanceof APIError) {
        throw providerUnavailableError(`Anthropic API error (${error.status}): ${error.message}`);
      }
      throw error;
    }
  }
}
