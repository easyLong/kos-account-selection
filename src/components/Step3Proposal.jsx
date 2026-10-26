import React, { useState, useRef } from 'react';

export default function Step3Proposal({ formData, onChange, onSubmit, onPrev, isSubmitting }) {
  const videoInputRef = useRef(null);
  const graphicInputRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingGraphic, setIsUploadingGraphic] = useState(false);

  const workType = formData.workType || 'video'; // 'video' | 'graphic'

  // Account positioning categories
  const categoryOptions = [
    '知识科普派',
    '专家派',
    '生活体验派',
    '特定人群派',
    '其它'
  ];

  // ==========================================
  // Video Upload Handler
  // ==========================================
  const handleVideoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('请上传 MP4 或 MOV 格式的视频文件');
      return;
    }

    if (file.size > 550 * 1024 * 1024) {
      alert('视频大小超出限制，不能超过 500MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);

    const formDataPayload = new FormData();
    formDataPayload.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload?type=video');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      if (xhr.status === 200) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.code === 0) {
            const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
            onChange({
              videoUrl: res.url,
              videoName: file.name,
              videoSize: sizeMb,
              videoDuration: '已就绪'
            });
            setUploadProgress(100);
            if (errors.work) setErrors(prev => ({ ...prev, work: null }));
          } else {
            alert('上传失败: ' + (res.message || '未知错误'));
            setUploadProgress(0);
          }
        } catch (err) {
          alert('解析上传响应失败');
          setUploadProgress(0);
        }
      } else {
        alert('上传失败，状态码: ' + xhr.status);
        setUploadProgress(0);
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setUploadProgress(0);
      alert('网络连接错误，文件上传失败，请重试');
    };

    xhr.send(formDataPayload);
  };

  const handleRemoveVideo = (e) => {
    e.stopPropagation();
    onChange({
      videoUrl: '',
      videoName: '',
      videoSize: '',
      videoDuration: ''
    });
    setUploadProgress(0);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // ==========================================
  // Graphic / Multi-Image Upload Handler
  // ==========================================
  const handleGraphicFilesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const currentImages = Array.isArray(formData.graphicImages) ? [...formData.graphicImages] : [];
    if (currentImages.length + files.length > 9) {
      alert('图文作品最多支持上传 9 张图片/文档');
      return;
    }

    setIsUploadingGraphic(true);

    try {
      const uploadedList = [];
      for (const file of files) {
        if (file.size > 50 * 1024 * 1024) {
          alert(`文件 ${file.name} 超过 50MB 限制`);
          continue;
        }

        const formDataPayload = new FormData();
        formDataPayload.append('file', file);

        const res = await fetch('/api/upload?type=graphic', {
          method: 'POST',
          body: formDataPayload
        });
        const resData = await res.json();
        if (resData.code === 0 && resData.url) {
          const sizeText = file.size > 1024 * 1024 
            ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
            : (file.size / 1024).toFixed(0) + ' KB';
          uploadedList.push({
            url: resData.url,
            name: file.name,
            size: sizeText
          });
        }
      }

      const nextImages = [...currentImages, ...uploadedList];
      onChange({
        graphicImages: nextImages,
        // Sync primary videoUrl if empty for compatibility
        videoUrl: nextImages[0]?.url || formData.videoUrl || ''
      });
      if (errors.work) setErrors(prev => ({ ...prev, work: null }));
    } catch (err) {
      alert('图片上传失败，请重试: ' + err.message);
    } finally {
      setIsUploadingGraphic(false);
      if (graphicInputRef.current) graphicInputRef.current.value = '';
    }
  };

  const handleRemoveGraphicImage = (idx, e) => {
    e.stopPropagation();
    const currentImages = Array.isArray(formData.graphicImages) ? [...formData.graphicImages] : [];
    currentImages.splice(idx, 1);
    onChange({
      graphicImages: currentImages,
      videoUrl: currentImages[0]?.url || ''
    });
  };

  // ==========================================
  // Form Validation
  // ==========================================
  const validate = () => {
    const newErrors = {};

    if (workType === 'video') {
      if (!formData.videoUrl) {
        newErrors.work = '请上传自我出镜短视频';
      }
    } else {
      const hasImages = Array.isArray(formData.graphicImages) && formData.graphicImages.length > 0;
      const hasText = !!formData.graphicContent?.trim();
      const hasUrl = !!formData.videoUrl;
      if (!hasImages && !hasText && !hasUrl) {
        newErrors.work = '请上传图文配图/长图或输入图文作品阐述';
      }
    }

    if (!formData.videoTitle?.trim()) {
      newErrors.videoTitle = '请给你的作品起一个名字';
    }

    if (!formData.videoCategory) {
      newErrors.videoCategory = '请选择账号定位';
    }

    const introLen = formData.videoIntro?.trim().length || 0;
    if (introLen === 0) {
      newErrors.videoIntro = '请填写作品简要介绍与构思';
    } else if (introLen > 300) {
      newErrors.videoIntro = '作品介绍已超过 300 字限制';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit();
    } else {
      const firstErr = document.querySelector('.form-input.error, .form-select.error, .form-textarea.error, .video-upload-box.error, .graphic-upload-box.error');
      if (firstErr) {
        firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="step-content-card animate-fade-in">
      <div className="step-intro-banner">
        <h3 className="step-section-heading">作品提交</h3>
        <p className="step-section-sub">
          作品主题不限，须为本人原创并符合合规与品牌要求；自主选题图文笔记 1 篇，或出镜短视频 1 条。
        </p>
      </div>

      <form onSubmit={handleFormSubmit} noValidate>
        {/* Work Type Segmented Switcher */}
        <div className="work-type-selector-wrapper">
          <label className="form-label">
            参赛作品类型<span className="required-star">*</span>
          </label>
          <div className="work-type-segmented-tabs">
            <button
              type="button"
              className={`work-type-tab ${workType === 'video' ? 'active' : ''}`}
              onClick={() => {
                onChange({ workType: 'video' });
                if (errors.work) setErrors(prev => ({ ...prev, work: null }));
              }}
            >
              <span className="tab-icon">🎥</span>
              <span className="tab-label">视频作品</span>
              <span className="tab-badge">MP4 / MOV</span>
            </button>
            <button
              type="button"
              className={`work-type-tab ${workType === 'graphic' ? 'active' : ''}`}
              onClick={() => {
                onChange({ workType: 'graphic' });
                if (errors.work) setErrors(prev => ({ ...prev, work: null }));
              }}
            >
              <span className="tab-icon">📝</span>
              <span className="tab-label">图文作品</span>
              <span className="tab-badge">多图 / 长图 / 文案</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 1. VIDEO WORK MODE */}
        {/* ============================================================== */}
        {workType === 'video' && (
          <div className="work-panel-video animate-fade-in">
            {/* Hidden video file input */}
            <input 
              type="file" 
              ref={videoInputRef} 
              accept="video/mp4,video/quicktime,video/*" 
              onChange={handleVideoFileChange} 
              style={{ display: 'none' }} 
            />

            {/* Video Upload Box */}
            <div 
              className={`video-upload-box compact ${formData.videoUrl ? 'uploaded' : ''} ${errors.work ? 'error' : ''}`}
              onClick={() => !isUploading && videoInputRef.current?.click()}
            >
              {isUploading ? (
                <div className="upload-progress-container">
                  <div className="spinner-gold"></div>
                  <p className="uploading-text">正在上传视频并同步至云端... {uploadProgress}%</p>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-inner" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              ) : formData.videoUrl ? (
                <div className="video-preview-container" onClick={e => e.stopPropagation()}>
                  <video 
                    src={formData.videoUrl} 
                    controls 
                    playsInline
                    webkit-playsinline="true"
                    x5-video-player-type="h5-page"
                    className="video-player-preview"
                  />
                  <div className="video-meta-bar">
                    <div className="video-meta-left">
                      <span className="video-badge-tag">已就绪</span>
                      <span className="video-file-name" title={formData.videoName}>{formData.videoName || '出镜视频.mp4'}</span>
                      <span className="video-file-size">({formData.videoSize || '24.5 MB'})</span>
                    </div>
                    <button 
                      type="button" 
                      className="btn-video-reupload" 
                      onClick={handleRemoveVideo}
                    >
                      重新上传
                    </button>
                  </div>
                </div>
              ) : (
                <div className="video-upload-compact-row">
                  <div className="upload-icon-circle-compact">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9E6F1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                  </div>

                  <div className="upload-text-compact">
                    <h4 className="upload-main-title">出镜短视频 1 条<span className="required-star">*</span></h4>
                    <p className="upload-sub-title">MP4/MOV · 须为本人原创 · 支持最大500MB · 手机直接录制或相册选择</p>
                  </div>

                  <span className="upload-action-pill">点击上传 ›</span>
                </div>
              )}
            </div>
            {errors.work && <div className="form-error-msg">{errors.work}</div>}
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. GRAPHIC / IMAGE-TEXT WORK MODE */}
        {/* ============================================================== */}
        {workType === 'graphic' && (
          <div className="work-panel-graphic animate-fade-in">
            {/* Hidden graphic file input */}
            <input 
              type="file" 
              ref={graphicInputRef} 
              accept="image/png,image/jpeg,image/webp,application/pdf" 
              multiple 
              onChange={handleGraphicFilesChange} 
              style={{ display: 'none' }} 
            />

            {/* Graphic Upload Box */}
            <div className={`graphic-upload-box ${errors.work ? 'error' : ''}`}>
              <div className="graphic-upload-header">
                <div>
                  <h4 className="upload-main-title">图文笔记 1 篇<span className="required-star">*</span></h4>
                  <p className="upload-sub-title">作品主题不限 · 支持 JPG / PNG / WEBP / PDF · 可多选 1~9 张 · 单张最大 50MB</p>
                </div>
                <span className="graphic-count-badge">
                  {(formData.graphicImages || []).length} / 9 张
                </span>
              </div>

              {/* Uploaded Thumbnails Grid */}
              <div className="graphic-thumbnails-grid">
                {(formData.graphicImages || []).map((img, idx) => (
                  <div key={img.url || idx} className="graphic-thumb-item">
                    <img src={img.url} alt={img.name || `图文配图 ${idx + 1}`} className="graphic-thumb-img" />
                    <button
                      type="button"
                      className="graphic-thumb-remove-btn"
                      onClick={(e) => handleRemoveGraphicImage(idx, e)}
                      title="删除此图"
                    >
                      ✕
                    </button>
                    <span className="graphic-thumb-idx">{idx + 1}</span>
                  </div>
                ))}

                {/* Add More Button if < 9 */}
                {(!formData.graphicImages || formData.graphicImages.length < 9) && (
                  <div 
                    className={`graphic-add-box ${isUploadingGraphic ? 'uploading' : ''}`}
                    onClick={() => !isUploadingGraphic && graphicInputRef.current?.click()}
                  >
                    {isUploadingGraphic ? (
                      <div className="graphic-mini-loading">
                        <div className="spinner-gold-sm"></div>
                        <span>上传中...</span>
                      </div>
                    ) : (
                      <>
                        <div className="graphic-add-icon">+</div>
                        <span className="graphic-add-text">添加图片/长图</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            {errors.work && <div className="form-error-msg">{errors.work}</div>}

            {/* Optional Graphic Article Content / Script */}
            <div className="form-group" style={{ marginTop: '14px' }}>
              <label className="form-label" htmlFor="textarea-graphic-content">
                图文正文 / 核心观点文案 <span className="optional-tag">（建议填写）</span>
              </label>
              <textarea
                id="textarea-graphic-content"
                rows="4"
                className="form-textarea"
                placeholder="可粘贴图文推文正文、深度研报摘要、脚本大纲或排版核心要点，便于评审团快速研读……"
                value={formData.graphicContent || ''}
                onChange={(e) => onChange({ graphicContent: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. COMMON FIELDS: Title, Category, Intro */}
        {/* ============================================================== */}
        {/* 提案标题 * */}
        <div className="form-group" style={{ marginTop: '16px' }}>
          <label className="form-label" htmlFor="input-video-title">
            作品标题<span className="required-star">*</span>
          </label>
          <input 
            id="input-video-title"
            type="text" 
            className={`form-input ${errors.videoTitle ? 'error' : ''}`}
            placeholder={workType === 'graphic' ? '请为你的图文作品起一个有吸引力的标题' : '请为你的出镜视频起一个清晰、有吸引力的名字'}
            value={formData.videoTitle || ''}
            onChange={(e) => {
              onChange({ videoTitle: e.target.value });
              if (errors.videoTitle) setErrors(prev => ({ ...prev, videoTitle: null }));
            }}
          />
          {errors.videoTitle && <div className="form-error-msg">{errors.videoTitle}</div>}
        </div>

        {/* 账号定位 * */}
        <div className="form-group">
          <label className="form-label" htmlFor="select-video-category">
            账号定位<span className="required-star">*</span>
          </label>
          <div className="select-wrapper">
            <select
              id="select-video-category"
              className={`form-select ${errors.videoCategory ? 'error' : ''}`}
              value={formData.videoCategory || ''}
              onChange={(e) => {
                onChange({ videoCategory: e.target.value });
                if (errors.videoCategory) setErrors(prev => ({ ...prev, videoCategory: null }));
              }}
            >
              <option value="">请选择账号定位</option>
              {categoryOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <div className="select-arrow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A756D" strokeWidth="2">
                <path d="M6 9l6 6 6-6"></path>
              </svg>
            </div>
          </div>
          {errors.videoCategory && <div className="form-error-msg">{errors.videoCategory}</div>}
        </div>

        {/* 提案介绍 * (0/300 字) */}
        <div className="form-group">
          <label className="form-label" htmlFor="textarea-video-intro">
            作品构思与亮点介绍<span className="required-star">*</span>
          </label>
          <div className="textarea-wrapper">
            <textarea
              id="textarea-video-intro"
              rows="3"
              maxLength={300}
              className={`form-textarea ${errors.videoIntro ? 'error' : ''}`}
              placeholder="简述作品选题构思、面向人群或想传递的核心观点……"
              value={formData.videoIntro || ''}
              onChange={(e) => {
                onChange({ videoIntro: e.target.value });
                if (errors.videoIntro) setErrors(prev => ({ ...prev, videoIntro: null }));
              }}
            />
            <div className="char-counter">
              <span className={formData.videoIntro?.length > 300 ? 'text-error' : ''}>
                {formData.videoIntro?.length || 0}
              </span>
              <span> / 300 字</span>
            </div>
          </div>
          {errors.videoIntro && <div className="form-error-msg">{errors.videoIntro}</div>}
        </div>

        {/* Step Actions: 上一步 / 提交报名 */}
        <div className="step-actions step-double-actions">
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onPrev}
            disabled={isSubmitting}
          >
            上一步
          </button>
          <button 
            id="btn-step3-submit"
            type="submit" 
            className="btn-gold-primary" 
            disabled={isSubmitting || isUploading || isUploadingGraphic}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-sm"></span>
                <span>正在提交报名...</span>
              </>
            ) : (
              <>
                <span>提交报名</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
