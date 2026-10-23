import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import PosterModal from './PosterModal';

export default function Step4Success({ submission, onRestart }) {
  const [showPoster, setShowPoster] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

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
          <span className="reg-label">海选评审编号</span>
          <span className="status-badge-active">已进入初筛池</span>
        </div>
        <div className="reg-id-code">{submission.id}</div>
        <div className="reg-time">提交时间：{submission.submittedAt || new Date().toLocaleString()}</div>
      </div>

      {/* Evaluation Process Timeline - Clean, Perfectly Aligned & Modern */}
      <div className="timeline-card">
        <div className="timeline-header">
          <h4 className="timeline-title">
            <span className="sparkle-gold">✦</span>
            <span>海选评审流程</span>
          </h4>
          <span className="timeline-status-hint">已进入初筛池</span>
        </div>

        <div className="timeline-stepper-wrap">
          {/* Top Nodes & Connecting Lines Track */}
          <div className="stepper-nodes-track">
            <div className="stepper-dot passed" title="已完成">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="stepper-line passed"></div>
            <div className="stepper-dot current" title="评审团初筛进行中">
              <span>2</span>
            </div>
            <div className="stepper-line"></div>
            <div className="stepper-dot upcoming" title="成为公司级UP主">
              <span>3</span>
            </div>
          </div>

          {/* Bottom Step Titles Grid */}
          <div className="stepper-text-grid">
            <div className="stepper-col passed">
              <span className="step-title">提交报名</span>
              <span className="step-tag-pill passed">已完成</span>
            </div>
            <div className="stepper-col current">
              <span className="step-title">评审团初筛</span>
            </div>
            <div className="stepper-col upcoming">
              <span className="step-title">成为公司级UP主</span>
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
          <span className="s-label">通知手机号</span>
          <span className="s-val">{submission.mobile}</span>
        </div>
        <div className="summary-row">
          <span className="s-label">在线问卷</span>
          <span className="s-val text-green">✓ 潜力测评已完成 ({submission.surveyScore || 124}分 · {submission.surveyRating || 'S级'})</span>
        </div>
        <div className="summary-row">
          <span className="s-label">选题派别</span>
          <span className="s-val text-gold">{submission.videoCategory}</span>
        </div>
        <div className="summary-row">
          <span className="s-label">提案短视频</span>
          <span className="s-val text-ellipsis" title={submission.videoTitle}>“{submission.videoTitle}”</span>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="sms-notice-box">
        <span className="sms-icon">📱</span>
        <p>评审结果将以<strong>手机短信</strong>形式通知，请保持手机畅通。初筛入围者将直接签约成为<strong>公司级 UP 主</strong>，开启全平台官方资源扶持！</p>
      </div>

      {/* Actions */}
      <div className="success-action-group">
        <button 
          id="btn-open-poster"
          type="button" 
          className="btn-gold-primary"
          onClick={() => setShowPoster(true)}
        >
          <span>生成我的海选荣誉海报</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </button>

        <button 
          type="button" 
          className="btn-secondary" 
          onClick={onRestart}
        >
          返回首页 / 重新报名
        </button>
      </div>

      {/* Share Poster Modal */}
      <PosterModal 
        isOpen={showPoster} 
        onClose={() => setShowPoster(false)} 
        submission={submission} 
      />
    </div>
  );
}
