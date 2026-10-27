import React, { useState, useEffect } from 'react';
import { SURVEY_MODULES } from '../data/questionnaireData';

export default function QuestionnaireAdminPage({ onBackToApp, onOpenCandidates }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [batchSaving, setBatchSaving] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [toastMsg, setToastMsg] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Draft edits keyed by question id: { [id]: { text, title, placeholder, sortOrder, status, moduleId, moduleName } }
  const [drafts, setDrafts] = useState({});

  // New question draft
  const [newQ, setNewQ] = useState({
    id: '',
    moduleId: 'm1',
    moduleName: '模块一·表达沟通能力',
    moduleDesc: '考察观点输出欲、同理心受众思维与多维度阐释能力',
    type: 'scale',
    title: '',
    text: '',
    placeholder: '',
    sortOrder: 1,
    status: 1
  });

  const showToast = (msg, type = 'success') => {
    setToastMsg({ text: msg, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/survey/questions?all=1');
      const data = await res.json();
      if (data?.data?.questions?.length) {
        setQuestions(data.data.questions);
      } else {
        // Fallback to initial local modules
        const flattened = [];
        SURVEY_MODULES.forEach(m => {
          m.questions.forEach(q => {
            flattened.push({
              id: q.id,
              moduleId: m.id,
              moduleName: m.name,
              moduleDesc: m.desc,
              type: q.type || 'scale',
              title: q.title || '',
              text: q.text,
              placeholder: q.placeholder || '',
              sortOrder: q.sortOrder || q.id,
              status: 1
            });
          });
        });
        setQuestions(flattened);
      }
    } catch (e) {
      console.warn('Failed to fetch survey questions:', e);
      showToast('获取题库失败，使用本地兜底数据', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  // Update a single draft field
  const handleDraftChange = (id, field, value) => {
    setDrafts(prev => {
      const original = questions.find(q => q.id === id) || {};
      const currentDraft = prev[id] || { ...original };
      return {
        ...prev,
        [id]: {
          ...currentDraft,
          [field]: value
        }
      };
    });
  };

  // Revert a question's draft
  const handleResetDraft = (id) => {
    setDrafts(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Save single question to MySQL
  const handleSaveQuestion = async (id) => {
    const original = questions.find(q => q.id === id);
    const draft = drafts[id];
    if (!draft && !original) return;

    const payload = {
      ...(original || {}),
      ...(draft || {}),
      id: parseInt(id, 10)
    };

    setSavingId(id);
    try {
      const res = await fetch('/api/survey/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.code === 0) {
        showToast(`第 ${id} 题修改成功，已同步写入 MySQL 数据库！`);
        // Update local state
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...payload } : q));
        // Remove from draft
        handleResetDraft(id);
      } else {
        showToast('保存失败: ' + (data.message || '未知错误'), 'error');
      }
    } catch (err) {
      showToast('网络请求异常: ' + err.message, 'error');
    } finally {
      setSavingId(null);
    }
  };

  // Save all modified drafts in batch
  const handleBatchSave = async () => {
    const modifiedIds = Object.keys(drafts);
    if (!modifiedIds.length) return;

    setBatchSaving(true);
    try {
      const listToSave = modifiedIds.map(idStr => {
        const id = parseInt(idStr, 10);
        const original = questions.find(q => q.id === id) || {};
        return {
          ...original,
          ...drafts[idStr],
          id
        };
      });

      const res = await fetch('/api/survey/questions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: listToSave })
      });
      const data = await res.json();
      if (data.code === 0) {
        showToast(`已成功批量保存 ${modifiedIds.length} 道题目至 MySQL！`);
        setDrafts({});
        fetchQuestions();
      } else {
        showToast('批量保存失败: ' + data.message, 'error');
      }
    } catch (e) {
      showToast('批量保存请求异常: ' + e.message, 'error');
    } finally {
      setBatchSaving(false);
    }
  };

  // Quick toggle status (enable / disable)
  const handleToggleStatus = async (q) => {
    const nextStatus = q.status === 1 ? 0 : 1;
    handleDraftChange(q.id, 'status', nextStatus);
    // Directly save toggle for fast UX
    try {
      const res = await fetch('/api/survey/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...q,
          status: nextStatus
        })
      });
      const data = await res.json();
      if (data.code === 0) {
        showToast(`第 ${q.id} 题状态已切换为【${nextStatus === 1 ? '启用展示' : '停用隐藏'}】`);
        setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, status: nextStatus } : item));
        handleResetDraft(q.id);
      }
    } catch (err) {
      showToast('切换状态失败: ' + err.message, 'error');
    }
  };

  // Add new question
  const handleAddNewQuestion = async (e) => {
    e.preventDefault();
    if (!newQ.text.trim()) {
      alert('请填写题目内容');
      return;
    }
    const targetId = parseInt(newQ.id || (questions.length ? Math.max(...questions.map(q => q.id)) + 1 : 1), 10);
    const payload = {
      ...newQ,
      id: targetId,
      sortOrder: parseInt(newQ.sortOrder || targetId, 10)
    };

    try {
      const res = await fetch('/api/survey/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.code === 0) {
        showToast(`第 ${targetId} 题新增成功，已入库！`);
        setShowAddModal(false);
        setNewQ({
          id: '',
          moduleId: 'm1',
          moduleName: '模块一·表达沟通能力',
          moduleDesc: '考察观点输出欲、同理心受众思维与多维度阐释能力',
          type: 'scale',
          title: '',
          text: '',
          placeholder: '',
          sortOrder: targetId + 1,
          status: 1
        });
        fetchQuestions();
      } else {
        showToast('新增题目失败: ' + data.message, 'error');
      }
    } catch (err) {
      showToast('新增失败: ' + err.message, 'error');
    }
  };

  // Modules list for filtering
  const moduleTabs = [
    { key: 'ALL', name: '全部题目' },
    { key: 'm1', name: '模块一 · 表达沟通' },
    { key: 'm2', name: '模块二 · 财经敏感' },
    { key: 'm3', name: '模块三 · 镜头表现' },
    { key: 'm4', name: '模块四 · 创作抗压' },
    { key: 'm5', name: '模块五 · 主观问答' }
  ];

  // Filtered questions
  const filteredQuestions = questions.filter(q => {
    const draft = drafts[q.id];
    const text = draft?.text !== undefined ? draft.text : q.text;
    const title = draft?.title !== undefined ? draft.title : q.title;
    const moduleName = draft?.moduleName !== undefined ? draft.moduleName : q.moduleName;
    const moduleId = draft?.moduleId !== undefined ? draft.moduleId : q.moduleId;

    if (selectedModule !== 'ALL' && moduleId !== selectedModule) {
      return false;
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      const matchText = (text || '').toLowerCase().includes(kw);
      const matchTitle = (title || '').toLowerCase().includes(kw);
      const matchModule = (moduleName || '').toLowerCase().includes(kw);
      const matchId = String(q.id).includes(kw);
      return matchText || matchTitle || matchModule || matchId;
    }
    return true;
  });

  const modifiedCount = Object.keys(drafts).length;
  const activeCount = questions.filter(q => q.status === 1).length;
  const scaleCount = questions.filter(q => q.type === 'scale').length;
  const textCount = questions.filter(q => q.type !== 'scale').length;

  return (
    <div className="qa-admin-page-container">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`qa-toast qa-toast-${toastMsg.type} animate-fade-in`}>
          <span>{toastMsg.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="qa-top-nav">
        <div className="qa-nav-left">
          {onBackToApp && (
            <button className="btn-back-pill" onClick={onBackToApp}>
              ‹ 返回报名页面
            </button>
          )}
          <div className="qa-brand">
            <span className="qa-brand-sparkle">✦</span>
            <h1 className="qa-brand-title">星火计划 · 动态问卷题库管理平台</h1>
          </div>
          <span className="qa-db-tag">
            <span className="db-live-dot"></span>
            MySQL 表：<code>htf_kos_survey_questions</code>
          </span>
        </div>

        <div className="qa-nav-actions">
          <button 
            className="qa-btn qa-btn-secondary"
            onClick={fetchQuestions}
            disabled={loading}
          >
            {loading ? '同步中...' : '⟳ 刷新数据库'}
          </button>
          <button 
            className="qa-btn qa-btn-primary"
            onClick={() => {
              const nextId = questions.length ? Math.max(...questions.map(q => q.id)) + 1 : 1;
              setNewQ(prev => ({ ...prev, id: nextId, sortOrder: nextId }));
              setShowAddModal(true);
            }}
          >
            + 新增一道题目
          </button>
          {onOpenCandidates && (
            <button 
              className="qa-btn qa-btn-outline"
              onClick={onOpenCandidates}
            >
              👥 候选人评审后台
            </button>
          )}
        </div>
      </header>

      {/* Dashboard Stats */}
      <section className="qa-stats-row">
        <div className="qa-stat-card">
          <div className="stat-label">题库总题数</div>
          <div className="stat-value">{questions.length} <span className="stat-unit">道</span></div>
          <div className="stat-desc">已同步 Aliyun RDS MySQL</div>
        </div>
        <div className="qa-stat-card highlight">
          <div className="stat-label">当前启用展示</div>
          <div className="stat-value text-gold">{activeCount} <span className="stat-unit">道</span></div>
          <div className="stat-desc">移动端答题流程即时展示</div>
        </div>
        <div className="qa-stat-card">
          <div className="stat-label">量表评分题</div>
          <div className="stat-value">{scaleCount} <span className="stat-unit">道</span></div>
          <div className="stat-desc">1~5分单选评分题型</div>
        </div>
        <div className="qa-stat-card">
          <div className="stat-label">开放简答题</div>
          <div className="stat-value">{textCount} <span className="stat-unit">道</span></div>
          <div className="stat-desc">主观发挥与核心加分题</div>
        </div>
      </section>

      {/* Search & Filter Toolbar */}
      <section className="qa-toolbar">
        <div className="qa-module-tabs">
          {moduleTabs.map(tab => {
            const count = tab.key === 'ALL' 
              ? questions.length 
              : questions.filter(q => q.moduleId === tab.key).length;
            return (
              <button
                key={tab.key}
                type="button"
                className={`qa-tab-btn ${selectedModule === tab.key ? 'active' : ''}`}
                onClick={() => setSelectedModule(tab.key)}
              >
                {tab.name} <span className="tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="qa-search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="qa-search-input"
            placeholder="搜索题目内容、题号、模块名..."
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
          />
          {searchKeyword && (
            <button className="btn-clear-search" onClick={() => setSearchKeyword('')}>✕</button>
          )}
        </div>
      </section>

      {/* Questions List */}
      <main className="qa-questions-container">
        {loading ? (
          <div className="qa-loading-state">
            <div className="qa-spinner"></div>
            <p>正在从 MySQL 数据库加载最新题库...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="qa-empty-state">
            <p>未找到符合条件的问卷题目</p>
          </div>
        ) : (
          <div className="qa-cards-grid">
            {filteredQuestions.map(q => {
              const draft = drafts[q.id] || {};
              const isModified = Object.keys(draft).length > 0;
              const currentText = draft.text !== undefined ? draft.text : q.text;
              const currentTitle = draft.title !== undefined ? draft.title : q.title;
              const currentPlaceholder = draft.placeholder !== undefined ? draft.placeholder : q.placeholder;
              const currentSort = draft.sortOrder !== undefined ? draft.sortOrder : q.sortOrder;
              const currentStatus = draft.status !== undefined ? draft.status : q.status;
              const isSaving = savingId === q.id;

              return (
                <div 
                  key={q.id} 
                  className={`qa-question-card ${isModified ? 'has-unsaved' : ''} ${currentStatus === 0 ? 'is-disabled' : ''}`}
                >
                  {/* Card Header */}
                  <div className="qa-card-header">
                    <div className="qa-card-meta-left">
                      <span className="qa-q-num">Q{String(q.id).padStart(2, '0')}</span>
                      <span className="qa-q-module">{q.moduleName}</span>
                      <span className={`qa-q-type-badge ${q.type}`}>
                        {q.type === 'scale' ? '单选评分题' : '开放简答题'}
                      </span>
                    </div>

                    <div className="qa-card-meta-right">
                      {/* Status Toggle Switch */}
                      <label className="qa-status-switch" title={currentStatus === 1 ? '点击停用隐藏此题' : '点击启用展示此题'}>
                        <input 
                          type="checkbox"
                          checked={currentStatus === 1}
                          onChange={() => handleToggleStatus(q)}
                        />
                        <span className="slider round"></span>
                        <span className="switch-text">{currentStatus === 1 ? '启用中' : '已停用'}</span>
                      </label>

                      {/* Sort Order */}
                      <div className="qa-sort-wrap" title="排序权重，越小越靠前">
                        <span className="sort-label">排序:</span>
                        <input
                          type="number"
                          className="qa-sort-input"
                          value={currentSort}
                          onChange={e => handleDraftChange(q.id, 'sortOrder', parseInt(e.target.value, 10) || 0)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Body: Direct Text Edit */}
                  <div className="qa-card-body">
                    {/* Subjective Title (if type === 'text') */}
                    {q.type === 'text' && (
                      <div className="qa-field-group">
                        <label className="qa-field-label">题目标题：</label>
                        <input
                          type="text"
                          className="qa-input-text"
                          value={currentTitle}
                          placeholder="例如：主观定位一"
                          onChange={e => handleDraftChange(q.id, 'title', e.target.value)}
                        />
                      </div>
                    )}

                    {/* Question Statement */}
                    <div className="qa-field-group">
                      <div className="qa-field-head">
                        <label className="qa-field-label">
                          <strong>题目内容与问法：</strong>
                          <span className="sub-tip">（直接在此输入框修改文字，将直接同步到 MySQL 数据表）</span>
                        </label>
                        <span className="qa-char-hint">{currentText.length} 字符</span>
                      </div>
                      <textarea
                        rows={3}
                        className="qa-textarea-content"
                        value={currentText}
                        onChange={e => handleDraftChange(q.id, 'text', e.target.value)}
                        placeholder="请输入题目具体阐述..."
                      />
                    </div>

                    {/* Placeholder (if type === 'text') */}
                    {q.type === 'text' && (
                      <div className="qa-field-group">
                        <label className="qa-field-label">输入提示占位符 (Placeholder)：</label>
                        <input
                          type="text"
                          className="qa-input-text"
                          value={currentPlaceholder}
                          placeholder="例如：请具体阐述你的思考与见解..."
                          onChange={e => handleDraftChange(q.id, 'placeholder', e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="qa-card-footer">
                    <div className="qa-footer-status">
                      {isModified ? (
                        <span className="badge-unsaved-dot">● 存在未保存的修改</span>
                      ) : (
                        <span className="badge-saved-sync">✓ 与 MySQL 数据库完全同步</span>
                      )}
                    </div>

                    <div className="qa-footer-btns">
                      {isModified && (
                        <button
                          type="button"
                          className="qa-btn qa-btn-ghost"
                          onClick={() => handleResetDraft(q.id)}
                          disabled={isSaving}
                        >
                          ↺ 放弃修改
                        </button>
                      )}
                      <button
                        type="button"
                        className={`qa-btn ${isModified ? 'qa-btn-save-glow' : 'qa-btn-secondary'}`}
                        onClick={() => handleSaveQuestion(q.id)}
                        disabled={isSaving || !isModified}
                      >
                        {isSaving ? '正在写入 MySQL...' : isModified ? '💾 保存此题修改' : '已保存'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Batch Save Bar */}
      {modifiedCount > 0 && (
        <div className="qa-batch-floating-bar animate-fade-in">
          <div className="batch-info">
            <span className="sparkle">✦</span>
            <span>当前有 <strong>{modifiedCount}</strong> 道题目被修改但尚未提交</span>
          </div>
          <div className="batch-actions">
            <button 
              className="qa-btn qa-btn-ghost-light"
              onClick={() => setDrafts({})}
              disabled={batchSaving}
            >
              放弃所有修改
            </button>
            <button 
              className="qa-btn qa-btn-gold-lg"
              onClick={handleBatchSave}
              disabled={batchSaving}
            >
              {batchSaving ? '正在批量写入 MySQL...' : `🚀 一键批量保存全部 (${modifiedCount}题)`}
            </button>
          </div>
        </div>
      )}

      {/* Add New Question Modal */}
      {showAddModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog qa-modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <span className="sparkle-gold">✦</span>
                <span>新增问卷题目 (写入 MySQL)</span>
              </h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddNewQuestion} className="qa-add-form">
              <div className="qa-form-row">
                <div className="qa-form-col">
                  <label className="qa-modal-label">题号 (ID)：</label>
                  <input
                    type="number"
                    className="admin-edit-input"
                    value={newQ.id}
                    required
                    onChange={e => setNewQ(prev => ({ ...prev, id: parseInt(e.target.value, 10) }))}
                  />
                </div>
                <div className="qa-form-col">
                  <label className="qa-modal-label">题型：</label>
                  <select
                    className="admin-edit-input"
                    value={newQ.type}
                    onChange={e => setNewQ(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="scale">单选评分题 (5点量表)</option>
                    <option value="text">开放简答题 (主观作答)</option>
                  </select>
                </div>
                <div className="qa-form-col">
                  <label className="qa-modal-label">排序权重：</label>
                  <input
                    type="number"
                    className="admin-edit-input"
                    value={newQ.sortOrder}
                    onChange={e => setNewQ(prev => ({ ...prev, sortOrder: parseInt(e.target.value, 10) }))}
                  />
                </div>
              </div>

              <div className="qa-form-group">
                <label className="qa-modal-label">所属模块：</label>
                <select
                  className="admin-edit-input"
                  value={newQ.moduleId}
                  onChange={e => {
                    const mKey = e.target.value;
                    const found = moduleTabs.find(t => t.key === mKey);
                    const name = found ? found.name : '问卷测评';
                    setNewQ(prev => ({ ...prev, moduleId: mKey, moduleName: name }));
                  }}
                >
                  <option value="m1">模块一·表达沟通能力</option>
                  <option value="m2">模块二·财经商业敏感度</option>
                  <option value="m3">模块三·镜头表现力与感染力</option>
                  <option value="m4">模块四·持续创作与抗压韧性</option>
                  <option value="m5">模块五·开放主观定位题</option>
                </select>
              </div>

              {newQ.type === 'text' && (
                <div className="qa-form-group">
                  <label className="qa-modal-label">简答题标题：</label>
                  <input
                    type="text"
                    className="admin-edit-input"
                    value={newQ.title}
                    placeholder="例如：主观定位题"
                    onChange={e => setNewQ(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
              )}

              <div className="qa-form-group">
                <label className="qa-modal-label">题目内容与问法 (必填)：</label>
                <textarea
                  rows={4}
                  className="admin-edit-textarea"
                  value={newQ.text}
                  required
                  placeholder="请输入题目的具体内容..."
                  onChange={e => setNewQ(prev => ({ ...prev, text: e.target.value }))}
                />
              </div>

              {newQ.type === 'text' && (
                <div className="qa-form-group">
                  <label className="qa-modal-label">输入提示占位符：</label>
                  <input
                    type="text"
                    className="admin-edit-input"
                    value={newQ.placeholder}
                    placeholder="输入框底纹提示..."
                    onChange={e => setNewQ(prev => ({ ...prev, placeholder: e.target.value }))}
                  />
                </div>
              )}

              <div className="qa-modal-footer">
                <button 
                  type="button" 
                  className="qa-btn qa-btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className="qa-btn qa-btn-primary"
                >
                  确认保存至 MySQL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
