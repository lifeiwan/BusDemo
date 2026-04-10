import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface Props {
  label: string;
  value: string;
  sparkline?: number[];
  positive?: boolean;
}

export default function StatCard({ label, value, sparkline, positive = true }: Props) {
  const data = sparkline?.map((v, i) => ({ i, v }));
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <p className="text-sm text-slate-500 font-medium mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-800 truncate">{value}</p>
      {data && data.length > 1 && (
        <div className="mt-3 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={positive ? '#22c55e' : '#ef4444'}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
