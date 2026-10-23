import React, { useState } from 'react';

export default function Step1Profile({ formData, onChange, onNext }) {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = '请填写真实姓名';
    }

    if (!formData.department?.trim()) {
      newErrors.department = '请填写所属部门';
    }

    if (!formData.position?.trim()) {
      newErrors.position = '请填写当前岗位';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onNext();
    } else {
      const firstErrorEl = document.querySelector('.form-input.error');
      if (firstErrorEl) {
        firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="step-content-card animate-fade-in">
      <div className="step-intro-banner">
        <h3 className="step-section-heading">基本信息</h3>
        <p className="step-section-sub">请填写参赛者的真实姓名与所在部门，便于评审团核实身份</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* 姓名 & 性别 并排布局 */}
        <div className="form-row-grid form-row-name-gender">
          <div className="form-group flex-name-col">
            <label className="form-label" htmlFor="input-name">
              真实姓名<span className="required-star">*</span>
            </label>
            <input 
              id="input-name"
              type="text" 
              className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder="请输入您的姓名"
              value={formData.name || ''}
              onChange={(e) => {
                onChange({ name: e.target.value });
                if (errors.name) setErrors(prev => ({ ...prev, name: null }));
              }}
            />
            {errors.name && <div className="form-error-msg">{errors.name}</div>}
          </div>

          <div className="form-group flex-gender-col">
            <label className="form-label">
              性别
            </label>
            <div className="gender-segmented-control">
              <button
                type="button"
                className={`gender-btn ${formData.gender === '男' ? 'active' : ''}`}
                onClick={() => onChange({ gender: formData.gender === '男' ? '' : '男' })}
              >
                男
              </button>
              <button
                type="button"
                className={`gender-btn ${formData.gender === '女' ? 'active' : ''}`}
                onClick={() => onChange({ gender: formData.gender === '女' ? '' : '女' })}
              >
                女
              </button>
            </div>
          </div>
        </div>

        {/* 部门 & 岗位 双列布局 */}
        <div className="form-row-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="input-department">
              所属部门 / 团队<span className="required-star">*</span>
            </label>
            <input 
              id="input-department"
              type="text" 
              className={`form-input ${errors.department ? 'error' : ''}`}
              placeholder="例如：财富管理部 / 投研部"
              value={formData.department || ''}
              onChange={(e) => {
                onChange({ department: e.target.value });
                if (errors.department) setErrors(prev => ({ ...prev, department: null }));
              }}
            />
            {errors.department && <div className="form-error-msg">{errors.department}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="input-position">
              现任岗位 / 职级<span className="required-star">*</span>
            </label>
            <input 
              id="input-position"
              type="text" 
              className={`form-input ${errors.position ? 'error' : ''}`}
              placeholder="例如：投资顾问 / 渠道经理"
              value={formData.position || ''}
              onChange={(e) => {
                onChange({ position: e.target.value });
                if (errors.position) setErrors(prev => ({ ...prev, position: null }));
              }}
            />
            {errors.position && <div className="form-error-msg">{errors.position}</div>}
          </div>
        </div>

        {/* Submit Step 1 Action */}
        <div className="step-actions">
          <button 
            id="btn-step1-next"
            type="submit" 
            className="btn-gold-primary"
          >
            <span>下一步：在线问卷测评</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
