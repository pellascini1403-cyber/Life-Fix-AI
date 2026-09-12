import { MockAIService } from '../MockAIService';

describe('MockAIService', () => {
  it('resolves to a well-formed AnalysisResult', async () => {
    const service = new MockAIService();
    const result = await service.analyze({ imageUri: 'file:///tmp/photo.jpg', category: 'clothing' });

    expect(result.category).toBe('clothing');
    expect(result.imageUri).toBe('file:///tmp/photo.jpg');
    expect(result.steps.length).toBeGreaterThan(0);
    expect(Array.isArray(result.followUpQuestions)).toBe(true);
  });

  it('infers a category from free-text context when none is picked', async () => {
    const service = new MockAIService();
    const result = await service.analyze({ imageUri: 'file:///x.jpg', userContext: 'mancha en la remera' });
    expect(result.category).toBe('clothing');
  });

  it('downgrades confidence to low when the text signals high risk', async () => {
    const service = new MockAIService();
    const result = await service.analyze({
      imageUri: 'file:///x.jpg',
      userContext: 'siento olor a gas en la cocina',
    });
    expect(result.risk).toBe('high');
    expect(result.confidence).toBe('low');
    expect(result.recommendsProfessional).toBe(true);
  });

  it('carries the user context through unchanged', async () => {
    const service = new MockAIService();
    const result = await service.analyze({ imageUri: 'file:///x.jpg', userContext: 'se rompió la manija' });
    expect(result.userContext).toBe('se rompió la manija');
  });
});
