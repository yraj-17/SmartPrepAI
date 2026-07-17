import mongoose from 'mongoose';
import {
  AptitudeCategory,
  AptitudeDifficulty,
  AptitudeQuestion,
  AptitudeTest,
} from '../models/Aptitude';
import logger from '../utils/logger';

const categories = [
  ['Quantitative Aptitude', 'Arithmetic, ratios, averages, profit-loss, work-time, and data interpretation.'],
  ['Logical Reasoning', 'Series, coding-decoding, syllogism, direction sense, and puzzles.'],
  ['Verbal Ability', 'Grammar, vocabulary, sentence correction, and comprehension.'],
];

const difficulties = [
  ['Easy', 'Basic concept-building aptitude questions.'],
  ['Medium', 'Placement-level balanced aptitude questions.'],
  ['Hard', 'Higher difficulty questions for competitive exam practice.'],
];

const sampleQuestions = [
  ['01-ratio-and-proportion.svg', 'Quantitative Aptitude', 'Easy', 'B', 1, 75, 'Let the numbers be 2x and 3x. Their sum is 50, so x is 10 and the larger number is 30.'],
  ['02-average-speed.svg', 'Quantitative Aptitude', 'Easy', 'C', 1, 75, 'Average speed = total distance / total time = 180 / 3 = 60 km/h.'],
  ['03-number-series.svg', 'Logical Reasoning', 'Easy', 'D', 1, 75, 'The pattern adds 3 each time: 4, 7, 10, 13, 16.'],
  ['04-sentence-correction.svg', 'Verbal Ability', 'Easy', 'A', 1, 75, 'The subject She takes the singular verb has.'],
  ['05-profit-percentage.svg', 'Quantitative Aptitude', 'Medium', 'C', 1, 75, 'Profit is 200. Profit percent = 200 / 1000 x 100 = 20%.'],
  ['06-coding-decoding.svg', 'Logical Reasoning', 'Medium', 'B', 1, 75, 'Each letter is shifted by 2 positions: D becomes F, O becomes Q, and G becomes I.'],
  ['07-vocabulary.svg', 'Verbal Ability', 'Medium', 'D', 1, 75, 'The closest synonym of abundant is plentiful.'],
  ['08-work-and-time.svg', 'Quantitative Aptitude', 'Hard', 'A', 2, 120, 'A completes 1/12 per day and B completes 1/18 per day. Together they complete 5/36 per day, so time = 36/5 = 7.2 days.'],
  ['09-syllogism.svg', 'Logical Reasoning', 'Hard', 'C', 2, 120, 'No definite relation between roses and fading can be concluded from the given statements.'],
  ['10-grammar-usage.svg', 'Verbal Ability', 'Hard', 'B', 2, 120, 'Neither pairs with nor; the correct construction is neither X nor Y.'],
];

export async function seedAptitudeData(): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    logger.warn('Skipping aptitude seed because MongoDB is not connected');
    return;
  }

  for (const [name, description] of categories) {
    await AptitudeCategory.updateOne({ name }, { $setOnInsert: { name, description } }, { upsert: true });
  }

  for (const [name, description] of difficulties) {
    await AptitudeDifficulty.updateOne({ name }, { $setOnInsert: { name, description } }, { upsert: true });
  }

  const existingQuestions = await AptitudeQuestion.countDocuments();
  if (existingQuestions === 0) {
    const categoryMap = new Map((await AptitudeCategory.find()).map((item) => [item.name, item._id]));
    const difficultyMap = new Map((await AptitudeDifficulty.find()).map((item) => [item.name, item._id]));

    for (const [fileName, categoryName, difficultyName, correctOption, marks, timeLimitSeconds, explanation] of sampleQuestions) {
      await AptitudeQuestion.create({
        imagePath: '/uploads/aptitude/questions/' + fileName,
        category: categoryMap.get(categoryName as string),
        difficulty: difficultyMap.get(difficultyName as string),
        correctOption,
        marks,
        timeLimitSeconds,
        explanation,
        isActive: true,
      });
    }
  }

  const existingTests = await AptitudeTest.countDocuments();
  if (existingTests === 0) {
    for (const difficultyName of ['Easy', 'Medium', 'Hard']) {
      const difficulty = await AptitudeDifficulty.findOne({ name: difficultyName });
      const questions = await AptitudeQuestion.find({ difficulty: difficulty?._id, isActive: true }).select('_id');
      if (difficulty && questions.length > 0) {
        await AptitudeTest.create({
          title: difficultyName + ' Aptitude Mock Test',
          description: 'A 60-minute image-based aptitude mock test for ' + difficultyName.toLowerCase() + ' placement practice.',
          difficulty: difficulty._id,
          totalTimeMinutes: 60,
          questions: questions.map((question) => question._id),
          isActive: true,
        });
      }
    }
  }

  logger.info('Aptitude seed data is ready');
}
