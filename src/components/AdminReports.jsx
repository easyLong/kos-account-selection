import React, { useState, useMemo } from 'react';

// Helper to sum scale questions
export function calcModuleScore(answers, start, end) {
  let sum = 0;
  if (!answers) return 0;
  for (let i = start; i <= end; i++) {
    const v = Number(answers[i] || answers[String(i)] || 0);
    if (!isNaN(v)) sum += v;
  }
  return sum;
}

// Helper to determine ABS Rating
export function getAbsRating(scaleTotal, textTotal) {
  const total = scaleTotal + textTotal;
  if (total >= 112 && scaleTotal >= 102 && textTotal >= 10) {
    return { level: 'S级·标杆IP', key: 'S', color: '#B45309', bg: '#FEF3C7', border: '#F59E0B' };
  }
  if (total >= 88 && scaleTotal >= 80 && textTotal >= 4) {
    return { level: 'A级·主力IP', key: 'A', color: '#15803D', bg: '#DCFCE7', border: '#22C55E' };
  }
  if (total >= 65 && scaleTotal >= 60) {
    return { level: 'B级·储备IP', key: 'B', color: '#C2410C', bg: '#FFEDD5', border: '#FB923C' };
  }
  return { level: '暂不推荐·幕后支持', key: 'X', color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB' };
}

/**
 * 报表一：【报名总览】 (匹配模板 Sheet 2)
 */
export function AdminOverviewReport({ candidates, onUpdateCandidate, onSelectCandidate }) {
  const [searchKw, setSearchKw] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterRating, setFilterRating] = useState('ALL');
  const [editingComments, setEditingComments] = useState({});

  // KPIs
  const stats = useMemo(() => {
    let sCount = 0, aCount = 0, bCount = 0, xCount = 0;
    let pendingCount = 0, passCount = 0;

    candidates.forEach(c => {
      const status = c.status || '待初筛';
      if (status === '待初筛') pendingCount++;
      if (status === '初筛通过') passCount++;

      const r = c.surveyRating || '';
      if (r.includes('S级')) sCount++;
      else if (r.includes('A级')) aCount++;
      else if (r.includes('B级')) bCount++;
      else xCount++;
    });

    return {
      total: candidates.length,
      pending: pendingCount,
      passed: passCount,
      s: sCount,
      a: aCount,
      b: bCount,
      x: xCount
    };
  }, [candidates]);

  // Filtered rows
  const filtered = useMemo(() => {
    return candidates.filter(c => {
      if (searchKw.trim()) {
        const kw = searchKw.trim().toLowerCase();
        const match = (
          (c.name || '').toLowerCase().includes(kw) ||
          (c.id || '').toLowerCase().includes(kw) ||
          (c.department || '').toLowerCase().includes(kw) ||
          (c.position || '').toLowerCase().includes(kw) ||
          (c.mobile || '').includes(kw) ||
          (c.targetAccountStyle || '').toLowerCase().includes(kw)
        );
        if (!match) return false;
      }
      if (filterStatus !== 'ALL' && (c.status || '待初筛') !== filterStatus) return false;
      if (filterRating !== 'ALL' && !(c.surveyRating || '').includes(filterRating)) return false;
      return true;
    });
  }, [candidates, searchKw, filterStatus, filterRating]);

  const handleCommentBlur = (cId, oldVal) => {
    const newVal = editingComments[cId];
    if (newVal !== undefined && newVal !== oldVal) {
      onUpdateCandidate(cId, { reviewComments: newVal });
    }
  };

  return (
    <div className="report-view-container animate-fade-in">
      {/* KPI Metric Cards */}
      <div className="report-kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">报名总数</span>
          <span className="kpi-value">{stats.total}</span>
          <span className="kpi-sub">位申报创作者</span>
        </div>
        <div className="kpi-card highlight-pending">
          <span className="kpi-label">待初筛</span>
          <span className="kpi-value text-amber">{stats.pending}</span>
          <span className="kpi-sub">待评定审核</span>
        </div>
        <div className="kpi-card highlight-pass">
          <span className="kpi-label">初筛通过</span>
          <span className="kpi-value text-emerald">{stats.passed}</span>
          <span className="kpi-sub">符合入围资格</span>
        </div>
        <div className="kpi-card highlight-s">
          <span className="kpi-label">S级 · 标杆IP</span>
          <span className="kpi-value text-gold">{stats.s}</span>
          <span className="kpi-sub">全案扶持</span>
        </div>
        <div className="kpi-card highlight-a">
          <span className="kpi-label">A级 · 主力IP</span>
          <span className="kpi-value text-green">{stats.a}</span>
          <span className="kpi-sub">半托管孵化</span>
        </div>
        <div className="kpi-card highlight-b">
          <span className="kpi-label">B级 · 储备IP</span>
          <span className="kpi-value text-orange">{stats.b}</span>
          <span className="kpi-sub">图文/长文循序进阶</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="report-action-toolbar">
        <div className="toolbar-left">
          <div className="report-search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索姓名 / 编号 / 部门 / 岗位 / 手机号..."
              value={searchKw}
              onChange={e => setSearchKw(e.target.value)}
              className="report-search-input"
            />
            {searchKw && (
              <button className="clear-btn" onClick={() => setSearchKw('')}>✕</button>
            )}
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="report-filter-select"
          >
            <option value="ALL">全部审核状态</option>
            <option value="待初筛">待初筛</option>
            <option value="初筛通过">初筛通过</option>
            <option value="待定">待定</option>
            <option value="未通过">未通过</option>
          </select>

          <select
            value={filterRating}
            onChange={e => setFilterRating(e.target.value)}
            className="report-filter-select"
          >
            <option value="ALL">全部系统定级</option>
            <option value="S级">S级·标杆IP</option>
            <option value="A级">A级·主力IP</option>
            <option value="B级">B级·储备IP</option>
            <option value="暂不推荐">暂不推荐</option>
          </select>
        </div>

        <div className="toolbar-right">
          <span className="row-count-badge">显示 {filtered.length} / {candidates.length} 条</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="report-table-card">
        <div className="report-table-scroll">
          <table className="report-custom-table">
            <thead>
              <tr className="th-group-row">
                <th colSpan="6" className="th-group-hdr hdr-enroll">报名信息</th>
                <th colSpan="6" className="th-group-hdr hdr-base">基本信息</th>
                <th colSpan="2" className="th-group-hdr hdr-grade">综合定级 (满分 145)</th>
                <th colSpan="2" className="th-group-hdr hdr-review">评审操作</th>
              </tr>
              <tr className="th-main-row">
                <th style={{ width: '45px' }}>序号</th>
                <th style={{ width: '95px' }}>数据日期</th>
                <th style={{ width: '85px' }}>评审编号</th>
                <th style={{ width: '135px' }}>提交时间</th>
                <th style={{ width: '135px' }}>问卷时间</th>
                <th style={{ width: '100px' }}>审核状态</th>
                <th style={{ width: '85px' }}>姓名</th>
                <th style={{ width: '55px' }}>性别</th>
                <th style={{ width: '110px' }}>部门/团队</th>
                <th style={{ width: '100px' }}>现任岗位</th>
                <th style={{ minWidth: '150px' }}>一句话介绍</th>
                <th style={{ minWidth: '120px' }}>账号风格</th>
                <th style={{ width: '80px', textAlign: 'center' }}>总分</th>
                <th style={{ width: '125px', textAlign: 'center' }}>系统定级</th>
                <th style={{ minWidth: '160px' }}>评审意见</th>
                <th style={{ width: '75px', textAlign: 'center' }}>详情</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="16" className="empty-row">暂无符合条件的报名数据</td>
                </tr>
              ) : (
                filtered.map((c, idx) => {
                  const subDate = (c.submittedAt || '').split(' ')[0] || '-';
                  const ratingObj = getAbsRating(
                    Number(c.surveyScaleScore || 0),
                    Number(c.surveySubjectiveScore || 0)
                  );
                  const isS = (c.surveyRating || ratingObj.level).includes('S级');
                  const isA = (c.surveyRating || ratingObj.level).includes('A级');
                  const isB = (c.surveyRating || ratingObj.level).includes('B级');

                  return (
                    <tr key={c.id || idx} className="report-data-row">
                      <td className="cell-num">{idx + 1}</td>
                      <td className="cell-date">{subDate}</td>
                      <td>
                        <span className="badge-id-tag">{c.id}</span>
                      </td>
                      <td className="cell-time">{c.submittedAt || '-'}</td>
                      <td className="cell-time">{c.surveyTime || c.submittedAt || '-'}</td>
                      <td>
                        <select
                          className={`status-select-badge status-${c.status || '待初筛'}`}
                          value={c.status || '待初筛'}
                          onChange={e => onUpdateCandidate(c.id, { status: e.target.value })}
                        >
                          <option value="待初筛">待初筛</option>
                          <option value="初筛通过">初筛通过</option>
                          <option value="待定">待定</option>
                          <option value="未通过">未通过</option>
                        </select>
                      </td>
                      <td>
                        <strong className="cell-name">{c.name}</strong>
                      </td>
                      <td className="cell-center">{c.gender || '-'}</td>
                      <td>{c.department || '-'}</td>
                      <td>{c.position || '-'}</td>
                      <td className="cell-ellipsis" title={c.personalIntro || c.videoIntro || ''}>
                        {c.personalIntro || c.videoIntro || '-'}
                      </td>
                      <td className="cell-ellipsis" title={c.targetAccountStyle || c.accountPersona || ''}>
                        {c.targetAccountStyle || c.accountPersona || '-'}
                      </td>
                      <td className="cell-score" style={{ textAlign: 'center' }}>
                        <strong>{c.surveyScore || 0}</strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span 
                          className="rating-pill" 
                          style={{
                            color: isS ? '#B45309' : isA ? '#15803D' : isB ? '#C2410C' : '#6B7280',
                            backgroundColor: isS ? '#FEF3C7' : isA ? '#DCFCE7' : isB ? '#FFEDD5' : '#F3F4F6',
                            borderColor: isS ? '#F59E0B' : isA ? '#22C55E' : isB ? '#FB923C' : '#D1D5DB'
                          }}
                        >
                          {c.surveyRating || ratingObj.level}
                        </span>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="inline-input-cell"
                          placeholder="点击录入评审意见..."
                          value={editingComments[c.id] !== undefined ? editingComments[c.id] : (c.reviewComments || '')}
                          onChange={e => setEditingComments({ ...editingComments, [c.id]: e.target.value })}
                          onBlur={() => handleCommentBlur(c.id, c.reviewComments || '')}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-inspect-sm"
                          onClick={() => onSelectCandidate(c)}
                        >
                          查看 ›
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * 报表二：【测评与作品明细】 (匹配模板 Sheet 3)
 */
export function AdminDetailsReport({ candidates, onUpdateCandidate, onSelectCandidate }) {
  const [searchKw, setSearchKw] = useState('');
  const [previewVideo, setPreviewVideo] = useState(null);
  const [editingScores, setEditingScores] = useState({});
  const [editingRemarks, setEditingRemarks] = useState({});

  const filtered = useMemo(() => {
    return candidates.filter(c => {
      if (searchKw.trim()) {
        const kw = searchKw.trim().toLowerCase();
        const match = (
          (c.name || '').toLowerCase().includes(kw) ||
          (c.id || '').toLowerCase().includes(kw) ||
          (c.department || '').toLowerCase().includes(kw) ||
          (c.videoTitle || '').toLowerCase().includes(kw)
        );
        if (!match) return false;
      }
      return true;
    });
  }, [candidates, searchKw]);

  // Handle Q26 / Q27 score change
  const handleScoreChange = (c, field, val) => {
    const num = Math.max(0, Math.min(10, Number(val) || 0));
    setEditingScores(prev => ({
      ...prev,
      [`${c.id}_${field}`]: num
    }));
  };

  const handleScoreBlur = (c, field) => {
    const key = `${c.id}_${field}`;
    const newVal = editingScores[key];
    if (newVal !== undefined && newVal !== c[field]) {
      onUpdateCandidate(c.id, { [field]: newVal });
    }
  };

  const handleRemarkBlur = (cId, oldVal) => {
    const newVal = editingRemarks[cId];
    if (newVal !== undefined && newVal !== oldVal) {
      onUpdateCandidate(cId, { reviewerRemark: newVal });
    }
  };

  return (
    <div className="report-view-container animate-fade-in">
      {/* Top Banner Guide */}
      <div className="details-banner-guide">
        <div className="guide-left">
          <span className="guide-icon">✨</span>
          <div className="guide-text">
            <strong>问卷量表明细与作品在线评分区</strong>
            <p>
              展示 6 大模块明细分（满分 125）、Q26/Q27 主观简答原文与后台评分（满分 20）。在得分框直接输入分值并失焦，系统将实时计算总分并自动重新判定 ABS 等级！
            </p>
          </div>
        </div>
        <div className="guide-right">
          <div className="report-search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索姓名 / 编号 / 部门..."
              value={searchKw}
              onChange={e => setSearchKw(e.target.value)}
              className="report-search-input"
            />
            {searchKw && (
              <button className="clear-btn" onClick={() => setSearchKw('')}>✕</button>
            )}
          </div>
        </div>
      </div>

      {/* Main Big Analytical Table */}
      <div className="report-table-card">
        <div className="report-table-scroll">
          <table className="report-custom-table table-detailed">
            <thead>
              <tr className="th-group-row">
                <th colSpan="4" className="th-group-hdr hdr-enroll">报名信息</th>
                <th colSpan="7" className="th-group-hdr hdr-scale">量表测评 (自评满分 125)</th>
                <th colSpan="5" className="th-group-hdr hdr-subjective">简答评分 (后台评分满分 20)</th>
                <th colSpan="2" className="th-group-hdr hdr-grade">综合定级 (满分 145)</th>
                <th colSpan="6" className="th-group-hdr hdr-works">作品信息与构思</th>
                <th className="th-group-hdr hdr-review">备注</th>
              </tr>
              <tr className="th-main-row">
                <th style={{ width: '40px' }}>序号</th>
                <th style={{ width: '90px' }}>数据日期</th>
                <th style={{ width: '85px' }}>评审编号</th>
                <th style={{ width: '80px' }}>姓名</th>
                {/* 6 Modules */}
                <th style={{ width: '70px', textAlign: 'center' }}>M1表达(25)</th>
                <th style={{ width: '70px', textAlign: 'center' }}>M2特质(25)</th>
                <th style={{ width: '70px', textAlign: 'center' }}>M3专业(20)</th>
                <th style={{ width: '70px', textAlign: 'center' }}>M4镜头(20)</th>
                <th style={{ width: '70px', textAlign: 'center' }}>M5学习(15)</th>
                <th style={{ width: '70px', textAlign: 'center' }}>M6自驱(20)</th>
                <th style={{ width: '80px', textAlign: 'center', background: '#FDF7EB' }}>量表总分</th>
                {/* Subjective Q26/Q27 */}
                <th style={{ minWidth: '160px' }}>Q26 爱好与跨界(原文)</th>
                <th style={{ width: '85px', textAlign: 'center' }}>Q26得分</th>
                <th style={{ minWidth: '160px' }}>Q27 账号人设(原文)</th>
                <th style={{ width: '85px', textAlign: 'center' }}>Q27得分</th>
                <th style={{ width: '75px', textAlign: 'center', background: '#F5EBE1' }}>简答小计</th>
                {/* Final rating */}
                <th style={{ width: '80px', textAlign: 'center', background: '#FEF3C7' }}>总分(145)</th>
                <th style={{ width: '120px', textAlign: 'center' }}>系统定级</th>
                {/* Works */}
                <th style={{ minWidth: '130px' }}>作品标题</th>
                <th style={{ width: '80px' }}>视频文件</th>
                <th style={{ width: '65px' }}>时长</th>
                <th style={{ width: '65px' }}>大小</th>
                <th style={{ width: '80px', textAlign: 'center' }}>视频预览</th>
                <th style={{ minWidth: '150px' }}>作品构思</th>
                <th style={{ minWidth: '140px' }}>评分人/备注</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="25" className="empty-row">暂无符合条件的测评数据</td>
                </tr>
              ) : (
                filtered.map((c, idx) => {
                  const subDate = (c.submittedAt || '').split(' ')[0] || '-';
                  const ans = c.surveyAnswers || {};
                  const m1 = calcModuleScore(ans, 1, 5);
                  const m2 = calcModuleScore(ans, 6, 10);
                  const m3 = calcModuleScore(ans, 11, 14);
                  const m4 = calcModuleScore(ans, 15, 18);
                  const m5 = calcModuleScore(ans, 19, 21);
                  const m6 = calcModuleScore(ans, 22, 25);
                  const scaleTotal = m1 + m2 + m3 + m4 + m5 + m6;

                  const q26Val = editingScores[`${c.id}_q26Score`] !== undefined 
                    ? editingScores[`${c.id}_q26Score`] 
                    : Number(c.q26Score || 0);

                  const q27Val = editingScores[`${c.id}_q27Score`] !== undefined 
                    ? editingScores[`${c.id}_q27Score`] 
                    : Number(c.q27Score || 0);

                  const textTotal = q26Val + q27Val;
                  const totalScore = scaleTotal + textTotal;
                  const ratingObj = getAbsRating(scaleTotal, textTotal);
                  const isS = ratingObj.level.includes('S级');
                  const isA = ratingObj.level.includes('A级');
                  const isB = ratingObj.level.includes('B级');

                  const q26Text = ans['26'] || c.specialtyTalent || '';
                  const q27Text = ans['27'] || c.accountPersona || '';

                  return (
                    <tr key={c.id || idx} className="report-data-row">
                      <td className="cell-num">{idx + 1}</td>
                      <td className="cell-date">{subDate}</td>
                      <td>
                        <span className="badge-id-tag">{c.id}</span>
                      </td>
                      <td>
                        <strong className="cell-name">{c.name}</strong>
                      </td>
                      {/* Modules */}
                      <td className="cell-center cell-muted">{m1}</td>
                      <td className="cell-center cell-muted">{m2}</td>
                      <td className="cell-center cell-muted">{m3}</td>
                      <td className="cell-center cell-muted">{m4}</td>
                      <td className="cell-center cell-muted">{m5}</td>
                      <td className="cell-center cell-muted">{m6}</td>
                      <td className="cell-center" style={{ background: '#FAF3E3' }}>
                        <strong style={{ color: '#946313' }}>{scaleTotal}</strong>
                      </td>
                      {/* Q26 */}
                      <td className="cell-ellipsis" title={q26Text}>
                        {q26Text || <span className="cell-placeholder">未填</span>}
                      </td>
                      <td className="cell-center">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          className="score-number-input"
                          value={q26Val}
                          onChange={e => handleScoreChange(c, 'q26Score', e.target.value)}
                          onBlur={() => handleScoreBlur(c, 'q26Score')}
                          title="Q26 打分 (0~10分)"
                        />
                      </td>
                      {/* Q27 */}
                      <td className="cell-ellipsis" title={q27Text}>
                        {q27Text || <span className="cell-placeholder">未填</span>}
                      </td>
                      <td className="cell-center">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          className="score-number-input"
                          value={q27Val}
                          onChange={e => handleScoreChange(c, 'q27Score', e.target.value)}
                          onBlur={() => handleScoreBlur(c, 'q27Score')}
                          title="Q27 打分 (0~10分)"
                        />
                      </td>
                      {/* Text subtotal */}
                      <td className="cell-center" style={{ background: '#FAF0E6' }}>
                        <strong style={{ color: '#C2410C' }}>{textTotal}</strong>
                      </td>
                      {/* Final Total */}
                      <td className="cell-center" style={{ background: '#FFFDF0' }}>
                        <strong style={{ fontSize: '14px', color: '#B45309' }}>{totalScore}</strong>
                      </td>
                      {/* Rating */}
                      <td style={{ textAlign: 'center' }}>
                        <span 
                          className="rating-pill" 
                          style={{
                            color: isS ? '#B45309' : isA ? '#15803D' : isB ? '#C2410C' : '#6B7280',
                            backgroundColor: isS ? '#FEF3C7' : isA ? '#DCFCE7' : isB ? '#FFEDD5' : '#F3F4F6',
                            borderColor: isS ? '#F59E0B' : isA ? '#22C55E' : isB ? '#FB923C' : '#D1D5DB'
                          }}
                        >
                          {ratingObj.level}
                        </span>
                      </td>
                      {/* Works */}
                      <td className="cell-ellipsis" title={c.videoTitle || ''}>
                        {c.videoTitle || '-'}
                      </td>
                      <td className="cell-muted cell-ellipsis" title={c.videoName || ''}>
                        {c.videoName || (c.videoUrl ? c.videoUrl.split('/').pop() : '-')}
                      </td>
                      <td className="cell-muted">{c.videoDuration || '-'}</td>
                      <td className="cell-muted">{c.videoSize || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {c.videoUrl ? (
                          <button
                            type="button"
                            className="btn-play-video-sm"
                            onClick={() => setPreviewVideo({ url: c.videoUrl, title: c.videoTitle || c.name })}
                          >
                            ▶ 播放
                          </button>
                        ) : (
                          <span className="cell-placeholder">无视频</span>
                        )}
                      </td>
                      <td className="cell-ellipsis" title={c.videoIntro || ''}>
                        {c.videoIntro || '-'}
                      </td>
                      <td>
                        <input
                          type="text"
                          className="inline-input-cell"
                          placeholder="评分人 / 备注..."
                          value={editingRemarks[c.id] !== undefined ? editingRemarks[c.id] : (c.reviewerRemark || '')}
                          onChange={e => setEditingRemarks({ ...editingRemarks, [c.id]: e.target.value })}
                          onBlur={() => handleRemarkBlur(c.id, c.reviewerRemark || '')}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setPreviewVideo(null)}>
          <div className="report-video-modal" onClick={e => e.stopPropagation()}>
            <div className="video-modal-header">
              <span className="video-modal-title">🎬 视频提案预览：{previewVideo.title}</span>
              <button className="modal-close-btn" onClick={() => setPreviewVideo(null)}>✕</button>
            </div>
            <div className="video-modal-body">
              <video 
                src={previewVideo.url} 
                controls 
                autoPlay 
                playsInline
                className="modal-video-player"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 报表三：【员工投票结果排行榜与导出】
 */
export function AdminVotesReport() {
  const [data, setData] = useState({ totalVotersCount: 0, totalVotesCount: 0, candidates: [] });
  const [loading, setLoading] = useState(false);
  const [selectedCandVoters, setSelectedCandVoters] = useState(null);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vote/results');
      const json = await res.json();
      if (json.code === 0 && json.data) {
        setData(json.data);
      }
    } catch (e) {
      console.warn('Fetch vote results error', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleExport = () => {
    window.open('/api/vote/export', '_blank');
  };

  const topCandidate = data.candidates?.[0];

  return (
    <div className="report-view-container animate-fade-in">
      {/* KPI Cards */}
      <div className="report-kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">参选视频总数</span>
          <span className="kpi-value">{data.candidates?.length || 0}</span>
          <span className="kpi-sub">位视频创作者</span>
        </div>
        <div className="kpi-card highlight-pass">
          <span className="kpi-label">参与投票员工</span>
          <span className="kpi-value text-emerald">{data.totalVotersCount || 0}</span>
          <span className="kpi-sub">位员工实名认证</span>
        </div>
        <div className="kpi-card highlight-s">
          <span className="kpi-label">累计投出推荐票</span>
          <span className="kpi-value text-gold">{data.totalVotesCount || 0}</span>
          <span className="kpi-sub">张推荐票</span>
        </div>
        <div className="kpi-card highlight-a">
          <span className="kpi-label">当前最高得票</span>
          <span className="kpi-value text-green">{topCandidate?.voteCount || 0}</span>
          <span className="kpi-sub">{topCandidate ? `${topCandidate.name} (${topCandidate.id})` : '暂无数据'}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">每人投票预算</span>
          <span className="kpi-value">5</span>
          <span className="kpi-sub">票/人（去重限制）</span>
        </div>
        <div className="kpi-card highlight-pending">
          <span className="kpi-label">投票状态</span>
          <span className="kpi-value text-amber" style={{ fontSize: '18px' }}>火热进行中</span>
          <span className="kpi-sub">实时统计入库</span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="report-action-toolbar">
        <div className="toolbar-left" style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-excel-export" onClick={handleExport} style={{ background: 'linear-gradient(135deg,#D97706 0%,#B45309 100%)' }}>
            📥 导出投票结果 Excel 报表
          </button>
          <button 
            className="btn-refresh-top" 
            onClick={() => window.open('/vote.html', '_blank')}
            style={{ color: '#2b2119', background: '#EAE4D6', border: '1px solid #D6CEBE' }}
          >
            📱 打开手机端展播与投票页
          </button>
        </div>
        <div className="toolbar-right">
          <button className="btn-refresh" onClick={fetchResults} disabled={loading}>
            {loading ? '刷新中...' : '⟳ 刷新实时榜单'}
          </button>
        </div>
      </div>

      {/* Main Ranking Table */}
      <div className="report-table-card">
        <div className="report-table-scroll">
          <table className="report-custom-table">
            <thead>
              <tr className="th-main-row">
                <th style={{ width: '60px', textAlign: 'center' }}>排名</th>
                <th style={{ width: '90px' }}>候选人编号</th>
                <th style={{ width: '90px' }}>姓名</th>
                <th style={{ width: '120px' }}>所属部门</th>
                <th style={{ width: '110px' }}>现任岗位</th>
                <th style={{ minWidth: '180px' }}>短视频提案标题</th>
                <th style={{ width: '90px', textAlign: 'center' }}>得票数</th>
                <th style={{ width: '140px' }}>得票占比</th>
                <th style={{ width: '100px', textAlign: 'center' }}>投票员工</th>
              </tr>
            </thead>
            <tbody>
              {(!data.candidates || data.candidates.length === 0) ? (
                <tr>
                  <td colSpan="9" className="empty-row">暂无视频作品或投票数据</td>
                </tr>
              ) : (
                data.candidates.map((c) => {
                  const isTop1 = c.rank === 1;
                  const isTop2 = c.rank === 2;
                  return (
                    <tr key={c.id} className="report-data-row">
                      <td style={{ textAlign: 'center' }}>
                        <span 
                          className="badge-id-tag" 
                          style={{
                            backgroundColor: isTop1 ? '#FEF3C7' : (isTop2 ? '#E0E7FF' : '#F3F4F6'),
                            color: isTop1 ? '#B45309' : (isTop2 ? '#4338CA' : '#374151'),
                            fontWeight: '800'
                          }}
                        >
                          {c.rank}
                        </span>
                      </td>
                      <td><span className="badge-id-tag">{c.id}</span></td>
                      <td><strong className="cell-name">{c.name}</strong></td>
                      <td>{c.department || '-'}</td>
                      <td>{c.position || '-'}</td>
                      <td className="cell-ellipsis" title={c.videoTitle || ''}>{c.videoTitle || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: isTop1 ? '#B45309' : (isTop2 ? '#059669' : '#17140F') }}>
                          {c.voteCount} 票
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ flex: 1, height: '8px', background: '#EAE5D9', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: c.voteRatio, height: '100%', background: 'linear-gradient(90deg, #D97706, #F59E0B)', borderRadius: '4px' }}></div>
                          </div>
                          <span style={{ fontSize: '11.5px', color: '#776E60', minWidth: '38px', textAlign: 'right' }}>{c.voteRatio}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-inspect-sm"
                          onClick={() => setSelectedCandVoters(c)}
                        >
                          明细 ({c.voters?.length || 0}) ›
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Voters Detail Modal */}
      {selectedCandVoters && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setSelectedCandVoters(null)}>
          <div className="report-video-modal" style={{ maxWidth: '600px', background: '#FFFFFF' }} onClick={e => e.stopPropagation()}>
            <div className="video-modal-header" style={{ background: '#17140F', color: '#FFF' }}>
              <span className="video-modal-title">
                👥 投给【{selectedCandVoters.name} ({selectedCandVoters.id})】的员工清单
              </span>
              <button className="modal-close-btn" onClick={() => setSelectedCandVoters(null)}>✕</button>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px' }}>
              {(!selectedCandVoters.voters || selectedCandVoters.voters.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>暂无员工投票</div>
              ) : (
                <table className="report-custom-table" style={{ width: '100%' }}>
                  <thead>
                    <tr className="th-main-row">
                      <th style={{ width: '50px' }}>序号</th>
                      <th>员工姓名</th>
                      <th>员工工号</th>
                      <th>投票时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCandVoters.voters.map((v, i) => (
                      <tr key={i} className="report-data-row">
                        <td>{i + 1}</td>
                        <td><strong className="cell-name">{v.voterName}</strong></td>
                        <td><span className="badge-id-tag">{v.voterJobNo}</span></td>
                        <td className="cell-time">{v.time ? (typeof v.time === 'object' ? v.time.toISOString() : v.time) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

