import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { sportsData, searchSports } from '../data/sports';
import { Input } from '../components/ui/Input';

const sportColorMap: Record<string, string> = {
  'Court Sport': 'bg-blue-50 border-blue-100',
  'Field Sport': 'bg-green-50 border-green-100',
  'Indoor Sport': 'bg-purple-50 border-purple-100',
  'Contact Sport': 'bg-red-50 border-red-100',
  'Traditional Sport': 'bg-amber-50 border-amber-100',
  'Track & Field': 'bg-rose-50 border-rose-100',
};

const categoryBadge: Record<string, string> = {
  'Court Sport': 'bg-blue-100 text-blue-700',
  'Field Sport': 'bg-green-100 text-green-700',
  'Indoor Sport': 'bg-purple-100 text-purple-700',
  'Contact Sport': 'bg-red-100 text-red-700',
  'Traditional Sport': 'bg-amber-100 text-amber-700',
  'Track & Field': 'bg-rose-100 text-rose-700',
};

export function Sports() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const results = searchSports(query);

  const categories = Array.from(new Set(sportsData.map((s) => s.category)));

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto lg:max-w-3xl lg:px-8 lg:py-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Sports Library</h1>
        <p className="text-slate-500 text-sm mt-1">Court dimensions, rules & equipment for all PE sports</p>
      </div>

      {/* Search */}
      <div className="mb-5">
        <Input
          placeholder="Search sports... e.g. basketball, kabaddi"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          icon={<Search size={16} />}
        />
      </div>

      {/* Category filter pills */}
      {!query && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-5">
          {['All', ...categories].map((cat) => (
            <button
              key={cat}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Sports grid */}
      {results.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {results.map((sport) => (
            <button
              key={sport.id}
              onClick={() => navigate(`/sports/${sport.id}`)}
              className={`flex items-center gap-4 p-4 rounded-2xl border bg-gradient-to-r ${sportColorMap[sport.category] || 'bg-white border-slate-100'} text-left hover:shadow-md active:scale-[0.98] transition-all duration-150 group`}
            >
              <div className="text-4xl flex-shrink-0">{sport.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-800 text-sm">{sport.name}</h3>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${categoryBadge[sport.category] || 'bg-slate-100 text-slate-600'}`}>
                    {sport.category}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 leading-snug">{sport.overview.slice(0, 80)}...</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-slate-400">
                    {sport.court.length}{sport.court.lengthUnit} × {sport.court.width}{sport.court.widthUnit}
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="font-semibold text-slate-700">No sports found</h3>
          <p className="text-slate-500 text-sm mt-1">Try searching for "cricket", "basketball" or "kabaddi"</p>
        </div>
      )}
    </div>
  );
}
