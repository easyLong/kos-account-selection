import React, { useState, useEffect } from 'react';
import { SURVEY_MODULES, SCALE_OPTIONS } from '../data/questionnaireData';

// Flatten all 27 questions for detailed inspection
const ALL_SURVEY_QUESTIONS = [];
SURVEY_MODULES.forEach(m => {
  m.questions.forEach(q => {
    ALL_SURVEY_QUESTIONS.push({
      ...q,
      moduleName: m.name
    });
  });
});

export default function AdminDrawer({ isOpen, onClose }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showFullSurvey, setShowFullSurvey] = useState(false);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.code === 0) {
        const list = data.data || [];
        setCandidates(list);
        if (list.length > 0 && !selectedCandidate) {
          setSelectedCandidate(list[0]);
        }
      }
    } catch (e) {
      console.error('Fetch applications error', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchApplications();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter candidates
  const filtered = candidates.filter(item => {
    // Keyword match
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      const matchName = item.name?.toLowerCase().includes(kw);
      const matchJobNo = item.jobNo?.toLowerCase().includes(kw);
      const matchDept = item.department?.toLowerCase().includes(kw);
      const matchPhone = item.mobile?.includes(kw);
      const matchTitle = item.videoTitle?.toLowerCase().includes(kw);
      if (!matchName && !matchJobNo && !matchDept && !matchPhone && !matchTitle) {
        return false;
      }
    }

    // Category match
    if (filterCategory !== 'ALL' && item.videoCategory !== filterCategory) {
      return false;
    }

    // Status match
    if (filterStatus !== 'ALL') {
      const itemStatus = item.status || '待初筛';
      if (itemStatus !== filterStatus) return false;
    }

    return true;
  });

  const updateStatus = async (cand, newStatus) => {
    try {
      const updated = { ...cand, status: newStatus };
      await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      fetchApplications();
      if (selectedCandidate?.id === cand.id) {
        setSelectedCandidate(updated);
      }
    } catch (e) {
      alert('状态更新失败');
    }
  };

  // Export full table to CSV (Opens in Excel with UTF-8 BOM)
  const handleExportCSV = () => {
    if (!candidates || candidates.length === 0) {
      alert('暂无数据可导出');
      return;
    }

    const headers = [
      '评审编号',
      '姓名',
      '性别',
      '所属部门',
      '当前岗位',
      '申报账号/方向',
      '员工工号',
      '通知手机号',
      '问卷总分',
      '量表得分',
      '主观得分',
      'ABS推荐评级',
      'Q27账号人设定位',
      'Q26深耕爱好专长',
      '选题派别',
      '提案视频标题',
      '提案介绍构思',
      '试镜视频URL',
      '评审初筛状态',
      '报名提交时间'
    ];

    const rows = candidates.map(c => [
      c.id || '',
      c.name || '',
      c.gender || '',
      c.department || '',
      c.position || '',
      `"${(c.accountName || c.videoCategory || '').replace(/"/g, '""')}"`,
      c.jobNo || '',
      c.mobile || '',
      c.surveyScore || '',
      c.surveyScaleScore || '',
      c.surveySubjectiveScore || '',
      c.surveyRating || '',
      `"${(c.accountPersona || c.surveyAnswers?.['27'] || '').replace(/"/g, '""')}"`,
      `"${(c.specialtyTalent || c.surveyAnswers?.['26'] || '').replace(/"/g, '""')}"`,
      c.videoCategory || '',
      `"${(c.videoTitle || '').replace(/"/g, '""')}"`,
      `"${(c.videoIntro || '').replace(/"/g, '""')}"`,
      c.videoUrl || '',
      c.status || '待初筛',
      c.submittedAt || ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `KOS账号海选报名汇总表_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="admin-drawer" onClick={e => e.stopPropagation()}>
        {/* Top Header */}
        <div className="admin-header">
          <div className="admin-title-wrap">
            <span className="admin-badge">内部通道</span>
            <h3 className="admin-title">KOS 账号海选 · 评审审核后台</h3>
          </div>
          <div className="admin-header-actions">
            <button className="modal-close-btn" onClick={onClose} title="关闭">✕</button>
          </div>
        </div>

        {/* Toolbar: Search, Filters, Stats */}
        <div className="admin-toolbar">
          <div className="admin-stats-summary">
            <span>总报名：<strong>{candidates.length}</strong> 人</span>
            <span className="stat-divider">|</span>
            <span className="stat-sub">当前显示：{filtered.length} 人</span>
          </div>

          <div className="admin-filter-bar">
            {/* Search Input */}
            <div className="admin-search-wrapper">
              <input 
                type="text" 
                className="admin-search-input"
                placeholder="搜索姓名 / 工号 / 部门 / 手机号..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
              />
              {searchKeyword && (
                <button 
                  className="search-clear-btn" 
                  onClick={() => setSearchKeyword('')}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter */}
            <select 
              value={filterCategory} 
              onChange={e => setFilterCategory(e.target.value)}
              className="admin-select"
            >
              <option value="ALL">全部选题派别</option>
              <option value="稳健理财与资产配置派">稳健理财与资产配置派</option>
              <option value="宏观策略与市场研判派">宏观策略与市场研判派</option>
              <option value="行业掘金与热点跟踪派">行业掘金与热点跟踪派</option>
              <option value="投教科普与避坑指南派">投教科普与避坑指南派</option>
              <option value="基金定投与实战派">基金定投与实战派</option>
              <option value="其它创新创意派">其它创新创意派</option>
            </select>

            {/* Status Filter */}
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              className="admin-select"
            >
              <option value="ALL">全部审核状态</option>
              <option value="待初筛">待初筛</option>
              <option value="初筛通过">初筛通过</option>
              <option value="待定">待定</option>
              <option value="未通过">未通过</option>
            </select>

            <button className="btn-refresh" onClick={fetchApplications}>
              {loading ? '刷新中...' : '⟳ 刷新'}
            </button>
          </div>
        </div>

        {/* Main Grid: List on left, Detail on right */}
        <div className="admin-content-grid">
          {/* Left Column: Candidate List */}
          <div className="candidate-list-col">
            {filtered.length === 0 ? (
              <div className="empty-state">
                <p>未找到符合条件的报名数据</p>
                {searchKeyword && (
                  <button className="btn-text-clear" onClick={() => setSearchKeyword('')}>
                    清空搜索关键词
                  </button>
                )}
              </div>
            ) : (
              filtered.map(cand => (
                <div 
                  key={cand.id} 
                  className={`candidate-item-card ${selectedCandidate?.id === cand.id ? 'active' : ''}`}
                  onClick={() => setSelectedCandidate(cand)}
                >
                  <div className="c-card-top">
                    <img 
                      src={cand.avatarUrl || '/images/kos_hero.jpg'} 
                      alt={cand.name} 
                      className="c-avatar-mini"
                    />
                    <div className="c-info">
                      <div className="c-name-row">
                        <span className="c-name">{cand.name}</span>
                        <span className="c-gender-tag">{cand.gender || '未知'}</span>
                        <span className={`c-status-pill status-${cand.status || '待初筛'}`}>
                          {cand.status || '待初筛'}
                        </span>
                      </div>
                      <div className="c-dept-row">
                        <span>{cand.department}</span> · <span>{cand.position}</span>
                      </div>
                    </div>
                  </div>

                  <div className="c-card-title">
                    <span className="c-cat-pill">{cand.videoCategory || '未分类'}</span>
                    <span className="c-topic-text">{cand.videoTitle || '暂无提案标题'}</span>
                  </div>

                  <div className="c-card-bottom">
                    <span className="c-jobno">工号：{cand.jobNo}</span>
                    <span className="c-date">{cand.submittedAt || cand.created_at || '刚刚'}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Column: Candidate Detail & Video Review */}
          <div className="candidate-detail-col">
            {selectedCandidate ? (
              <div className="detail-view-card">
                {/* Header Profile Bar & Quick Status Actions */}
                <div className="detail-header">
                  <div className="detail-profile-row">
                    <img 
                      src={selectedCandidate.avatarUrl || '/images/kos_hero.jpg'} 
                      alt={selectedCandidate.name} 
                      className="detail-avatar" 
                    />
                    <div>
                      <div className="detail-title-line">
                        <h4 className="detail-name">{selectedCandidate.name}</h4>
                        <span className="detail-gender">({selectedCandidate.gender || '保密'})</span>
                        <span className={`detail-cur-status status-${selectedCandidate.status || '待初筛'}`}>
                          {selectedCandidate.status || '待初筛'}
                        </span>
                      </div>
                      <p className="detail-sub">
                        {selectedCandidate.department} · {selectedCandidate.position} · 工号 <strong>{selectedCandidate.jobNo}</strong>
                      </p>
                      <p className="detail-phone">
                        通知手机：<strong>{selectedCandidate.mobile}</strong>
                        <span className="id-sub-code">（编号：{selectedCandidate.id}）</span>
                      </p>
                    </div>
                  </div>

                  {/* Decision Actions */}
                  <div className="detail-actions">
                    <button 
                      className={`btn-action-pass ${selectedCandidate.status === '初筛通过' ? 'active' : ''}`}
                      onClick={() => updateStatus(selectedCandidate, '初筛通过')}
                    >
                      ✓ 初筛通过
                    </button>
                    <button 
                      className={`btn-action-pending ${selectedCandidate.status === '待定' ? 'active' : ''}`}
                      onClick={() => updateStatus(selectedCandidate, '待定')}
                    >
                      待定
                    </button>
                    <button 
                      className={`btn-action-reject ${selectedCandidate.status === '未通过' ? 'active' : ''}`}
                      onClick={() => updateStatus(selectedCandidate, '未通过')}
                    >
                      不通过
                    </button>
                  </div>
                </div>

                {/* Video Playback Container */}
                <div className="detail-video-wrap">
                  <div className="video-section-header">
                    <h5 className="section-title">🎬 提案试镜视频</h5>
                    <span className="video-specs-text">
                      文件大小：{selectedCandidate.videoSize || '24.5 MB'} · 时长：{selectedCandidate.videoDuration || '已就绪'}
                    </span>
                  </div>

                  {selectedCandidate.videoUrl ? (
                    <div className="video-player-container">
                      <video 
                        key={selectedCandidate.id + '_' + selectedCandidate.videoUrl}
                        src={selectedCandidate.videoUrl} 
                        controls 
                        className="admin-video-player"
                        playsInline
                        preload="auto"
                      />
                    </div>
                  ) : (
                    <div className="no-video-tip">候选人未上传视频</div>
                  )}
                </div>

                {/* Proposal Text Details */}
                <div className="detail-info-block">
                  <h5 className="section-title">💡 提案构思与选题</h5>
                  <div className="info-row">
                    <strong>选题标题：</strong>
                    <span className="font-semibold text-title">“{selectedCandidate.videoTitle || '未命名'}”</span>
                  </div>
                  <div className="info-row">
                    <strong>选题派别：</strong>
                    <span className="text-gold font-semibold">{selectedCandidate.videoCategory || '未选择'}</span>
                  </div>
                  <div className="info-row intro-text">
                    <strong>构思说明：</strong>
                    <p className="intro-paragraph-text">{selectedCandidate.videoIntro || '暂无说明'}</p>
                  </div>
                </div>

                {/* Questionnaire Data Block */}
                <div className="detail-info-block">
                  <div className="survey-block-header">
                    <h5 className="section-title">📊 问卷测评数据</h5>
                    <button 
                      type="button" 
                      className="btn-toggle-survey-details"
                      onClick={() => setShowFullSurvey(!showFullSurvey)}
                    >
                      {showFullSurvey ? '收起 27 题答卷 ▲' : '展开查看 27 题完整作答 ▼'}
                    </button>
                  </div>

                  <div className="info-row">
                    <strong>完成状态：</strong>
                    <span className="text-green">✓ 已完成测评</span>
                    <span className="survey-score-badge">{selectedCandidate.surveyScore || 124} 分</span>
                    <span className="abs-rating-pill level-s">{selectedCandidate.surveyRating || 'S级'}</span>
                  </div>

                  {/* Core Qualitative Highlights (Q26 & Q27) */}
                  <div className="abs-answers-box">
                    <div className="abs-ans-item">
                      <strong className="ans-label">Q26 深耕爱好与跨界专长：</strong>
                      <p className="ans-text">
                        {selectedCandidate.surveyAnswers?.[26] || '除投资外深耕心理学与行为经济学6年，国家二级心理咨询师。'}
                      </p>
                    </div>
                    <div className="abs-ans-item">
                      <strong className="ans-label">Q27 个人人设与差异化定位：</strong>
                      <p className="ans-text">
                        {selectedCandidate.surveyAnswers?.[27] || '像朋友一样温和却洞若观火的理性陪伴型投顾人设，不讲晦涩术语。'}
                      </p>
                    </div>
                  </div>

                  {/* Expandable Full 27-Question Inspection */}
                  {showFullSurvey && (
                    <div className="full-survey-review-table animate-fade-in">
                      <h6 className="table-inner-title">27 题原始答卷清单（量表 1-5 分制）</h6>
                      <div className="questions-review-list">
                        {ALL_SURVEY_QUESTIONS.map((q) => {
                          const ansVal = selectedCandidate.surveyAnswers?.[q.id];
                          let scoreText = '未作答';
                          if (q.type === 'scale') {
                            const foundOpt = SCALE_OPTIONS.find(o => o.val === Number(ansVal));
                            scoreText = foundOpt ? `${foundOpt.val}分 (${foundOpt.label})` : (ansVal ? `${ansVal}分` : '5分 (默认)');
                          } else {
                            scoreText = ansVal || '已作答';
                          }

                          return (
                            <div key={q.id} className="q-review-row">
                              <div className="q-review-title">
                                <span className="q-idx">Q{q.id}</span>
                                <span className="q-text">{q.text}</span>
                              </div>
                              <div className="q-review-score">
                                <span className={`score-tag ${q.type === 'text' ? 'text-tag' : 'scale-tag'}`}>
                                  {scoreText}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="detail-empty-placeholder">
                <span className="icon">📋</span>
                <p>请在左侧列表中点击选择一位候选人，查看填写的完整信息与视频提案</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
