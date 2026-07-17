export type AptitudeOption = 'A' | 'B' | 'C' | 'D';
export type AptitudeQuestionStatus = 'not_visited' | 'not_answered' | 'answered' | 'marked_for_review';

export interface AptitudeCategory {
  _id: string;
  id?: string;
  name: string;
  description?: string;
}

export interface AptitudeDifficulty {
  _id: string;
  id?: string;
  name: string;
  description?: string;
}

export interface AptitudeTestSummary {
  id: string;
  title: string;
  description?: string;
  difficulty: string;
  difficultyId: string;
  category?: string;
  categoryId?: string;
  totalTimeMinutes: number;
  questionCount: number;
  isActive: boolean;
}

export interface AptitudeQuestionResponse {
  selectedOption: AptitudeOption | null;
  status: AptitudeQuestionStatus;
  isMarked: boolean;
  timeSpentSeconds: number;
}

export interface AptitudeQuestion {
  id: string;
  position?: number;
  imagePath: string;
  correctOption?: AptitudeOption;
  difficulty: string;
  difficultyId: string;
  category: string;
  categoryId: string;
  marks: number;
  timeLimitSeconds: number;
  explanation?: string;
  isActive?: boolean;
  response?: AptitudeQuestionResponse;
}

export interface AptitudeAttemptState {
  attempt: {
    id: string;
    status: 'in_progress' | 'submitted';
    startedAt: string;
    submittedAt?: string;
    totalSeconds: number;
    endsAt: string;
  };
  test: AptitudeTestSummary;
  questions: AptitudeQuestion[];
}

export interface AptitudeResult {
  attempt: {
    id: string;
    status: 'submitted';
    score: number;
    totalMarks: number;
    accuracy: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    timeTakenSeconds: number;
    submittedAt: string;
  };
  test: AptitudeTestSummary;
  feedback: {
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    timeManagement?: string;
    studyPlan?: string[];
    categoryStats?: Array<{ name: string; total: number; attempted: number; correct: number; accuracy: number; avgTime: number }>;
    difficultyStats?: Array<{ name: string; total: number; attempted: number; correct: number; accuracy: number; avgTime: number }>;
  };
  review: Array<AptitudeQuestion & {
    position: number;
    selectedOption: AptitudeOption | null;
    isCorrect: boolean;
    timeSpentSeconds: number;
  }>;
}
