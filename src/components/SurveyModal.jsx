import React, { useState, useEffect } from 'react';
import { 
  SURVEY_TITLE, 
  SURVEY_MODULES, 
  SCALE_OPTIONS, 
  WENJUANXING_BASE_URL,
  calculateABSRating 
} from '../data/questionnaireData';

export default function SurveyModal({ isOpen, onClose, mobile, onSurveyComplete, initialAnswers }) {
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  
  // State for all 27 questions
  const [answers, setAnswers] = useState(() => {
    if (initialAnswers && Object.keys(initialAnswers).length > 0) {
      return initialAnswers;
    }
    // Default smart starting answers (balanced 4s and 5s)
    const initial = {};
    for (let i = 1; i <= 25; i++) {
      initial[i] = i % 3 === 0 ? 4 : 5;
    }
    initial[26] = '深耕行为金融学与投资者心理学6年，国家二级心理咨询师。善于从“情绪周期与人性弱点”视角切入，将晦涩的股债再平衡讲解得生动透彻。';
    initial[27] = '打造“兼具理智与温度的朋友型理财顾问”人设。区别于喊单式博主，专注教年轻人建立第一份科学底仓，把专业报告翻译成能落地的大白话。';
    return initial;
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialAnswers && Object.keys(initialAnswers).length > 0) {
      setAnswers(initialAnswers);
    }
  }, [initialAnswers]);

  if (!isOpen) return null;

  // Calculate live scores
  let scaleScore = 0;
  let answeredCount = 0;
  for (let i = 1; i <= 25; i++) {
    if (answers[i]) {
      scaleScore += Number(answers[i]);
      answeredCount++;
    }
  }
  if (answers[26]?.trim()) answeredCount++;
  if (answers[27]?.trim()) answeredCount++;

  const textScore1 = (answers[26]?.trim().length || 0) > 15 ? 8 : 4;
  const textScore2 = (answers[27]?.trim().length || 0) > 15 ? 8 : 4;
  const subjectiveScore = textScore1 + textScore2;
  const totalScore = scaleScore + subjectiveScore;
  const currentRating = calculateABSRating(scaleScore, subjectiveScore);

  const handleSelectOption = (qid, val) => {
    setAnswers(prev => ({ ...prev, [qid]: val }));
  };

  const handleTextChange = (qid, text) => {
    setAnswers(prev => ({ ...prev, [qid]: text }));
  };

  const handleQuickFill = (level) => {
    const filled = {};
    if (level === 'S') {
      for (let i = 1; i <= 25; i++) filled[i] = i % 4 === 0 ? 4 : 5;
      filled[26] = '深耕古典音乐与交响乐编曲10年，跨界研究复杂系统理论。擅长用“复调对位法”类比多元资产配置与股债再平衡，内容视觉化极强，极具个人辨识度。';
      filled[27] = '打造“兼具审美感性与数据理性的思想者”标杆IP。区别于传统喊单式或纯科普博主，打造高审美、深洞察的投教内容，为公司树立行业破圈级专业美誉。';
    } else {
      for (let i = 1; i <= 25; i++) filled[i] = i % 2 === 0 ? 3 : 4;
      filled[26] = '平时热爱长跑与马拉松，擅长将耐力运动的长跑自律与基金定投的耐心周期相结合。';
      filled[27] = '阳光亲切的同龄人成长伙伴，专注解决年轻白领第一桶金理财困惑。';
    }
    setAnswers(filled);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch('/api/webhook/wenjuanxing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: mobile,
          score: totalScore,
          scaleScore: scaleScore,
          subjectiveScore: subjectiveScore,
          rating: currentRating.level,
          answers: answers
        })
      });
    } catch (e) {
      console.warn('Webhook mock error, falling back locally', e);
    }
    setSubmitting(false);
    onSurveyComplete({ 
      completed: true, 
      score: totalScore,
      scaleScore,
      subjectiveScore,
      rating: currentRating.level,
      answers 
    });
    onClose();
  };

  const openRealWenjuanxing = () => {
    const fullUrl = `${WENJUANXING_BASE_URL}?sojump_parm=${encodeURIComponent(mobile || '13800138000')}`;
    window.open(fullUrl, '_blank');
  };

  const activeModule = SURVEY_MODULES[activeModuleIdx];
  const progressPercent = Math.round((answeredCount / 27) * 100);

  return (
    <div className="survey-fullscreen-overlay animate-fade-in">
      <div className="survey-immersion-container">
        
        {/* Top Sticky Header */}
        <header className="survey-nav-header">
          <button 
            type="button" 
            className="survey-back-pill" 
            onClick={onClose}
            title="暂存并返回"
          >
            <span className="back-arrow">‹</span>
            <span>暂存返回</span>
          </button>

          <div className="survey-header-center">
            <span className="survey-header-title">{SURVEY_TITLE}</span>
            <span className="survey-header-sub">
              {activeModule.name.split('·')[1]} ({activeModuleIdx + 1}/{SURVEY_MODULES.length})
            </span>
          </div>

          <div className="survey-header-right">
            <div className="live-score-badge" style={{ borderColor: currentRating.color }}>
              <span className="score-num">{totalScore}</span>
              <span className="score-unit">分 · {currentRating.level}</span>
            </div>
          </div>
        </header>

        {/* Thin Gold Progress Bar */}
        <div className="survey-linear-progress-track">
          <div 
            className="survey-linear-progress-fill" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Module Pill Navigation */}
        <nav className="survey-module-segmented-bar">
          {SURVEY_MODULES.map((m, idx) => {
            const isCompleted = idx < activeModuleIdx;
            const isCurrent = idx === activeModuleIdx;
            return (
              <button
                key={m.id}
                type="button"
                className={`module-segment-item ${isCurrent ? 'current' : ''} ${isCompleted ? 'done' : ''}`}
                onClick={() => setActiveModuleIdx(idx)}
              >
                <span className="segment-index">{idx + 1}</span>
                <span className="segment-text">{m.name.split('·')[1]}</span>
              </button>
            );
          })}
        </nav>

        {/* Question Area Scrollable Body */}
        <main className="survey-scroll-body">
          {/* Module Hero Intro Card */}
          <div className="module-hero-banner">
            <div className="module-hero-tag">
              <span>{activeModule.name.split('·')[0]}</span>
              <span className="dot">•</span>
              <span>共 {activeModule.questions.length} 题</span>
            </div>
            <h2 className="module-hero-heading">{activeModule.name.split('·')[1]}</h2>
            <p className="module-hero-description">{activeModule.desc}</p>
          </div>

          {/* Question List */}
          <div className="survey-cards-stack">
            {activeModule.questions.map((q, qIndex) => {
              const hasAnswered = q.type === 'scale' ? answers[q.id] !== undefined : Boolean(answers[q.id]?.trim());

              return (
                <div key={q.id} className={`survey-question-card ${hasAnswered ? 'answered' : ''}`}>
                  {/* Question Header */}
                  <div className="q-card-header">
                    <span className="q-num-tag">
                      Q{String(q.id).padStart(2, '0')}
                    </span>
                    {q.type === 'scale' ? (
                      <span className="q-type-badge">5分量表</span>
                    ) : (
                      <span className="q-type-badge highlight-badge">✨ 人工加分 (0-10分)</span>
                    )}
                  </div>

                  {/* Question Text */}
                  <h3 className="q-sentence-text">
                    {q.text}
                  </h3>

                  {/* Rating Selector (Scale Options) */}
                  {q.type === 'scale' ? (
                    <div className="rating-scale-container">
                      <div className="rating-labels-guide">
                        <span className="guide-left">1分 完全不符合</span>
                        <span className="guide-center">3分 一般</span>
                        <span className="guide-right">5分 完全符合</span>
                      </div>

                      <div className="rating-buttons-grid">
                        {SCALE_OPTIONS.map((opt) => {
                          const isSelected = answers[q.id] === opt.val;
                          return (
                            <button
                              key={opt.val}
                              type="button"
                              className={`rating-pill-btn ${isSelected ? 'active' : ''}`}
                              onClick={() => handleSelectOption(q.id, opt.val)}
                            >
                              <span className="rating-value">{opt.val}</span>
                              <span className="rating-desc">{opt.label}</span>
                              {isSelected && <span className="rating-check-dot">●</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Open-ended Subjective Question */
                    <div className="subjective-input-container">
                      <textarea
                        rows="4"
                        className="subjective-textarea"
                        placeholder={q.placeholder}
                        value={answers[q.id] || ''}
                        onChange={(e) => handleTextChange(q.id, e.target.value)}
                      />
                      <div className="subjective-meta-info">
                        <span className="hint">💡 建议结合真实个人经历与金融专业思考展开</span>
                        <span className="char-count">{(answers[q.id] || '').length} 字</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>

        {/* Bottom Floating Navigation Toolbar */}
        <footer className="survey-bottom-toolbar">
          <div className="toolbar-left">
            <span className="toolbar-stat-label">已答进度</span>
            <span className="toolbar-stat-value">{answeredCount} <small>/ 27</small></span>
          </div>

          <div className="toolbar-actions">
            {activeModuleIdx > 0 && (
              <button 
                type="button" 
                className="btn-step-prev"
                onClick={() => {
                  setActiveModuleIdx(prev => prev - 1);
                  document.querySelector('.survey-scroll-body')?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                ← 上一模块
              </button>
            )}

            {activeModuleIdx < SURVEY_MODULES.length - 1 ? (
              <button 
                type="button" 
                className="btn-step-next"
                onClick={() => {
                  setActiveModuleIdx(prev => prev + 1);
                  document.querySelector('.survey-scroll-body')?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span>下一模块</span>
                <span className="arrow">→</span>
              </button>
            ) : (
              <button 
                type="button" 
                className="btn-finish-submit"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? '正在核算并验签...' : '完成评测并提交验签 ✓'}
              </button>
            )}
          </div>
        </footer>

      </div>
    </div>
  );
}
