const { checkAnswer } = require('../../utils/challengeAnswerCheck');

describe('checkAnswer', () => {
  describe('multiple_choice (default)', () => {
    it('matches correct option case-insensitively', () => {
      const q = { question: 'x', correctAnswer: 'Paris' };
      expect(checkAnswer(q, 'paris')).toBe(true);
      expect(checkAnswer(q, 'London')).toBe(false);
    });
  });

  describe('true_false', () => {
    it('compares booleans', () => {
      const q = { questionType: 'true_false', correctAnswer: true };
      expect(checkAnswer(q, true)).toBe(true);
      expect(checkAnswer(q, false)).toBe(false);
    });

    it('accepts string true/false from client', () => {
      const q = { questionType: 'true_false', correctAnswer: false };
      expect(checkAnswer(q, 'false')).toBe(true);
      expect(checkAnswer(q, 'true')).toBe(false);
    });
  });

  describe('fill_in_the_blank', () => {
    it('ignores case by default', () => {
      const q = {
        questionType: 'fill_in_the_blank',
        correctAnswer: 'ATP',
        caseSensitive: false,
      };
      expect(checkAnswer(q, 'atp')).toBe(true);
    });

    it('respects caseSensitive', () => {
      const q = {
        questionType: 'fill_in_the_blank',
        correctAnswer: 'ATP',
        caseSensitive: true,
      };
      expect(checkAnswer(q, 'atp')).toBe(false);
      expect(checkAnswer(q, 'ATP')).toBe(true);
    });
  });

  describe('matching', () => {
    it('requires full correct L/R map', () => {
      const q = {
        questionType: 'matching',
        matchingPairs: [
          { left: 'A', right: '1' },
          { left: 'B', right: '2' },
        ],
      };
      expect(checkAnswer(q, { L0: 'R0', L1: 'R1' })).toBe(true);
      expect(checkAnswer(q, { L0: 'R1', L1: 'R0' })).toBe(false);
      expect(checkAnswer(q, { L0: 'R0' })).toBe(false);
    });
  });

  describe('error_detection', () => {
    it('matches word index', () => {
      const q = {
        questionType: 'error_detection',
        errorWordIndex: 2,
      };
      expect(checkAnswer(q, 2)).toBe(true);
      expect(checkAnswer(q, '2')).toBe(true);
      expect(checkAnswer(q, 1)).toBe(false);
    });
  });
});
