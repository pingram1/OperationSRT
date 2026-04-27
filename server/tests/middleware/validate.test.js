/**
 * Unit tests for middleware/validate.js
 *
 * Verifies that the canonical 400 envelope is emitted when express-validator
 * chains report errors, and that next() is called when nothing failed.
 */
const { body, param } = require('express-validator');
const { validateRequest } = require('../../middleware/validate');

const runChain = async (chain, req) => {
    for (const c of chain) {
        // express-validator chains expose .run(req)
        await c.run(req);
    }
};

const fakeRes = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('validateRequest middleware', () => {
    it('calls next() when no validators failed', async () => {
        const req = { body: { email: 'alice@example.com' }, params: {}, query: {} };
        const res = fakeRes();
        const next = vi.fn();

        await runChain([
            body('email').isString().isEmail(),
        ], req);

        validateRequest(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it('returns the canonical 400 envelope when validators failed', async () => {
        const req = { body: { email: 'not-an-email' }, params: {}, query: {} };
        const res = fakeRes();
        const next = vi.fn();

        await runChain([
            body('email').isEmail().withMessage('email must be a valid email address'),
        ], req);

        validateRequest(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        const body0 = res.json.mock.calls[0][0];
        expect(body0).toMatchObject({
            success: false,
            message: 'Invalid request',
            code: 'INVALID_INPUT',
        });
        expect(Array.isArray(body0.errors)).toBe(true);
        expect(body0.errors[0]).toMatchObject({
            path: 'email',
            msg: 'email must be a valid email address',
        });
    });

    it('reports only the first error per field', async () => {
        const req = { body: { name: '' }, params: {}, query: {} };
        const res = fakeRes();
        const next = vi.fn();

        await runChain([
            body('name')
                .isString().withMessage('name must be a string')
                .isLength({ min: 1 }).withMessage('name must be 1+ chars')
                .isLength({ max: 100 }).withMessage('name too long'),
        ], req);

        validateRequest(req, res, next);

        const body0 = res.json.mock.calls[0][0];
        // express-validator deduplicates per-field; we set onlyFirstError true.
        const nameEntries = body0.errors.filter((e) => e.path === 'name');
        expect(nameEntries).toHaveLength(1);
    });

    it('does NOT echo back the offending value (defense in depth for secrets)', async () => {
        const SECRET = 'CorrectHorseBatteryStaple';
        const req = { body: { password: SECRET }, params: {}, query: {} };
        const res = fakeRes();
        const next = vi.fn();

        await runChain([
            // Forces a failure (length=25 > max=8) regardless of contents.
            body('password').isLength({ max: 8 }).withMessage('password is too long'),
        ], req);

        validateRequest(req, res, next);

        const body0 = res.json.mock.calls[0][0];
        // The serialized response must not contain the literal password value.
        expect(JSON.stringify(body0)).not.toContain(SECRET);
    });

    it('honors param() validators too', async () => {
        const req = { params: { id: 'not-an-objectid' }, body: {}, query: {} };
        const res = fakeRes();
        const next = vi.fn();

        await runChain([
            param('id').matches(/^[a-fA-F0-9]{24}$/).withMessage('id must be a valid ObjectId'),
        ], req);

        validateRequest(req, res, next);

        const body0 = res.json.mock.calls[0][0];
        expect(body0.errors[0]).toMatchObject({
            path: 'id',
            msg: 'id must be a valid ObjectId',
        });
    });
});
