import React, { useRef } from 'react';

export default function PosterModal({ isOpen, onClose, submission }) {
  const posterRef = useRef(null);

  if (!isOpen || !submission) return null;

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="modal-dialog poster-modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">KOS 官方参赛荣誉海报</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body poster-scroll-wrap">
          {/* Visual Poster Card */}
          <div className="official-poster-card" ref={posterRef}>
            <div className="poster-bg-glow"></div>

            <div className="poster-header">
              <div className="poster-badge-pill">
                <span>✦ 官方认证参赛者 ✦</span>
              </div>
              <h2 className="poster-main-title">闪闪发光的公司级 UP 主</h2>
              <p className="poster-sub">KOS 账号海选 · 勇敢出镜，才华可见</p>
            </div>

            <div className="poster-creator-profile">
              <div className="poster-avatar-ring">
                {submission.avatarUrl ? (
                  <img 
                    src={submission.avatarUrl} 
                    alt={submission.name} 
                    className="poster-avatar-img"
                  />
                ) : (
                  <div className="poster-avatar-monogram">
                    {submission.name ? submission.name.slice(0, 1) : 'UP'}
                  </div>
                )}
              </div>
              <h3 className="poster-creator-name">{submission.name}</h3>
              <p className="poster-creator-dept">
                {submission.department} · {submission.position}
              </p>
            </div>

            <div className="poster-proposal-info">
              <div className="poster-tag-row">
                <span className="poster-school-tag">{submission.videoCategory || '投资创作派'}</span>
                <span className="poster-id-tag">No. {submission.id}</span>
              </div>
              <h4 className="poster-proposal-title">“{submission.videoTitle || '我的理财与投资提案'}”</h4>
              <p className="poster-proposal-quote">
                {submission.videoIntro ? (submission.videoIntro.slice(0, 75) + '...') : '用专业与热情，传递投资理性的温度。'}
              </p>
            </div>

            <div className="poster-footer">
              <div className="poster-qr-block">
                <div className="mini-qr-box">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(window.location.origin)}`} 
                    alt="二维码" 
                    className="mini-qr-img"
                  />
                </div>
                <div className="poster-qr-text">
                  <p className="qr-title">扫码加入公司 KOS 海选</p>
                  <p className="qr-sub">不限岗位 · 让你的才华被看见</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            type="button" 
            className="btn-gold-primary" 
            onClick={() => alert('请长按上方海报，或截图保存分享至微信朋友圈/工作群！')}
          >
            长按或截图保存海报分享
          </button>
        </div>
      </div>
    </div>
  );
}
