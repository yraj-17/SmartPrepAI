import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import mongoose from 'mongoose';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAdmin } from '../middleware/auth';
import {
  AptitudeAttempt,
  AptitudeCategory,
  AptitudeDifficulty,
  AptitudeQuestion,
  AptitudeTest,
} from '../models/Aptitude';

const router = express.Router();
const uploadDir = path.resolve(__dirname, '../../public/uploads/aptitude/questions');
fs.mkdirSync(uploadDir, { recursive: true });

const imageStorage = multer.diskStorage({
  destination: function (_req, _file, callback) {
    callback(null, uploadDir);
  },
  filename: function (_req, file, callback) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = Date.now() + '-' + Math.random().toString(16).slice(2) + ext;
    callback(null, safeName);
  },
});

const upload = multer({
  storage: imageStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: function (_req, file, callback) {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new Error('Only PNG, JPG, WEBP, and SVG question images are allowed'));
  },
});

function ok(res: Response, data: any, message?: string, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, ...(message ? { message } : {}) });
}

function fail(res: Response, error: string, statusCode = 400) {
  return res.status(statusCode).json({ success: false, error });
}

function normalizeOption(value: any): 'A' | 'B' | 'C' | 'D' | null {
  const option = String(value || '').toUpperCase();
  if (['A', 'B', 'C', 'D'].includes(option)) return option as 'A' | 'B' | 'C' | 'D';
  return null;
}

function toId(value: any) {
  return value?._id?.toString?.() || value?.toString?.() || String(value || '');
}

function publicQuestion(question: any, includeAnswer = false) {
  return {
    id: toId(question._id),
    imagePath: question.imagePath,
    correctOption: includeAnswer ? question.correctOption : undefined,
    difficulty: question.difficulty?.name || question.difficulty,
    difficultyId: toId(question.difficulty?._id || question.difficulty),
    category: question.category?.name || question.category,
    categoryId: toId(question.category?._id || question.category),
    marks: question.marks,
    timeLimitSeconds: question.timeLimitSeconds,
    explanation: includeAnswer ? question.explanation : undefined,
    isActive: question.isActive,
  };
}

function publicTest(test: any) {
  const questionCount = Array.isArray(test.questions) ? test.questions.length : 0;
  return {
    id: toId(test._id),
    title: test.title,
    description: test.description,
    difficulty: test.difficulty?.name || test.difficulty,
    difficultyId: toId(test.difficulty?._id || test.difficulty),
    category: test.category?.name || 'Mixed',
    categoryId: test.category?._id ? toId(test.category._id) : '',
    totalTimeMinutes: test.totalTimeMinutes,
    questionCount,
    isActive: test.isActive,
  };
}

function publicAttempt(attempt: any) {
  const startedAt = new Date(attempt.startedAt);
  return {
    id: toId(attempt._id),
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    totalSeconds: attempt.totalSeconds,
    endsAt: new Date(startedAt.getTime() + attempt.totalSeconds * 1000),
  };
}

async function loadOwnedAttempt(attemptId: string, userId: string) {
  if (!mongoose.Types.ObjectId.isValid(attemptId)) return null;
  return AptitudeAttempt.findOne({ _id: attemptId, user: userId });
}

async function autoSubmitIfExpired(attempt: any) {
  if (!attempt || attempt.status !== 'in_progress') return attempt;
  const elapsed = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
  if (elapsed >= attempt.totalSeconds) {
    return submitAttempt(attempt, 'Timer ended');
  }
  return attempt;
}

function addStat(bucket: Record<string, any>, name: string, answered: boolean, correct: boolean, timeSpent: number) {
  if (!bucket[name]) bucket[name] = { name, total: 0, attempted: 0, correct: 0, time: 0 };
  bucket[name].total += 1;
  if (answered) bucket[name].attempted += 1;
  if (correct) bucket[name].correct += 1;
  bucket[name].time += Number(timeSpent || 0);
}

function finalizeStats(bucket: Record<string, any>) {
  return Object.values(bucket).map((stat: any) => ({
    name: stat.name,
    total: stat.total,
    attempted: stat.attempted,
    correct: stat.correct,
    accuracy: stat.attempted ? Math.round((stat.correct / stat.attempted) * 100) : 0,
    avgTime: stat.total ? Math.round(stat.time / stat.total) : 0,
  }));
}

