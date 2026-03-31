import { QuestionType, type Question, type ChallengeAnswerPayload } from '../types/challengeQuestions';

/**
 * True when the user has not provided an answer yet (submit should stay disabled).
 */
export function isAnswerIncomplete(
  question: Question,
  value: ChallengeAnswerPayload | undefined
): boolean {
  if (value === undefined) return true;

  switch (question.type) {
    case QuestionType.MultipleChoice:
      return typeof value !== 'string' || value.trim() === '';
    case QuestionType.TrueFalse:
      return typeof value !== 'boolean';
    case QuestionType.FillInTheBlank:
      return typeof value !== 'string' || value.trim() === '';
    case QuestionType.Matching: {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return true;
      const map = value as Record<string, string>;
      return question.pairs.some((p) => !map[p.leftId]?.trim());
    }
    case QuestionType.ErrorDetection:
      return typeof value !== 'number' || Number.isNaN(value);
    default:
      return true;
  }
}
