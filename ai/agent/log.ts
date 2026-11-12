/**
 * Run log of the agent (step 2.2): one JSONL file per question in ai/agent/logs/ (gitignored). Every model turn, every
 * tool call with its arguments, full result, size, time and the cost of model calls inside it, and the final answer
 * with its verification, so a run can be read back step by step.
 */
import { appendFileSync, mkdirSync } from 'fs';
import path from 'path';

export const LOG_DIR = 'ai/agent/logs';

export interface EventSink {
  write(event: Record<string, unknown>): void;
}

export class JsonlLog implements EventSink {
  readonly file: string;

  constructor(question: string, root = process.cwd(), now = new Date()) {
    const slug = question.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'question';
    const dir = path.join(root, LOG_DIR);
    mkdirSync(dir, { recursive: true });
    this.file = path.join(dir, `${now.toISOString().replace(/[:.]/g, '-').slice(0, 19)}-${slug}.jsonl`);
  }

  write(event: Record<string, unknown>): void {
    appendFileSync(this.file, JSON.stringify({ t: new Date().toISOString(), ...event }) + '\n');
  }
}

export const nullLog: EventSink = { write: () => undefined };
