import './workorder.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { workorderApi } from '../services/workorder-api';
import type { CreateWorkOrderInput, WorkOrder, WorkOrderType } from '../types/workorder';
import * as XLSX from 'xlsx';

const WORKORDER_TYPES: WorkOrderType[] = ['故障', '咨询', '变更', '优化'];

const COMMON_SERVICES = [
  '新建区政务服务网', '新建区叫号系统', '赣服通', '新事新办系统', '政务晓屋'
];

export function WorkOrderPage() {
  const [records, setRecords] = useState<WorkOrder[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [showReminder, setShowReminder] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<WorkOrder>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState<'date' | 'service' | 'type' | 'duration'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [importLoading, setImportLoading] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().split('T')[0];
  const [endDateValue, setEndDateValue] = useState(today);

  const sortedRecords = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      if (sortField === 'date') {
        aVal = a.date;
        bVal = b.date;
      } else if (sortField === 'service') {
        aVal = a.service;
        bVal = b.service;
      } else if (sortField === 'type') {
        aVal = a.type;
        bVal = b.type;
      } else if (sortField === 'duration') {
        aVal = a.duration ?? 0;
        bVal = b.duration ?? 0;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [records, sortField, sortDir]);

  function handleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 3000);
  }

  function startEdit(wo: WorkOrder) {
    setEditingId(wo.id);
    setEditForm({ ...wo });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  async function saveEdit() {
    if (!editingId) return;
    try {
      await workorderApi.update(editingId, editForm as Partial<CreateWorkOrderInput>);
      setEditingId(null);
      setEditForm({});
      showToast('✅ 工单已更新');
      await fetchRecords();
    } catch (err) {
      showToast(`❌ 更新失败：${err instanceof Error ? err.message : '未知错误'}`, 'error');
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('task_token');
    if (!token) {
      setIsLoggedIn(false);
      return;
    }
    setIsLoggedIn(true);
    checkTodayCount();
    fetchRecords();
    setEndDateValue(today);
  }, []);

  async function checkTodayCount() {
    try {
      const data = await workorderApi.getTodayCount();
      setTodayCount(data.count);
      setShowReminder(data.count === 0);
    } catch {
      // ignore
    }
  }

  async function fetchRecords(page = currentPage) {
    setListLoading(true);
    try {
      const data = await workorderApi.list({ page, pageSize: 10, dateFrom, dateTo });
      setRecords(data.list);
      setTotalCount(data.total);
      setCurrentPage(page);
    } catch {
      // ignore
    } finally {
      setListLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const input: CreateWorkOrderInput = {
      date: formData.get('date') as string || today,
      endDate: formData.get('endDate') as string || '',
      service: formData.get('service') as string,
      requester: formData.get('requester') as string || '',
      type: formData.get('type') as WorkOrderType,
      description: formData.get('description') as string || '',
      solution: formData.get('solution') as string || '',

      handler: formData.get('handler') as string || '',
    };

    if (!input.service || !input.type) {
      setSubmitting(false);
      return;
    }

    try {
      await workorderApi.create(input);
      showToast('✅ 工单已保存');
      form.reset();
      (form.elements.namedItem('date') as HTMLInputElement).value = today;
      await checkTodayCount();
      await fetchRecords();
      setShowFormModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteConfirmId(id);
  }

  async function confirmDelete() {
    if (!deleteConfirmId) return;
    try {
      await workorderApi.delete(deleteConfirmId);
      setDeleteConfirmId(null);
      showToast('✅ 工单已删除');
      await fetchRecords();
      await checkTodayCount();
    } catch (err) {
      showToast(`❌ 删除失败：${err instanceof Error ? err.message : '未知错误'}`, 'error');
    }
  }

  const totalPages = Math.ceil(totalCount / 10);

  function goPage(p: number) {
    if (p < 1 || p > totalPages) return;
    fetchRecords(p);
  }

  function handleExport() {
    const from = dateFrom || today;
    const to = dateTo || today;
    const params = new URLSearchParams();
    if (from) params.set('dateFrom', from);
    if (to) params.set('dateTo', to);
    const token = localStorage.getItem('task_token');
    if (!token) {
      showToast('请先登录', 'error');
      return;
    }
    fetch(`/api/workorders/export?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `工单记录_${from || 'start'}_${to || 'end'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => showToast('导出失败，请先登录', 'error'));
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportMsg('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }) as Record<string, unknown>[];

      const orders = rows
        .map((row) => {
          // 支持多种列名映射
          const rawDate =
            (row['开始时间'] as string | Date) ||
            (row['开始时间(年/月/日)'] as string | Date) ||
            (row['Date'] as string | Date) ||
            '';
          let dateStr = '';
          if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
              dateStr = d.toISOString().split('T')[0];
            } else if (typeof rawDate === 'string') {
              dateStr = rawDate.trim().slice(0, 10);
            }
          }

          const service =
            (row['项目名称'] as string) ||
            (row['项目'] as string) ||
            (row['Service'] as string) ||
            '';

          if (!dateStr || !service) return null;

          // 结束时间
          const rawEndDate =
            (row['结束时间'] as string | Date) || '';
          let endDateStr = '';
          if (rawEndDate) {
            const d = new Date(rawEndDate as string | Date);
            if (!isNaN(d.getTime())) {
              endDateStr = d.toISOString().split('T')[0];
            } else if (typeof rawEndDate === 'string') {
              endDateStr = rawEndDate.trim().slice(0, 10);
            }
          }

          return {
            date: dateStr,
            endDate: endDateStr,
            service: String(service).trim(),
            requester: String(
              (row['需求人'] as string) ||
              (row['Requester'] as string) ||
              ''
            ).trim(),
            type: ((row['问题类型'] as string) || '其他') as WorkOrderType,
            description: String(
              (row['问题描述（工作内容）'] as string) ||
              (row['问题描述'] as string) ||
              (row['Description'] as string) ||
              ''
            ).trim(),
            solution: String(
              (row['处理方案（措施）'] as string) ||
              (row['处理方案'] as string) ||
              (row['Solution'] as string) ||
              ''
            ).trim(),
            handler: String(
              (row['处理人'] as string) ||
              (row['Handler'] as string) ||
              ''
            ).trim(),
          } as CreateWorkOrderInput;
        })
        .filter((o): o is CreateWorkOrderInput => o !== null);

      if (orders.length === 0) {
        setImportMsg('⚠️ 未找到有效数据，请检查 Excel 列名是否匹配');
        setImportLoading(false);
        return;
      }

      const result = await workorderApi.importOrders(orders);
      setImportMsg(`✅ 成功导入 ${result.imported} 条${result.skipped > 0 ? `，${result.skipped} 条已跳过` : ''}`);
      await fetchRecords();
      await checkTodayCount();
    } catch (err) {
      setImportMsg(`❌ 导入失败：${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="workorder-page">
      {!isLoggedIn && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          <p style={{ marginBottom: 16 }}>请先登录后再使用工单记录功能</p>
          <button className="wo-add-btn" onClick={() => window.location.href = '/login'}>
            前往登录
          </button>
        </div>
      )}
      {/* 忘记记录提醒 */}
      {showReminder && (
        <div className="wo-reminder-banner" role="alert">
          <span>📋 今天还没有记录，开始记录吧！</span>
          <button type="button" onClick={() => setShowReminder(false)}>✕</button>
        </div>
      )}

      <div className="wo-list-panel">
          <div className="wo-list-header">
            <h2>📋 最近记录 {todayCount > 0 && <span className="wo-today-badge">今日 {todayCount} 条</span>}</h2>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <button type="button" className="wo-add-btn" onClick={() => setShowFormModal(true)}>+ 快速记录</button>
            </div>
            <div className="wo-export-row">
              <div className="wo-date-filter">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="wo-input"
                  placeholder="从"
                />
                <span>—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="wo-input"
                  placeholder="至"
                />
                <button type="button" className="wo-filter-btn" onClick={() => fetchRecords(1)}>筛选</button>
              </div>
              <div className="wo-btn-group">
                <button type="button" className="wo-export-btn" onClick={handleExport}>📤 导出</button>
                <button type="button" className="wo-import-btn" onClick={() => fileInputRef.current?.click()} disabled={importLoading}>
                  {importLoading ? '导入中…' : '📥 导入'}
                </button>
                <button type="button" className="wo-template-btn" onClick={() => workorderApi.downloadTemplate()} title="下载标准导入模板">📄 模板</button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleImportFile}
              />
            </div>
            {importMsg && (
              <div className={`wo-import-msg ${importMsg.includes('✅') ? 'success' : 'warning'}`}>
                {importMsg}
              </div>
            )}
          </div>

          <div className="wo-table-wrapper">
            {listLoading ? (
              <div className="wo-empty">加载中…</div>
            ) : sortedRecords.length === 0 ? (
              <div className="wo-empty">暂无记录，试试上面的表单？</div>
            ) : (
              <table className="wo-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('type')} className="th-type">
                      问题类型 {sortField === 'type' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onClick={() => handleSort('service')} className="th-service">
                      项目名称 {sortField === 'service' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th>需求人</th>
                    <th>处理人</th>
                    <th onClick={() => handleSort('date')} className="th-date">
                      开始时间 {sortField === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th>结束时间</th>
                    <th className="th-desc">问题描述（工作内容）</th>
                    <th className="th-solution">处理方案（措施）</th>
                    <th className="th-created">记录时间</th>
                    <th className="th-action">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRecords.map((wo, idx) => {
                    const isEditing = editingId === wo.id;
                    const isDeleting = deleteConfirmId === wo.id;
                    return (
                      <>
                        {isDeleting ? (
                          <tr key={`${wo.id}-confirm`} className="confirm-row">
                            <td colSpan={10}>
                              <div className="confirm-inner">
                                <span>确认删除这条工单？</span>
                                <button type="button" className="wo-action-btn delete" onClick={confirmDelete}>确认删除</button>
                                <button type="button" className="wo-action-btn cancel" onClick={() => setDeleteConfirmId(null)}>取消</button>
                              </div>
                            </td>
                          </tr>
                        ) : isEditing ? (
                          <tr key={wo.id} className="edit-row">
                            <td>
                              <select
                                className="wo-edit-select"
                                value={editForm.type || ''}
                                onChange={(e) => setEditForm({ ...editForm, type: e.target.value as WorkOrderType })}
                              >
                                {WORKORDER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </td>
                            <td>
                              <input
                                className="wo-edit-input"
                                value={editForm.service || ''}
                                onChange={(e) => setEditForm({ ...editForm, service: e.target.value })}
                              />
                            </td>
                            <td>
                              <input
                                className="wo-edit-input"
                                value={editForm.requester || ''}
                                onChange={(e) => setEditForm({ ...editForm, requester: e.target.value })}
                              />
                            </td>
                            <td>
                              <input
                                className="wo-edit-input"
                                value={editForm.handler || ''}
                                onChange={(e) => setEditForm({ ...editForm, handler: e.target.value })}
                              />
                            </td>
                            <td>
                              <input
                                type="date"
                                className="wo-edit-input"
                                value={editForm.date || ''}
                                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                              />
                            </td>
                            <td>
                              <input
                                type="date"
                                className="wo-edit-input"
                                value={editForm.endDate || ''}
                                onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                              />
                            </td>
                            <td>
                              <textarea
                                className="wo-edit-textarea"
                                value={editForm.description || ''}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              />
                            </td>
                            <td>
                              <textarea
                                className="wo-edit-textarea"
                                value={editForm.solution || ''}
                                onChange={(e) => setEditForm({ ...editForm, solution: e.target.value })}
                              />
                            </td>
                            <td className="td-created">{new Date(wo.createdAt).toLocaleString()}</td>
                            <td className="td-action">
                              <button type="button" className="wo-action-btn save" onClick={saveEdit} title="保存">✅</button>
                              <button type="button" className="wo-action-btn cancel" onClick={cancelEdit} title="取消">✕</button>
                            </td>
                          </tr>
                        ) : (
                          <tr
                            key={wo.id}
                            className={`${idx % 2 === 0 ? 'row-even' : 'row-odd'}`}
                          >
                            <td><span className={`wo-type-badge wo-type-${wo.type}`}>{wo.type}</span></td>
                            <td className="td-service">{wo.service}</td>
                            <td>{wo.requester || '—'}</td>
                            <td>{wo.handler || '—'}</td>
                            <td className="td-date">{wo.date}</td>
                            <td className="td-date">{wo.endDate || '—'}</td>
                            <td className="td-desc" title={wo.description}>{wo.description || '—'}</td>
                            <td className="td-solution" title={wo.solution}>{wo.solution || '—'}</td>
                            <td className="td-created">{new Date(wo.createdAt).toLocaleString()}</td>
                            <td className="td-action">
                              <button type="button" className="wo-action-btn edit" onClick={() => startEdit(wo)} title="修改">✏️</button>
                              <button type="button" className="wo-action-btn delete" onClick={() => handleDelete(wo.id)} title="删除">🗑</button>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="wo-pagination">
              <span className="wo-page-info">
                第 {(currentPage - 1) * 10 + 1}–{Math.min(currentPage * 10, totalCount)} 条，共 {totalCount} 条
              </span>
              <div className="wo-page-btns">
                <button
                  type="button"
                  className="wo-page-btn"
                  onClick={() => goPage(1)}
                  disabled={currentPage === 1}
                >«</button>
                <button
                  type="button"
                  className="wo-page-btn"
                  onClick={() => goPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx) => (
                    <span key={p}>
                      {idx > 0 && (Array.from({ length: totalPages }, (_, i) => i + 1).filter(x => x === 1 || x === totalPages || Math.abs(x - currentPage) <= 1)[idx - 1] !== p - 1) && (
                        <span className="wo-page-ellipsis">…</span>
                      )}
                      <button
                        type="button"
                        className={`wo-page-btn num ${currentPage === p ? 'active' : ''}`}
                        onClick={() => goPage(p)}
                      >{p}</button>
                    </span>
                  ))}
                <button
                  type="button"
                  className="wo-page-btn"
                  onClick={() => goPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >›</button>
                <button
                  type="button"
                  className="wo-page-btn"
                  onClick={() => goPage(totalPages)}
                  disabled={currentPage === totalPages}
                >»</button>
              </div>
            </div>
          )}
        </div>

      <style>{`
        .workorder-page { display: flex; flex-direction: column; gap: 18px; height: 100%; }
        .wo-reminder-banner {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border: 1px solid #f59e0b;
          border-radius: 12px;
          padding: 12px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
          color: #92400e;
        }
        .wo-reminder-banner button {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          color: #92400e;
          padding: 0 4px;
        }
        .wo-layout {
          position: relative;
          width: 100%;
          padding-right: 258px;
          box-sizing: border-box;
        }
        .wo-form-panel {
          position: absolute;
          right: 0;
          top: 0;
          width: 244px;
        }
        .wo-list-panel {
          width: 100%;
        }
        .wo-form-panel, .wo-list-panel {
          background: white;
          border: 1px solid rgba(96,165,250,0.12);
          border-radius: 18px;
          padding: 20px 22px;
          box-shadow: 0 4px 20px rgba(59,130,246,0.07);
          min-width: 0;
          overflow: hidden;
        }
        .wo-form-panel h2, .wo-list-header h2 {
          margin: 0 0 16px;
          font-size: 16px;
          font-weight: 800;
          color: #1e3a8a;
          display: flex;
          align-items: center;
          gap: 8px;
          letter-spacing: 0.3px;
        }
        .wo-form { display: grid; gap: 14px; }
        .wo-field { display: flex; flex-direction: column; gap: 5px; }
        .wo-field label {
          font-size: 13px;
          font-weight: 600;
          color: #1e3a8a;
        }
        .wo-required { color: #ef4444; }
        .wo-input {
          border: 1px solid rgba(96,165,250,0.2);
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 14px;
          background: #f8faff;
          color: #1e293b;
          width: 100%;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .wo-input:focus {
          outline: none;
          border-color: #3b82f6;
          background: white;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }
        .wo-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .wo-submit-btn {
          background: linear-gradient(135deg, #1d4ed8, #4f46e5);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 12px;
          font-weight: 800;
          font-size: 15px;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(59,130,246,0.35);
          transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
          letter-spacing: 0.3px;
        }
        .wo-submit-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(59,130,246,0.4); }
        .wo-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .wo-success {
          text-align: center;
          padding: 8px;
          border-radius: 8px;
          background: #d1fae5;
          color: #065f46;
          font-weight: 600;
          font-size: 14px;
        }
        .wo-today-badge {
          font-size: 12px;
          background: #dbeafe;
          color: #1e40af;
          border-radius: 20px;
          padding: 2px 10px;
          font-weight: 600;
        }
        .wo-list-header { display: flex; flex-direction: column; gap: 12px; }
        .wo-export-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .wo-btn-group { display: flex; gap: 8px; flex-wrap: wrap; }
        .wo-date-filter { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .wo-date-filter .wo-input { width: auto; }
        .wo-filter-btn {
          border: 1px solid rgba(96,165,250,0.3);
          border-radius: 8px;
          padding: 6px 12px;
          background: rgba(255,255,255,0.9);
          color: #1e3a8a;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
        }
        .wo-export-btn {
          border: 1px solid rgba(96,165,250,0.3);
          border-radius: 10px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          color: white;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(59,130,246,0.25);
        }
        .wo-import-btn {
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 10px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(16,185,129,0.25);
        }
        .wo-template-btn {
          border: 1px solid rgba(96,165,250,0.3);
          border-radius: 10px;
          padding: 8px 14px;
          background: white;
          color: #1e40af;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }
        .wo-template-btn:hover { background: #eff6ff; }
        .wo-import-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .wo-import-msg {
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
        }
        .wo-import-msg.success { background: #d1fae5; color: #065f46; }
        .wo-import-msg.warning { background: #fef3c7; color: #92400e; }
        .wo-table-wrapper { overflow-x: auto; margin-top: 14px; border-radius: 12px; border: 1px solid rgba(96,165,250,0.15); }
        .wo-table { width: 100%; border-collapse: collapse; font-size: 13px; background: white; min-width: 500px; }
        .wo-table thead tr { background: linear-gradient(135deg, #1e40af, #3730a3); border-radius: 8px; overflow: hidden; }
        .wo-table thead th {
          padding: 11px 12px;
          color: rgba(255,255,255,0.92);
          font-weight: 700;
          font-size: 12px;
          text-align: left;
          white-space: nowrap;
          cursor: pointer;
          user-select: none;
          letter-spacing: 0.3px;
          border: none;
        }
        .wo-table thead th:hover { background: rgba(255,255,255,0.12); }
        .wo-table thead th:first-child { border-radius: 8px 0 0 8px; }
        .wo-table thead th:last-child { border-radius: 0 8px 8px 0; }
        .th-type { width: 80px; }
        .th-service { min-width: 130px; }
        .th-date { width: 96px; }
        .th-desc { min-width: 160px; }
        .th-solution { min-width: 160px; }
        .th-created { width: 150px; }
        .th-action { width: 80px; }
        .wo-table tbody tr { transition: background 0.12s; }
        .wo-table tbody tr.row-even { background: #ffffff; }
        .wo-table tbody tr.row-odd { background: #f0f4ff; }
        .wo-table tbody tr:hover { background: #dbeafe; }
        .wo-table tbody td {
          padding: 10px 12px;
          border-bottom: 1px solid rgba(96,165,250,0.07);
          vertical-align: middle;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          color: #334155;
        }
        .td-service { font-weight: 600; color: #1e3a8a; }
        .td-date { color: #64748b; font-size: 12px; white-space: nowrap; }
        .td-desc, .td-solution { color: #475569; font-size: 12px; }
        .td-created { color: #94a3b8; font-size: 11px; white-space: nowrap; }
        .td-action { text-align: center; }
        .wo-type-badge { font-size: 11px; font-weight: 700; border-radius: 6px; padding: 2px 8px; white-space: nowrap; }
        .wo-type-故障 { background: #fee2e2; color: #991b1b; }
        .wo-type-咨询 { background: #dbeafe; color: #1e40af; }
        .wo-type-变更 { background: #fef3c7; color: #92400e; }
        .wo-type-优化 { background: #d1fae5; color: #065f46; }
        .wo-action-btn {
          border-radius: 6px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 13px;
          transition: background 0.15s, opacity 0.15s;
          border: 1px solid transparent;
          margin: 0 2px;
        }
        .wo-action-btn.edit {
          background: rgba(59,130,246,0.1);
          border-color: rgba(59,130,246,0.2);
          color: #1e40af;
        }
        .wo-action-btn.edit:hover { background: rgba(59,130,246,0.2); }
        .wo-action-btn.delete {
          background: rgba(239,68,68,0.08);
          border-color: rgba(239,68,68,0.2);
          color: #991b1b;
        }
        .wo-action-btn.delete:hover { background: rgba(239,68,68,0.15); }
        .wo-empty { text-align: center; color: #94a3b8; padding: 30px; font-size: 14px; }
        .wo-toast {
          position: fixed;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
          z-index: 9999;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          animation: wo-slide-up 0.25s ease;
          white-space: nowrap;
        }
        .wo-toast.success { background: #065f46; color: white; }
        .wo-toast.error { background: #991b1b; color: white; }
        @keyframes wo-slide-up {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .confirm-row td { background: #fff1f0; border-bottom: 1px solid #ffccc7; }
        .confirm-inner { display: flex; align-items: center; gap: 12px; padding: 4px 0; }
        .confirm-inner span { color: #881b1b; font-weight: 600; font-size: 13px; }
        .wo-action-btn.save {
          background: rgba(16,185,129,0.1);
          border-color: rgba(16,185,129,0.3);
          color: #065f46;
        }
        .wo-action-btn.save:hover { background: rgba(16,185,129,0.2); }
        .wo-action-btn.cancel {
          background: rgba(100,116,139,0.1);
          border-color: rgba(100,116,139,0.2);
          color: #475569;
        }
        .wo-action-btn.cancel:hover { background: rgba(100,116,139,0.2); }
        .edit-row td { background: #f0f9ff; }
        .wo-edit-input, .wo-edit-select, .wo-edit-textarea {
          width: 100%;
          border: 1px solid rgba(59,130,246,0.3);
          border-radius: 6px;
          padding: 4px 6px;
          font-size: 12px;
          background: white;
          color: #172554;
          box-sizing: border-box;
        }
        .wo-edit-input:focus, .wo-edit-select:focus, .wo-edit-textarea:focus {
          outline: none;
          border-color: #3b82f6;
        }
        .wo-edit-textarea { resize: vertical; min-height: 36px; }
        .edit-row .td-action { text-align: center; }
        .wo-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 4px 4px;
          border-top: 1px solid rgba(96,165,250,0.1);
          margin-top: 4px;
        }
        .wo-page-info { font-size: 12px; color: #64748b; white-space: nowrap; }
        .wo-page-btns { display: flex; align-items: center; gap: 3px; }
        .wo-page-btn {
          border: 1px solid rgba(96,165,250,0.2);
          border-radius: 7px;
          background: white;
          color: #3b82f6;
          font-size: 13px;
          padding: 4px 10px;
          cursor: pointer;
          transition: all 0.15s;
          font-weight: 700;
          line-height: 1;
          min-width: 34px;
          text-align: center;
        }
        .wo-page-btn:hover:not(:disabled) { background: #eff6ff; border-color: #3b82f6; }
        .wo-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .wo-page-btn.num { font-size: 13px; }
        .wo-page-btn.active { background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; border-color: transparent; }
        .wo-page-btn.active:hover { background: linear-gradient(135deg, #2563eb, #4f46e5); }
        .wo-page-ellipsis { color: #94a3b8; font-size: 13px; padding: 0 2px; }
        @media (max-width: 900px) {
          .wo-layout { position: static; padding-right: 0; }
          .wo-form-panel { position: static; width: 100%; }
        }
      `}</style>
      {showFormModal && (
        <div className="wo-modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="wo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wo-modal-header">
              <h2>📝 快速记录</h2>
              <button type="button" className="wo-modal-close" onClick={() => setShowFormModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="wo-form">
              <div className="wo-field-row">
                <div className="wo-field">
                  <label htmlFor="wo-date">开始时间</label>
                  <input type="date" id="wo-date" name="date" defaultValue={today} className="wo-input" />
                </div>
                <div className="wo-field">
                  <label htmlFor="wo-endDate">结束时间</label>
                  <input type="date" id="wo-endDate" name="endDate" value={endDateValue} onChange={(e) => setEndDateValue(e.target.value)} className="wo-input" />
                </div>
              </div>
              <div className="wo-field">
                <label htmlFor="wo-service">项目名称 <span className="wo-required">*</span></label>
                <select id="wo-service" name="service" className="wo-input" defaultValue="新建区叫号系统" required>
                  <option value="" disabled>请选择项目</option>
                  {COMMON_SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="wo-field-row">
                <div className="wo-field">
                  <label htmlFor="wo-requester">需求人</label>
                  <input type="text" id="wo-requester" name="requester" placeholder="发起人/需求方" className="wo-input" />
                </div>
                <div className="wo-field">
                  <label htmlFor="wo-handler">处理人</label>
                  <input type="text" id="wo-handler" name="handler" placeholder="你的名字" className="wo-input" />
                </div>
              </div>
              <div className="wo-field">
                <label htmlFor="wo-type">问题类型 <span className="wo-required">*</span></label>
                <select id="wo-type" name="type" className="wo-input" required defaultValue="">
                  <option value="" disabled>选择类型</option>
                  {WORKORDER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="wo-field">
                <label htmlFor="wo-description">问题描述（工作内容）</label>
                <textarea id="wo-description" name="description" placeholder="简要描述遇到的问题或完成的工作" className="wo-input" rows={3} />
              </div>
              <div className="wo-field">
                <label htmlFor="wo-solution">处理方案（措施）</label>
                <textarea id="wo-solution" name="solution" placeholder="如何解决或处理" className="wo-input" rows={3} />
              </div>
              <button type="submit" className="wo-submit-btn" disabled={submitting}>
                {submitting ? '保存中…' : '💾 保存工单'}
              </button>
            </form>
          </div>
        </div>
      )}
      {toastMsg && (
        <div className={`wo-toast ${toastType}`}>{toastMsg}</div>
      )}
    </div>
  );
}
