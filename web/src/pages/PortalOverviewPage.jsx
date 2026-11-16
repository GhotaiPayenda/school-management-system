import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  ArrowUpRight,
  BookOpen,
  CalendarCheck2,
  ClipboardList,
  GraduationCap,
  Library,
  Wallet,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { selectAuth } from '../features/auth/authSlice.js';
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Panel,
  ProgressBar,
  Select,
  StatCard,
} from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';
import { useFormat } from '../lib/format.js';

const cardIcons = {
  attendance: CalendarCheck2,
  average: GraduationCap,
  outstanding: Wallet,
  loans: Library,
};

function formatCardValue(card, format) {
  if (card.format === 'percent' || card.key === 'attendance') return format.formatPercent(card.value);
  if (card.format === 'currency' || card.key === 'outstanding') return format.formatCurrency(card.value);
  return format.formatInteger(card.value);
}

export default function PortalOverviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const format = useFormat();
  const { user, role } = useSelector(selectAuth);
  const overview = useApi('/portal/overview');
  const announcements = useApi('/announcements', { params: { status: 'published' } });
  const [selectedId, setSelectedId] = useState('');

  const children = overview.data?.children ?? [];
  const cards = overview.data?.cards ?? [];
  const tasks = overview.data?.tasks ?? [];
  const activeChild = children.find((child) => Number(child.id) === Number(selectedId)) ?? children[0] ?? null;
  const childOverview = useApi(`/portal/children/${activeChild?.id}/overview`, { enabled: Boolean(activeChild?.id) });
  const detail = childOverview.data;
  const subjectScores = useMemo(
    () => (detail?.subjects ?? []).filter((subject) => subject.published).map((subject) => ({
      ...subject,
      short: subject.code,
    })),
    [detail],
  );

  if (overview.error) {
    return (
      <div className="page-stack">
        <PageHeader eyebrow={t('portal.eyebrow')} title={t('portal.title')} />
        <ErrorState error={overview.error} onRetry={overview.reload} />
      </div>
    );
  }

  if (overview.loading || !overview.data) {
    return (
      <div className="page-stack">
        <PageHeader eyebrow={t('portal.eyebrow')} title={t('portal.title')} />
        <LoadingBlock rows={8} />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={`${t('portal.eyebrow')} · ${format.formatDate(new Date())}`}
        title={t('portal.welcome', { name: user?.name ?? '', defaultValue: `Welcome, ${user?.name ?? ''}` })}
        copy={t('portal.copy')}
        actions={<Badge tone="forest">{role?.name}</Badge>}
      />

      {children.length === 0 ? (
        <EmptyState title={t('portal.noChildren')} copy={t('portal.copy')} />
      ) : (
        <>
          <section className="kpi-grid">
            {cards.map((card, index) => (
              <StatCard
                key={card.key}
                label={card.label}
                value={formatCardValue(card, format)}
                hint={card.hint}
                icon={cardIcons[card.key] || ClipboardList}
                tone={index % 4 === 0 ? 'forest' : index % 4 === 1 ? 'brass' : index % 4 === 2 ? 'terracotta' : 'ink'}
              />
            ))}
          </section>

          <div className="dashboard-grid">
            <Panel title={t('portal.tasks')}>
              {tasks.length === 0 ? <p className="muted">{t('dashboard.noTasks')}</p> : (
                <ul className="task-list">
                  {tasks.map((task) => (
                    <li key={task.key}>
                      <button type="button" className="task-row" onClick={() => task.to && navigate(task.to)}>
                        <span className="task-count">{format.formatInteger(task.count)}</span>
                        <span className="task-copy">
                          <span className="task-title">{task.label}</span>
                          <span className="task-hint">{task.to || ''}</span>
                        </span>
                        <ArrowUpRight size={16} className="task-arrow direction-icon" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title={t('portal.family')}>
              <div className="portal-child-list">
                {children.map((child) => (
                  <button
                    type="button"
                    className={`portal-child-card ${activeChild?.id === child.id ? 'is-active' : ''}`}
                    key={child.id}
                    onClick={() => setSelectedId(child.id)}
                  >
                    <span className="avatar avatar-md">{(child.firstName?.[0] || '') + (child.lastName?.[0] || '')}</span>
                    <span className="portal-child-copy">
                      <strong>{child.firstName} {child.lastName}</strong>
                      <span className="muted">{child.gradeName} — {child.sectionName}</span>
                      <span className="muted">{child.admissionNumber}</span>
                    </span>
                    <span className="portal-child-stats">
                      <span>{format.formatPercent(child.attendanceRate)}</span>
                      <span>{format.formatCurrency(child.outstanding)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Panel>
          </div>

          {activeChild ? (
            <Panel
              title={`${activeChild.firstName} ${activeChild.lastName}`}
              copy={`${activeChild.gradeName} — ${activeChild.sectionName} · ${activeChild.academicYearLabel}`}
              actions={children.length > 1 ? (
                <Select value={activeChild.id} onChange={(event) => setSelectedId(event.target.value)}>
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>{child.firstName} {child.lastName}</option>
                  ))}
                </Select>
              ) : null}
            >
              {childOverview.loading || !detail ? <LoadingBlock rows={6} /> : (
                <div className="page-stack">
                  <div className="result-summary">
                    <div>
                      <span className="muted">{t('portal.average')}</span>
                      <strong>{detail.average === null ? '—' : format.formatNumber(detail.average, { maximumFractionDigits: 1 })}</strong>
                    </div>
                    <div>
                      <span className="muted">{t('results.letterGrade')}</span>
                      <Badge tone={detail.letterGrade === 'A' ? 'forest' : detail.letterGrade === 'F' ? 'danger' : 'brass'}>{detail.letterGrade || '—'}</Badge>
                    </div>
                    <div>
                      <span className="muted">{t('portal.attendance')}</span>
                      <strong>{format.formatPercent(detail.attendanceRate)}</strong>
                    </div>
                    <div>
                      <span className="muted">{t('portal.outstanding')}</span>
                      <strong>{format.formatCurrency(detail.outstanding)}</strong>
                    </div>
                  </div>

                  <div className="dashboard-grid">
                    <section>
                      <h3 className="section-title">{t('portal.subjectScores')}</h3>
                      {subjectScores.length === 0 ? <p className="muted">{t('portal.noReportCards')}</p> : (
                        <div className="chart-frame">
                          <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={subjectScores}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                              <XAxis dataKey="short" tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} axisLine={false} tickLine={false} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} axisLine={false} tickLine={false} width={30} />
                              <Tooltip
                                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}
                                formatter={(value, name, props) => [format.formatInteger(value), props.payload.name]}
                              />
                              <Bar dataKey="score" fill="var(--forest)" radius={[5, 5, 0, 0]} maxBarSize={28} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </section>
                    <section>
                      <h3 className="section-title">{t('portal.timetable')}</h3>
                      {(detail.timetable ?? []).length === 0 ? <p className="muted">{t('portal.noLessons', { defaultValue: 'No lessons scheduled today.' })}</p> : (
                        <div className="record-list">
                          {detail.timetable.map((lesson, index) => (
                            <div className="record-row" key={`${lesson.period_label}-${index}`}>
                              <div className="record-main">
                                <strong>{lesson.subject_code} — {lesson.subject_name}</strong>
                                <span className="muted">{lesson.first_name} {lesson.last_name} · {lesson.room_name || '—'}</span>
                              </div>
                              <span className="muted">{format.formatTime(lesson.start_time)}–{format.formatTime(lesson.end_time)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>

                  <div className="dashboard-grid">
                    <section>
                      <h3 className="section-title">{t('portal.recentInvoices')}</h3>
                      {(detail.invoices ?? []).length === 0 ? <p className="muted">{t('portal.noFees')}</p> : (
                        <div className="record-list">
                          {detail.invoices.slice(0, 6).map((invoice) => (
                            <button type="button" className="record-row" key={invoice.id} onClick={() => navigate('/portal/fees')}>
                              <div className="record-main">
                                <strong>{invoice.invoice_number}</strong>
                                <span className="muted">{format.formatMonth(invoice.billing_period)} · {format.formatDate(invoice.due_date)}</span>
                              </div>
                              <span className="record-side">
                                <Badge status={invoice.status} />
                                <strong>{format.formatCurrency(invoice.balance)}</strong>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </section>
                    <section>
                      <h3 className="section-title">{t('portal.library')}</h3>
                      {(detail.loans ?? []).length === 0 ? <p className="muted">{t('portal.noLoans')}</p> : (
                        <div className="record-list">
                          {detail.loans.slice(0, 6).map((loan) => (
                            <div className="record-row" key={loan.id}>
                              <div className="record-main">
                                <strong>{loan.title}</strong>
                                <span className="muted">{loan.accession_number} · {format.formatDate(loan.issued_at)}</span>
                              </div>
                              <Badge status={Number(loan.overdue) ? 'overdue' : loan.status} />
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>

                  <div className="attendance-summary-strip">
                    {Object.entries(detail.attendance?.counts ?? {}).map(([status, count]) => (
                      <div key={status}>
                        <span className="muted">{t(`attendance.${status}`, { defaultValue: status })}</span>
                        <strong>{format.formatInteger(count)}</strong>
                      </div>
                    ))}
                    <div>
                      <span className="muted">{t('portal.attendance')}</span>
                      <strong>{format.formatPercent(detail.attendanceRate)}</strong>
                    </div>
                  </div>
                </div>
              )}
            </Panel>
          ) : null}
        </>
      )}

      <Panel
        title={t('portal.announcements')}
        actions={<button type="button" className="text-link" onClick={() => navigate('/announcements')}>{t('common.view')}</button>}
      >
        {announcements.loading ? <LoadingBlock rows={3} /> : (announcements.data?.items ?? []).length === 0 ? (
          <p className="muted">{t('dashboard.noAnnouncements')}</p>
        ) : (
          <ul className="announcement-list">
            {announcements.data.items.slice(0, 4).map((announcement) => (
              <li key={announcement.id}>
                <button type="button" className="announcement-row" onClick={() => navigate('/announcements')}>
                  <span className="announcement-title">{announcement.title}</span>
                  <span className="muted announcement-meta">{format.formatDate(announcement.published_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
