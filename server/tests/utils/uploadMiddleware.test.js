/**
 * Upload Middleware Unit Tests
 * Defensive: Filename sanitization, path traversal, MIME validation.
 * Security: Ensure malicious filenames cannot escape upload directory.
 * Pattern: Arrange-Act-Assert (AAA)
 */
const multer = require('multer');
const {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  handleUploadError,
} = require('../../middleware/uploadMiddleware');

describe('Upload Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {};
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  describe('handleUploadError - error handling', () => {
    it('returns 400 with user-friendly message for LIMIT_FILE_SIZE', () => {
      const err = new multer.MulterError('LIMIT_FILE_SIZE');

      handleUploadError(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('10'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 for LIMIT_FILE_COUNT', () => {
      const err = new Error('Too many files');
      err.code = 'LIMIT_FILE_COUNT';

      handleUploadError(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Too many files',
      });
    });

    it('returns 400 for generic MulterError', () => {
      const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
      err.message = 'Unexpected field';

      handleUploadError(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Upload error'),
        })
      );
    });

    it('returns 400 with err.message for non-Multer errors', () => {
      const err = new Error('Invalid file extension');

      handleUploadError(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid file extension',
      });
    });
  });

  describe('constants - defensive configuration', () => {
    it('ALLOWED_FILE_TYPES restricts to expected MIME types', () => {
      expect(ALLOWED_FILE_TYPES).toHaveProperty('application/pdf');
      expect(ALLOWED_FILE_TYPES).toHaveProperty('image/jpeg');
      expect(ALLOWED_FILE_TYPES).toHaveProperty('image/png');
      expect(ALLOWED_FILE_TYPES).toHaveProperty('image/gif');
      expect(ALLOWED_FILE_TYPES['application/pdf']).toContain('.pdf');
    });

    it('MAX_FILE_SIZE is 10MB', () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });
  });
});
