/**
 * Learning Style Matching System
 * Converted from Python to JavaScript
 * Matches tutors with students based on learning style compatibility,
 * subject expertise, and teaching approach alignment
 */

/** Synonym map for pedagogical terms (Phase 6) */
const PEDAGOGICAL_SYNONYMS = {
    'Visual Learning Support': ['Visual Aids', 'Diagrams', 'Visual Explanations', 'Visual Learning'],
    'Practice Opportunities': ['Practice', 'Drills', 'Exercises', 'Practice Problems'],
    'Structured Learning': ['Structure', 'Organized Learning', 'Step-by-Step'],
    'Flexible Approach': ['Flexibility', 'Adaptive', 'Flexible Teaching'],
    'Clear Explanations': ['Clear Explanations', 'Explains Clearly', 'Clarity'],
    'Patient Teaching': ['Patient', 'Patience', 'Patient Approach'],
    'Adaptive Teaching': ['Adaptive', 'Adapts to Student', 'Adaptive Teaching'],
    'Independent Learning': ['Independent Learning', 'Encourages Independence', 'Self-Directed'],
};

/** Levenshtein distance for fuzzy string matching */
function levenshteinDistance(a, b) {
    if (!a || !b) return Math.max((a || '').length, (b || '').length);
    const m = a.length, n = b.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[m][n];
}

function stringSimilarity(a, b) {
    if (!a || !b) return 0;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return 1 - levenshteinDistance(a, b) / maxLen;
}

/**
 * LearningStyleProfile class - represents a user's learning/teaching style profile
 */
class LearningStyleProfile {
    constructor(name, userData = {}) {
        this.name = name;
        // Each dimension is scored 0-10
        this.dimensions = {
            visual_verbal: userData.visual_verbal || 5,      // 0 = highly visual, 10 = highly verbal
            sequential_global: userData.sequential_global || 5, // 0 = very sequential, 10 = very global
            active_reflective: userData.active_reflective || 5, // 0 = very active, 10 = very reflective
            structured_flexible: userData.structured_flexible || 5 // 0 = highly structured, 10 = highly flexible
        };
        this.teachingStrengths = userData.teachingStrengths || []; // For tutors only
        this.learningNeeds = userData.learningNeeds || [];          // For students only
        this.subjectsOfInterest = userData.subjectsOfInterest || []; // For students: subjects they want to study
        this.subjectExpertise = userData.subjectExpertise || {};    // Dictionary of subject: proficiency_level
    }
}

/**
 * LearningStyleMatcher class - handles matching logic
 */
class LearningStyleMatcher {
    constructor(compatibilityThreshold = 0.5, weights = null) {
        this.tutors = [];
        this.compatibilityThreshold = compatibilityThreshold; // Lower default threshold (50%) to show more matches
        this.weights = weights || {
            styleCompatibility: 0.4,
            subjectMatch: 0.3,
            teachingAlignment: 0.3
        };
    }

    /**
     * Creates a learning style profile based on assessment answers
     * @param {Object} answers - Assessment answers from user
     * @returns {LearningStyleProfile} - Created profile
     */
    assessLearningStyle(answers) {
        const profile = new LearningStyleProfile(answers.name || 'User');

        // Process visual vs verbal preference
        const visualIndicators = [
            answers.prefers_diagrams,
            answers.remembers_pictures,
            answers.enjoys_visual_aids
        ];
        profile.dimensions.visual_verbal = this._calculateDimensionScore(visualIndicators);

        // Process sequential vs global thinking
        const sequentialIndicators = [
            answers.likes_step_by_step,
            answers.prefers_ordered_learning,
            answers.follows_procedures
        ];
        profile.dimensions.sequential_global = this._calculateDimensionScore(sequentialIndicators);

        // Process active vs reflective (if provided)
        if (answers.active_reflective_indicators) {
            profile.dimensions.active_reflective = this._calculateDimensionScore(answers.active_reflective_indicators);
        }

        // Process structured vs flexible (if provided)
        if (answers.structured_flexible_indicators) {
            profile.dimensions.structured_flexible = this._calculateDimensionScore(answers.structured_flexible_indicators);
        }

        // Additional processing for teaching style (tutors only)
        if (answers.is_tutor) {
            profile.teachingStrengths = this._assessTeachingStrengths(answers);
            profile.subjectExpertise = this._assessSubjectExpertise(answers);
        } else {
            // For students
            profile.learningNeeds = this._assessLearningNeeds(answers);
        }

        return profile;
    }

