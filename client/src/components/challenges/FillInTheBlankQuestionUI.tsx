import { type FillInTheBlankQuestion } from '../../types/challengeQuestions';

type Props = {
  question: FillInTheBlankQuestion;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  showResult: boolean;
  isCorrect: boolean;
};

/**
 * Renders template around a single blank (token default `{{blank}}`).
 * If the token is missing, shows the stem as a heading and a single input below.
 */
export function FillInTheBlankQuestionUI({
  question,
  value,
  onChange,
  disabled,
  showResult,
  isCorrect,
}: Props) {
  const token = question.blankToken;
  const hasToken = question.template.includes(token);
  const parts = hasToken ? question.template.split(token) : null;

  const inputClass = `min-w-[8rem] flex-1 px-3 py-2 border-2 rounded-lg text-center font-medium ${
    showResult
      ? isCorrect
        ? 'border-green-500 bg-green-50'
        : 'border-red-500 bg-red-50'
      : 'border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
  }`;

  if (parts && parts.length >= 2) {
    return (
      <div
        className={`text-lg leading-relaxed flex flex-wrap items-center gap-2 ${
          showResult || disabled ? 'opacity-95' : ''
        }`}
      >
        <span>{parts[0]}</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || showResult}
          placeholder="?"
          className={inputClass}
          aria-label="Fill in the blank"
        />
        <span>{parts.slice(1).join(token)}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-gray-700">{question.template}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || showResult}
        placeholder="Your answer"
        className={`w-full p-4 border-2 rounded-lg ${inputClass}`}
        aria-label="Fill in the blank"
      />
    </div>
  );
}
