import { ANALYSIS_ERROR_CODES as BACKEND_CODES } from '../errors';
import { ANALYSIS_ERROR_CODES as CLIENT_CODES } from '../../src/types/analysisError';

describe('AnalysisErrorCode sync', () => {
  it('has a client-side entry for every backend error code', () => {
    for (const code of BACKEND_CODES) {
      expect(CLIENT_CODES).toContain(code);
    }
  });

  it('only adds NETWORK_ERROR on the client side (no other client-only codes)', () => {
    const clientOnly = CLIENT_CODES.filter((code) => !(BACKEND_CODES as readonly string[]).includes(code));
    expect(clientOnly).toEqual(['NETWORK_ERROR']);
  });
});
