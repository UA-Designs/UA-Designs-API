const { authorize, authorizeOwnerOr } = require('../../../src/middleware/authorize');

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(role) {
  return { user: { id: 'user-1', role } };
}

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// ── authorize() ───────────────────────────────────────────────────────────────

describe('authorize() — named access level', () => {
  it('throws at call-time with an unknown level name', () => {
    expect(() => authorize('UNKNOWN_LEVEL')).toThrow(/Unknown access level/);
  });

  describe('ADMIN_ONLY', () => {
    const mw = authorize('ADMIN_ONLY');

    it('allows ADMIN', () => {
      const req = makeReq('ADMIN');
      const res = makeRes();
      const next = jest.fn();
      mw(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it.each(['PROJECT_MANAGER', 'ENGINEER', 'STAFF'])(
      'blocks %s with 403',
      (role) => {
        const req = makeReq(role);
        const res = makeRes();
        const next = jest.fn();
        mw(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
      }
    );
  });

  describe('MANAGER_AND_ABOVE', () => {
    const mw = authorize('MANAGER_AND_ABOVE');

    it.each(['ADMIN', 'PROJECT_MANAGER'])('allows %s', (role) => {
      const req = makeReq(role);
      const res = makeRes();
      const next = jest.fn();
      mw(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it.each(['ENGINEER', 'STAFF'])(
      'blocks %s with 403',
      (role) => {
        const req = makeReq(role);
        const res = makeRes();
        const next = jest.fn();
        mw(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
      }
    );
  });

  describe('ENGINEER_AND_ABOVE', () => {
    const mw = authorize('ENGINEER_AND_ABOVE');

    it.each(['ADMIN', 'PROJECT_MANAGER', 'ENGINEER'])(
      'allows %s',
      (role) => {
        const req = makeReq(role);
        const res = makeRes();
        const next = jest.fn();
        mw(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);
      }
    );

    it.each(['STAFF'])('blocks %s with 403', (role) => {
      const req = makeReq(role);
      const res = makeRes();
      const next = jest.fn();
      mw(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('ALL_ROLES', () => {
    const mw = authorize('ALL_ROLES');

    it.each(['ADMIN', 'PROJECT_MANAGER', 'ENGINEER', 'STAFF'])(
      'allows %s',
      (role) => {
        const req = makeReq(role);
        const res = makeRes();
        const next = jest.fn();
        mw(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);
      }
    );
  });

  it('returns 401 when req.user is missing', () => {
    const mw = authorize('MANAGER_AND_ABOVE');
    const req = {};
    const res = makeRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('authorize() — explicit role array', () => {
  it('accepts an explicit role array', () => {
    const mw = authorize(['ADMIN', 'STAFF']);
    const req = makeReq('STAFF');
    const res = makeRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('blocks roles not in the explicit array', () => {
    const mw = authorize(['ADMIN']);
    const req = makeReq('STAFF');
    const res = makeRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ── authorizeOwnerOr() ────────────────────────────────────────────────────────

describe('authorizeOwnerOr()', () => {
  it('allows access when user is the owner (any role)', async () => {
    const mw = authorizeOwnerOr('ADMIN_ONLY', () => Promise.resolve('user-1'));
    const req = makeReq('STAFF'); // STAFF would normally be blocked
    req.user.id = 'user-1';
    const res = makeRes();
    const next = jest.fn();
    await mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows access when user is not owner but has sufficient role', async () => {
    const mw = authorizeOwnerOr('MANAGER_AND_ABOVE', () => Promise.resolve('other-user'));
    const req = makeReq('ADMIN');
    req.user.id = 'user-1';
    const res = makeRes();
    const next = jest.fn();
    await mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('blocks access when user is not owner and role is insufficient', async () => {
    const mw = authorizeOwnerOr('MANAGER_AND_ABOVE', () => Promise.resolve('other-user'));
    const req = makeReq('ENGINEER');
    req.user.id = 'user-1';
    const res = makeRes();
    const next = jest.fn();
    await mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('falls through to role check when ownerFn throws', async () => {
    const mw = authorizeOwnerOr('MANAGER_AND_ABOVE', () => { throw new Error('DB error'); });
    const req = makeReq('PROJECT_MANAGER');
    req.user.id = 'user-1';
    const res = makeRes();
    const next = jest.fn();
    await mw(req, res, next);
    // PROJECT_MANAGER is in MANAGER_AND_ABOVE so should be allowed
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when req.user is missing', async () => {
    const mw = authorizeOwnerOr('MANAGER_AND_ABOVE', () => 'user-1');
    const req = {};
    const res = makeRes();
    const next = jest.fn();
    await mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
