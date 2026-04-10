interface Tab {
  label: string;
  key: string;
}

interface Props {
  title: string;
  subtitle?: string;
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  children: React.ReactNode;
}

export default function EntityDetail({ title, subtitle, tabs, activeTab, onTabChange, children }: Props) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-500 text-white'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
