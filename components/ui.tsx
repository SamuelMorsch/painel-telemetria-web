import type { ReactNode } from 'react';

export const card =
  'rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900';
export const input =
  'w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700';
export const btn =
  'rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50';
export const btnGhost =
  'rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800';

type Tone = 'green' | 'red' | 'gray' | 'blue' | 'amber';
const tones: Record<Tone, string> = {
  green: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  gray: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
  );
}

export function Stat({
  label,
  value,
  unit,
  alert = false,
}: {
  label: string;
  value: string;
  unit?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`${card} ${alert ? 'border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-950/40' : ''}`}
      role="group"
      aria-label={label}
    >
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${alert ? 'text-red-600 dark:text-red-400' : ''}`}>
        {value}
        {unit ? <span className="ml-1 text-sm font-normal text-neutral-500">{unit}</span> : null}
      </p>
    </div>
  );
}
