const colorMap: Record<string, string> = {
  active:         'bg-green-100 text-green-800',
  maintenance:    'bg-yellow-100 text-yellow-800',
  out_of_service: 'bg-red-100 text-red-800',
  completed:      'bg-green-100 text-green-800',
  scheduled:      'bg-yellow-100 text-yellow-800',
  route:          'bg-purple-100 text-purple-800',
  one_time:       'bg-cyan-100 text-cyan-800',
  pass:           'bg-green-100 text-green-800',
  fail:           'bg-red-100 text-red-800',
  inactive:       'bg-slate-100 text-slate-600',
  salary:         'bg-blue-100 text-blue-800',
  bonus:          'bg-indigo-100 text-indigo-800',
  reimbursement:  'bg-orange-100 text-orange-800',
};

export default function Badge({ value }: { value: string }) {
  const cls = colorMap[value] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {value.replace(/_/g, ' ')}
    </span>
  );
}
