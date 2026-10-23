import React, { useState, useRef } from 'react';

export default function Step3Proposal({ formData, onChange, onSubmit, onPrev, isSubmitting }) {
  const fileInputRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Categories matching financial UP topic schools
  const categoryOptions = [
    '宏观策略与市场研判派',
    '行业掘金与热点跟踪派',
    '稳健理财与资产配置派',
    '投教科普与避坑指南派',
    '基金定投与实战派',
    '职场财商与生活消费派',
    '其它创新创意派'
  ];

  // Sample video for fast demonstration
  const handleUseDemoVideo = (e) => {
    e.stopPropagation();
    setIsUploading(true);
    setUploadProgress(10);

    const timer = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsUploading(false);
          onChange({
            videoUrl: '/uploads/videos/demo_sample.mp4',
            videoName: 'KOS出镜自我介绍与试镜提案.mp4',
            videoSize: '24.8 MB',
            videoDuration: '02:15'
          });
          return 100;
        }
        return prev + 18;
      });
    }, 150);
  };

  const handleVideoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('请上传 MP4 或 MOV 格式的视频文件');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      alert('视频大小超出限制，不能超过 500MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);

    // Real streaming upload with live progress tracking
    const formDataPayload = new FormData();
    formDataPayload.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');

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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Topic presets for instant 1-click inspiration
  const TOPIC_PRESETS = [
    {
      title: '3分钟搞懂ETF定投心法',
      category: '基金定投与实战派',
      intro: '针对年轻职场人，拆解指数ETF定投选基、止盈与微笑曲线心法，用大白话降低投资门槛。'
    },
    {
      title: '低利率时代：资产稳健配置三笔钱',
      category: '稳健理财与资产配置派',
      intro: '结合当下低利率市场环境，拆解活钱、稳钱与长钱的比例分配，传递理性长期投资理念。'
    },
    {
      title: '理财经理不会告诉你的避坑常识',
      category: '投教科普与避坑指南派',
      intro: '以真实投资痛点切入，深度拆解收益率与波动风险陷阱，打造有温度、接地气的专业UP主形象。'
    }
  ];

  const applyPreset = (preset) => {
    onChange({
      videoTitle: preset.title,
      videoCategory: preset.category,
      videoIntro: preset.intro
    });
    setErrors((prev) => ({
      ...prev,
      videoTitle: null,
      videoCategory: null,
      videoIntro: null
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.videoUrl) {
      newErrors.video = '请上传自我出镜短视频或使用演示样片';
    }

    if (!formData.videoTitle?.trim()) {
      newErrors.videoTitle = '请给你的选题起一个名字';
    }

    if (!formData.videoCategory) {
      newErrors.videoCategory = '请选择选题派别';
    }

    const introLen = formData.videoIntro?.trim().length || 0;
    if (introLen === 0) {
      newErrors.videoIntro = '请填写提案简要介绍';
    } else if (introLen > 300) {
      newErrors.videoIntro = '提案介绍已超过 300 字限制';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit();
    } else {
      const firstErr = document.querySelector('.form-input.error, .form-select.error, .form-textarea.error, .video-upload-box.error');
      if (firstErr) {
        firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="step-content-card animate-fade-in">
      <form onSubmit={handleFormSubmit} noValidate>
        {/* Hidden video file input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="video/mp4,video/quicktime,video/*" 
          onChange={handleVideoFileChange} 
          style={{ display: 'none' }} 
        />

        {/* Video Upload Area - Compact & Refined */}
        <div 
          className={`video-upload-box compact ${formData.videoUrl ? 'uploaded' : ''} ${errors.video ? 'error' : ''}`}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="upload-progress-container">
              <div className="spinner-gold"></div>
              <p className="uploading-text">正在上传视频... {uploadProgress}%</p>
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
                <h4 className="upload-main-title">上传出镜短视频<span className="required-star">*</span></h4>
                <p className="upload-sub-title">MP4/MOV · 1-3分钟 · 手机可直接拍</p>
              </div>

              <button 
                type="button" 
                className="btn-use-sample-compact" 
                onClick={handleUseDemoVideo}
                title="一键填入演示视频"
              >
                ⚡ 示例样片
              </button>
            </div>
          )}
        </div>
        {errors.video && <div className="form-error-msg">{errors.video}</div>}

        {/* 灵感选题快速填入胶囊 */}
        <div className="topic-presets-section">
          <div className="topic-presets-label">
            <span>💡 热门选题推荐（点击一键自动填入）：</span>
          </div>
          <div className="topic-presets-chips">
            {TOPIC_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                className="topic-preset-chip"
                onClick={() => applyPreset(preset)}
              >
                + {preset.title}
              </button>
            ))}
          </div>
        </div>

        {/* 提案标题 * */}
        <div className="form-group">
          <label className="form-label" htmlFor="input-video-title">
            提案标题<span className="required-star">*</span>
          </label>
          <input 
            id="input-video-title"
            type="text" 
            className={`form-input ${errors.videoTitle ? 'error' : ''}`}
            placeholder="给你的选题起一个名字（或点击上方推荐）"
            value={formData.videoTitle || ''}
            onChange={(e) => {
              onChange({ videoTitle: e.target.value });
              if (errors.videoTitle) setErrors(prev => ({ ...prev, videoTitle: null }));
            }}
          />
          {errors.videoTitle && <div className="form-error-msg">{errors.videoTitle}</div>}
        </div>

        {/* 选题派别 * */}
        <div className="form-group">
          <label className="form-label" htmlFor="select-video-category">
            选题派别<span className="required-star">*</span>
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
              <option value="">请选择</option>
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
            提案介绍<span className="required-star">*</span>
          </label>
          <div className="textarea-wrapper">
            <textarea
              id="textarea-video-intro"
              rows="3"
              maxLength={300}
              className={`form-textarea ${errors.videoIntro ? 'error' : ''}`}
              placeholder="简述选题构思、面向人群或想传递的核心观点……"
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
            disabled={isSubmitting || isUploading}
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
