import React, { useState, useRef } from 'react';

export default function Step1Profile({ formData, onChange, onNext }) {
  const fileInputRef = useRef(null);
  const [errors, setErrors] = useState({});

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择有效的图片文件（JPG/PNG）');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      onChange({ avatarUrl: event.target.result });
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = (e) => {
    e.stopPropagation();
    onChange({ avatarUrl: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

    if (!formData.jobNo?.trim()) {
      newErrors.jobNo = '请填写员工工号';
    }

    if (!formData.mobile?.trim()) {
      newErrors.mobile = '请填写手机号';
    } else if (!/^1[3-9]\d{9}$/.test(formData.mobile.trim())) {
      newErrors.mobile = '请输入正确的11位大陆手机号码';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onNext();
    } else {
      // Scroll to first error
      const firstErrorEl = document.querySelector('.form-input.error');
      if (firstErrorEl) {
        firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const fillSampleData = (e) => {
    e.preventDefault();
    onChange({
      name: '陈若琳',
      gender: '女',
      department: '数字金融部',
      position: '投教内容策划',
      jobNo: 'HTF-9082',
      mobile: '13812345678',
      avatarUrl: formData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
    });
    setErrors({});
  };

  return (
    <div className="step-content-card animate-fade-in">
      <form onSubmit={handleSubmit} noValidate>
        {/* Avatar Upload Row - Compact & Refined */}
        <div className="avatar-upload-row">
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            onChange={handleAvatarChange} 
            style={{ display: 'none' }} 
          />
          <div 
            className="avatar-circle-box" 
            onClick={() => fileInputRef.current?.click()}
            title="点击上传个人头像"
          >
            {formData.avatarUrl ? (
              <div className="avatar-preview-wrap">
                <img src={formData.avatarUrl} alt="头像预览" className="avatar-preview-img" />
                <button 
                  type="button" 
                  className="avatar-remove-btn" 
                  onClick={removeAvatar}
                  title="删除头像"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="avatar-placeholder">
                <span className="plus-icon">+</span>
              </div>
            )}
          </div>

          <div className="avatar-text-desc">
            <div className="avatar-title-row">
              <h4 className="avatar-title">上传头像 <span className="optional-tag">（选填）</span></h4>
              <button 
                type="button" 
                className="btn-quick-fill-hint" 
                onClick={fillSampleData}
                title="一键填入演示测试信息"
              >
                ⚡ 示例填入
              </button>
            </div>
            <p className="avatar-hint">建议清晰本人正脸照，未来将作为 UP 主官方头像</p>
          </div>
        </div>

        {/* 姓名 & 性别 并排布局 */}
        <div className="form-row-grid form-row-name-gender">
          <div className="form-group flex-name-col">
            <label className="form-label" htmlFor="input-name">
              姓名<span className="required-star">*</span>
            </label>
            <input 
              id="input-name"
              type="text" 
              className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder="请输入真实姓名"
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
              所属部门<span className="required-star">*</span>
            </label>
            <input 
              id="input-department"
              type="text" 
              className={`form-input ${errors.department ? 'error' : ''}`}
              placeholder="请输入所属部门"
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
              岗位<span className="required-star">*</span>
            </label>
            <input 
              id="input-position"
              type="text" 
              className={`form-input ${errors.position ? 'error' : ''}`}
              placeholder="请输入岗位名称"
              value={formData.position || ''}
              onChange={(e) => {
                onChange({ position: e.target.value });
                if (errors.position) setErrors(prev => ({ ...prev, position: null }));
              }}
            />
            {errors.position && <div className="form-error-msg">{errors.position}</div>}
          </div>
        </div>

        {/* 工号 & 手机号 双列布局 */}
        <div className="form-row-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="input-jobno">
              工号<span className="required-star">*</span>
            </label>
            <input 
              id="input-jobno"
              type="text" 
              className={`form-input ${errors.jobNo ? 'error' : ''}`}
              placeholder="请输入工号"
              value={formData.jobNo || ''}
              onChange={(e) => {
                onChange({ jobNo: e.target.value });
                if (errors.jobNo) setErrors(prev => ({ ...prev, jobNo: null }));
              }}
            />
            {errors.jobNo && <div className="form-error-msg">{errors.jobNo}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="input-mobile">
              手机号<span className="required-star">*</span>
              <span className="hint">接收评审结果</span>
            </label>
            <input 
              id="input-mobile"
              type="tel" 
              maxLength="11"
              className={`form-input ${errors.mobile ? 'error' : ''}`}
              placeholder="11位手机号"
              value={formData.mobile || ''}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                onChange({ mobile: val });
                if (errors.mobile) setErrors(prev => ({ ...prev, mobile: null }));
              }}
            />
            {errors.mobile && <div className="form-error-msg">{errors.mobile}</div>}
          </div>
        </div>

        {/* Submit Step 1 Action */}
        <div className="step-actions">
          <button 
            id="btn-step1-next"
            type="submit" 
            className="btn-gold-primary"
          >
            <span>下一步：在线问卷</span>
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
