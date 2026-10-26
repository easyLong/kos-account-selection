import React from 'react';

export default function LandingPage({ onStart, onOpenAdmin }) {
  return (
    <div className="landing-page animate-fade-in">
      {/* Hero Media Section matching mockup 1 */}
      <div className="hero-section">
        <div className="hero-image-wrap">
          <img 
            src="/images/kos_hero.jpg" 
            alt="KOS 海选 - 闪闪发光的公司级 UP 主" 
            className="hero-img"
          />
          {/* Warm luxury lighting vignettes */}
          <div className="hero-top-vignette"></div>
          <div className="hero-bottom-gradient"></div>
        </div>

        {/* Hero Floating Content */}
        <div className="hero-content">
          <div className="badge-pill">
            <span className="sparkle">✦</span>
            <span>星火计划</span>
            <span className="sparkle">✦</span>
          </div>

          <h1 className="hero-title">
            闪闪发光的公司级 UP 主
          </h1>

          <p className="hero-subtitle">
            财经类自媒体创作者选拔项目
          </p>
        </div>
      </div>

      {/* Narrative & Body Section matching mockup 1 */}
      <div className="landing-body">
        <div className="intro-card">
          <p className="intro-paragraph">
            你有强烈的表达欲吗？愿意<strong className="text-highlight">以真实身份或出镜创作</strong>，把专业财经知识与投资体验变成爆款内容？【星火计划】创作者队伍正在招募，让你的才华被看见！
          </p>
        </div>

        {/* Bottom Floating Action Area */}
        <div className="landing-footer">
          <button 
            id="btn-start-register"
            className="btn-gold-primary hero-btn"
            onClick={onStart}
          >
            <span>立即报名</span>
          </button>
          <div className="landing-quick-hint">
            <span>⚡ 全程仅需 3 步 · 约 3 分钟即可完成</span>
          </div>

        </div>
      </div>
    </div>
  );
}