function generateAptitudeFeedback(data: any) {
  const strengths = data.categoryStats
    .filter((item: any) => item.attempted > 0 && item.accuracy >= 70)
    .map((item: any) => item.name + ' is a strength with ' + item.accuracy + '% accuracy.');

  const weakAreas = data.categoryStats.filter((item: any) => item.accuracy < 60 || item.attempted < Math.ceil(item.total * 0.7));
  const weaknesses = weakAreas.map((item: any) => 'Practice ' + item.name + ': accuracy ' + item.accuracy + '%, attempted ' + item.attempted + '/' + item.total + '.');
  const usedRatio = data.totalSeconds ? data.timeTakenSeconds / data.totalSeconds : 0;
  const timeManagement = usedRatio > 0.9 && data.unansweredCount > 0
    ? 'You used most of the timer and still left questions unanswered. Practice 60-minute mocks with a two-pass strategy.'
    : data.timeTakenSeconds < data.totalSeconds * 0.5 && data.incorrectCount > data.correctCount
      ? 'You finished quickly but accuracy dropped. Slow down on calculations and reasoning checks.'
      : 'Your time usage is acceptable. Keep tracking time per question during practice.';

  const studyPlan: string[] = [];
  if (weakAreas.length === 0) studyPlan.push('Revise mixed aptitude sets 3 days per week and attempt one full mock every weekend.');
  weakAreas.slice(0, 3).forEach((item: any) => {
    studyPlan.push('Spend 30 minutes daily on ' + item.name + ', then solve 20 image-based MCQs and review explanations.');
  });
  if (data.unansweredCount > 0) studyPlan.push('Solve easy questions first, mark doubtful questions, and return in the final 15 minutes.');

  return {
    summary: 'Score ' + data.score + '/' + data.totalMarks + ', accuracy ' + data.accuracy + '%, correct ' + data.correctCount + ', incorrect ' + data.incorrectCount + ', unanswered ' + data.unansweredCount + '.',
    strengths: strengths.length ? strengths : ['No strong area is confirmed yet. Build consistency with more attempts.'],
    weaknesses: weaknesses.length ? weaknesses : ['No major weak area detected in this attempt.'],
    timeManagement,
    studyPlan,
    categoryStats: data.categoryStats,
    difficultyStats: data.difficultyStats,
  };
}

async function submitAttempt(attempt: any, reason: string) {
  if (attempt.status === 'submitted') return attempt;

  const test: any = await AptitudeTest.findById(attempt.test).populate({
    path: 'questions',
    populate: [{ path: 'category' }, { path: 'difficulty' }],
  });

  if (!test) throw new Error('Test not found');

  let score = 0;
  let totalMarks = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  const categoryStats: Record<string, any> = {};
  const difficultyStats: Record<string, any> = {};

  for (const question of test.questions || []) {
    totalMarks += question.marks;
    const response = attempt.responses.find((item: any) => item.question.toString() === question._id.toString());
    const selected = response?.selectedOption || null;
    const answered = Boolean(selected);
    const isCorrect = answered && selected === question.correctOption;

    if (!answered) unansweredCount += 1;
    else if (isCorrect) {
      correctCount += 1;
      score += question.marks;
    } else {
      incorrectCount += 1;
    }

    addStat(categoryStats, question.category?.name || 'General', answered, Boolean(isCorrect), response?.timeSpentSeconds || 0);
    addStat(difficultyStats, question.difficulty?.name || 'Mixed', answered, Boolean(isCorrect), response?.timeSpentSeconds || 0);
  }

  const attempted = correctCount + incorrectCount;
  const accuracy = attempted ? Math.round((correctCount / attempted) * 10000) / 100 : 0;
  const timeTakenSeconds = Math.min(
    attempt.totalSeconds,
    Math.max(0, Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000))
  );

  const feedback = generateAptitudeFeedback({
    score,
    totalMarks,
    correctCount,
    incorrectCount,
    unansweredCount,
    accuracy,
    timeTakenSeconds,
    totalSeconds: attempt.totalSeconds,
    categoryStats: finalizeStats(categoryStats),
    difficultyStats: finalizeStats(difficultyStats),
  });

  attempt.status = 'submitted';
  attempt.submittedAt = new Date();
  attempt.submitReason = reason;
  attempt.timeTakenSeconds = timeTakenSeconds;
  attempt.score = score;
  attempt.totalMarks = totalMarks;
  attempt.correctCount = correctCount;
  attempt.incorrectCount = incorrectCount;
  attempt.unansweredCount = unansweredCount;
  attempt.accuracy = accuracy;
  attempt.aiFeedback = feedback;
  await attempt.save();
  return attempt;
}

router.get('/meta', asyncHandler(async (_req: Request, res: Response) => {
  const [categories, difficulties] = await Promise.all([
    AptitudeCategory.find().sort({ name: 1 }),
    AptitudeDifficulty.find().sort({ createdAt: 1 }),
  ]);
  return ok(res, { categories, difficulties });
}));

router.get('/tests', asyncHandler(async (req: Request, res: Response) => {
  const query: any = { isActive: true };
  if (req.query.difficultyId) query.difficulty = req.query.difficultyId;
  const tests = await AptitudeTest.find(query)
    .populate('difficulty')
    .populate('category')
    .sort({ createdAt: -1 });
  return ok(res, tests.map(publicTest));
}));

