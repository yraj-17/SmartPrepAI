import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, Eraser, EyeOff, Flag, Loader2, Maximize, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import aptitudeService, { getAptitudeAssetUrl } from '../services/aptitude';
import { AptitudeAttemptState, AptitudeOption, AptitudeQuestion, AptitudeQuestionStatus } from '../types/aptitude';

const optionList: AptitudeOption[] = ['A', 'B', 'C', 'D'];

function getStatus(response: any): AptitudeQuestionStatus {
  if (response?.isMarked) return 'marked_for_review';
  if (response?.selectedOption) return 'answered';
  if (response?.status === 'not_visited') return 'not_visited';
  return 'not_answered';
}

function statusClasses(status: AptitudeQuestionStatus) {
  if (status === 'answered') return 'bg-green-600 text-white';
  if (status === 'not_answered') return 'bg-red-600 text-white';
  if (status === 'marked_for_review') return 'bg-yellow-400 text-gray-950';
  return 'bg-gray-200 text-gray-700';
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

export function AptitudeExamPage() {
  const { attemptId = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<AptitudeAttemptState | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [secureNote, setSecureNote] = useState('Secure mode active');
  const lastTickRef = useRef(Date.now());
  const dataRef = useRef<AptitudeAttemptState | null>(null);
  const currentIndexRef = useRef(0);
  const submittedRef = useRef(false);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    loadState();
  }, [attemptId]);

  useEffect(() => {
    const prevent = (event: Event) => event.preventDefault();
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('copy', prevent);
    document.addEventListener('paste', prevent);
    const onVisibility = () => setSecureNote(document.hidden ? 'Tab switch detected. Your progress is saved.' : 'Secure mode active');
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('copy', prevent);
      document.removeEventListener('paste', prevent);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    const timer = window.setInterval(() => {
      const endsAt = new Date(data.attempt.endsAt).getTime();
      const remaining = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining <= 0 && !submittedRef.current) {
        submittedRef.current = true;
        submitExam(false, 'Timer ended');
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [data?.attempt.endsAt]);

  useEffect(() => {
    if (!data) return;
    const autosave = window.setInterval(() => {
      saveCurrentQuestion();
    }, 10000);
    return () => window.clearInterval(autosave);
  }, [data?.attempt.id]);

  const loadState = async () => {
    try {
      setLoading(true);
      const state = await aptitudeService.getAttemptState(attemptId);
      if (state.attempt.status === 'submitted') {
        navigate('/aptitude/results/' + attemptId);
        return;
      }
      const first = state.questions[0];
      if (first?.response && first.response.status === 'not_visited') first.response.status = 'not_answered';
      setData(state);
      setRemainingSeconds(Math.max(0, Math.floor((new Date(state.attempt.endsAt).getTime() - Date.now()) / 1000)));
      lastTickRef.current = Date.now();
    } catch (error: any) {
      toast.error(error.message || 'Failed to load exam');
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = useMemo(() => {
    return data?.questions[currentIndex] || null;
  }, [data, currentIndex]);

  const updateLocalResponse = (questionId: string, patch: any) => {
    setData((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        questions: previous.questions.map((question) => {
          if (question.id !== questionId) return question;
          const current = question.response || { selectedOption: null, status: 'not_visited', isMarked: false, timeSpentSeconds: 0 };
          return { ...question, response: { ...current, ...patch } };
        }),
      };
    });
  };

  const getTimeDelta = () => {
    const now = Date.now();
    const delta = Math.max(0, Math.round((now - lastTickRef.current) / 1000));
    lastTickRef.current = now;
    return delta;
  };

  const saveCurrentQuestion = async (extra: any = {}) => {
    const liveData = dataRef.current;
    const question = liveData?.questions[currentIndexRef.current];
    if (!question || liveData?.attempt.status !== 'in_progress') return null;
    try {
      setSaving(true);
      const response = await aptitudeService.saveResponse(attemptId, {
        questionId: question.id,
        selectedOption: question.response?.selectedOption || null,
        isMarked: Boolean(question.response?.isMarked),
        visited: true,
        timeSpentDelta: getTimeDelta(),
        ...extra,
      });
      if (response.redirect) navigate(response.redirect);
      if (response.status) {
        updateLocalResponse(question.id, {
          selectedOption: response.selectedOption || null,
          isMarked: response.isMarked,
          status: response.status,
        });
      }
      return response;
    } catch (error: any) {
      console.error(error);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const chooseOption = (option: AptitudeOption) => {
    if (!currentQuestion) return;
    const marked = Boolean(currentQuestion.response?.isMarked);
    updateLocalResponse(currentQuestion.id, {
      selectedOption: option,
      status: marked ? 'marked_for_review' : 'answered',
    });
    window.setTimeout(() => saveCurrentQuestion({ selectedOption: option }), 0);
  };

  const clearResponse = () => {
    if (!currentQuestion) return;
    const marked = Boolean(currentQuestion.response?.isMarked);
    updateLocalResponse(currentQuestion.id, {
      selectedOption: null,
      status: marked ? 'marked_for_review' : 'not_answered',
    });
    window.setTimeout(() => saveCurrentQuestion({ clearResponse: true, selectedOption: null }), 0);
  };

  const toggleReview = () => {
    if (!currentQuestion) return;
    const nextMarked = !currentQuestion.response?.isMarked;
    updateLocalResponse(currentQuestion.id, {
      isMarked: nextMarked,
      status: nextMarked ? 'marked_for_review' : (currentQuestion.response?.selectedOption ? 'answered' : 'not_answered'),
    });
    window.setTimeout(() => saveCurrentQuestion({ isMarked: nextMarked }), 0);
  };

  const moveTo = async (nextIndex: number) => {
    if (!data || nextIndex < 0 || nextIndex >= data.questions.length || nextIndex === currentIndex) return;
    await saveCurrentQuestion();
    setCurrentIndex(nextIndex);
    currentIndexRef.current = nextIndex;
    lastTickRef.current = Date.now();
    const nextQuestion = data.questions[nextIndex];
    if (nextQuestion.response?.status === 'not_visited') {
      updateLocalResponse(nextQuestion.id, { status: 'not_answered' });
      window.setTimeout(() => saveCurrentQuestion({ questionId: nextQuestion.id, timeSpentDelta: 0 }), 0);
    }
  };

  const submitExam = async (confirmFirst = true, reason = 'Submitted by student') => {
    if (confirmFirst && !window.confirm('Submit this aptitude test now?')) return;
    try {
      submittedRef.current = true;
      await saveCurrentQuestion();
      const result = await aptitudeService.submitAttempt(attemptId, reason);
      navigate(result.redirect || ('/aptitude/results/' + attemptId));
    } catch (error: any) {
      submittedRef.current = false;
      toast.error(error.message || 'Failed to submit exam');
    }
  };

  const openFullscreen = () => {
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Preparing secure exam...</p>
        </div>
      </div>
    );
  }

  if (!data || !currentQuestion) {
    return (
      <div className="min-h-screen py-20 px-4 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <EyeOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Exam not available</h2>
          <p className="text-muted-foreground mb-4">This attempt could not be loaded.</p>
          <Button onClick={() => navigate('/aptitude')}>Back to tests</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-3 bg-gray-100">
      <div className="max-w-[1500px] mx-auto grid grid-cols-1 xl:grid-cols-[1fr_330px] gap-4">
        <Card className="overflow-hidden border border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-border bg-white">
            <div>
              <h1 className="text-xl font-bold">{data.test.title}</h1>
              <p className="text-sm text-muted-foreground">Question {currentIndex + 1} of {data.questions.length} | {currentQuestion.category} | {currentQuestion.difficulty}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={openFullscreen}><Maximize className="w-4 h-4 mr-2" />Fullscreen</Button>
              <div className={'px-4 py-2 rounded-lg font-mono text-xl font-bold text-white ' + (remainingSeconds <= 300 ? 'bg-red-700' : 'bg-gray-950')}>{formatTime(remainingSeconds)}</div>
              <Button variant="destructive" size="sm" onClick={() => submitExam(true)}><Send className="w-4 h-4 mr-2" />Submit</Button>
            </div>
          </div>

          <div className="bg-gray-50 p-4 flex justify-center min-h-[420px] max-h-[calc(100vh-350px)] overflow-auto">
            <img
              src={getAptitudeAssetUrl(currentQuestion.imagePath)}
              alt={'Question ' + (currentIndex + 1)}
              className="max-w-full object-contain bg-white border border-border rounded-lg shadow-sm"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-white border-t border-border">
            {optionList.map((option) => (
              <button
                key={option}
                onClick={() => chooseOption(option)}
                className={'h-12 rounded-lg border-2 font-bold text-lg transition-colors ' + (currentQuestion.response?.selectedOption === option ? 'border-primary bg-blue-100 text-primary' : 'border-border bg-white hover:border-primary')}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 bg-white border-t border-border">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={currentIndex === 0} onClick={() => moveTo(currentIndex - 1)}><ArrowLeft className="w-4 h-4 mr-2" />Previous</Button>
              <Button variant="outline" onClick={toggleReview}><Flag className="w-4 h-4 mr-2" />{currentQuestion.response?.isMarked ? 'Unmark Review' : 'Mark for Review'}</Button>
              <Button variant="outline" onClick={clearResponse}><Eraser className="w-4 h-4 mr-2" />Clear Response</Button>
            </div>
            <Button disabled={currentIndex === data.questions.length - 1} onClick={() => moveTo(currentIndex + 1)}>Next<ArrowRight className="w-4 h-4 ml-2" /></Button>
          </div>
        </Card>

        <Card className="p-5 h-fit sticky top-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Question Palette</h2>
            <span className="text-xs text-muted-foreground">{saving ? 'Saving...' : 'Autosaved'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-5">
            <span className="flex items-center gap-2"><i className="w-3 h-3 rounded-full bg-green-600" />Answered</span>
            <span className="flex items-center gap-2"><i className="w-3 h-3 rounded-full bg-red-600" />Not Answered</span>
            <span className="flex items-center gap-2"><i className="w-3 h-3 rounded-full bg-yellow-400" />Marked</span>
            <span className="flex items-center gap-2"><i className="w-3 h-3 rounded-full bg-gray-200" />Not Visited</span>
          </div>
          <div className="grid grid-cols-5 gap-2 mb-5">
            {data.questions.map((question: AptitudeQuestion, index: number) => {
              const status = getStatus(question.response);
              return (
                <button
                  key={question.id}
                  onClick={() => moveTo(index)}
                  className={'aspect-square rounded-lg font-bold ' + statusClasses(status) + (index === currentIndex ? ' ring-4 ring-gray-950 ring-offset-2' : '')}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <div className="p-3 rounded-lg bg-gray-50 text-sm text-muted-foreground flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-primary mt-0.5" />
            <span>{secureNote}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
