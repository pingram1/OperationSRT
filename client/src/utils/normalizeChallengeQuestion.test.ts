import { describe, it, expect } from 'vitest';
import { normalizeChallengeQuestion } from './normalizeChallengeQuestion';
import { QuestionType } from '../types/challengeQuestions';

describe('normalizeChallengeQuestion', () => {
  it('defaults legacy questions to multiple choice', () => {
    const q = normalizeChallengeQuestion(
      {
        question: 'Pick one',
        options: ['A', 'B'],
        correctAnswer: 'A',
      },
      0
    );
    expect(q.type).toBe(QuestionType.MultipleChoice);
    if (q.type === QuestionType.MultipleChoice) {
      expect(q.options).toEqual(['A', 'B']);
      expect(q.correctAnswer).toBe('A');
    }
  });

  it('normalizes true_false', () => {
    const q = normalizeChallengeQuestion(
      {
        question: 'The sky is blue.',
        questionType: 'true_false',
        correctAnswer: false,
      },
      0
    );
    expect(q.type).toBe(QuestionType.TrueFalse);
    if (q.type === QuestionType.TrueFalse) {
      expect(q.correctAnswer).toBe(false);
    }
  });

  it('normalizes matching pairs with stable ids', () => {
    const q = normalizeChallengeQuestion(
      {
        question: 'Match',
        questionType: 'matching',
        matchingPairs: [
          { left: 'Cat', right: 'Meow' },
          { left: 'Dog', right: 'Bark' },
        ],
      },
      0
    );
    expect(q.type).toBe(QuestionType.Matching);
    if (q.type === QuestionType.Matching) {
      expect(q.correctMap).toEqual({ L0: 'R0', L1: 'R1' });
      expect(q.pairs[0].leftLabel).toBe('Cat');
    }
  });

  it('normalizes error_detection sentence', () => {
    const q = normalizeChallengeQuestion(
      {
        question: 'Find the error',
        questionType: 'error_detection',
        errorSentence: 'one two three',
        errorWordIndex: 1,
      },
      0
    );
    expect(q.type).toBe(QuestionType.ErrorDetection);
    if (q.type === QuestionType.ErrorDetection) {
      expect(q.words).toEqual(['one', 'two', 'three']);
      expect(q.errorWordIndex).toBe(1);
    }
  });
});
