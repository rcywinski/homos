/**
 * Argument validation for the agent tools (step 2.1; enums and numeric ranges added in step 2.3 for run_backtest). The
 * tool schemas use a small subset of JSON Schema: an object with string (optionally from an enum), string-array,
 * integer or number properties, required names and no additional properties. Anything outside the schema is rejected
 * with a message the model can read; nothing is coerced.
 */

export interface StringProp {
  type: 'string';
  description: string;
  minLength?: number;
  maxLength: number;
  enum?: string[];
}

export interface NumberProp {
  type: 'integer' | 'number';
  description: string;
  minimum: number;
  maximum: number;
}

export interface StringArrayProp {
  type: 'array';
  description: string;
  items: { type: 'string'; maxLength: number };
  maxItems: number;
}

export interface ObjectSchema {
  type: 'object';
  properties: Record<string, StringProp | StringArrayProp | NumberProp>;
  required: string[];
  additionalProperties: false;
}

export type Validated = { ok: true; value: Record<string, unknown> } | { ok: false; error: string };

const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

export function validateArgs(schema: ObjectSchema, args: unknown): Validated {
  if (typeof args !== 'object' || args === null || Array.isArray(args)) return { ok: false, error: 'arguments must be a JSON object' };
  const a = args as Record<string, unknown>;
  for (const k of Object.keys(a)) if (!own(schema.properties, k)) return { ok: false, error: `unexpected argument "${k}"; allowed: ${Object.keys(schema.properties).join(', ') || 'none'}` };
  for (const k of schema.required) if (!own(a, k)) return { ok: false, error: `missing required argument "${k}"` };
  for (const [k, p] of Object.entries(schema.properties)) {
    if (!own(a, k)) continue;
    const v = a[k];
    if (p.type === 'string') {
      if (typeof v !== 'string') return { ok: false, error: `argument "${k}" must be a string` };
      if (v.length < (p.minLength ?? 0)) return { ok: false, error: `argument "${k}" must have at least ${p.minLength} characters` };
      if (v.length > p.maxLength) return { ok: false, error: `argument "${k}" is longer than ${p.maxLength} characters` };
      if (p.enum && !p.enum.includes(v)) return { ok: false, error: `argument "${k}" must be one of: ${p.enum.join(', ')}` };
    } else if (p.type === 'array') {
      if (!Array.isArray(v)) return { ok: false, error: `argument "${k}" must be an array of strings` };
      if (v.length > p.maxItems) return { ok: false, error: `argument "${k}" has more than ${p.maxItems} items` };
      for (const x of v) {
        if (typeof x !== 'string') return { ok: false, error: `argument "${k}" must contain only strings` };
        if (x.length > p.items.maxLength) return { ok: false, error: `an item of "${k}" is longer than ${p.items.maxLength} characters` };
      }
    } else {
      if (typeof v !== 'number' || !Number.isFinite(v)) return { ok: false, error: `argument "${k}" must be a number` };
      if (p.type === 'integer' && !Number.isInteger(v)) return { ok: false, error: `argument "${k}" must be a whole number` };
      if (v < p.minimum || v > p.maximum) return { ok: false, error: `argument "${k}" must be between ${p.minimum} and ${p.maximum}` };
    }
  }
  return { ok: true, value: a };
}
