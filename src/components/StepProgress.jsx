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
          <div className="nav-col-left">
            {onBackHome ? (
              <button 
                className="btn-nav-home" 
                onClick={onBackHome} 
                title="返回首页"
                type="button"
              >
                首页
              </button>
            ) : (
              <span className="nav-placeholder"></span>
            )}
          </div>

          <div className="nav-col-center">
            <h2 className="nav-brand-title">
              <span className="sparkle-tiny">✦</span>
              <span>星火计划</span>
              <span className="sparkle-tiny">✦</span>
            </h2>
          </div>

          <div className="nav-col-right">
            <span className="nav-step-count">第 {currentStep}/3 步</span>
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