    /**
     * Finds the best tutor matches for a student
     * @param {LearningStyleProfile} student - Student's learning profile
     * @param {Array<LearningStyleProfile>} availableTutors - List of available tutors
     * @param {string} subject - Optional subject filter
     * @param {Object} options - Optional: preferredDays, preferredTimeRange, systemSchedule, tutorHistoricalScores
     * @returns {Array<{tutor: LearningStyleProfile, score: number, explanation: string, breakdown: object, lowConfidence?: boolean}>} - Sorted matches
     */
    findOptimalMatches(student, availableTutors, subject = null, options = {}) {
        const {
            preferredDays,
            preferredTimeRange,
            systemSchedule,
            tutorHistoricalScores
        } = options;

        const useAvailability = preferredDays && preferredDays.length > 0 && preferredTimeRange && systemSchedule;
        const useHistorical = tutorHistoricalScores && Object.keys(tutorHistoricalScores).length > 0;

        // Build effective weights: base 3 components, optionally + availability (10%), + historical (10%)
        const w = this.weights;
        let scale = 1;
        if (useAvailability) scale *= 0.9;
        if (useHistorical) scale *= 0.9;
        const effectiveWeights = {
            styleCompatibility: w.styleCompatibility * scale,
            subjectMatch: w.subjectMatch * scale,
            teachingAlignment: w.teachingAlignment * scale,
            availability: useAvailability ? 0.1 : 0,
            historicalPerformance: useHistorical ? 0.1 : 0
        };

        const matches = [];

        for (const tutor of availableTutors) {
            // Filter by subject if specified (check both subjectExpertise and tutorInfo.subjects)
            if (subject) {
                const hasSubject = tutor.subjectExpertise[subject] !== undefined ||
                    (tutor.userData?.tutorInfo?.subjects && tutor.userData.tutorInfo.subjects.includes(subject));
                if (!hasSubject) continue;
            }

            // Calculate base compatibility score
            const styleCompatibility = this._calculateStyleCompatibility(student, tutor);

            // Weight subject expertise (use subjectsOfInterest; fallback to requested subject if empty)
            const subjectsForMatch = (student.subjectsOfInterest && student.subjectsOfInterest.length > 0)
                ? student.subjectsOfInterest
                : (subject ? [subject] : []);
            const subjectMatch = this._calculateSubjectMatch(subjectsForMatch, tutor.subjectExpertise, subject);

            // Calculate teaching strength alignment (with synonyms + fuzzy match)
            const teachingAlignment = this._assessTeachingAlignment(student, tutor);

            // Availability overlap (Phase 5)
            let availabilityScore = 0.5;
            if (useAvailability) {
                availabilityScore = this._calculateAvailabilityScore(tutor, preferredDays, preferredTimeRange, systemSchedule);
            }

            // Historical performance (Phase 7)
            let historicalScore = 0.5;
            if (useHistorical && tutor.userData?._id) {
                const tid = String(tutor.userData._id);
                historicalScore = tutorHistoricalScores[tid] != null ? tutorHistoricalScores[tid] : 0.5;
            }

            // Combined weighted score
            let finalScore = (
                styleCompatibility * effectiveWeights.styleCompatibility +
                subjectMatch * effectiveWeights.subjectMatch +
                teachingAlignment * effectiveWeights.teachingAlignment +
                availabilityScore * effectiveWeights.availability +
                historicalScore * effectiveWeights.historicalPerformance
            );

            // Profile completeness confidence multiplier (Phase 8)
            const studentCompleteness = this._getProfileCompleteness(student, true);
            const tutorCompleteness = this._getProfileCompleteness(tutor, false);
            const confidence = Math.min(studentCompleteness, tutorCompleteness);
            finalScore *= confidence;
            const lowConfidence = confidence < 0.5;

            if (finalScore >= this.compatibilityThreshold) {
                const explanation = this.generateMatchingExplanation(student, tutor, finalScore);
                const breakdown = {
                    styleCompatibility,
                    subjectMatch,
                    teachingAlignment
                };
                if (useAvailability) breakdown.availability = availabilityScore;
                if (useHistorical) breakdown.historicalPerformance = historicalScore;

                matches.push({
                    tutor,
                    score: finalScore,
                    explanation,
                    breakdown,
                    lowConfidence: lowConfidence || undefined
                });
            }
        }

        // Sort by compatibility score (descending)
        matches.sort((a, b) => b.score - a.score);
        return matches;
    }

