import { KeywordRiskClassifier, shouldRecommendProfessional } from '../riskClassifier';

describe('KeywordRiskClassifier', () => {
  const classifier = new KeywordRiskClassifier();

  it('returns "none" for empty or harmless text', () => {
    expect(classifier.classifyText('')).toBe('none');
    expect(classifier.classifyText('una mancha en la remera')).toBe('none');
  });

  it('flags high-risk keywords like gas leaks and fire', () => {
    expect(classifier.classifyText('siento olor a gas en la cocina')).toBe('high');
    expect(classifier.classifyText('hay un principio de incendio')).toBe('high');
  });

  it('flags medium-risk keywords like electricity and chemicals', () => {
    expect(classifier.classifyText('un cable eléctrico suelto')).toBe('medium');
    expect(classifier.classifyText('quiero limpiar con lejía')).toBe('medium');
  });

  it('is case-insensitive', () => {
    expect(classifier.classifyText('FUGA DE GAS EN CASA')).toBe('high');
  });
});

describe('shouldRecommendProfessional', () => {
  it('recommends a professional for medium and high risk', () => {
    expect(shouldRecommendProfessional('medium')).toBe(true);
    expect(shouldRecommendProfessional('high')).toBe(true);
  });

  it('does not recommend a professional for low or no risk', () => {
    expect(shouldRecommendProfessional('low')).toBe(false);
    expect(shouldRecommendProfessional('none')).toBe(false);
  });
});
