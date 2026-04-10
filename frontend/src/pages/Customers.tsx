import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { customers, jobs } from '../data';
import { profitByCustomer, currentMonthRange } from '../lib/profit';

function fmt$(n: number) {
  return '$' + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function Customers() {
  const range = useMemo(currentMonthRange, []);
  const profitRows = useMemo(() => profitByCustomer(range), [range]);
  const profitMap = Object.fromEntries(profitRows.map(r => [r.id, r]));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
        <p className="text-sm text-slate-500 mt-1">{customers.length} customers</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Customer', 'Contact', 'Email', 'Jobs', 'Revenue (MTD)', 'Net Profit (MTD)'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map(c => {
              const jobCount = jobs.filter(j => j.customerId === c.id).length;
              const profit = profitMap[c.id];
              return (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/master/customers/${c.id}`} className="font-medium text-blue-600 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.contactName}</td>
                  <td className="px-4 py-3 text-slate-500">{c.email}</td>
                  <td className="px-4 py-3 text-slate-600">{jobCount}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">
                    {profit ? fmt$(profit.revenue) : '—'}
                  </td>
                  <td className={`px-4 py-3 font-semibold ${profit && profit.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profit ? (profit.netProfit < 0 ? '-' : '') + fmt$(profit.netProfit) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
