import { type TrueFalseQuestion } from '../../types/challengeQuestions';

type Props = {
  question: TrueFalseQuestion;
  value: boolean | undefined;
  onChange: (v: boolean) => void;
  disabled: boolean;
  showResult: boolean;
  isCorrect: boolean;
};

export function TrueFalseQuestionUI({
  question,
  value,
  onChange,
  disabled,
  showResult,
  isCorrect,
}: Props) {
  const choices: { label: string; val: boolean }[] = [
    { label: 'True', val: true },
    { label: 'False', val: false },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {choices.map(({ label, val }) => {
        const isCorrectOption = val === question.correctAnswer;
        const isSelected = value === val;
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
            key={label}
            type="button"
            onClick={() => !showResult && !disabled && onChange(val)}
            disabled={showResult || disabled}
            className={`p-6 rounded-lg border-2 text-lg font-semibold transition-all ${border} ${
              showResult || disabled ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
