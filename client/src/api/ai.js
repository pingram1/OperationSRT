import { apiRequest } from './apiService';

/**
 * Generates a study plan using AI
 * @param {object} planData - Data for study plan generation
 * @returns {Promise<object>} Generated study plan
 */
export const generateStudyPlan = (planData) =>
  apiRequest('/api/ai/study-plan', {
    method: 'POST',
    body: JSON.stringify(planData),
  });

/**
 * Generates practice questions using AI
 * @param {object} questionData - Data for question generation
 * @returns {Promise<object>} Generated practice questions
 */
export const generatePracticeQuestions = (questionData) =>
  apiRequest('/api/ai/practice-questions', {
    method: 'POST',
    body: JSON.stringify(questionData),
  });
