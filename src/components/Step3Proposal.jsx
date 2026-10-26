import React, { useState, useRef } from 'react';

export default function Step3Proposal({ formData, onChange, onSubmit, onPrev, isSubmitting }) {
  const videoInputRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // ==========================================
  // Video Upload Handler (Max 2 mins / 500MB)
  // ==========================================
  const startUploadVideo = (file, durationText) => {
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
              workType: 'video',
              videoUrl: res.url,
              videoName: file.name,
              videoSize: sizeMb,
              videoDuration: durationText || '2分钟内'
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

    // Inspect video duration (must be within 2 minutes)
    try {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      const blobUrl = URL.createObjectURL(file);
      tempVideo.src = blobUrl;
      tempVideo.onloadedmetadata = () => {
        URL.revokeObjectURL(blobUrl);
        const duration = tempVideo.duration;
        if (duration && duration > 130) {
          const minutes = Math.floor(duration / 60);
          const seconds = Math.round(duration % 60);
          alert(`视频时长限制在 2 分钟以内，您选择的视频时长约为 ${minutes} 分 ${seconds} 秒，请剪辑后重新上传`);
          if (videoInputRef.current) videoInputRef.current.value = '';
          return;
        }
        const durationText = duration ? `${Math.round(duration)} 秒` : '2分钟内';
        startUploadVideo(file, durationText);
      };
      tempVideo.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        startUploadVideo(file);
      };
    } catch (e) {
      startUploadVideo(file);
    }
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
  // Form Validation
  // ==========================================
  const validate = () => {
    const newErrors = {};

    if (!formData.videoUrl) {
      newErrors.work = '请上传自我出镜短视频（时长 2 分钟以内）';
    }

    if (!formData.videoTitle?.trim()) {
      newErrors.videoTitle = '请给你的作品起一个名字';
    }

    const introLen = formData.videoIntro?.trim().length || 0;
    if (introLen === 0) {
      newErrors.videoIntro = '请填写作品构思';
    } else if (introLen > 300) {
      newErrors.videoIntro = '作品构思已超过 300 字限制';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit();
    } else {
      const firstErr = document.querySelector('.form-input.error, .form-textarea.error, .video-upload-box.error');
      if (firstErr) {
        firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="step-content-card animate-fade-in">
      <form onSubmit={handleFormSubmit} noValidate>
        {/* Video Upload Section */}
        <div className="form-group">
          <label className="form-label">
            上传短视频作品<span className="required-star">*</span>
            <span className="form-label-hint">（时长 2 分钟以内）</span>
          </label>

          <input 
            type="file" 
            ref={videoInputRef} 
            accept="video/mp4,video/quicktime,video/*" 
            onChange={handleVideoFileChange} 
            style={{ display: 'none' }} 
          />

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
                    <span className="video-file-name" title={formData.videoName}>{formData.videoName || '出镜短视频.mp4'}</span>
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
                  <p className="upload-sub-title">MP4 / MOV · 时长限制 2 分钟以内 · 支持最大 500MB</p>
                </div>

                <span className="upload-action-pill">点击上传 ›</span>
              </div>
            )}
          </div>
          {errors.work && <div className="form-error-msg">{errors.work}</div>}
        </div>

        {/* 作品标题 * */}
        <div className="form-group" style={{ marginTop: '16px' }}>
          <label className="form-label" htmlFor="input-video-title">
            作品标题<span className="required-star">*</span>
          </label>
          <input 
            id="input-video-title"
            type="text" 
            className={`form-input ${errors.videoTitle ? 'error' : ''}`}
            placeholder="请为你的出镜短视频起一个清晰、有吸引力的名字"
            value={formData.videoTitle || ''}
            onChange={(e) => {
              onChange({ videoTitle: e.target.value });
              if (errors.videoTitle) setErrors(prev => ({ ...prev, videoTitle: null }));
            }}
          />
          {errors.videoTitle && <div className="form-error-msg">{errors.videoTitle}</div>}
        </div>

        {/* 作品构思 * (0/300 字) */}
        <div className="form-group" style={{ marginTop: '16px' }}>
          <label className="form-label" htmlFor="textarea-video-intro">
            作品构思<span className="required-star">*</span>
          </label>
          <div className="textarea-wrapper">
            <textarea
              id="textarea-video-intro"
              rows="4"
              maxLength={300}
              className={`form-textarea ${errors.videoIntro ? 'error' : ''}`}
              placeholder="简述作品选题构思、面向人群或想传递的核心观点（作品主题不限，须为原创）……"
              value={formData.videoIntro || ''}
              onChange={(e) => {
                onChange({ videoIntro: e.target.value });
                if (errors.videoIntro) setErrors(prev => ({ ...prev, videoIntro: null }));
              }}
            />
            <div className="char-counter">
              <span className={(formData.videoIntro?.length || 0) > 300 ? 'text-error' : ''}>
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
