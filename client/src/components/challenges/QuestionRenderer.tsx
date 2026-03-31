import { QuestionType, type Question, type ChallengeAnswerPayload } from '../../types/challengeQuestions';
import { MultipleChoiceQuestionUI } from './MultipleChoiceQuestionUI';
import { TrueFalseQuestionUI } from './TrueFalseQuestionUI';
import { FillInTheBlankQuestionUI } from './FillInTheBlankQuestionUI';
import { MatchingQuestionUI } from './MatchingQuestionUI';
import { ErrorDetectionQuestionUI } from './ErrorDetectionQuestionUI';

export type QuestionRendererProps = {
  question: Question;
  value: ChallengeAnswerPayload | undefined;
  onChange: (next: ChallengeAnswerPayload) => void;
  disabled: boolean;
  showResult: boolean;
  isCorrect: boolean;
};

export function QuestionRenderer({
  question,
  value,
  onChange,
  disabled,
  showResult,
  isCorrect,
}: QuestionRendererProps) {
  switch (question.type) {
    case QuestionType.MultipleChoice:
      return (
        <MultipleChoiceQuestionUI
          question={question}
          value={typeof value === 'string' ? value : ''}
          onChange={(v) => onChange(v)}
          disabled={disabled}
          showResult={showResult}
          isCorrect={isCorrect}
        />
      );
    case QuestionType.TrueFalse:
      return (
        <TrueFalseQuestionUI
          question={question}
          value={typeof value === 'boolean' ? value : undefined}
          onChange={(v) => onChange(v)}
          disabled={disabled}
          showResult={showResult}
          isCorrect={isCorrect}
        />
      );
    case QuestionType.FillInTheBlank:
      return (
        <FillInTheBlankQuestionUI
          question={question}
          value={typeof value === 'string' ? value : ''}
          onChange={(v) => onChange(v)}
          disabled={disabled}
          showResult={showResult}
          isCorrect={isCorrect}
        />
      );
    case QuestionType.Matching:
      return (
        <MatchingQuestionUI
          question={question}
          value={typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, string>) : {}}
          onChange={(v) => onChange(v)}
          disabled={disabled}
          showResult={showResult}
          isCorrect={isCorrect}
        />
      );
    case QuestionType.ErrorDetection:
      return (
        <ErrorDetectionQuestionUI
          question={question}
          value={typeof value === 'number' ? value : undefined}
          onChange={(v) => onChange(v)}
          disabled={disabled}
          showResult={showResult}
          isCorrect={isCorrect}
        />
      );
    default:
      return assertNever(question);
  }
}

function assertNever(x: never): null {
  console.error('Unknown question type', x);
  return null;
}
