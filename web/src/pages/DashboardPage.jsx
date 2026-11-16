import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowUpRight,
  BookOpen,
  CalendarCheck2,
  ClipboardList,
  GraduationCap,
  Library,
  ScrollText,
  Users,
  Wallet,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, ErrorState, LoadingBlock, PageHeader, Panel, ProgressBar, StatCard } from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';
import { useFormat } from '../lib/format.js';

const cardIcons = {
  students: Users,
  staff: GraduationCap,
  sections: CalendarCheck2,
  attendance: CalendarCheck2,
  finance: Wallet,
  outstanding: Wallet,
  invoices: Wallet,
  exams: ScrollText,
  applicants: ClipboardList,
  books: Library,
  loans: BookOpen,
  reportCards: ScrollText,
  teachers: GraduationCap,
};

function formatCardValue(card, format) {
  if (card.format === 'percent' || card.key === 'attendance') return format.formatPercent(card.value);
  if (card.format === 'currency' || ['finance', 'outstanding', 'fees'].includes(card.key)) return format.formatCurrency(card.value);
  return format.formatInteger(card.value);
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const format = useFormat();
  const { data, loading, error, reload } = useApi('/dashboard');

  if (error) {
    return (
      <div className="page-stack">
        <PageHeader eyebrow={t('dashboard.eyebrow')} title={t('dashboard.title')} />
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="page-stack">
        <PageHeader eyebrow={t('dashboard.eyebrow')} title={t('dashboard.title')} />
        <LoadingBlock rows={8} />
      </div>
    );
  }

  const cards = data.cards ?? [];
  const tasks = data.tasks ?? [];
  const enrollment = data.charts?.enrollmentByGrade ?? [];
  const activity = data.activity ?? [];
  const announcements = data.announcements ?? [];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={`${t('dashboard.eyebrow')} · ${format.formatDate(data.date)}`}
        title={data.greeting || t('dashboard.welcome', { name: '' })}
        copy={t('dashboard.copy', { defaultValue: 'A calm view of the school day, with the work that needs you first.' })}
        actions={<Badge tone="forest">{data.role?.name}</Badge>}
      />

      <section className="kpi-grid" aria-label={t('dashboard.eyebrow')}>
        {cards.map((card, index) => (
          <StatCard
            key={card.key ?? index}
            label={card.label}
            value={formatCardValue(card, format)}
            hint={card.hint}
            icon={cardIcons[card.key] || ClipboardList}
            tone={index % 4 === 0 ? 'forest' : index % 4 === 1 ? 'brass' : index % 4 === 2 ? 'terracotta' : 'ink'}
          />
        ))}
      </section>

      <div className="dashboard-grid">
        <Panel title={t('dashboard.tasks')} copy={t('dashboard.tasksCopy')}>
          {tasks.length === 0 ? (
            <p className="muted">{t('dashboard.noTasks')}</p>
          ) : (
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

        <Panel title={t('dashboard.enrollment')}>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={enrollment.map((row) => ({ ...row, name: format.formatInteger(row.label) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} axisLine={false} tickLine={false} width={34} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}
                  formatter={(value) => [format.formatInteger(value), t('dashboard.card.students')]}
                />
                <Bar dataKey="value" fill="var(--forest)" radius={[5, 5, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title={t('dashboard.activity')}>
          {activity.length === 0 ? (
            <p className="muted">{t('dashboard.noActivity')}</p>
          ) : (
            <ol className="activity-list">
              {activity.map((entry) => (
                <li key={entry.id}>
                  <span className="activity-dot" aria-hidden="true" />
                  <div>
                    <p className="activity-title">{entry.action.replaceAll('.', ' · ')}</p>
                    <p className="muted activity-meta">
                      {entry.actor_name || '—'} · {format.formatDateTime(entry.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel
          title={t('dashboard.announcements')}
          actions={
            <button type="button" className="text-link" onClick={() => navigate('/announcements')}>
              {t('common.view')}
            </button>
          }
        >
          {announcements.length === 0 ? (
            <p className="muted">{t('dashboard.noAnnouncements')}</p>
          ) : (
            <ul className="announcement-list">
              {announcements.map((announcement) => (
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

      {data.charts?.attendance7?.length ? (
        <Panel title={t('dashboard.attendance7')}>
          <div className="attendance-strip">
            {data.charts.attendance7.map((row) => (
              <div key={row.date} className="attendance-strip-item">
                <p className="muted">{format.formatDateShort(row.date)}</p>
                <ProgressBar value={row.rate} label={`${row.date} ${row.rate}%`} />
                <span className="attendance-strip-value">{format.formatPercent(row.rate)}</span>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
