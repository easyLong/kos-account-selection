export default function LandingPage({ onStart }) {
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
            <span>创作者招募</span>
            <span className="sparkle">✦</span>
          </div>

          <h1 className="hero-title">
            星火计划
          </h1>

          <p className="hero-subtitle">
            财经类自媒体创作者选拔项目
          </p>
        </div>
      </div>

      {/* Narrative & Body Section matching mockup 1 */}
      <div className="landing-body">
        <div className="intro-card">
          <div className="intro-lines-wrapper">
            <p className="intro-line">如果你热爱内容创作</p>
            <p className="intro-line">希望沉淀已久的专业认知被更多人看见</p>
            <p className="intro-line">如果你乐于分享观点</p>
            <p className="intro-line">想把扎实的财经积累转化为大众听得懂的表达</p>
            <p className="intro-line">如果你愿意跳出固有工作视角</p>
            <p className="intro-line">发掘自身更多可能性</p>
            <p className="intro-line intro-line-right">
              <strong className="text-highlight">欢迎报名星火计划</strong>
            </p>
          </div>
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
