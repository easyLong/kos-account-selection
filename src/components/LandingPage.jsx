import React from 'react';

export default function LandingPage({ onStart, onOpenAdmin }) {
  const selectionStages = [
    {
      num: '01',
      title: '作品提交',
      tag: '第一阶段',
      desc: '作品主题不限，须为本人原创并符合合规与品牌要求；自主选题图文笔记 1 篇，或出镜短视频 1 条。'
    },
    {
      num: '02',
      title: '路演答辩',
      tag: '第二阶段',
      desc: '参赛人员开展路演答辩，由公司管理层及内部专家组建评审团开展评审。'
    },
    {
      num: '03',
      title: '结果公示',
      tag: '第三阶段',
      desc: '结合报名作品质量、现场路演综合得分确定入选名单并予以公示。'
    }
  ];

  return (
    <div className="landing-page animate-fade-in">
      {/* Hero Media Section */}
      <div className="hero-section">
        <div className="hero-image-wrap">
          <img 
            src="/images/kos_hero.jpg" 
            alt="【星火计划】财经类自媒体创作者选拔项目" 
            className="hero-img"
          />
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
            【星火计划】
          </h1>

          <p className="hero-subtitle">
            财经类自媒体创作者选拔项目
          </p>
        </div>
      </div>

      {/* Narrative & Body Section */}
      <div className="landing-body">
        {/* Core Intro Card */}
        <div className="intro-card">
          <p className="intro-paragraph">
            你有强烈的表达欲吗？愿意<strong className="text-highlight">以真实身份或出镜创作</strong>，把专业投资研判、财富智慧与生活体验变成爆款内容？【星火计划】面向全员正式招募，让每一个闪闪发光的创作者被看见！
          </p>
        </div>

        {/* 3-Step Selection Flow Section */}
        <div className="selection-flow-card">
          <div className="flow-card-header">
            <span className="sparkle-gold">✦</span>
            <h3 className="flow-card-title">选拔流程</h3>
            <span className="sparkle-gold">✦</span>
          </div>
          
          <div className="flow-steps-list">
            {selectionStages.map((s) => (
              <div key={s.num} className="flow-step-item">
                <div className="flow-step-left">
                  <span className="flow-step-num">{s.num}</span>
                  <span className="flow-step-tag">{s.tag}</span>
                </div>
                <div className="flow-step-content">
                  <h4 className="flow-step-title">{s.title}</h4>
                  <p className="flow-step-desc">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Floating Action Area */}
        <div className="landing-footer">
          <button 
            id="btn-start-register"
            className="btn-gold-primary hero-btn"
            onClick={onStart}
          >
            <span>立即报名提交作品</span>
          </button>
          <div className="landing-quick-hint">
            <span>⚡ 全程仅需 3 步 · 约 3 分钟即可完成</span>
          </div>
        </div>
      </div>
    </div>
  );
}
