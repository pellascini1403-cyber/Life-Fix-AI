import { riskClassifier, shouldRecommendProfessional } from '../../safety/riskClassifier';
import { AnalysisRequest, AnalysisResult, ProblemCategory } from '../../types/analysis';
import { AIService } from './types';

/**
 * Development-only stand-in for `AIService`.
 *
 * This lets the full capture -> analyze -> result flow be built and tested
 * end-to-end before the real backend + AI provider integration exists. It
 * does NOT call any AI provider — it returns one of a handful of canned,
 * category-shaped results after a short simulated delay, and still runs
 * user context through the real risk classifier so the safety UI
 * (professional-recommended banner, downgraded confidence) can be verified.
 *
 * This must be swapped for `RemoteAIService` before release; see
 * `createAIService` in `index.ts` for the switch point.
 */
export class MockAIService implements AIService {
  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    await delay(1400 + Math.random() * 900);

    const category = request.category ?? inferCategory(request.userContext);
    const risk = riskClassifier.classifyText(request.userContext ?? '');
    const template = TEMPLATES[category];

    return {
      id: `mock-${Date.now()}`,
      createdAt: new Date().toISOString(),
      category,
      problemTitle: template.problemTitle,
      problemExplanation: template.problemExplanation,
      confidence: risk === 'high' ? 'low' : template.confidence,
      steps: template.steps,
      requiredItems: template.requiredItems,
      estimatedTimeMinutes: template.estimatedTimeMinutes,
      difficulty: template.difficulty,
      warnings: template.warnings,
      risk,
      recommendsProfessional: shouldRecommendProfessional(risk),
      imageUri: request.imageUri,
      userContext: request.userContext ?? null,
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function inferCategory(context?: string): ProblemCategory {
  const text = (context ?? '').toLowerCase();
  if (/mancha|stain|ropa|clothes|lavado|laundry/.test(text)) return 'clothing';
  if (/planta|plant|jardín|garden|hoja|leaf/.test(text)) return 'garden';
  if (/fuga|leak|cañ|pipe|electr/.test(text)) return 'repairs';
  if (/limpi|clean/.test(text)) return 'cleaning';
  return 'home';
}

type Template = Omit<
  AnalysisResult,
  'id' | 'createdAt' | 'category' | 'risk' | 'recommendsProfessional' | 'imageUri' | 'userContext'
>;

const TEMPLATES: Record<ProblemCategory, Template> = {
  clothing: {
    problemTitle: 'Mancha de aceite en tela de algodón',
    problemExplanation:
      'Detectamos una mancha con bordes oscuros, típica de aceite o grasa, sobre una tela que parece de algodón.',
    confidence: 'high',
    steps: [
      { order: 1, instruction: 'Retirá el exceso con una servilleta de papel, sin frotar.' },
      { order: 2, instruction: 'Aplicá un poco de detergente líquido directamente sobre la mancha.' },
      { order: 3, instruction: 'Dejá actuar 10 minutos.' },
      { order: 4, instruction: 'Lavá la prenda a la temperatura indicada en su etiqueta.' },
      { order: 5, instruction: 'Revisá la mancha antes de secar: el calor la puede fijar.' },
    ],
    requiredItems: ['Detergente líquido', 'Servilleta de papel'],
    estimatedTimeMinutes: { min: 15, max: 20 },
    difficulty: 'easy',
    warnings: ['No uses agua caliente antes de quitar la mancha.'],
  },
  garden: {
    problemTitle: 'Hojas amarillentas por posible exceso de riego',
    problemExplanation:
      'Las hojas muestran amarillamiento uniforme desde la base, un patrón asociado a exceso de agua o mal drenaje.',
    confidence: 'medium',
    steps: [
      { order: 1, instruction: 'Tocá la tierra 3-4 cm por debajo de la superficie.' },
      { order: 2, instruction: 'Si está húmeda, esperá antes de volver a regar.' },
      { order: 3, instruction: 'Verificá que la maceta tenga buen drenaje.' },
      { order: 4, instruction: 'Retirá las hojas ya muy dañadas con tijeras limpias.' },
    ],
    requiredItems: ['Tijeras de poda'],
    estimatedTimeMinutes: { min: 10, max: 15 },
    difficulty: 'easy',
    warnings: [],
  },
  repairs: {
    problemTitle: 'Posible fuga en conexión de cañería',
    problemExplanation:
      'Se observa humedad concentrada alrededor de una conexión, compatible con una fuga menor de agua.',
    confidence: 'medium',
    steps: [
      { order: 1, instruction: 'Cerrá la llave de paso general del agua.' },
      { order: 2, instruction: 'Secá la zona y confirmá el punto exacto de la fuga.' },
      { order: 3, instruction: 'Si es una conexión roscada, probá ajustarla con una llave.' },
      { order: 4, instruction: 'Si la fuga continúa, es momento de llamar a un plomero.' },
    ],
    requiredItems: ['Llave ajustable', 'Trapo'],
    estimatedTimeMinutes: { min: 20, max: 40 },
    difficulty: 'medium',
    warnings: ['Si hay riesgo de contacto con instalación eléctrica, no toques nada y llamá a un profesional.'],
  },
  cleaning: {
    problemTitle: 'Acumulación de sarro en superficie',
    problemExplanation:
      'La superficie muestra depósitos blanquecinos típicos de sarro por agua dura.',
    confidence: 'high',
    steps: [
      { order: 1, instruction: 'Mezclá partes iguales de vinagre blanco y agua.' },
      { order: 2, instruction: 'Aplicá la mezcla y dejá actuar 10-15 minutos.' },
      { order: 3, instruction: 'Frotá con un cepillo suave.' },
      { order: 4, instruction: 'Enjuagá bien con agua.' },
    ],
    requiredItems: ['Vinagre blanco', 'Cepillo suave', 'Rociador'],
    estimatedTimeMinutes: { min: 15, max: 25 },
    difficulty: 'easy',
    warnings: ['No mezcles vinagre con lavandina: genera gases tóxicos.'],
  },
  objects: {
    problemTitle: 'Dispositivo no enciende',
    problemExplanation:
      'La imagen no muestra daño visible externo; es probable que sea un problema de alimentación eléctrica.',
    confidence: 'low',
    steps: [
      { order: 1, instruction: 'Verificá que el cable esté bien conectado en ambos extremos.' },
      { order: 2, instruction: 'Probá con otro tomacorriente.' },
      { order: 3, instruction: 'Revisá si hay un fusible o protector térmico para reiniciar.' },
    ],
    requiredItems: [],
    estimatedTimeMinutes: { min: 5, max: 10 },
    difficulty: 'easy',
    warnings: ['No abras el dispositivo si sigue conectado a la corriente.'],
  },
  home: {
    problemTitle: 'Humedad leve en pared',
    problemExplanation:
      'Se observa una mancha de humedad localizada, sin signos evidentes de moho extendido.',
    confidence: 'medium',
    steps: [
      { order: 1, instruction: 'Ventilá el ambiente diariamente durante al menos 15 minutos.' },
      { order: 2, instruction: 'Verificá que no haya una fuente de agua cercana (cañería, filtración).' },
      { order: 3, instruction: 'Limpiá la superficie con un paño seco.' },
    ],
    requiredItems: ['Paño seco'],
    estimatedTimeMinutes: { min: 10, max: 15 },
    difficulty: 'easy',
    warnings: ['Si la mancha crece rápido o hay olor fuerte, consultá a un profesional.'],
  },
  other: {
    problemTitle: 'Problema no identificado con certeza',
    problemExplanation:
      'No pudimos identificar el problema con suficiente confianza a partir de la imagen.',
    confidence: 'low',
    steps: [
      { order: 1, instruction: 'Probá sacar la foto con mejor luz y más cerca del detalle.' },
      { order: 2, instruction: 'Agregá una breve descripción del problema.' },
    ],
    requiredItems: [],
    estimatedTimeMinutes: null,
    difficulty: 'easy',
    warnings: [],
  },
};
