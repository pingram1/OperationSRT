import { useMemo } from 'react';
import { type MatchingQuestion } from '../../types/challengeQuestions';

type Props = {
  question: MatchingQuestion;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  disabled: boolean;
  showResult: boolean;
  isCorrect: boolean;
};

/**
 * MVP: each left item has a dropdown of right options. Selections stored as leftId -> rightId.
 */
export function MatchingQuestionUI({
  question,
  value,
  onChange,
  disabled,
  showResult,
  isCorrect,
}: Props) {
  const rightOptions = useMemo(
    () => question.pairs.map((p) => ({ id: p.rightId, label: p.rightLabel })),
    [question.pairs]
  );

  const updatePair = (leftId: string, rightId: string) => {
    onChange({ ...value, [leftId]: rightId });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Match each item on the left with the correct choice on the right.
      </p>
      <div className="space-y-3">
        {question.pairs.map((p) => {
          const selected = value[p.leftId] ?? '';
          const expectedRight = question.correctMap[p.leftId];
          const rowCorrect = selected === expectedRight;
          return (
            <div
              key={p.leftId}
              className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border-2 ${
                showResult
                  ? rowCorrect
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="sm:w-2/5 font-medium text-gray-900">{p.leftLabel}</div>
              <select
                value={selected}
                onChange={(e) => updatePair(p.leftId, e.target.value)}
                disabled={disabled || showResult}
                className="sm:flex-1 w-full p-3 border-2 rounded-lg border-gray-200 bg-white disabled:opacity-70"
                aria-label={`Match for ${p.leftLabel}`}
              >
                <option value="">Select…</option>
                {rightOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
      {showResult && (
        <p className={`text-sm font-medium ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
          {isCorrect ? 'All pairs matched correctly.' : 'Review the highlighted rows for incorrect pairs.'}
        </p>
      )}
    </div>
  );
}
