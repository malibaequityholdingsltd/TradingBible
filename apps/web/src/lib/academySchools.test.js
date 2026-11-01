import { describe, expect, it } from 'vitest';
import { PATHS, SCHOOLS } from './academyCatalog';

describe('Academy 2.0 schools', () => {
  it('places every programme in exactly one school', () => {
    const assigned = SCHOOLS.flatMap((school) => school.pathKeys);
    expect(new Set(assigned).size).toBe(assigned.length);
    expect([...assigned].sort()).toEqual(PATHS.map((path) => path.key).sort());
  });

  it('keeps the four-school catalogue stable', () => {
    expect(SCHOOLS).toHaveLength(4);
    expect(PATHS).toHaveLength(13);
  });
});