router.get('/history', asyncHandler(async (req: Request, res: Response) => {
  const attempts = await AptitudeAttempt.find({ user: req.user!.userId, status: 'submitted' })
    .populate({ path: 'test', populate: { path: 'difficulty' } })
    .sort({ createdAt: -1 })
    .limit(20);
  return ok(res, attempts.map((attempt: any) => ({
    id: toId(attempt._id),
    testTitle: attempt.test?.title || 'Aptitude Test',
    difficulty: attempt.test?.difficulty?.name || 'Mixed',
    score: attempt.score,
    totalMarks: attempt.totalMarks,
    accuracy: attempt.accuracy,
    submittedAt: attempt.submittedAt,
  })));
}));

router.post('/attempts/start', asyncHandler(async (req: Request, res: Response) => {
  const testId = req.body.testId;
  const test: any = await AptitudeTest.findOne({ _id: testId, isActive: true }).populate('questions');
  if (!test) return fail(res, 'Test not found', 404);
  if (!test.questions || test.questions.length === 0) return fail(res, 'This test has no questions yet', 400);

  const attempt = await AptitudeAttempt.create({
    user: req.user!.userId,
    test: test._id,
    status: 'in_progress',
    startedAt: new Date(),
    totalSeconds: test.totalTimeMinutes * 60,
    responses: test.questions.map((question: any) => ({
      question: question._id,
      selectedOption: null,
      status: 'not_visited',
      isMarked: false,
      timeSpentSeconds: 0,
      updatedAt: new Date(),
    })),
  });

  return ok(res, { attemptId: toId(attempt._id) }, 'Aptitude test started', 201);
}));

router.get('/attempts/:attemptId/state', asyncHandler(async (req: Request, res: Response) => {
  let attempt = await loadOwnedAttempt(req.params.attemptId, req.user!.userId);
  if (!attempt) return fail(res, 'Attempt not found', 404);
  attempt = await autoSubmitIfExpired(attempt);

  const test: any = await AptitudeTest.findById(attempt.test)
    .populate('difficulty')
    .populate({
      path: 'questions',
      populate: [{ path: 'category' }, { path: 'difficulty' }],
    });

  const questions = (test?.questions || []).map((question: any, index: number) => {
    const response = attempt!.responses.find((item: any) => item.question.toString() === question._id.toString());
    return {
      ...publicQuestion(question),
      position: index + 1,
      response: {
        selectedOption: response?.selectedOption || null,
        status: response?.status || 'not_visited',
        isMarked: Boolean(response?.isMarked),
        timeSpentSeconds: response?.timeSpentSeconds || 0,
      },
    };
  });

  return ok(res, {
    attempt: publicAttempt(attempt),
    test: publicTest(test),
    questions,
  });
}));

router.post('/attempts/:attemptId/response', asyncHandler(async (req: Request, res: Response) => {
  let attempt = await loadOwnedAttempt(req.params.attemptId, req.user!.userId);
  if (!attempt) return fail(res, 'Attempt not found', 404);
  attempt = await autoSubmitIfExpired(attempt);
  if (attempt.status !== 'in_progress') return ok(res, { submitted: true, redirect: '/aptitude/results/' + toId(attempt._id) });

  const questionId = req.body.questionId;
  const response = attempt.responses.find((item: any) => item.question.toString() === String(questionId));
  if (!response) return fail(res, 'Question does not belong to this attempt', 404);

  const hasSelected = Object.prototype.hasOwnProperty.call(req.body, 'selectedOption');
  let selectedOption = hasSelected ? normalizeOption(req.body.selectedOption) : response.selectedOption;
  if (req.body.clearResponse) selectedOption = null;

  const isMarked = Object.prototype.hasOwnProperty.call(req.body, 'isMarked') ? Boolean(req.body.isMarked) : Boolean(response.isMarked);
  const visited = req.body.visited !== false;
  let status = response.status;
  if (isMarked) status = 'marked_for_review';
  else if (selectedOption) status = 'answered';
  else if (visited) status = 'not_answered';

  const delta = Math.min(600, Math.max(0, Number(req.body.timeSpentDelta || 0)));
  response.selectedOption = selectedOption;
  response.isMarked = isMarked;
  response.status = status;
  response.timeSpentSeconds = (response.timeSpentSeconds || 0) + Math.round(delta);
  response.updatedAt = new Date();
  await attempt.save();

  return ok(res, {
    status: response.status,
    selectedOption: response.selectedOption || null,
    isMarked: response.isMarked,
  });
}));

