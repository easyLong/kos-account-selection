import React, { useState, useEffect, useRef } from 'react';
import { 
  SURVEY_MODULES, 
  SCALE_OPTIONS, 
  calculateABSRating 
} from '../data/questionnaireData';

// Flatten all questions with their parent module info
function flattenModules(modules) {
  const result = [];
  (modules || []).forEach((m, mIdx) => {
    (m.questions || []).forEach((q) => {
      result.push({
        ...q,
        moduleIndex: mIdx + 1,
        moduleTotal: (modules || []).length,
        moduleId: m.id,
        moduleName: m.name,
        moduleDesc: m.desc
      });
    });
  });
  return result;
}

export default function Step2Survey({ formData, onChange, onNext, onPrev }) {
  const [flatQuestions, setFlatQuestions] = useState(() => flattenModules(SURVEY_MODULES));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState(() => formData.surveyAnswers || {});
  const [animDirection, setAnimDirection] = useState('forward');
  const [shakeCard, setShakeCard] = useState(false);
  const [toastTip, setToastTip] = useState(null);
  const [unansweredModal, setUnansweredModal] = useState(null);
  const cardRef = useRef(null);
  const advanceTimerRef = useRef(null);
  const isTransitioningRef = useRef(false);

  // Clean up any pending timer on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  // Fetch dynamic questions from database/API
  useEffect(() => {
    fetch('/api/survey/questions')
      .then(r => r.json())
      .then(res => {
        if (res.code === 0 && res.data?.modules?.length > 0) {
          setFlatQuestions(flattenModules(res.data.modules));
        }
      })
      .catch(() => {});
  }, []);

  const currentQ = flatQuestions[currentIdx] || flatQuestions[0] || {};
  const totalCount = flatQuestions.length || 27;

  // Calculate answered count dynamically
  let answeredCount = 0;
  let scaleScore = 0;
  let subjectiveScore = 0;

  flatQuestions.forEach(q => {
    const val = answers[q.id];
    if (q.type === 'scale') {
      if (val !== undefined && val !== null && val !== '') {
        answeredCount++;
        scaleScore += Number(val);
      }
    } else {
      if (typeof val === 'string' && val.trim()) {
        answeredCount++;
        subjectiveScore += val.trim().length > 10 ? 8 : 4;
      }
    }
  });

  const totalScore = scaleScore + subjectiveScore;
  const absRating = calculateABSRating(scaleScore, subjectiveScore);

  // Check whether a question is answered
  const isQuestionAnswered = (q) => {
    if (!q) return false;
    const val = answers[q.id];
    if (q.type === 'scale') {
      return val !== undefined && val !== null && val !== '';
    } else {
      return typeof val === 'string' && val.trim().length > 0;
    }
  };

  const triggerShakeAndToast = (msg) => {
    setShakeCard(true);
    setToastTip(msg);
    setTimeout(() => setShakeCard(false), 450);
    setTimeout(() => setToastTip(null), 2500);
  };

  // Handle scale option tap: auto-advance with anti-spam transition lock
  const handleSelectOption = (val) => {
    // Prevent multiple rapid clicks from scheduling multiple advances
    if (isTransitioningRef.current) return;

    const nextAnswers = { ...answers, [currentQ.id]: val };
    setAnswers(nextAnswers);
    onChange({ surveyAnswers: nextAnswers });

    // Clear any existing pending advance timer
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    // Auto glide to next question after 180ms
    if (currentIdx < totalCount - 1) {
      isTransitioningRef.current = true;
      advanceTimerRef.current = setTimeout(() => {
        setAnimDirection('forward');
        setCurrentIdx(prev => prev + 1);
        advanceTimerRef.current = null;
        // Release lock after card slide animation finishes
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 240);
      }, 180);
    }
  };

  const handleTextChange = (text) => {
    const nextAnswers = { ...answers, [currentQ.id]: text };
    setAnswers(nextAnswers);
    onChange({ surveyAnswers: nextAnswers });
  };

  const handlePrevQuestion = () => {
    if (isTransitioningRef.current) return;
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    if (currentIdx > 0) {
      isTransitioningRef.current = true;
      setAnimDirection('backward');
      setCurrentIdx(prev => prev - 1);
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 260);
    } else {
      onPrev();
    }
  };

  const handleNextQuestion = () => {
    if (isTransitioningRef.current) return;

    if (!isQuestionAnswered(currentQ)) {
      triggerShakeAndToast(`请先完成当前第 Q${String(currentIdx + 1).padStart(2, '0')} 题再继续`);
      return;
    }

    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    if (currentIdx < totalCount - 1) {
      isTransitioningRef.current = true;
      setAnimDirection('forward');
      setCurrentIdx(prev => prev + 1);
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 260);
    }
  };

  const proceedToNextStep = () => {
    setUnansweredModal(null);
    const finalData = {
      surveyCompleted: true,
      surveyAnswers: answers,
      surveyScore: totalScore,
      surveyScaleScore: scaleScore,
      surveySubjectiveScore: subjectiveScore,
      surveyRating: absRating.level,
      surveyTime: new Date().toLocaleString('zh-CN', { hour12: false })
    };
    onChange(finalData);
    onNext();
  };

  // Complete survey: validate all questions, jump if unanswered
  const handleCompleteSurvey = () => {
    if (!isQuestionAnswered(currentQ)) {
      triggerShakeAndToast(`请先完成当前第 Q${String(currentIdx + 1).padStart(2, '0')} 题再提交`);
    }

    const unanswered = [];
    flatQuestions.forEach((q, idx) => {
      if (!isQuestionAnswered(q)) {
        unanswered.push({
          idx,
          id: q.id,
          displayNum: `Q${String(idx + 1).padStart(2, '0')}`,
          moduleName: (q.moduleName || '问卷测评').split('·')[0],
          type: q.type,
          text: q.text
        });
      }
    });

    if (unanswered.length > 0) {
      setUnansweredModal(unanswered);
      return;
    }

    proceedToNextStep();
  };

  const jumpToQuestion = (targetIdx) => {
    setUnansweredModal(null);
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    isTransitioningRef.current = true;
    setAnimDirection(targetIdx > currentIdx ? 'forward' : 'backward');
    setCurrentIdx(targetIdx);
    setTimeout(() => {
      isTransitioningRef.current = false;
      triggerShakeAndToast(`已为您定位至未答题目 (Q${String(targetIdx + 1).padStart(2, '0')})`);
    }, 200);
  };

  const progressPercent = Math.round((answeredCount / totalCount) * 100);
  const isLastQuestion = currentIdx === totalCount - 1;
  const isCurrentAnswered = isQuestionAnswered(currentQ);

  return (
    <div className="native-survey-wrapper animate-fade-in">
      {/* Top Questionnaire Status Bar */}
      <div className="survey-meta-strip">
        <div className="survey-module-badge">
          <span className="sparkle">✦</span>
          <span>{(currentQ.moduleName || '问卷测评').split('·')[0]}</span>
          {(currentQ.moduleName || '').includes('·') && (
            <span className="module-title-sub">· {(currentQ.moduleName || '').split('·')[1]}</span>
          )}
        </div>

        <div className="survey-strip-right">
          <span className="survey-step-num">
            <strong>{currentIdx + 1}</strong> / {totalCount} 题
          </span>
        </div>
      </div>

      {/* Thin Gold Progress Bar */}
      <div className="survey-progress-track">
        <div 
          className="survey-progress-fill" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Native Question Card */}
      <div 
        ref={cardRef} 
        key={currentQ.id} 
        className={`native-question-card animate-card-${animDirection} ${shakeCard ? 'shake-card' : ''}`}
      >
        {/* Module Context Hint */}
        <div className="q-card-top-info">
          <span className="q-badge-num">Q{String(currentIdx + 1).padStart(2, '0')}</span>
          <span className="q-warm-hint">
            <span className="sparkle-tiny">✦</span>
            <span>请如实填写，帮助我们更好的认识你</span>
          </span>
        </div>

        {/* Question Statement */}
        <h3 className="q-main-title">
          {currentQ.text}
        </h3>

        {/* Scale Question (Q1-Q25) */}
        {currentQ.type === 'scale' ? (
          <div className="scale-options-list">
            {SCALE_OPTIONS.map((opt) => {
              const isSelected = answers[currentQ.id] === opt.val;
              return (
                <button
                  key={opt.val}
                  type="button"
                  className={`scale-option-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectOption(opt.val)}
                >
                  <div className="scale-left">
                    <span className="scale-score-circle">{opt.val}</span>
                    <span className="scale-label-text">{opt.label}</span>
                  </div>
                  <div className="scale-radio-indicator">
                    {isSelected && <span className="scale-check-dot">✓</span>}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Open-ended Question (Q26, Q27) */
          <div className="text-question-container">
            <textarea
              rows="4"
              className="native-survey-textarea"
              placeholder={currentQ.placeholder || '请分享你的构思与积累……'}
              value={answers[currentQ.id] || ''}
              onChange={(e) => handleTextChange(e.target.value)}
            />

            <div className="text-word-count" style={{ justifyContent: 'flex-end' }}>
              <span>{(answers[currentQ.id] || '').length} 字</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="native-survey-bottom-bar">
        <button 
          type="button" 
          className="btn-survey-prev" 
          onClick={handlePrevQuestion}
        >
          {currentIdx === 0 ? '‹ 个人介绍' : '‹ 上一题'}
        </button>

        {isLastQuestion ? (
          <button 
            type="button" 
            className="btn-survey-submit btn-gold-primary" 
            onClick={handleCompleteSurvey}
          >
            <span>✓ 完成问卷，下一步：视频提案</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </button>
        ) : (
          <button 
            type="button" 
            className={`btn-survey-next ${isCurrentAnswered ? 'btn-next-answered' : ''}`}
            onClick={handleNextQuestion}
          >
            <span>下一题 ›</span>
          </button>
        )}
      </div>

      {/* Floating Gentle Toast Hint */}
      {toastTip && (
        <div className="survey-toast-tip animate-fade-in">
          <span className="toast-icon">💡</span>
          <span className="toast-text">{toastTip}</span>
        </div>
      )}

      {/* Unanswered Check Modal */}
      {unansweredModal && (() => {
        const hasScaleUnanswered = unansweredModal.some(item => item.type === 'scale');
        return (
          <div className="modal-backdrop animate-fade-in" onClick={() => setUnansweredModal(null)}>
            <div className="modal-dialog survey-unanswered-dialog" onClick={e => e.stopPropagation()}>
              <div className="unanswered-modal-header">
                <div className="unanswered-icon-wrap">
                  <span className="unanswered-icon">{hasScaleUnanswered ? '📝' : '✨'}</span>
                </div>
                <div className="unanswered-header-text">
                  <h4 className="unanswered-modal-title">
                    还有 <strong>{unansweredModal.length}</strong> 道{hasScaleUnanswered ? '题目尚未作答' : '简答加分题未填写'}
                  </h4>
                  <p className="unanswered-modal-sub">
                    {hasScaleUnanswered 
                      ? '请补齐以下题目后再提交，助我们全面了解你的特长与风格'
                      : '开放思考题为评定 S级/A级 标杆 IP 的核心加分项。建议填写，亦可直接提交进入下一步'}
                  </p>
                </div>
                <button 
                  type="button" 
                  className="modal-close-btn" 
                  onClick={() => setUnansweredModal(null)}
                >
                  ✕
                </button>
              </div>

              <div className="unanswered-pills-list">
                <span className="pills-label">未答题目清单 (点击可直达对应题目)：</span>
                <div className="pills-grid">
                  {unansweredModal.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="unanswered-pill-btn"
                      onClick={() => jumpToQuestion(item.idx)}
                    >
                      <span className="pill-q-num">{item.displayNum}</span>
                      <span className="pill-q-module">{item.moduleName}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="unanswered-modal-actions">
                {hasScaleUnanswered ? (
                  <>
                    <button
                      type="button"
                      className="btn-modal-ghost"
                      onClick={() => setUnansweredModal(null)}
                    >
                      稍后检查
                    </button>
                    <button
                      type="button"
                      className="btn-modal-primary"
                      onClick={() => jumpToQuestion(unansweredModal[0].idx)}
                    >
                      <span>立即前往补答 ({unansweredModal[0].displayNum}) ›</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn-modal-ghost"
                      onClick={proceedToNextStep}
                    >
                      无需加分，直接提交 ›
                    </button>
                    <button
                      type="button"
                      className="btn-modal-primary"
                      onClick={() => jumpToQuestion(unansweredModal[0].idx)}
                    >
                      <span>前往填写加分题 ({unansweredModal[0].displayNum}) ›</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
