import { describe, expect, it } from 'vitest';
import { slugifyStaffName, staffProfilePath, staffProfileSlug } from './staffSlug';

describe('staffSlug', () => {
  it('turns an employee name into a readable profile slug', () => {
    expect(slugifyStaffName('Malik Nlem')).toBe('malik-nlem');
    expect(slugifyStaffName('  Dr. Amara O’Connor  ')).toBe('dr-amara-oconnor');
    expect(slugifyStaffName('José & Sons')).toBe('jose-and-sons');
  });

  it('keeps a stored canonical slug ahead of the display name', () => {
    expect(staffProfileSlug({ name: 'Malik Nlem', profileSlug: 'malik-nlem' })).toBe('malik-nlem');
    expect(staffProfileSlug({ name: 'Malik Nlem' })).toBe('malik-nlem');
  });

  it('builds the public staff path from the name', () => {
    expect(staffProfilePath({ name: 'Malik Nlem' })).toBe('/staff/malik-nlem');
    expect(staffProfilePath({ name: '' })).toBe('');
  });
});
