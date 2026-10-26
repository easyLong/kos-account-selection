import React from 'react';

export default function StepProgress({ currentStep, onBackHome }) {
  const steps = [
    { num: 1, label: '基本信息' },
    { num: 2, label: '在线问卷' },
    { num: 3, label: '作品提交' }
  ];

  return (
    <div className="step-header-container">
      {/* Top Title & Quick Return */}
      <div className="step-header-text">
        <div className="title-row">
          <div className="title-left">
            {onBackHome && (
              <button 
                className="btn-text-back" 
                onClick={onBackHome} 
                title="返回首页"
                type="button"
              >
                <span className="back-arrow">‹</span>
                <span className="back-text">首页</span>
              </button>
            )}
            <div className="step-brand-pill">
              <span className="sparkle-gold">✦</span>
              <span className="brand-text">星火计划</span>
              <span className="sparkle-gold">✦</span>
            </div>
          </div>

          <div className="title-right">
            <span className="step-count-clean">
              <strong>0{currentStep}</strong>
              <span className="step-slash">/</span>
              <span>03</span>
            </span>
          </div>
        </div>
      </div>

      {/* Stepper Progress Indicator */}
      <div className="stepper-indicator">
        <div className="stepper-track">
          <div 
            className="stepper-track-fill" 
            style={{ 
              width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' 
            }}
          />
        </div>

        <div className="stepper-items">
          {steps.map((s) => {
            const isCompleted = s.num < currentStep;
            const isActive = s.num === currentStep;
            
            return (
              <div 
                key={s.num} 
                className={`stepper-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              >
                <div className="stepper-node">
                  {isCompleted ? (
                    <span className="check-icon">✓</span>
                  ) : (
                    <span className="step-num">{s.num}</span>
                  )}
                </div>
                <span className="stepper-label">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

