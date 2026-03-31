/**
 * Polymorphic challenge question types (client + API contract).
 * Legacy documents omit `questionType` and are treated as multiple_choice.
 */

export enum QuestionType {
  MultipleChoice = 'multiple_choice',
  TrueFalse = 'true_false',
  FillInTheBlank = 'fill_in_the_blank',
  Matching = 'matching',
  ErrorDetection = 'error_detection',
}

/** Raw subdocument shape from GET /api/challenges (Mongo-friendly) */
export interface ApiChallengeQuestion {
  _id?: string;
  question: string;
  questionType?: QuestionType | string;
  options?: string[];
  correctAnswer?: unknown;
  explanation?: string;
  points?: number;
  /** e.g. "The answer is ___." or "The answer is {{blank}}." */
  fillTemplate?: string;
  /** If true, fill-in comparison is case-sensitive */
  caseSensitive?: boolean;
  /** For matching: ordered pairs; left labels must be unique per question */
  matchingPairs?: Array<{ left: string; right: string }>;
  /** Full sentence shown for error detection */
  errorSentence?: string;
  /** 0-based index of the incorrect word in `errorSentence.split(/\\s+/)` */
  errorWordIndex?: number;
}

export interface BaseQuestion {
  id: string;
  /** Stem / prompt (maps from API `question`) */
  text: string;
  points: number;
  type: QuestionType;
  explanation?: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: QuestionType.MultipleChoice;
  options: string[];
  /** Stored correct option text (same as one of `options`) */
  correctAnswer: string;
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: QuestionType.TrueFalse;
  correctAnswer: boolean;
}

export interface FillInTheBlankQuestion extends BaseQuestion {
  type: QuestionType.FillInTheBlank;
  /** Text with a single placeholder (default token below) */
  template: string;
  blankToken: string;
  correctAnswer: string;
  caseSensitive: boolean;
}

export interface MatchingPair {
  leftId: string;
  leftLabel: string;
  rightId: string;
  rightLabel: string;
}

export interface MatchingQuestion extends BaseQuestion {
  type: QuestionType.Matching;
  pairs: MatchingPair[];
  /** Canonical map leftId -> rightId for grading */
  correctMap: Record<string, string>;
}

export interface ErrorDetectionQuestion extends BaseQuestion {
  type: QuestionType.ErrorDetection;
  sentence: string;
  words: string[];
  /** Index into `words` that the student must select */
  errorWordIndex: number;
}

export type Question =
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | FillInTheBlankQuestion
  | MatchingQuestion
  | ErrorDetectionQuestion;

/** Payload sent to POST .../answer (`answer` body field) */
export type ChallengeAnswerPayload =
  | string
  | boolean
  | Record<string, string>
  | number;
