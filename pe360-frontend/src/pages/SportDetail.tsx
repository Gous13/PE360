import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Maximize2, Eye, EyeOff, Ruler } from 'lucide-react';
import { getSportById } from '../data/sports';
import { CourtDiagram } from '../components/courts/CourtDiagram';
import { cn } from '../utils/cn';

const tabs = ['Overview', 'Court', 'Rules', 'Players & Equipment'];

export function SportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const sport = getSportById(Number(id));
  const [activeTab, setActiveTab] = useState('Overview');
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [fullScreen, setFullScreen] = useState(false);

  if (!sport) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-4xl mb-3">🏀</div>
        <h2 className="text-lg font-semibold text-slate-700">Sport not found</h2>
        <button onClick={() => navigate('/sports')} className="text-blue-600 text-sm mt-2 hover:underline">← Back to Sports</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto lg:max-w-4xl">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/sports')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-2xl">{sport.icon}</div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-slate-900 text-lg leading-tight">{sport.name}</h1>
          <p className="text-xs text-slate-500">{sport.category}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[57px] z-10 bg-white border-b border-slate-100 px-4">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 lg:px-8">
        {activeTab === 'Overview' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-slate-800 mb-2">About {sport.name}</h2>
              <p className="text-slate-600 text-sm leading-relaxed">{sport.overview}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-2xl p-4">
                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Players</div>
                <div className="text-sm text-slate-700 leading-snug">{sport.players}</div>
              </div>
              <div className="bg-green-50 rounded-2xl p-4">
                <div className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">Court Size</div>
                <div className="text-sm font-bold text-slate-700">
                  {sport.court.length}{sport.court.lengthUnit} × {sport.court.width}{sport.court.widthUnit}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{sport.court.name}</div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Scoring</div>
              <p className="text-sm text-slate-700 leading-relaxed">{sport.scoring}</p>
            </div>

            <div className="bg-amber-50 rounded-2xl p-4">
              <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Officials</div>
              <p className="text-sm text-slate-700 leading-relaxed">{sport.officials}</p>
            </div>
          </div>
        )}

        {activeTab === 'Court' && (
          <div className="space-y-5">
            {/* Court diagram */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-800">{sport.court.name}</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMeasurements(!showMeasurements)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    {showMeasurements ? <EyeOff size={13} /> : <Eye size={13} />}
                    {showMeasurements ? 'Hide' : 'Show'} Labels
                  </button>
                  <button
                    onClick={() => setFullScreen(true)}
                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>
              </div>
              <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <CourtDiagram type={sport.court.type} showMeasurements={showMeasurements} />
              </div>
            </div>

            {/* Measurements list */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Ruler size={16} className="text-blue-600" />
                <h2 className="font-semibold text-slate-800">Key Measurements</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sport.court.measurements.map((m, i) => (
                  <div key={i} className="flex items-start justify-between p-3 bg-slate-50 rounded-xl gap-3">
                    <span className="text-sm text-slate-600 flex-1">{m.label}</span>
                    <span className="text-sm font-semibold text-slate-900 text-right">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 rounded-2xl p-4">
              <p className="text-sm text-slate-600">{sport.court.description}</p>
            </div>
          </div>
        )}

        {activeTab === 'Rules' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-800">Rules & Regulations</h2>
            {sport.rules.map((rule, i) => (
              <div key={i} className="border border-slate-100 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 flex items-center gap-3">
                  <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-700 font-bold text-xs">{i + 1}</span>
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm">{rule.title}</h3>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-slate-600 leading-relaxed">{rule.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Players & Equipment' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-slate-800 mb-2">Players</h2>
              <div className="bg-blue-50 rounded-2xl p-4">
                <p className="text-sm text-slate-700 leading-relaxed">{sport.players}</p>
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 mb-3">Equipment Required</h2>
              <div className="space-y-2">
                {sport.equipment.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    <span className="text-sm text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full screen court modal */}
      {fullScreen && (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-white font-semibold">{sport.court.name}</h2>
            <button
              onClick={() => setFullScreen(false)}
              className="px-4 py-2 bg-white/10 rounded-xl text-white text-sm hover:bg-white/20"
            >
              Close
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
              <CourtDiagram type={sport.court.type} showMeasurements={showMeasurements} fullScreen />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
