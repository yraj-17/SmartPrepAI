import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Clock, ClipboardCheck, Loader2, Play, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import aptitudeService from '../services/aptitude';
import { AptitudeDifficulty, AptitudeTestSummary } from '../types/aptitude';

export function AptitudeTestsPage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<AptitudeTestSummary[]>([]);
  const [difficulties, setDifficulties] = useState<AptitudeDifficulty[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTests(selectedDifficulty);
  }, [selectedDifficulty]);

  const loadData = async () => {
    try {
      setLoading(true);
      const meta = await aptitudeService.getMeta();
      setDifficulties(meta.difficulties || []);
      await loadTests('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to load aptitude tests');
    } finally {
      setLoading(false);
    }
  };

  const loadTests = async (difficultyId: string) => {
    try {
      const data = await aptitudeService.getTests(difficultyId || undefined);
      setTests(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load tests');
    }
  };

  const startTest = async (testId: string) => {
    try {
      setStartingId(testId);
      const result = await aptitudeService.startAttempt(testId);
      navigate('/aptitude/exam/' + result.attemptId);
    } catch (error: any) {
      toast.error(error.message || 'Unable to start test');
    } finally {
      setStartingId('');
    }
  };

  const totals = useMemo(() => {
    return {
      tests: tests.length,
      questions: tests.reduce((sum, test) => sum + test.questionCount, 0),
      minutes: tests.reduce((sum, test) => sum + test.totalTimeMinutes, 0),
    };
  }, [tests]);

  if (loading) {
    return (
      <div className="min-h-screen py-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading aptitude tests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-primary rounded-full text-sm font-semibold mb-3">
              <ClipboardCheck className="w-4 h-4" /> Placement Aptitude Module
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Aptitude Mock Tests</h1>
            <p className="text-muted-foreground max-w-2xl">
              Practice image-based online exams with a one-hour timer, question palette, autosave, and AI performance feedback.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedDifficulty('')}
              className={'px-4 py-2 rounded-lg border font-semibold ' + (!selectedDifficulty ? 'bg-primary text-white border-primary' : 'bg-white text-foreground border-border')}
            >
              All
            </button>
            {difficulties.map((difficulty) => (
              <button
                key={difficulty._id}
                onClick={() => setSelectedDifficulty(difficulty._id)}
                className={'px-4 py-2 rounded-lg border font-semibold ' + (selectedDifficulty === difficulty._id ? 'bg-primary text-white border-primary' : 'bg-white text-foreground border-border')}
              >
                {difficulty.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5">
            <Brain className="w-8 h-8 text-primary mb-3" />
            <p className="text-3xl font-bold text-primary">{totals.tests}</p>
            <p className="text-sm text-muted-foreground">Available Tests</p>
          </Card>
          <Card className="p-5">
            <Target className="w-8 h-8 text-green-600 mb-3" />
            <p className="text-3xl font-bold text-primary">{totals.questions}</p>
            <p className="text-sm text-muted-foreground">Practice Questions</p>
          </Card>
          <Card className="p-5">
            <Clock className="w-8 h-8 text-purple-600 mb-3" />
            <p className="text-3xl font-bold text-primary">60m</p>
            <p className="text-sm text-muted-foreground">Default Exam Timer</p>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {tests.map((test) => (
            <Card key={test.id} className="p-6 flex flex-col justify-between gap-6 hover:shadow-lg transition-shadow">
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <span className="px-3 py-1 bg-blue-100 text-primary rounded-full text-sm font-semibold">{test.difficulty}</span>
                  <span className="text-sm text-muted-foreground">{test.questionCount} questions</span>
                </div>
                <h2 className="text-2xl font-bold mb-3">{test.title}</h2>
                <p className="text-muted-foreground text-sm leading-6">{test.description || 'Professional image-based aptitude mock test.'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Timer</p>
                  <p className="font-bold">{test.totalTimeMinutes} min</p>
                </div>
                <div className="bg-gray-50 border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-bold truncate">{test.category || 'Mixed'}</p>
                </div>
              </div>
              <Button
                variant="default"
                className="w-full"
                disabled={!test.questionCount || startingId === test.id}
                onClick={() => startTest(test.id)}
              >
                {startingId === test.id ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Play className="mr-2 w-4 h-4" />}
                Start Test
              </Button>
            </Card>
          ))}
        </div>

        {tests.length === 0 && (
          <Card className="p-10 text-center">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No tests found</h2>
            <p className="text-muted-foreground">Ask admin to create an aptitude test for this difficulty level.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
