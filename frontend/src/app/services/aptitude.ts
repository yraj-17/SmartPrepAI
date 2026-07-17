import apiService from './api';
import {
  AptitudeCategory,
  AptitudeDifficulty,
  AptitudeQuestion,
  AptitudeResult,
  AptitudeTestSummary,
  AptitudeAttemptState,
  AptitudeOption,
} from '../types/aptitude';

const rawBase = ((import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5001/api') as string;
const apiBase = rawBase.endsWith('/api') ? rawBase : rawBase.replace(/\/$/, '') + '/api';
const assetBase = apiBase.replace(/\/api$/, '');

export function getAptitudeAssetUrl(path: string) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return assetBase + path;
}

export const aptitudeService = {
  async getMeta() {
    const response = await apiService.get<{ categories: AptitudeCategory[]; difficulties: AptitudeDifficulty[] }>('/aptitude/meta');
    if (!response.success || !response.data) throw new Error(response.error || 'Failed to load aptitude metadata');
    return response.data;
  },

  async getTests(difficultyId?: string) {
    const response = await apiService.get<AptitudeTestSummary[]>('/aptitude/tests', difficultyId ? { difficultyId } : undefined);
    if (!response.success || !response.data) throw new Error(response.error || 'Failed to load aptitude tests');
    return response.data;
  },

  async startAttempt(testId: string) {
    const response = await apiService.post<{ attemptId: string }>('/aptitude/attempts/start', { testId });
    if (!response.success || !response.data) throw new Error(response.error || 'Failed to start test');
    return response.data;
  },

  async getAttemptState(attemptId: string) {
    const response = await apiService.get<AptitudeAttemptState>('/aptitude/attempts/' + attemptId + '/state');
    if (!response.success || !response.data) throw new Error(response.error || 'Failed to load attempt');
    return response.data;
  },

  async saveResponse(attemptId: string, payload: {
    questionId: string;
    selectedOption?: AptitudeOption | null;
    isMarked?: boolean;
    clearResponse?: boolean;
    visited?: boolean;
    timeSpentDelta?: number;
  }) {
    const response = await apiService.post<any>('/aptitude/attempts/' + attemptId + '/response', payload);
    if (!response.success || !response.data) throw new Error(response.error || 'Failed to save response');
    return response.data;
  },

  async submitAttempt(attemptId: string, reason = 'Submitted by student') {
    const response = await apiService.post<{ redirect: string; attemptId: string }>('/aptitude/attempts/' + attemptId + '/submit', { reason });
    if (!response.success || !response.data) throw new Error(response.error || 'Failed to submit test');
    return response.data;
  },

  async getResult(attemptId: string) {
    const response = await apiService.get<AptitudeResult>('/aptitude/results/' + attemptId);
    if (!response.success || !response.data) throw new Error(response.error || 'Failed to load result');
    return response.data;
  },

  async getAdminSummary() {
    const response = await apiService.get<any>('/aptitude/admin/summary');
    if (!response.success || !response.data) throw new Error(response.error || 'Failed to load admin summary');
    return response.data;
  },

  async getAdminQuestions() {
    const response = await apiService.get<AptitudeQuestion[]>('/aptitude/admin/questions');
    if (!response.success || !response.data) throw new Error(response.error || 'Failed to load questions');
    return response.data;
  },

  async getAdminTests() {
    const response = await apiService.get<AptitudeTestSummary[]>('/aptitude/admin/tests');
    if (!response.success || !response.data) throw new Error(response.error || 'Failed to load tests');
    return response.data;
  },

  async createCategory(data: { name: string; description?: string }) {
    const response = await apiService.post('/aptitude/admin/categories', data);
    if (!response.success) throw new Error(response.error || 'Failed to create category');
    return response.data;
  },

  async createDifficulty(data: { name: string; description?: string }) {
    const response = await apiService.post('/aptitude/admin/difficulties', data);
    if (!response.success) throw new Error(response.error || 'Failed to create difficulty');
    return response.data;
  },

  async uploadQuestion(formData: FormData) {
    const response = await apiService.upload('/aptitude/admin/questions', formData);
    if (!response.success) throw new Error(response.error || 'Failed to upload question');
    return response.data;
  },

  async createTest(data: {
    title: string;
    description?: string;
    difficultyId: string;
    categoryId?: string;
    totalTimeMinutes: number;
    questionIds: string[];
    isActive: boolean;
  }) {
    const response = await apiService.post('/aptitude/admin/tests', data);
    if (!response.success) throw new Error(response.error || 'Failed to create test');
    return response.data;
  },
};

export default aptitudeService;
