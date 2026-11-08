import { describe, expect, it } from 'vitest';
import { PATHS, SCHOOLS, STATIC_CURRICULA } from './academyCatalog';

describe('Academy 2.0 schools', () => {
  it('places every programme in exactly one school', () => {
    const assigned = SCHOOLS.flatMap((school) => school.pathKeys);
    expect(new Set(assigned).size).toBe(assigned.length);
    expect([...assigned].sort()).toEqual(PATHS.map((path) => path.key).sort());
  });

  it('keeps the four-school catalogue stable', () => {
    expect(SCHOOLS).toHaveLength(4);
    expect(PATHS).toHaveLength(17);
    const courses = Object.values(STATIC_CURRICULA).reduce((n, path) => n + path.courses.length, 0);
    const lessons = Object.values(STATIC_CURRICULA).reduce(
      (n, path) => n + path.courses.reduce((m, course) => m + course.lessons.length, 0),
      0,
    );
    expect(courses).toBe(76);
    expect(lessons).toBe(347);
  });
});
