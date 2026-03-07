const { ROLES, ACCESS_LEVELS } = require('../../../src/middleware/roles');

describe('ROLES constants', () => {
  const expectedRoles = ['ADMIN', 'PROJECT_MANAGER', 'ENGINEER', 'STAFF'];

  it('exports all expected role strings', () => {
    expectedRoles.forEach(role => {
      expect(ROLES[role]).toBe(role);
    });
  });

  it('has no extra keys beyond expected roles', () => {
    expect(Object.keys(ROLES).sort()).toEqual(expectedRoles.sort());
  });
});

describe('ACCESS_LEVELS', () => {
  it('ADMIN_ONLY contains only ADMIN', () => {
    expect(ACCESS_LEVELS.ADMIN_ONLY).toEqual(['ADMIN']);
  });

  it('MANAGER_AND_ABOVE contains ADMIN and PROJECT_MANAGER', () => {
    expect(ACCESS_LEVELS.MANAGER_AND_ABOVE).toEqual(
      expect.arrayContaining(['ADMIN', 'PROJECT_MANAGER'])
    );
    expect(ACCESS_LEVELS.MANAGER_AND_ABOVE).not.toContain('ENGINEER');
    expect(ACCESS_LEVELS.MANAGER_AND_ABOVE).not.toContain('STAFF');
  });

  it('ENGINEER_AND_ABOVE contains ADMIN, PROJECT_MANAGER, and ENGINEER', () => {
    const level = ACCESS_LEVELS.ENGINEER_AND_ABOVE;
    expect(level).toContain('ADMIN');
    expect(level).toContain('PROJECT_MANAGER');
    expect(level).toContain('ENGINEER');
    expect(level).not.toContain('STAFF');
  });

  it('ALL_ROLES contains every role', () => {
    const level = ACCESS_LEVELS.ALL_ROLES;
    Object.values(ROLES).forEach(role => {
      expect(level).toContain(role);
    });
  });

  it('levels are cumulative (ADMIN_ONLY ⊂ MANAGER ⊂ ENGINEER ⊂ ALL)', () => {
    ACCESS_LEVELS.ADMIN_ONLY.forEach(r =>
      expect(ACCESS_LEVELS.MANAGER_AND_ABOVE).toContain(r)
    );
    ACCESS_LEVELS.MANAGER_AND_ABOVE.forEach(r =>
      expect(ACCESS_LEVELS.ENGINEER_AND_ABOVE).toContain(r)
    );
    ACCESS_LEVELS.ENGINEER_AND_ABOVE.forEach(r =>
      expect(ACCESS_LEVELS.ALL_ROLES).toContain(r)
    );
  });
});
