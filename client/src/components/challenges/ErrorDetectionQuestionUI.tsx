import { type ErrorDetectionQuestion } from '../../types/challengeQuestions';

type Props = {
  question: ErrorDetectionQuestion;
  value: number | undefined;
  onChange: (wordIndex: number) => void;
  disabled: boolean;
  showResult: boolean;
  isCorrect: boolean;
};

/**
 * Click the word that contains the error. Answer payload is the 0-based word index.
 */
export function ErrorDetectionQuestionUI({
  question,
  value,
  onChange,
  disabled,
  showResult,
  isCorrect,
}: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">Click the word that is incorrect or used wrongly.</p>
      <p className="text-lg leading-relaxed flex flex-wrap gap-x-1 gap-y-2">
        {question.words.map((word, index) => {
          const isSelected = value === index;
          const isErrorTarget = index === question.errorWordIndex;
          let cls =
            'px-1.5 py-0.5 rounded cursor-pointer transition-colors border-2 border-transparent';
          if (showResult) {
            if (isErrorTarget) {
              cls += ' border-green-500 bg-green-100 text-green-900';
            } else if (isSelected && !isCorrect) {
              cls += ' border-red-500 bg-red-100 text-red-900';
            } else {
              cls += ' text-gray-700';
            }
          } else if (isSelected) {
            cls += ' border-blue-500 bg-blue-50';
          } else if (!disabled) {
            cls += ' hover:bg-gray-100';
          } else {
            cls += ' opacity-60 cursor-not-allowed';
          }

          return (
            <button
              key={`${index}-${word}`}
              type="button"
              className={cls}
              disabled={disabled || showResult}
              onClick={() => !disabled && !showResult && onChange(index)}
            >
              {word}
            </button>
          );
        })}
      </p>
    </div>
  );
}
