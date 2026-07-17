import mongoose, { Document, Schema, Types } from 'mongoose';

export type AptitudeOption = 'A' | 'B' | 'C' | 'D';
export type AptitudeDifficultyName = 'Easy' | 'Medium' | 'Hard' | string;
export type AptitudeResponseStatus = 'not_visited' | 'not_answered' | 'answered' | 'marked_for_review';
export type AptitudeAttemptStatus = 'in_progress' | 'submitted';

export interface IAptitudeCategory extends Document {
  name: string;
  description?: string;
}

export interface IAptitudeDifficulty extends Document {
  name: AptitudeDifficultyName;
  description?: string;
}

export interface IAptitudeQuestion extends Document {
  imagePath: string;
  correctOption: AptitudeOption;
  difficulty: Types.ObjectId;
  category: Types.ObjectId;
  marks: number;
  timeLimitSeconds: number;
  explanation?: string;
  isActive: boolean;
}

export interface IAptitudeTest extends Document {
  title: string;
  description?: string;
  difficulty: Types.ObjectId;
  category?: Types.ObjectId;
  totalTimeMinutes: number;
  questions: Types.ObjectId[];
  isActive: boolean;
}

export interface IAptitudeResponse {
  question: Types.ObjectId;
  selectedOption?: AptitudeOption | null;
  status: AptitudeResponseStatus;
  isMarked: boolean;
  timeSpentSeconds: number;
  updatedAt: Date;
}

export interface IAptitudeAttempt extends Document {
  user: Types.ObjectId;
  test: Types.ObjectId;
  status: AptitudeAttemptStatus;
  startedAt: Date;
  submittedAt?: Date;
  submitReason?: string;
  totalSeconds: number;
  timeTakenSeconds: number;
  responses: IAptitudeResponse[];
  score: number;
  totalMarks: number;
  accuracy: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  aiFeedback: any;
}

const aptitudeCategorySchema = new Schema<IAptitudeCategory>({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
}, { timestamps: true });

const aptitudeDifficultySchema = new Schema<IAptitudeDifficulty>({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
}, { timestamps: true });

const aptitudeQuestionSchema = new Schema<IAptitudeQuestion>({
  imagePath: { type: String, required: true },
  correctOption: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] },
  difficulty: { type: Schema.Types.ObjectId, ref: 'AptitudeDifficulty', required: true },
  category: { type: Schema.Types.ObjectId, ref: 'AptitudeCategory', required: true },
  marks: { type: Number, default: 1, min: 1 },
  timeLimitSeconds: { type: Number, default: 60, min: 30 },
  explanation: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const aptitudeTestSchema = new Schema<IAptitudeTest>({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  difficulty: { type: Schema.Types.ObjectId, ref: 'AptitudeDifficulty', required: true },
  category: { type: Schema.Types.ObjectId, ref: 'AptitudeCategory', default: null },
  totalTimeMinutes: { type: Number, default: 60, min: 1 },
  questions: [{ type: Schema.Types.ObjectId, ref: 'AptitudeQuestion', required: true }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const aptitudeResponseSchema = new Schema<IAptitudeResponse>({
  question: { type: Schema.Types.ObjectId, ref: 'AptitudeQuestion', required: true },
  selectedOption: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
  status: {
    type: String,
    enum: ['not_visited', 'not_answered', 'answered', 'marked_for_review'],
    default: 'not_visited',
  },
  isMarked: { type: Boolean, default: false },
  timeSpentSeconds: { type: Number, default: 0, min: 0 },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const aptitudeAttemptSchema = new Schema<IAptitudeAttempt>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  test: { type: Schema.Types.ObjectId, ref: 'AptitudeTest', required: true },
  status: { type: String, enum: ['in_progress', 'submitted'], default: 'in_progress' },
  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date, default: null },
  submitReason: { type: String, default: '' },
  totalSeconds: { type: Number, required: true },
  timeTakenSeconds: { type: Number, default: 0 },
  responses: [aptitudeResponseSchema],
  score: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
  incorrectCount: { type: Number, default: 0 },
  unansweredCount: { type: Number, default: 0 },
  aiFeedback: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

aptitudeQuestionSchema.index({ category: 1, difficulty: 1, isActive: 1 });
aptitudeTestSchema.index({ difficulty: 1, isActive: 1 });
aptitudeAttemptSchema.index({ user: 1, createdAt: -1 });

export const AptitudeCategory = mongoose.model<IAptitudeCategory>('AptitudeCategory', aptitudeCategorySchema);
export const AptitudeDifficulty = mongoose.model<IAptitudeDifficulty>('AptitudeDifficulty', aptitudeDifficultySchema);
export const AptitudeQuestion = mongoose.model<IAptitudeQuestion>('AptitudeQuestion', aptitudeQuestionSchema);
export const AptitudeTest = mongoose.model<IAptitudeTest>('AptitudeTest', aptitudeTestSchema);
export const AptitudeAttempt = mongoose.model<IAptitudeAttempt>('AptitudeAttempt', aptitudeAttemptSchema);
