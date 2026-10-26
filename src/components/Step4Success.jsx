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
          <span className="reg-label">【星火计划】评审编号</span>
          <span className="status-badge-active">作品已提交</span>
        </div>
        <div className="reg-id-code">{submission.id}</div>
        <div className="reg-time">提交时间：{submission.submittedAt || new Date().toLocaleString()}</div>
      </div>

      {/* Evaluation Process Timeline - Clean, Perfectly Aligned & Modern */}
      <div className="timeline-card">
        <div className="timeline-header">
          <h4 className="timeline-title">
            <span className="sparkle-gold">✦</span>
            <span>【星火计划】选拔流程</span>
          </h4>
          <span className="timeline-status-hint">第一阶段已达成</span>
        </div>

        <div className="timeline-stepper-wrap">
          {/* Top Nodes & Connecting Lines Track */}
          <div className="stepper-nodes-track">
            <div className="stepper-dot passed" title="作品提交 (已完成)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="stepper-line passed"></div>
            <div className="stepper-dot current" title="路演答辩 (即将开展)">
              <span>2</span>
            </div>
            <div className="stepper-line"></div>
            <div className="stepper-dot upcoming" title="结果公示">
              <span>3</span>
            </div>
          </div>

          {/* Bottom Step Titles Grid */}
          <div className="stepper-text-grid">
            <div className="stepper-col passed">
              <span className="step-title">作品提交</span>
              <span className="step-tag-pill passed">已完成</span>
            </div>
            <div className="stepper-col current">
              <span className="step-title">路演答辩</span>
              <span className="step-tag-pill ongoing">评审团评审</span>
            </div>
            <div className="stepper-col upcoming">
              <span className="step-title">结果公示</span>
            </div>
          </div>
        </div>

        {/* Detailed Stages Info List */}
        <div className="timeline-detail-notes">
          <div className="timeline-note-item passed">
            <span className="note-dot">✓</span>
            <div className="note-text">
              <strong>作品提交：</strong>作品主题不限，须为本人原创并符合合规与品牌要求；自主选题图文笔记 1 篇，或出镜短视频 1 条。
            </div>
          </div>
          <div className="timeline-note-item current">
            <span className="note-dot">2</span>
            <div className="note-text">
              <strong>路演答辩：</strong>参赛人员开展路演答辩，由公司管理层及内部专家组建评审团开展评审。
            </div>
          </div>
          <div className="timeline-note-item upcoming">
            <span className="note-dot">3</span>
            <div className="note-text">
              <strong>结果公示：</strong>结合报名作品质量、现场路演综合得分确定入选名单并予以公示。
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
          <span className="s-label">作品形式</span>
          <span className="s-val font-semibold">
            {submission.workType === 'graphic' ? '📝 图文笔记' : '🎥 出镜短视频'}
          </span>
        </div>
        <div className="summary-row">
          <span className="s-label">在线问卷</span>
          <span className="s-val text-green">✓ 潜力测评已完成 ({submission.surveyScore || 124}分 · {submission.surveyRating || 'S级'})</span>
        </div>
        <div className="summary-row">
          <span className="s-label">账号定位</span>
          <span className="s-val text-gold">{submission.videoCategory}</span>
        </div>
        <div className="summary-row">
          <span className="s-label">
            {submission.workType === 'graphic' ? '图文标题' : '视频标题'}
          </span>
          <span className="s-val text-ellipsis" title={submission.videoTitle}>“{submission.videoTitle}”</span>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="sms-notice-box">
        <span className="sms-icon">📢</span>
        <p>结合报名作品质量、现场路演综合得分确定入选名单并予以公示。参赛人员开展路演答辩日程将以工作通知形式公布，敬请留意！</p>
      </div>

      {/* Actions */}
      <div className="success-action-group">
        <button 
          id="btn-open-poster"
          type="button" 
          className="btn-gold-primary"
          onClick={() => setShowPoster(true)}
        >
          <span>生成【星火计划】荣誉海报</span>
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
