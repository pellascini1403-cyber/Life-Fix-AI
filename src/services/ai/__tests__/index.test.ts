import { createAIService } from '../index';
import { MockAIService } from '../MockAIService';
import { RemoteAIService } from '../RemoteAIService';

describe('createAIService', () => {
  const originalValue = process.env.EXPO_PUBLIC_USE_REMOTE_AI;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.EXPO_PUBLIC_USE_REMOTE_AI;
    } else {
      process.env.EXPO_PUBLIC_USE_REMOTE_AI = originalValue;
    }
  });

  it('defaults to MockAIService when EXPO_PUBLIC_USE_REMOTE_AI is unset', () => {
    delete process.env.EXPO_PUBLIC_USE_REMOTE_AI;
    expect(createAIService()).toBeInstanceOf(MockAIService);
  });

  it('stays on MockAIService for any value other than the literal string "true"', () => {
    process.env.EXPO_PUBLIC_USE_REMOTE_AI = 'false';
    expect(createAIService()).toBeInstanceOf(MockAIService);

    process.env.EXPO_PUBLIC_USE_REMOTE_AI = '1';
    expect(createAIService()).toBeInstanceOf(MockAIService);
  });

  it('only switches to RemoteAIService when EXPO_PUBLIC_USE_REMOTE_AI is exactly "true"', () => {
    process.env.EXPO_PUBLIC_USE_REMOTE_AI = 'true';
    expect(createAIService()).toBeInstanceOf(RemoteAIService);
  });
});
