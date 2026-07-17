import { FormEvent, useEffect, useMemo, useState } from 'react';
import { FileImage, Layers, ListChecks, Loader2, Plus, Settings, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import aptitudeService, { getAptitudeAssetUrl } from '../services/aptitude';
import { AptitudeCategory, AptitudeDifficulty, AptitudeQuestion, AptitudeTestSummary } from '../types/aptitude';

export function AptitudeAdminPage() {
  const [summary, setSummary] = useState<any>(null);
  const [categories, setCategories] = useState<AptitudeCategory[]>([]);
  const [difficulties, setDifficulties] = useState<AptitudeDifficulty[]>([]);
  const [questions, setQuestions] = useState<AptitudeQuestion[]>([]);
  const [tests, setTests] = useState<AptitudeTestSummary[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [meta, summaryData, questionData, testData] = await Promise.all([
        aptitudeService.getMeta(),
        aptitudeService.getAdminSummary(),
        aptitudeService.getAdminQuestions(),
        aptitudeService.getAdminTests(),
      ]);
      setCategories(meta.categories || []);
      setDifficulties(meta.difficulties || []);
      setSummary(summaryData);
      setQuestions(questionData);
      setTests(testData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load aptitude admin data');
    } finally {
      setLoading(false);
    }
  };

  const firstCategory = categories[0]?._id || categories[0]?.id || '';
  const firstDifficulty = difficulties[0]?._id || difficulties[0]?.id || '';

  const groupedQuestions = useMemo(() => {
    return questions.reduce((map: Record<string, AptitudeQuestion[]>, question) => {
      const key = question.difficulty + ' / ' + question.category;
      if (!map[key]) map[key] = [];
      map[key].push(question);
      return map;
    }, {});
  }, [questions]);

  const createCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setSaving(true);
      await aptitudeService.createCategory({
        name: String(form.get('name') || ''),
        description: String(form.get('description') || ''),
      });
      toast.success('Category created');
      event.currentTarget.reset();
      await loadAll();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  const createDifficulty = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setSaving(true);
      await aptitudeService.createDifficulty({
        name: String(form.get('name') || ''),
        description: String(form.get('description') || ''),
      });
      toast.success('Difficulty level created');
      event.currentTarget.reset();
      await loadAll();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create difficulty');
    } finally {
      setSaving(false);
    }
  };

  const uploadQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setSaving(true);
      await aptitudeService.uploadQuestion(form);
      toast.success('Question uploaded');
      event.currentTarget.reset();
      await loadAll();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload question');
    } finally {
      setSaving(false);
    }
  };

  const createTest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setSaving(true);
      await aptitudeService.createTest({
        title: String(form.get('title') || ''),
        description: String(form.get('description') || ''),
        difficultyId: String(form.get('difficultyId') || ''),
        categoryId: String(form.get('categoryId') || ''),
        totalTimeMinutes: Number(form.get('totalTimeMinutes') || 60),
        questionIds: selectedQuestions,
        isActive: form.get('isActive') === 'on',
      });
      toast.success('Test created');
      setSelectedQuestions([]);
      event.currentTarget.reset();
      await loadAll();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create test');
    } finally {
      setSaving(false);
    }
  };

  const toggleQuestion = (questionId: string) => {
    setSelectedQuestions((current) => current.includes(questionId) ? current.filter((id) => id !== questionId) : current.concat(questionId));
  };

  if (loading) {
    return (
      <div className="min-h-screen py-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading aptitude admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-primary rounded-full text-sm font-semibold mb-3">
            <Settings className="w-4 h-4" /> Admin Module
          </div>
          <h1 className="text-4xl font-bold mb-2">Aptitude Test Management</h1>
          <p className="text-muted-foreground">Upload question images, manage categories and difficulty levels, and create exam-style tests.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            ['Categories', summary?.categories || 0, Layers],
            ['Difficulties', summary?.difficulties || 0, Settings],
            ['Questions', summary?.questions || 0, FileImage],
            ['Tests', summary?.tests || 0, ListChecks],
            ['Attempts', summary?.attempts || 0, Trophy],
          ].map(([label, value, Icon]: any) => (
            <Card key={label} className="p-5">
              <Icon className="w-7 h-7 text-primary mb-3" />
              <p className="text-3xl font-bold text-primary">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Add Category</h2>
            <form onSubmit={createCategory} className="space-y-4">
              <input name="name" required placeholder="Category name" className="w-full px-4 py-3 border border-border rounded-lg" />
              <textarea name="description" placeholder="Description" className="w-full px-4 py-3 border border-border rounded-lg min-h-[90px]" />
              <Button disabled={saving}><Plus className="w-4 h-4 mr-2" />Save Category</Button>
            </form>
            <div className="mt-5 flex flex-wrap gap-2">
              {categories.map((category) => <span key={category._id} className="px-3 py-1 bg-gray-100 rounded-full text-sm">{category.name}</span>)}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Add Difficulty Level</h2>
            <form onSubmit={createDifficulty} className="space-y-4">
              <input name="name" required placeholder="Easy / Medium / Hard" className="w-full px-4 py-3 border border-border rounded-lg" />
              <textarea name="description" placeholder="Description" className="w-full px-4 py-3 border border-border rounded-lg min-h-[90px]" />
              <Button disabled={saving}><Plus className="w-4 h-4 mr-2" />Save Difficulty</Button>
            </form>
            <div className="mt-5 flex flex-wrap gap-2">
              {difficulties.map((difficulty) => <span key={difficulty._id} className="px-3 py-1 bg-gray-100 rounded-full text-sm">{difficulty.name}</span>)}
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Question Image</h2>
            <form onSubmit={uploadQuestion} className="space-y-4">
              <input name="image" type="file" accept="image/*" required className="w-full px-4 py-3 border border-border rounded-lg bg-white" />
              <div className="grid md:grid-cols-2 gap-3">
                <select name="correctOption" required className="px-4 py-3 border border-border rounded-lg bg-white">
                  <option value="A">Correct: A</option>
                  <option value="B">Correct: B</option>
                  <option value="C">Correct: C</option>
                  <option value="D">Correct: D</option>
                </select>
                <select name="categoryId" defaultValue={firstCategory} required className="px-4 py-3 border border-border rounded-lg bg-white">
                  {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
                </select>
                <select name="difficultyId" defaultValue={firstDifficulty} required className="px-4 py-3 border border-border rounded-lg bg-white">
                  {difficulties.map((difficulty) => <option key={difficulty._id} value={difficulty._id}>{difficulty.name}</option>)}
                </select>
                <input name="marks" type="number" min="1" defaultValue="1" className="px-4 py-3 border border-border rounded-lg" />
                <input name="timeLimitSeconds" type="number" min="30" defaultValue="60" className="px-4 py-3 border border-border rounded-lg" />
              </div>
              <textarea name="explanation" placeholder="Explanation after result" className="w-full px-4 py-3 border border-border rounded-lg min-h-[100px]" />
              <Button disabled={saving}><FileImage className="w-4 h-4 mr-2" />Upload Question</Button>
            </form>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Create Test</h2>
            <form onSubmit={createTest} className="space-y-4">
              <input name="title" required placeholder="Test title" className="w-full px-4 py-3 border border-border rounded-lg" />
              <textarea name="description" placeholder="Test description" className="w-full px-4 py-3 border border-border rounded-lg min-h-[80px]" />
              <div className="grid md:grid-cols-3 gap-3">
                <select name="difficultyId" defaultValue={firstDifficulty} required className="px-4 py-3 border border-border rounded-lg bg-white">
                  {difficulties.map((difficulty) => <option key={difficulty._id} value={difficulty._id}>{difficulty.name}</option>)}
                </select>
                <select name="categoryId" defaultValue="" className="px-4 py-3 border border-border rounded-lg bg-white">
                  <option value="">Mixed Category</option>
                  {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
                </select>
                <input name="totalTimeMinutes" type="number" min="1" defaultValue="60" className="px-4 py-3 border border-border rounded-lg" />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium"><input name="isActive" type="checkbox" defaultChecked /> Active test</label>
              <div className="border border-border rounded-lg p-3 bg-white max-h-72 overflow-auto space-y-3">
                {Object.entries(groupedQuestions).map(([group, groupQuestions]) => (
                  <div key={group}>
                    <p className="text-sm font-semibold mb-2 text-muted-foreground">{group}</p>
                    <div className="grid gap-2">
                      {groupQuestions.map((question) => (
                        <label key={question.id} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={selectedQuestions.includes(question.id)} onChange={() => toggleQuestion(question.id)} />
                          <span>Q {question.id.slice(-5)} | Ans {question.correctOption} | {question.marks} mark(s)</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Button disabled={saving || selectedQuestions.length === 0}><ListChecks className="w-4 h-4 mr-2" />Create Test ({selectedQuestions.length})</Button>
            </form>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-6 overflow-auto">
            <h2 className="text-xl font-semibold mb-4">Question Bank</h2>
            <div className="space-y-4 max-h-[520px] overflow-auto pr-2">
              {questions.map((question) => (
                <div key={question.id} className="grid grid-cols-[110px_1fr] gap-4 border border-border rounded-lg p-3 bg-white">
                  <img src={getAptitudeAssetUrl(question.imagePath)} alt="Question" className="w-full rounded border border-border bg-gray-50" />
                  <div className="text-sm">
                    <p className="font-semibold">{question.category} | {question.difficulty}</p>
                    <p className="text-muted-foreground">Correct option: {question.correctOption} | Marks: {question.marks}</p>
                    <p className="text-muted-foreground line-clamp-2">{question.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 overflow-auto">
            <h2 className="text-xl font-semibold mb-4">Created Tests</h2>
            <div className="space-y-3">
              {tests.map((test) => (
                <div key={test.id} className="border border-border rounded-lg p-4 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{test.title}</h3>
                      <p className="text-sm text-muted-foreground">{test.difficulty} | {test.questionCount} questions | {test.totalTimeMinutes} min</p>
                    </div>
                    <span className={'px-2 py-1 rounded-full text-xs font-semibold ' + (test.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600')}>{test.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
