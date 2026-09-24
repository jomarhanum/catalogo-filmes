import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from './pool';

describe('mapWithConcurrency', () => {
  it('processa tudo sem passar do limite', async () => {
    let running = 0;
    let peak = 0;
    const done: number[] = [];
    await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      done.push(n);
      running--;
    });
    expect(done.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(peak).toBe(3);
  });

  it('rejeita quando uma tarefa falha', async () => {
    await expect(
      mapWithConcurrency([1, 2], 2, async (n) => {
        if (n === 2) throw new Error('falhou');
      }),
    ).rejects.toThrow('falhou');
  });
});