    /**
     * Calculates overlap between preferred days/time and tutor's schedule (Phase 5)
     * @param {LearningStyleProfile} tutor - Tutor profile with userData.tutorInfo
     * @param {Array<string>} preferredDays - e.g. ['Monday','Wednesday']
     * @param {Object} preferredTimeRange - { start: '14:00', end: '18:00' } (24h)
     * @param {Array} systemSchedule - System default weeklySchedule
     * @returns {number} 0-1 score
     */
    _calculateAvailabilityScore(tutor, preferredDays, preferredTimeRange, systemSchedule) {
        const schedule = tutor.userData?.tutorInfo?.hasCustomAvailability && tutor.userData?.tutorInfo?.availability?.weeklySchedule?.length
            ? tutor.userData.tutorInfo.availability.weeklySchedule
            : (systemSchedule || []);

        if (!schedule.length || !preferredTimeRange?.start || !preferredTimeRange?.end) return 0.5;

        const prefStart = this._timeToMinutes(preferredTimeRange.start);
        const prefEnd = this._timeToMinutes(preferredTimeRange.end);
        const prefSpan = Math.max(0, prefEnd - prefStart);
        if (prefSpan === 0) return 0.5;

        let totalOverlap = 0;
        let totalPreferred = 0;

        for (const day of preferredDays) {
            const daySchedule = schedule.find(s => s.day === day);
            if (!daySchedule || !daySchedule.available) continue;

            const tutorStart = this._timeToMinutes(daySchedule.startTime || '00:00');
            const tutorEnd = this._timeToMinutes(daySchedule.endTime || '24:00');
            const overlapStart = Math.max(prefStart, tutorStart);
            const overlapEnd = Math.min(prefEnd, tutorEnd);
            const overlap = Math.max(0, overlapEnd - overlapStart);

            totalOverlap += overlap;
            totalPreferred += prefSpan;
        }

        return totalPreferred > 0 ? Math.min(1, totalOverlap / totalPreferred) : 0.5;
    }

