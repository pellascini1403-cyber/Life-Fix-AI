import en from '../locales/en.json';
import es from '../locales/es.json';

/** Recursively collects dotted key paths for every leaf (string/number)
 * value in a nested locale object, walking into arrays by index (e.g.
 * `help.faqs.0.question`) so structural drift inside an array — a missing
 * FAQ entry, a renamed field within one — is caught too, not just the
 * array's own top-level key. */
function flattenKeys(node: unknown, prefix = ''): Set<string> {
  const keys = new Set<string>();
  if (node === null || typeof node !== 'object') {
    keys.add(prefix);
    return keys;
  }
  const entries = Array.isArray(node)
    ? node.map((value, index) => [String(index), value] as const)
    : Object.entries(node as Record<string, unknown>);
  for (const [key, value] of entries) {
    const path = prefix ? `${prefix}.${key}` : key;
    for (const leaf of flattenKeys(value, path)) {
      keys.add(leaf);
    }
  }
  return keys;
}

describe('locale key parity (es.json vs en.json)', () => {
  it('has no keys present in es but missing from en', () => {
    const esKeys = flattenKeys(es);
    const enKeys = flattenKeys(en);

    const missingFromEn = [...esKeys].filter((key) => !enKeys.has(key));

    expect(missingFromEn).toEqual([]);
  });

  it('has no keys present in en but missing from es', () => {
    const esKeys = flattenKeys(es);
    const enKeys = flattenKeys(en);

    const missingFromEs = [...enKeys].filter((key) => !esKeys.has(key));

    expect(missingFromEs).toEqual([]);
  });
});
