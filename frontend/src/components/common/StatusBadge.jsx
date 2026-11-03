import { formatStatus } from './statusFormatting';

const statusStyles = {
  confirmed: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-rose-50 text-rose-700',
  open: 'bg-sky-50 text-sky-700',
  in_progress: 'bg-amber-50 text-amber-800',
  waiting_for_patient: 'bg-violet-50 text-violet-700',
  resolved: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-slate-100 text-slate-700',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status] || 'bg-surface-container text-on-surface-variant'}`}>
      {formatStatus(status)}
    </span>
  );
}
