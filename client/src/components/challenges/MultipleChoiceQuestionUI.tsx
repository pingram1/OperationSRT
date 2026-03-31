import { type MultipleChoiceQuestion } from '../../types/challengeQuestions';

type Props = {
  question: MultipleChoiceQuestion;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  showResult: boolean;
  isCorrect: boolean;
};

export function MultipleChoiceQuestionUI({
  question,
  value,
  onChange,
  disabled,
  showResult,
  isCorrect,
}: Props) {
  return (
    <div className="space-y-3">
      {question.options.map((option, index) => {
        const isCorrectOption = option === question.correctAnswer;
        const isSelected = value === option;
        let border = 'border-gray-200 hover:border-gray-300';
        if (showResult && isCorrectOption) {
          border = 'border-green-500 bg-green-50';
        } else if (showResult && isSelected && !isCorrect) {
          border = 'border-red-500 bg-red-50';
        } else if (isSelected) {
          border = 'border-blue-500 bg-blue-50';
        }
        return (
          <button
            key={index}
            type="button"
            onClick={() => !showResult && !disabled && onChange(option)}
            disabled={showResult || disabled}
            className={`w-full p-4 text-left rounded-lg border-2 transition-all ${border} ${
              showResult || disabled ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
