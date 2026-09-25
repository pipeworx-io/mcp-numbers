interface McpToolDefinition {
  name: string;
  description: string;
  /** Human-facing one-liner (fleet #1967). Optional; consumers fall back to
   *  description. Kept in step with shared/src/types.ts — scripts/lib/
   *  check-inlined-types.mjs reports drift at publish time. */
  summary?: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    anyOf?: Array<{ required: string[] }>;
    oneOf?: Array<{ required: string[] }>;
    allOf?: Array<{ required: string[] }>;
  };
  outputSchema?: Record<string, unknown>;
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Number utilities MCP.
 *
 * Keyless, offline: convert integers between bases (2-36), convert to/from
 * Roman numerals, and spell an integer in English words. Pure logic — no API,
 * no key.
 */


const ROMAN: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];

function toRoman(n: number): string { let out = ''; for (const [v, s] of ROMAN) while (n >= v) { out += s; n -= v; } return out; }
function fromRoman(s: string): number | null {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0, prev = 0;
  const up = s.toUpperCase();
  if (!/^[IVXLCDM]+$/.test(up)) return null;
  for (let i = up.length - 1; i >= 0; i--) { const v = map[up[i]]; if (v < prev) total -= v; else { total += v; prev = v; } }
  return toRoman(total) === up ? total : null; // reject malformed like "IIII"
}

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALE = ['', ' thousand', ' million', ' billion', ' trillion', ' quadrillion'];
function threeDigits(n: number): string {
  let s = '';
  if (n >= 100) { s += ONES[Math.floor(n / 100)] + ' hundred'; n %= 100; if (n) s += ' '; }
  if (n >= 20) { s += TENS[Math.floor(n / 10)]; if (n % 10) s += '-' + ONES[n % 10]; }
  else if (n > 0) s += ONES[n];
  return s;
}
function toWords(n: number): string {
  if (n === 0) return 'zero';
  const neg = n < 0; n = Math.abs(n);
  const groups: number[] = [];
  while (n > 0) { groups.push(n % 1000); n = Math.floor(n / 1000); }
  if (groups.length > SCALE.length) return '(number too large to spell)';
  let out = '';
  for (let i = groups.length - 1; i >= 0; i--) if (groups[i]) out += (out ? ' ' : '') + threeDigits(groups[i]) + SCALE[i];
  return (neg ? 'negative ' : '') + out;
}

const tools: McpToolExport['tools'] = [
  {
    name: 'convert_base',
    description: 'Convert an integer between numeral bases 2-36 (keyless, offline). E.g. number "ff" from_base 16 to_base 2 -> "11111111".',
    inputSchema: {
      type: 'object',
      properties: {
        number: { type: 'string', description: 'The number as a string in `from_base`.' },
        from_base: { type: 'number', description: 'Source base 2-36.' },
        to_base: { type: 'number', description: 'Target base 2-36.' },
      },
      required: ['number', 'from_base', 'to_base'],
    },
  },
  {
    name: 'to_roman',
    description: 'Convert an integer (1-3999) to Roman numerals.',
    inputSchema: { type: 'object', properties: { number: { type: 'number', description: 'An integer 1-3999.' } }, required: ['number'] },
  },
  {
    name: 'from_roman',
    description: 'Convert a Roman numeral to an integer (rejects malformed numerals).',
    inputSchema: { type: 'object', properties: { roman: { type: 'string', description: 'A Roman numeral, e.g. "MCMXCIV".' } }, required: ['roman'] },
  },
  {
    name: 'number_to_words',
    description: 'Spell an integer in English words, e.g. 1234 -> "one thousand two hundred thirty-four".',
    inputSchema: { type: 'object', properties: { number: { type: 'number', description: 'An integer.' } }, required: ['number'] },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'convert_base': {
      const numStr = reqStr(args, 'number', '"ff"').trim();
      const from = intArg(args, 'from_base'), to = intArg(args, 'to_base');
      if (from < 2 || from > 36 || to < 2 || to > 36) return { error: 'Bases must be between 2 and 36.' };
      const val = parseInt(numStr, from);
      if (Number.isNaN(val) || !new RegExp(`^-?[0-9a-z]+$`, 'i').test(numStr)) return { input: numStr, error: `"${numStr}" is not a valid base-${from} integer.` };
      return { input: numStr, from_base: from, to_base: to, decimal: val, result: val.toString(to) };
    }
    case 'to_roman': {
      const n = intArg(args, 'number');
      if (n < 1 || n > 3999) return { input: n, error: 'Roman numerals here cover 1-3999.' };
      return { input: n, roman: toRoman(n) };
    }
    case 'from_roman': {
      const r = reqStr(args, 'roman', '"MCMXCIV"');
      const n = fromRoman(r);
      return n === null ? { input: r, valid: false, reason: 'Not a valid Roman numeral.' } : { input: r, valid: true, number: n };
    }
    case 'number_to_words': {
      const n = intArg(args, 'number');
      return { input: n, words: toWords(n) };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function reqStr(args: Record<string, unknown>, key: string, ex: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing. Pass a string like ${ex}.`);
  return v;
}
function intArg(args: Record<string, unknown>, key: string): number {
  const v = args[key]; const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  if (!Number.isInteger(n)) throw new Error(`Required argument "${key}" must be an integer.`);
  return n;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
