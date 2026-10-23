import React, { useState, useEffect, useRef } from 'react';
import { 
  SURVEY_MODULES, 
  SCALE_OPTIONS, 
  calculateABSRating 
} from '../data/questionnaireData';

// Flatten all questions with their parent module info
const FLAT_QUESTIONS = [];
SURVEY_MODULES.forEach((m, mIdx) => {
  m.questions.forEach((q) => {
    FLAT_QUESTIONS.push({
      ...q,
      moduleIndex: mIdx + 1,
      moduleTotal: SURVEY_MODULES.length,
      moduleId: m.id,
      moduleName: m.name,
      moduleDesc: m.desc
    });
  });
});

export default function Step2Survey({ formData, onChange, onNext, onPrev }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState(() => formData.surveyAnswers || {});
  const [animDirection, setAnimDirection] = useState('forward');
  const cardRef = useRef(null);

  const currentQ = FLAT_QUESTIONS[currentIdx] || FLAT_QUESTIONS[0];
  const totalCount = FLAT_QUESTIONS.length;

  // Calculate answered count
  let answeredCount = 0;
  let scaleScore = 0;
  for (let i = 1; i <= 25; i++) {
    if (answers[i]) {
      answeredCount++;
      scaleScore += Number(answers[i]);
    }
  }
  if (answers[26]?.trim()) answeredCount++;
  if (answers[27]?.trim()) answeredCount++;

  const textScore1 = (answers[26]?.trim().length || 0) > 10 ? 8 : 4;
  const textScore2 = (answers[27]?.trim().length || 0) > 10 ? 8 : 4;
  const subjectiveScore = textScore1 + textScore2;
  const totalScore = scaleScore + subjectiveScore;
  const absRating = calculateABSRating(scaleScore, subjectiveScore);

  // Handle scale option tap: auto-advance
  const handleSelectOption = (val) => {
    const nextAnswers = { ...answers, [currentQ.id]: val };
    setAnswers(nextAnswers);
    onChange({ surveyAnswers: nextAnswers });

    // Auto glide to next question after 180ms
    if (currentIdx < totalCount - 1) {
      setTimeout(() => {
        setAnimDirection('forward');
        setCurrentIdx(prev => prev + 1);
      }, 180);
    }
  };

  const handleTextChange = (text) => {
    const nextAnswers = { ...answers, [currentQ.id]: text };
    setAnswers(nextAnswers);
    onChange({ surveyAnswers: nextAnswers });
  };

  const handlePrevQuestion = () => {
    if (currentIdx > 0) {
      setAnimDirection('backward');
      setCurrentIdx(prev => prev - 1);
    } else {
      onPrev();
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx < totalCount - 1) {
      setAnimDirection('forward');
      setCurrentIdx(prev => prev + 1);
    }
  };

  // Complete survey and advance to Step 3
  const handleCompleteSurvey = () => {
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

  const progressPercent = Math.round((answeredCount / totalCount) * 100);
  const isLastQuestion = currentIdx === totalCount - 1;
  const isCurrentAnswered = currentQ.type === 'scale' 
    ? answers[currentQ.id] !== undefined 
    : Boolean(answers[currentQ.id]?.trim());

  return (
    <div className="native-survey-wrapper animate-fade-in">
      {/* Top Questionnaire Status Bar */}
      <div className="survey-meta-strip">
        <div className="survey-module-badge">
          <span className="sparkle">✦</span>
          <span>{currentQ.moduleName.split('·')[0]}</span>
          <span className="module-title-sub">· {currentQ.moduleName.split('·')[1]}</span>
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
        className={`native-question-card animate-card-${animDirection}`}
      >
        {/* Module Context Hint */}
        <div className="q-card-top-info">
          <span className="q-badge-num">Q{String(currentIdx + 1).padStart(2, '0')}</span>
          <span className="q-badge-type">
            {currentQ.type === 'scale' ? '单选评分 · 5分制' : '开放简答 · 核心加分'}
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
            className="btn-survey-next" 
            onClick={handleNextQuestion}
          >
            <span>下一题 ›</span>
          </button>
        )}
      </div>
    </div>
  );
}
