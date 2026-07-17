import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Award, BarChart3, CheckCircle, Clock, Loader2, Target, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import aptitudeService, { getAptitudeAssetUrl } from '../services/aptitude';
import { AptitudeResult } from '../types/aptitude';

function formatSeconds(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return mins + 'm ' + String(secs).padStart(2, '0') + 's';
}

function list(items?: string[]) {
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground">No data available.</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className="text-sm text-muted-foreground flex gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function AptitudeResultPage() {
  const { attemptId = '' } = useParams();
  const [result, setResult] = useState<AptitudeResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResult();
  }, [attemptId]);

  const loadResult = async () => {
    try {
      setLoading(true);
      const data = await aptitudeService.getResult(attemptId);
      setResult(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load result');
    } finally {
      setLoading(false);
    }
  };

  const chartSegments = useMemo(() => {
    if (!result) return [];
    return [
      { label: 'Correct', value: result.attempt.correctCount, color: '#16a34a' },
      { label: 'Incorrect', value: result.attempt.incorrectCount, color: '#dc2626' },
      { label: 'Unanswered', value: result.attempt.unansweredCount, color: '#64748b' },
    ];
  }, [result]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Calculating result...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen py-20 px-4 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-semibold mb-2">Result not found</h2>
          <Link to="/aptitude"><Button>Back to tests</Button></Link>
        </Card>
      </div>
    );
  }

  const totalQuestions = result.attempt.correctCount + result.attempt.incorrectCount + result.attempt.unansweredCount;
  const answeredPercent = totalQuestions ? Math.round(((result.attempt.correctCount + result.attempt.incorrectCount) / totalQuestions) * 100) : 0;

  return (
    <div className="min-h-screen py-20 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">{result.test.title} Result</h1>
            <p className="text-muted-foreground">Detailed analytics, question review, and AI performance feedback.</p>
          </div>
          <Link to="/aptitude"><Button variant="outline">Attempt Another Test</Button></Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          <Card className="p-6 text-center">
            <div className="w-48 h-48 mx-auto rounded-full border-[20px] border-primary flex flex-col items-center justify-center mb-5">
              <p className="text-4xl font-bold text-primary">{result.attempt.accuracy}%</p>
              <p className="text-sm text-muted-foreground">Accuracy</p>
            </div>
            <h2 className="text-3xl font-bold">{result.attempt.score}/{result.attempt.totalMarks}</h2>
            <p className="text-muted-foreground">Final Score</p>
            <div className="mt-5 grid gap-2">
              {chartSegments.map((segment) => (
                <div key={segment.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><i className="w-3 h-3 rounded-full" style={{ background: segment.color }} />{segment.label}</span>
                  <strong>{segment.value}</strong>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5">
              <Award className="w-8 h-8 text-primary mb-3" />
              <p className="text-3xl font-bold text-primary">{result.attempt.score}</p>
              <p className="text-sm text-muted-foreground">Score</p>
            </Card>
            <Card className="p-5">
              <CheckCircle className="w-8 h-8 text-green-600 mb-3" />
              <p className="text-3xl font-bold text-primary">{result.attempt.correctCount}</p>
              <p className="text-sm text-muted-foreground">Correct</p>
            </Card>
            <Card className="p-5">
              <XCircle className="w-8 h-8 text-red-600 mb-3" />
              <p className="text-3xl font-bold text-primary">{result.attempt.incorrectCount}</p>
              <p className="text-sm text-muted-foreground">Incorrect</p>
            </Card>
            <Card className="p-5">
              <Clock className="w-8 h-8 text-purple-600 mb-3" />
              <p className="text-3xl font-bold text-primary">{formatSeconds(result.attempt.timeTakenSeconds)}</p>
              <p className="text-sm text-muted-foreground">Time Taken</p>
            </Card>
            <Card className="p-5 lg:col-span-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold">Attempted Questions</p>
                <p className="text-sm text-muted-foreground">{answeredPercent}%</p>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: answeredPercent + '%' }} />
              </div>
            </Card>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Category Analytics</h2>
            </div>
            <div className="space-y-4">
              {(result.feedback.categoryStats || []).map((stat) => (
                <div key={stat.name}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium">{stat.name}</span>
                    <span className="text-muted-foreground">{stat.accuracy}% accuracy | {stat.attempted}/{stat.total} attempted</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: stat.accuracy + '%' }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Target className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">AI Feedback</h2>
            </div>
            <p className="text-muted-foreground mb-4">{result.feedback.summary}</p>
            <h3 className="font-semibold mb-2">Strengths</h3>
            {list(result.feedback.strengths)}
            <h3 className="font-semibold mt-5 mb-2">Weaknesses</h3>
            {list(result.feedback.weaknesses)}
            <h3 className="font-semibold mt-5 mb-2">Time Management</h3>
            <p className="text-sm text-muted-foreground">{result.feedback.timeManagement}</p>
            <h3 className="font-semibold mt-5 mb-2">Recommended Study Plan</h3>
            {list(result.feedback.studyPlan)}
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-5">Detailed Question Review</h2>
          <div className="space-y-5">
            {result.review.map((question) => {
              const state = !question.selectedOption ? 'Unanswered' : question.isCorrect ? 'Correct' : 'Incorrect';
              const stateClass = state === 'Correct' ? 'bg-green-100 text-green-700' : state === 'Incorrect' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700';
              return (
                <div key={question.id} className="grid lg:grid-cols-[260px_1fr] gap-5 border-t border-border pt-5">
                  <img src={getAptitudeAssetUrl(question.imagePath)} alt={'Question ' + question.position} className="w-full rounded-lg border border-border bg-white" />
                  <div>
                    <span className={'inline-flex px-3 py-1 rounded-full text-sm font-semibold mb-3 ' + stateClass}>{state}</span>
                    <h3 className="text-xl font-semibold mb-2">Question {question.position}</h3>
                    <p className="text-sm text-muted-foreground mb-2">Your answer: <b>{question.selectedOption || '-'}</b> | Correct answer: <b>{question.correctOption}</b></p>
                    <p className="text-sm text-muted-foreground mb-2">Category: {question.category} | Difficulty: {question.difficulty} | Time: {formatSeconds(question.timeSpentSeconds)}</p>
                    <p className="text-sm leading-6">{question.explanation || 'No explanation added.'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
