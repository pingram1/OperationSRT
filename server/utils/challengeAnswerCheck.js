/**
 * Grade a single challenge question (shared by challengeController and tests).
 * @param {object} question - Mongo question subdocument
 * @param {unknown} userAnswer - Submitted answer (shape depends on questionType)
 * @returns {boolean}
 */
function checkAnswer(question, userAnswer) {
  const qt = question.questionType || 'multiple_choice';
  const correct = question.correctAnswer;

  if (qt === 'true_false') {
    const expected = typeof correct === 'boolean'
      ? correct
      : String(correct).toLowerCase() === 'true';
    if (typeof userAnswer === 'boolean') return userAnswer === expected;
    if (typeof userAnswer === 'string') {
      const u = userAnswer.toLowerCase().trim();
      if (u === 'true') return expected === true;
      if (u === 'false') return expected === false;
    }
    return false;
  }

  if (qt === 'fill_in_the_blank') {
    if (typeof userAnswer !== 'string') return false;
    const exp = typeof correct === 'string' ? correct : String(correct ?? '');
    const caseSensitive = question.caseSensitive === true;
    const u = userAnswer.trim();
    const e = exp.trim();
    if (caseSensitive) return u === e;
    return u.toLowerCase() === e.toLowerCase();
  }

  if (qt === 'matching') {
    const pairs = question.matchingPairs;
    if (!Array.isArray(pairs) || pairs.length === 0) return false;
    if (typeof userAnswer !== 'object' || userAnswer === null || Array.isArray(userAnswer)) {
      return false;
    }
    const correctMap = {};
    pairs.forEach((p, i) => {
      correctMap[`L${i}`] = `R${i}`;
    });
    const keys = Object.keys(correctMap);
    if (keys.length !== Object.keys(userAnswer).length) return false;
    return keys.every((k) => userAnswer[k] === correctMap[k]);
  }

  if (qt === 'error_detection') {
    const idx = typeof question.errorWordIndex === 'number' ? question.errorWordIndex : 0;
    if (typeof userAnswer === 'number') return userAnswer === idx;
    if (typeof userAnswer === 'string' && /^\d+$/.test(userAnswer)) {
      return Number.parseInt(userAnswer, 10) === idx;
    }
    return false;
  }

  if (Array.isArray(correct)) {
    return Array.isArray(userAnswer)
      ? JSON.stringify(correct.sort()) === JSON.stringify(userAnswer.sort())
      : false;
  }

  if (typeof correct === 'string' && typeof userAnswer === 'string') {
    return correct.toLowerCase().trim() === userAnswer.toLowerCase().trim();
  }

  return correct === userAnswer;
}

module.exports = { checkAnswer };
