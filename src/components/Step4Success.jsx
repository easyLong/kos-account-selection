import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function Step4Success({ submission, onRestart }) {

  useEffect(() => {
    // Fire celebratory confetti on mount
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#A87823', '#F4D592', '#FFFFFF', '#D29E38']
      });
    } catch (e) {
      console.warn('Confetti effect unavailable', e);
    }
  }, []);

  if (!submission) return null;

  const displayId = (() => {
    if (!submission?.id) return '01';
    const str = String(submission.id).trim();
    if (/^\d+$/.test(str)) {
      return str.padStart(2, '0');
    }
    return str;
  })();

  return (
    <div className="step-content-card success-container animate-fade-in">
      {/* Success Golden Icon */}
      <div className="success-icon-badge">
        <div className="success-ring-glow"></div>
        <div className="success-checkmark">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      </div>

      <h2 className="success-title">报名提交成功！</h2>
      <p className="success-subtitle">感谢你的热情参与，你的内容才华即将闪闪发光</p>

      {/* Registration Certificate Card */}
      <div className="reg-id-card">
        <div className="reg-id-header">
          <span className="reg-label">【星火计划】评审编号</span>
          <span className="status-badge-active">作品已提交</span>
        </div>
        <div className="reg-id-code">{displayId}</div>
        <div className="reg-time">提交时间：{submission.submittedAt || new Date().toLocaleString()}</div>
      </div>

      {/* Evaluation Process Timeline - Clean, Perfectly Aligned & Modern */}
      <div className="timeline-card">
        <div className="timeline-header">
          <h4 className="timeline-title">
            <span className="sparkle-gold">✦</span>
            <span>选拔评审流程</span>
          </h4>
          <span className="timeline-status-hint">第一阶段已达成</span>
        </div>

        <div className="timeline-stepper-flex">
          {/* Step 1: 作品提交 */}
          <div className="timeline-step-unit passed">
            <div className="stepper-dot passed" title="作品提交 (已完成)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="stepper-label-wrapper">
              <span className="step-title">作品提交</span>
              <span className="step-tag-pill passed">已完成</span>
            </div>
          </div>

          {/* Step 2: 路演答辩 */}
          <div className="timeline-step-unit current">
            <div className="stepper-dot current" title="路演答辩 (评审团评审)">
              <span>2</span>
            </div>
            <div className="stepper-label-wrapper">
              <span className="step-title">路演答辩</span>
              <span className="step-tag-pill ongoing">评审团评审</span>
            </div>
          </div>

          {/* Step 3: 结果公示 */}
          <div className="timeline-step-unit upcoming">
            <div className="stepper-dot upcoming" title="结果公示">
              <span>3</span>
            </div>
            <div className="stepper-label-wrapper">
              <span className="step-title">结果公示</span>
            </div>
          </div>
        </div>
      </div>

      {/* Application Snapshot Card */}
      <div className="summary-snapshot-card">
        <div className="summary-row">
          <span className="s-label">候选人姓名</span>
          <span className="s-val font-semibold">{submission.name}</span>
        </div>
        <div className="summary-row">
          <span className="s-label">所属部门 / 岗位</span>
          <span className="s-val">{submission.department} · {submission.position}</span>
        </div>
        <div className="summary-row">
          <span className="s-label">
            {submission.workType === 'graphic' ? '图文作品' : '提案短视频'}
          </span>
          <span className="s-val text-ellipsis font-semibold text-gold" title={submission.videoTitle}>
            “{submission.videoTitle || '未命名作品'}”
          </span>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="sms-notice-box">
        <span className="sms-icon">📢</span>
        <p>参赛人员开展路演答辩，由公司管理层及内部专家组建评审团开展评审；结合报名作品质量、现场路演综合得分确定入选名单并予以公示。</p>
      </div>

      {/* Actions */}
      <div className="success-action-group">
        <button 
          type="button" 
          className="btn-secondary" 
          onClick={onRestart}
        >
          返回首页 / 重新报名
        </button>
      </div>
    </div>
  );
}