router.post('/attempts/:attemptId/submit', asyncHandler(async (req: Request, res: Response) => {
  const attempt = await loadOwnedAttempt(req.params.attemptId, req.user!.userId);
  if (!attempt) return fail(res, 'Attempt not found', 404);
  const submitted = await submitAttempt(attempt, req.body.reason || 'Submitted by student');
  return ok(res, { attemptId: toId(submitted._id), redirect: '/aptitude/results/' + toId(submitted._id) });
}));

router.get('/results/:attemptId', asyncHandler(async (req: Request, res: Response) => {
  let attempt = await loadOwnedAttempt(req.params.attemptId, req.user!.userId);
  if (!attempt) return fail(res, 'Attempt not found', 404);
  attempt = await autoSubmitIfExpired(attempt);
  if (attempt.status !== 'submitted') return fail(res, 'Attempt is still in progress', 409);

  const test: any = await AptitudeTest.findById(attempt.test)
    .populate('difficulty')
    .populate({
      path: 'questions',
      populate: [{ path: 'category' }, { path: 'difficulty' }],
    });

  const review = (test?.questions || []).map((question: any, index: number) => {
    const response = attempt!.responses.find((item: any) => item.question.toString() === question._id.toString());
    const selectedOption = response?.selectedOption || null;
    return {
      ...publicQuestion(question, true),
      position: index + 1,
      selectedOption,
      isCorrect: Boolean(selectedOption && selectedOption === question.correctOption),
      timeSpentSeconds: response?.timeSpentSeconds || 0,
    };
  });

  return ok(res, {
    attempt: {
      id: toId(attempt._id),
      status: attempt.status,
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      accuracy: attempt.accuracy,
      correctCount: attempt.correctCount,
      incorrectCount: attempt.incorrectCount,
      unansweredCount: attempt.unansweredCount,
      timeTakenSeconds: attempt.timeTakenSeconds,
      submittedAt: attempt.submittedAt,
    },
    test: publicTest(test),
    feedback: attempt.aiFeedback || {},
    review,
  });
}));

router.get('/admin/summary', requireAdmin, asyncHandler(async (_req: Request, res: Response) => {
  const [categories, difficulties, questions, tests, attempts] = await Promise.all([
    AptitudeCategory.countDocuments(),
    AptitudeDifficulty.countDocuments(),
    AptitudeQuestion.countDocuments(),
    AptitudeTest.countDocuments(),
    AptitudeAttempt.countDocuments(),
  ]);
  return ok(res, { categories, difficulties, questions, tests, attempts });
}));

router.get('/admin/questions', requireAdmin, asyncHandler(async (_req: Request, res: Response) => {
  const questions = await AptitudeQuestion.find()
    .populate('category')
    .populate('difficulty')
    .sort({ createdAt: -1 });
  return ok(res, questions.map((question) => publicQuestion(question, true)));
}));

router.post('/admin/categories', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const category = await AptitudeCategory.create({
    name: req.body.name,
    description: req.body.description || '',
  });
  return ok(res, category, 'Category created', 201);
}));

router.post('/admin/difficulties', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const difficulty = await AptitudeDifficulty.create({
    name: req.body.name,
    description: req.body.description || '',
  });
  return ok(res, difficulty, 'Difficulty level created', 201);
}));

router.post('/admin/questions', requireAdmin, upload.single('image'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) return fail(res, 'Question image is required', 400);
  const correctOption = normalizeOption(req.body.correctOption);
  if (!correctOption) return fail(res, 'Correct option must be A, B, C, or D', 400);

  const question = await AptitudeQuestion.create({
    imagePath: '/uploads/aptitude/questions/' + req.file.filename,
    correctOption,
    difficulty: req.body.difficultyId,
    category: req.body.categoryId,
    marks: Math.max(1, Number(req.body.marks || 1)),
    timeLimitSeconds: Math.max(30, Number(req.body.timeLimitSeconds || 60)),
    explanation: req.body.explanation || '',
    isActive: req.body.isActive !== 'false',
  });

  return ok(res, question, 'Question uploaded', 201);
}));

router.get('/admin/tests', requireAdmin, asyncHandler(async (_req: Request, res: Response) => {
  const tests = await AptitudeTest.find()
    .populate('difficulty')
    .populate('category')
    .populate('questions')
    .sort({ createdAt: -1 });
  return ok(res, tests.map(publicTest));
}));

router.post('/admin/tests', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const questionIds = Array.isArray(req.body.questionIds) ? req.body.questionIds : [];
  if (!req.body.title || questionIds.length === 0) return fail(res, 'Title and at least one question are required', 400);

  const test = await AptitudeTest.create({
    title: req.body.title,
    description: req.body.description || '',
    difficulty: req.body.difficultyId,
    category: req.body.categoryId || null,
    totalTimeMinutes: Math.max(1, Number(req.body.totalTimeMinutes || 60)),
    questions: questionIds,
    isActive: req.body.isActive !== false,
  });

  return ok(res, test, 'Test created', 201);
}));

export default router;
