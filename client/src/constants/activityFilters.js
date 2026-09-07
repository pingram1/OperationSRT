/**
 * Shared filter option lists for Challenges and Concept Visualizers.
 * Values align with backend Challenge / Visualizer schema enums.
 */
export const SUBJECT_OPTIONS = ['Math', 'Science', 'History', 'English', 'Computer Science'];
export const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard', 'Post-Grad'];
export const GRADE_OPTIONS = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'College', 'Independent Learner'];

export const EMPTY_ACTIVITY_FILTERS = Object.freeze({
    grade: '',
    subject: '',
    difficulty: '',
});

/**
 * Normalize a string for case-insensitive filter comparison.
 */
function norm(value) {
    return String(value ?? '').trim().toLowerCase();
}

/**
 * Client-side filter for activity lists. Always applied in the UI as a
 * safety net even when the API also filters server-side.
 */
export function matchesActivityFilters(item, filters) {
    if (filters.subject && norm(item.subject) !== norm(filters.subject)) {
        return false;
    }

    if (filters.difficulty && norm(item.difficulty) !== norm(filters.difficulty)) {
        return false;
    }

    if (filters.grade) {
        const grades = Array.isArray(item.gradeLevels) ? item.gradeLevels : [];
        const target = norm(filters.grade);
        const matchesGrade = grades.some((g) => norm(g) === target);
        if (!matchesGrade) return false;
    }

    return true;
}
