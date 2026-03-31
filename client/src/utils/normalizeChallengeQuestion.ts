import {
  QuestionType,
  type ApiChallengeQuestion,
  type Question,
  type MatchingPair,
} from '../types/challengeQuestions';

const DEFAULT_BLANK = '{{blank}}';

function asType(raw: ApiChallengeQuestion): QuestionType {
  const t = raw.questionType;
  if (t && Object.values(QuestionType).includes(t as QuestionType)) {
    return t as QuestionType;
  }
  return QuestionType.MultipleChoice;
}

export function normalizeChallengeQuestion(
  raw: ApiChallengeQuestion,
  index: number
): Question {
  const id = raw._id?.toString() ?? `q-${index}`;
  const text = raw.question?.trim() ?? '';
  const points = raw.points ?? 1;
  const explanation = raw.explanation;

  const type = asType(raw);

  switch (type) {
    case QuestionType.TrueFalse: {
      let correct: boolean;
      if (typeof raw.correctAnswer === 'boolean') {
        correct = raw.correctAnswer;
      } else if (raw.correctAnswer === 'true' || raw.correctAnswer === 'True') {
        correct = true;
      } else if (raw.correctAnswer === 'false' || raw.correctAnswer === 'False') {
        correct = false;
      } else {
        correct = Boolean(raw.correctAnswer);
      }
      return {
        id,
        text,
        points,
        type: QuestionType.TrueFalse,
        explanation,
        correctAnswer: correct,
      };
    }

    case QuestionType.FillInTheBlank: {
      const template = (raw.fillTemplate ?? text).trim();
      const correct =
        typeof raw.correctAnswer === 'string'
          ? raw.correctAnswer
          : String(raw.correctAnswer ?? '');
      return {
        id,
        text,
        points,
        type: QuestionType.FillInTheBlank,
        explanation,
        template,
        blankToken: DEFAULT_BLANK,
        correctAnswer: correct,
        caseSensitive: raw.caseSensitive ?? false,
      };
    }

    case QuestionType.Matching: {
      const rows = raw.matchingPairs ?? [];
      const pairs: MatchingPair[] = rows.map((p, i) => ({
        leftId: `L${i}`,
        leftLabel: p.left,
        rightId: `R${i}`,
        rightLabel: p.right,
      }));
      const correctMap: Record<string, string> = {};
      pairs.forEach((p) => {
        correctMap[p.leftId] = p.rightId;
      });
      return {
        id,
        text,
        points,
        type: QuestionType.Matching,
        explanation,
        pairs,
        correctMap,
      };
    }

    case QuestionType.ErrorDetection: {
      const sentence = (raw.errorSentence ?? text).trim();
      const words = sentence.split(/\s+/).filter(Boolean);
      const errorWordIndex =
        typeof raw.errorWordIndex === 'number' && raw.errorWordIndex >= 0
          ? Math.min(raw.errorWordIndex, Math.max(0, words.length - 1))
          : 0;
      return {
        id,
        text,
        points,
        type: QuestionType.ErrorDetection,
        explanation,
        sentence,
        words,
        errorWordIndex,
      };
    }

    case QuestionType.MultipleChoice:
    default: {
      const options = Array.isArray(raw.options) ? raw.options : [];
      const correct =
        typeof raw.correctAnswer === 'string'
          ? raw.correctAnswer
          : raw.correctAnswer != null
            ? String(raw.correctAnswer)
            : '';
      return {
        id,
        text,
        points,
        type: QuestionType.MultipleChoice,
        explanation,
        options,
        correctAnswer: correct,
      };
    }
  }
}