    _timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [h, m] = String(timeStr).split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    }

    /**
     * Computes profile completeness 0-1 (Phase 8)
     * @param {LearningStyleProfile} profile - User profile
     * @param {boolean} isStudent - True if student
     * @returns {number} 0-1
     */
    _getProfileCompleteness(profile, isStudent) {
        let score = 0;
        let maxScore = 0;

        // Dimensions: non-default (≠5) indicates more complete
        for (const dim of Object.values(profile.dimensions || {})) {
            maxScore += 1;
            score += (dim !== 5 && dim != null) ? 1 : 0.5;
        }

        if (isStudent) {
            const subjLen = profile.subjectsOfInterest?.length || 0;
            const needsLen = profile.learningNeeds?.length || 0;
            maxScore += 2;
            score += (subjLen > 0 ? Math.min(1, subjLen / 2) : 0.5) + (needsLen > 0 ? Math.min(1, needsLen / 2) : 0.5);
        } else {
            const subjCount = Object.keys(profile.subjectExpertise || {}).length;
            const strengthCount = (profile.teachingStrengths || []).length;
            maxScore += 2;
            score += (subjCount > 0 ? Math.min(1, subjCount / 2) : 0.5) + (strengthCount > 0 ? Math.min(1, strengthCount / 2) : 0.5);
        }

        return maxScore > 0 ? Math.min(1, Math.max(0.3, score / maxScore)) : 0.5;
    }

    /**
     * Calculates how well a tutor's teaching style matches a student's learning style.
     * Dimension semantics:
     * - visual_verbal, sequential_global: Similarity preferred (student learns best when tutor matches).
     * - active_reflective, structured_flexible: Small complementary difference ideal; large gap penalized (Gaussian decay).
     * @param {LearningStyleProfile} student - Student profile
     * @param {LearningStyleProfile} tutor - Tutor profile
     * @returns {number} - Compatibility score between 0 and 1
     */
    _calculateStyleCompatibility(student, tutor) {
        const compatibilityScores = [];

        for (const dimension in student.dimensions) {
            const studentScore = student.dimensions[dimension];
            const tutorScore = tutor.dimensions[dimension];
            const diff = Math.abs(studentScore - tutorScore);

            if (dimension === 'visual_verbal' || dimension === 'sequential_global') {
                // Similarity preferred: linear decay with distance
                compatibilityScores.push(1 - (diff / 10));
            } else {
                // active_reflective, structured_flexible: small difference ideal, smooth Gaussian decay
                // Math.exp(-0.15 * diff^2): diff=0 -> 1, diff=3 -> ~0.9, diff=5 -> ~0.5, diff=8 -> ~0.1
                compatibilityScores.push(Math.exp(-0.15 * diff * diff));
            }
        }

        return compatibilityScores.reduce((sum, score) => sum + score, 0) / compatibilityScores.length;
    }

    /**
     * Calculates subject match between student's subjects of interest and tutor expertise
     * @param {Array<string>} subjectsOfInterest - Student's subjects they want to study
     * @param {Object} subjectExpertise - Tutor's subject expertise map
     * @param {string} requestedSubject - Optional specific subject being requested
     * @returns {number} - Match score between 0 and 1
     */
    _calculateSubjectMatch(subjectsOfInterest, subjectExpertise, requestedSubject = null) {
        if (!subjectsOfInterest || subjectsOfInterest.length === 0) {
            // If no specific subjects, check if requested subject exists
            if (requestedSubject && subjectExpertise[requestedSubject] !== undefined) {
                return subjectExpertise[requestedSubject] / 10; // Normalize 0-10 to 0-1
            }
            return 0.5; // Neutral score if no information
        }

        let totalScore = 0;
        let matchedSubjects = 0;

        for (const subj of subjectsOfInterest) {
            if (subjectExpertise[subj] !== undefined) {
                // Use proficiency level (0-10) normalized to 0-1
                totalScore += subjectExpertise[subj] / 10;
                matchedSubjects++;
            }
        }

        // If specific subject requested, weight it more
        if (requestedSubject && subjectExpertise[requestedSubject] !== undefined) {
            const requestedScore = subjectExpertise[requestedSubject] / 10;
            if (matchedSubjects > 0) {
                // Average with requested subject (weighted)
                return (totalScore / matchedSubjects * 0.5 + requestedScore * 0.5);
            }
            return requestedScore;
        }

        return matchedSubjects > 0 ? totalScore / matchedSubjects : 0;
    }

    /**
     * Assesses how well a tutor's teaching strengths align with a student's needs (Phase 6: synonyms + fuzzy)
     * @param {LearningStyleProfile} student - Student profile
     * @param {LearningStyleProfile} tutor - Tutor profile
     * @returns {number} - Alignment score between 0 and 1
     */
    _assessTeachingAlignment(student, tutor) {
        if (!student.learningNeeds || student.learningNeeds.length === 0) {
            return 0.5; // Neutral if no needs specified
        }

        if (!tutor.teachingStrengths || tutor.teachingStrengths.length === 0) {
            return 0.5; // Neutral if no strengths specified
        }

        const FUZZY_THRESHOLD = 0.8;
        const strengths = tutor.teachingStrengths.map(s => String(s).trim().toLowerCase());
        let alignmentScore = 0;
        const totalNeeds = student.learningNeeds.length;

        for (const need of student.learningNeeds) {
            const needStr = String(need).trim();
            const needLower = needStr.toLowerCase();

            // Exact match
            if (strengths.some(s => s === needLower)) {
                alignmentScore += 1;
                continue;
            }

            // Synonym match
            const synonyms = PEDAGOGICAL_SYNONYMS[needStr] || [];
            const synonymMatch = synonyms.some(syn => strengths.includes(String(syn).toLowerCase()));
            if (synonymMatch) {
                alignmentScore += 0.95;
                continue;
            }

            // Fuzzy match (Levenshtein)
            let bestFuzzy = 0;
            for (const strength of tutor.teachingStrengths) {
                const sim = stringSimilarity(needStr, strength);
                if (sim >= FUZZY_THRESHOLD && sim > bestFuzzy) bestFuzzy = sim;
            }
            if (bestFuzzy > 0) {
                alignmentScore += bestFuzzy;
            }
        }

        return totalNeeds > 0 ? alignmentScore / totalNeeds : 0;
    }

    /**
     * Calculates a dimension score based on assessment indicators
     * @param {Array<boolean|number>} indicators - Array of indicator values
     * @returns {number} - Score between 0 and 10
     */
    _calculateDimensionScore(indicators) {
        if (!indicators || indicators.length === 0) {
            return 5; // Default middle score
        }

        // Handle both boolean and numeric indicators
        const scores = indicators.map(indicator => {
            if (typeof indicator === 'boolean') {
                return indicator ? 1 : 0;
            }
            // If numeric (1-5 scale), normalize to 0-1
            if (typeof indicator === 'number') {
                return indicator / 5;
            }
            return 0;
        });

        const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        return average * 10; // Scale to 0-10
    }

    /**
     * Assesses teaching strengths from tutor assessment answers
     * @param {Object} answers - Assessment answers
     * @returns {Array<string>} - Array of teaching strengths
     */
    _assessTeachingStrengths(answers) {
        const strengths = [];
        
        if (answers.teaching_strengths && Array.isArray(answers.teaching_strengths)) {
            return answers.teaching_strengths;
        }

        // Fallback: infer from other answers if needed
        if (answers.explains_clearly) strengths.push('Clear Explanations');
        if (answers.patient_approach) strengths.push('Patient Teaching');
        if (answers.adapts_to_student) strengths.push('Adaptive Teaching');
        if (answers.encourages_independence) strengths.push('Independent Learning');

        return strengths;
    }

    /**
     * Assesses learning needs from student assessment answers
     * @param {Object} answers - Assessment answers
     * @returns {Array<string>} - Array of learning needs
     */
    _assessLearningNeeds(answers) {
        if (answers.learning_needs && Array.isArray(answers.learning_needs)) {
            return answers.learning_needs;
        }

        const needs = [];
        // Infer from other answers if needed
        if (answers.needs_visual_aids) needs.push('Visual Learning Support');
        if (answers.needs_practice) needs.push('Practice Opportunities');
        if (answers.needs_structure) needs.push('Structured Learning');
        if (answers.needs_flexibility) needs.push('Flexible Approach');

        return needs;
    }

    /**
     * Assesses subject expertise from tutor assessment answers
     * @param {Object} answers - Assessment answers
     * @returns {Object} - Map of subject names to proficiency levels (0-10)
     */
    _assessSubjectExpertise(answers) {
        if (answers.subject_expertise && typeof answers.subject_expertise === 'object') {
            return answers.subject_expertise;
        }

        // Fallback: empty object
        return {};
    }

    /**
     * Generates a human-readable explanation of why this match is recommended
     * @param {LearningStyleProfile} student - Student profile
     * @param {LearningStyleProfile} tutor - Tutor profile
     * @param {number} compatibilityScore - Compatibility score (0-1)
     * @returns {string} - Explanation text
     */
    generateMatchingExplanation(student, tutor, compatibilityScore) {
        const explanation = [
            `Match Score: ${(compatibilityScore * 100).toFixed(0)}%`,
            '\nKey Compatibility Factors:'
        ];

        // Analyze dimension matches
        for (const dimension in student.dimensions) {
            const studentScore = student.dimensions[dimension];
            const tutorScore = tutor.dimensions[dimension];
            const difference = Math.abs(studentScore - tutorScore);

            if (difference < 3) {
                explanation.push(`- Strong ${dimension.replace('_', ' ')} style alignment`);
            } else if (difference < 5) {
                explanation.push(`- Complementary ${dimension.replace('_', ' ')} styles`);
            }
        }

        // Add teaching strength matches
        if (student.learningNeeds && tutor.teachingStrengths) {
            const matchingStrengths = student.learningNeeds.filter(need => 
                tutor.teachingStrengths.includes(need)
            );
            if (matchingStrengths.length > 0) {
                explanation.push('\nMatching Teaching Strengths:');
                matchingStrengths.forEach(strength => {
                    explanation.push(`- ${strength}`);
                });
            }
        }

        return explanation.join('\n');
    }

    /**
     * Updates matching weights based on feedback data
     * Uses grid search to find weights that minimize |predicted - actual|.
     * Feedback must include breakdown (styleCompatibility, subjectMatch, teachingAlignment) and actualRating.
     * @param {Array<Object>} feedbackData - Array of feedback objects with breakdown and actualRating
     * @returns {Object} - Updated weights { styleCompatibility, subjectMatch, teachingAlignment }
     */
    updateMatchingWeights(feedbackData) {
        const valid = (feedbackData || []).filter(
            f => f.actualRating != null &&
                f.breakdown &&
                f.breakdown.styleCompatibility != null &&
                f.breakdown.subjectMatch != null &&
                f.breakdown.teachingAlignment != null
        );
        if (valid.length < 3) {
            return { styleCompatibility: 0.4, subjectMatch: 0.3, teachingAlignment: 0.3 };
        }

        let bestWeights = { styleCompatibility: 0.4, subjectMatch: 0.3, teachingAlignment: 0.3 };
        let bestError = Infinity;
        const step = 0.1;

        for (let w1 = 0; w1 <= 1; w1 += step) {
            for (let w2 = 0; w2 <= 1 - w1; w2 += step) {
                const w3 = 1 - w1 - w2;
                if (w3 < 0) continue;
                const weights = { styleCompatibility: w1, subjectMatch: w2, teachingAlignment: w3 };
                let totalError = 0;
                for (const f of valid) {
                    const pred = f.breakdown.styleCompatibility * w1 +
                        f.breakdown.subjectMatch * w2 +
                        f.breakdown.teachingAlignment * w3;
                    totalError += Math.abs(pred - f.actualRating);
                }
                const avgError = totalError / valid.length;
                if (avgError < bestError) {
                    bestError = avgError;
                    bestWeights = { ...weights };
                }
            }
        }
        return bestWeights;
    }

    /**
     * Calculates match accuracy based on predicted vs actual outcomes
     * @param {Array<Object>} feedbackData - Array of feedback objects
     * @returns {Object} - Accuracy metrics
     */
    calculateMatchAccuracy(feedbackData) {
        if (!feedbackData || feedbackData.length === 0) {
            return { accuracy: 0, sampleSize: 0 };
        }

        let totalError = 0;
        let count = 0;

        feedbackData.forEach(feedback => {
            if (feedback.predictedScore !== undefined && feedback.actualRating !== undefined) {
                // Normalize actualRating (1-5) to 0-1 scale for comparison
                const normalizedActual = (feedback.actualRating - 1) / 4;
                const error = Math.abs(feedback.predictedScore - normalizedActual);
                totalError += error;
                count++;
            }
        });

        const averageError = count > 0 ? totalError / count : 0;
        const accuracy = 1 - averageError; // Convert error to accuracy

        return {
            accuracy: Math.max(0, Math.min(1, accuracy)), // Clamp between 0 and 1
            averageError,
            sampleSize: count
        };
    }
}

module.exports = {
    LearningStyleProfile,
    LearningStyleMatcher
};

