import React from 'react';
import type { CourtInfo } from '../../types';

interface CourtProps {
  type: CourtInfo['type'];
  showMeasurements?: boolean;
  fullScreen?: boolean;
}

export function CourtDiagram({ type, showMeasurements = true, fullScreen = false }: CourtProps) {
  const height = fullScreen ? 400 : 260;

  const courts: Record<string, React.ReactElement> = {
    basketball: <BasketballCourt showMeasurements={showMeasurements} height={height} />,
    volleyball: <VolleyballCourt showMeasurements={showMeasurements} height={height} />,
    badminton: <BadmintonCourt showMeasurements={showMeasurements} height={height} />,
    tennis: <TennisCourt showMeasurements={showMeasurements} height={height} />,
    football: <FootballCourt showMeasurements={showMeasurements} height={height} />,
    cricket: <CricketPitch showMeasurements={showMeasurements} height={height} />,
    hockey: <HockeyField showMeasurements={showMeasurements} height={height} />,
    kabaddi: <KabaddiCourt showMeasurements={showMeasurements} height={height} />,
    'kho-kho': <KhoKhoCourt showMeasurements={showMeasurements} height={height} />,
    throwball: <ThrowballCourt showMeasurements={showMeasurements} height={height} />,
    handball: <HandballCourt showMeasurements={showMeasurements} height={height} />,
    tabletennis: <TableTennisCourt showMeasurements={showMeasurements} height={height} />,
    athletics: <AthleticsTrack showMeasurements={showMeasurements} height={height} />,
  };

  return (
    <div style={{ height }} className="w-full flex items-center justify-center">
      {courts[type] || <div className="text-white text-sm opacity-60 text-center p-8">Court diagram not available</div>}
    </div>
  );
}

interface DiagramProps { showMeasurements: boolean; height: number; }

function BasketballCourt({ showMeasurements, height }: DiagramProps) {
  const W = 560, H = height;
  const cw = W * 0.92, ch = H * 0.8;
  const cx = (W - cw) / 2, cy = (H - ch) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} fill="#1a472a" />
      <rect x={cx} y={cy} width={cw} height={ch} fill="#c68642" stroke="white" strokeWidth="2.5" />
      {/* Center line */}
      <line x1={W/2} y1={cy} x2={W/2} y2={cy+ch} stroke="white" strokeWidth="2" />
      {/* Center circle */}
      <circle cx={W/2} cy={H/2} r={ch * 0.18} fill="none" stroke="white" strokeWidth="2" />
      <circle cx={W/2} cy={H/2} r={3} fill="white" />
      {/* Left key */}
      <rect x={cx} y={cy + ch * 0.3} width={cw * 0.15} height={ch * 0.4} fill="none" stroke="white" strokeWidth="2" />
      <line x1={cx + cw * 0.15} y1={cy + ch * 0.3} x2={cx + cw * 0.15} y2={cy + ch * 0.7} stroke="white" strokeWidth="2" />
      <path d={`M ${cx + cw*0.15} ${H/2 - ch*0.2} A ${ch*0.2} ${ch*0.2} 0 0 1 ${cx + cw*0.15} ${H/2 + ch*0.2}`} fill="none" stroke="white" strokeWidth="2" />
      {/* Right key */}
      <rect x={cx + cw * 0.85} y={cy + ch * 0.3} width={cw * 0.15} height={ch * 0.4} fill="none" stroke="white" strokeWidth="2" />
      <path d={`M ${cx + cw*0.85} ${H/2 - ch*0.2} A ${ch*0.2} ${ch*0.2} 0 0 0 ${cx + cw*0.85} ${H/2 + ch*0.2}`} fill="none" stroke="white" strokeWidth="2" />
      {/* 3-point arcs */}
      <path d={`M ${cx + cw*0.02} ${cy + ch*0.14} L ${cx + cw*0.02} ${cy + ch*0.85} A ${ch*0.52} ${ch*0.52} 0 0 0 ${cx + cw*0.27} ${H/2 - ch*0.52}`} fill="none" stroke="white" strokeWidth="2" />
      <path d={`M ${cx + cw*0.02} ${cy+ch*0.14} A ${cw*0.28} ${cw*0.28} 0 0 1 ${cx+cw*0.27} ${H/2}`} fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="4,3" />
      {/* Basketball hoops */}
      <circle cx={cx + cw * 0.04} cy={H/2} r={ch * 0.055} fill="none" stroke="#ff6b00" strokeWidth="2.5" />
      <circle cx={cx + cw * 0.96} cy={H/2} r={ch * 0.055} fill="none" stroke="#ff6b00" strokeWidth="2.5" />
      {showMeasurements && (
        <>
          <text x={W/2} y={cy - 8} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">28m</text>
          <text x={cx - 8} y={H/2 + 4} textAnchor="end" fill="white" fontSize="11" fontWeight="600" transform={`rotate(-90, ${cx - 8}, ${H/2})`}>15m</text>
          <text x={W/2} y={H/2 + 4} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10">Center Circle r=1.8m</text>
        </>
      )}
    </svg>
  );
}

function VolleyballCourt({ showMeasurements, height }: DiagramProps) {
  const W = 560, H = height;
  const cw = W * 0.88, ch = H * 0.78;
  const cx = (W - cw) / 2, cy = (H - ch) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} fill="#8B4513" />
      <rect x={cx} y={cy} width={cw} height={ch} fill="#D2691E" stroke="white" strokeWidth="2.5" />
      {/* Net - center */}
      <line x1={W/2} y1={cy-4} x2={W/2} y2={cy+ch+4} stroke="#888" strokeWidth="1.5" strokeDasharray="3,2" />
      <rect x={W/2-2} y={cy} width={4} height={ch} fill="white" opacity="0.9" />
      {/* Attack lines (3m from center) */}
      <line x1={W/2 - cw*0.167} y1={cy} x2={W/2 - cw*0.167} y2={cy+ch} stroke="white" strokeWidth="2" />
      <line x1={W/2 + cw*0.167} y1={cy} x2={W/2 + cw*0.167} y2={cy+ch} stroke="white" strokeWidth="2" />
      {/* Service zones */}
      <line x1={cx} y1={cy + ch*0.17} x2={cx - 15} y2={cy + ch*0.17} stroke="white" strokeWidth="1.5" />
      <line x1={cx} y1={cy + ch*0.83} x2={cx - 15} y2={cy + ch*0.83} stroke="white" strokeWidth="1.5" />
      {showMeasurements && (
        <>
          <text x={W/2} y={cy - 8} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">18m</text>
          <text x={cx - 10} y={H/2 + 4} textAnchor="end" fill="white" fontSize="11" fontWeight="600" transform={`rotate(-90, ${cx-10}, ${H/2})`}>9m</text>
          <text x={W/2 - cw*0.167} y={cy + ch + 14} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="9">3m Attack</text>
          <text x={W/2 + cw*0.167} y={cy + ch + 14} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="9">3m Attack</text>
          <text x={W/2} y={cy - 22} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9">Net: 2.43m (M) / 2.24m (W)</text>
        </>
      )}
    </svg>
  );
}

function BadmintonCourt({ showMeasurements, height }: DiagramProps) {
  const W = 560, H = height;
  const cw = W * 0.55, ch = H * 0.86;
  const cx = (W - cw) / 2, cy = (H - ch) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} fill="#2d6a4f" />
      <rect x={cx} y={cy} width={cw} height={ch} fill="#40916c" stroke="white" strokeWidth="2" />
      {/* Net - center horizontal */}
      <rect x={cx} y={H/2-2} width={cw} height={4} fill="white" opacity="0.9" />
      {/* Short service lines */}
      <line x1={cx} y1={cy + ch*0.148} x2={cx+cw} y2={cy + ch*0.148} stroke="white" strokeWidth="1.5" />
      <line x1={cx} y1={cy + ch*0.852} x2={cx+cw} y2={cy + ch*0.852} stroke="white" strokeWidth="1.5" />
      {/* Long service lines for doubles */}
      <line x1={cx} y1={cy + ch*0.065} x2={cx+cw} y2={cy + ch*0.065} stroke="white" strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1={cx} y1={cy + ch*0.935} x2={cx+cw} y2={cy + ch*0.935} stroke="white" strokeWidth="1.5" strokeDasharray="4,3" />
      {/* Singles sidelines */}
      <line x1={cx + cw*0.135} y1={cy} x2={cx + cw*0.135} y2={cy+ch} stroke="white" strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1={cx + cw*0.865} y1={cy} x2={cx + cw*0.865} y2={cy+ch} stroke="white" strokeWidth="1.5" strokeDasharray="4,3" />
      {/* Center line */}
      <line x1={W/2} y1={cy + ch*0.148} x2={W/2} y2={cy + ch*0.852} stroke="white" strokeWidth="1.5" />
      {showMeasurements && (
        <>
          <text x={W/2} y={cy - 8} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">13.4m</text>
          <text x={cx - 10} y={H/2 + 4} textAnchor="end" fill="white" fontSize="11" fontWeight="600" transform={`rotate(-90,${cx-10},${H/2})`}>6.1m</text>
          <text x={W/2} y={H/2 - 10} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="9">Net h=1.524m</text>
        </>
      )}
    </svg>
  );
}

function TennisCourt({ showMeasurements, height }: DiagramProps) {
  const W = 560, H = height;
  const cw = W * 0.88, ch = H * 0.78;
  const cx = (W - cw) / 2, cy = (H - ch) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} fill="#2563eb" />
      <rect x={cx} y={cy} width={cw} height={ch} fill="#4f46e5" stroke="white" strokeWidth="2.5" />
      {/* Net */}
      <rect x={cx} y={H/2-2} width={cw} height={4} fill="white" opacity="0.9" />
      {/* Service boxes */}
      <line x1={cx + cw*0.12} y1={cy} x2={cx + cw*0.12} y2={cy+ch} stroke="white" strokeWidth="1.5" strokeDasharray="none" />
      <line x1={cx + cw*0.88} y1={cy} x2={cx + cw*0.88} y2={cy+ch} stroke="white" strokeWidth="1.5" />
      {/* Service lines */}
      <line x1={cx + cw*0.12} y1={cy + ch*0.23} x2={cx + cw*0.88} y2={cy + ch*0.23} stroke="white" strokeWidth="1.5" />
      <line x1={cx + cw*0.12} y1={cy + ch*0.77} x2={cx + cw*0.88} y2={cy + ch*0.77} stroke="white" strokeWidth="1.5" />
      {/* Center service lines */}
      <line x1={W/2} y1={cy + ch*0.23} x2={W/2} y2={cy + ch*0.77} stroke="white" strokeWidth="1.5" />
      {showMeasurements && (
        <>
          <text x={W/2} y={cy - 8} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">23.77m</text>
          <text x={cx - 10} y={H/2 + 4} textAnchor="end" fill="white" fontSize="11" fontWeight="600" transform={`rotate(-90,${cx-10},${H/2})`}>10.97m</text>
          <text x={W/2} y={H/2 - 10} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="9">Net h=0.914m</text>
        </>
      )}
    </svg>
  );
}

function FootballCourt({ showMeasurements, height }: DiagramProps) {
  const W = 560, H = height;
  const cw = W * 0.92, ch = H * 0.82;
  const cx = (W - cw) / 2, cy = (H - ch) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} fill="#166534" />
      {/* Stripes */}
      {Array.from({length:6}).map((_,i)=>(
        <rect key={i} x={cx + i*(cw/6)} y={cy} width={cw/6} height={ch} fill={i%2===0?"#15803d":"#166534"} />
      ))}
      <rect x={cx} y={cy} width={cw} height={ch} fill="none" stroke="white" strokeWidth="2.5" />
      {/* Center */}
      <line x1={W/2} y1={cy} x2={W/2} y2={cy+ch} stroke="white" strokeWidth="2" />
      <circle cx={W/2} cy={H/2} r={ch*0.22} fill="none" stroke="white" strokeWidth="2" />
      <circle cx={W/2} cy={H/2} r={3} fill="white" />
      {/* Penalty areas */}
      <rect x={cx} y={cy + ch*0.22} width={cw*0.15} height={ch*0.56} fill="none" stroke="white" strokeWidth="2" />
      <rect x={cx + cw*0.85} y={cy + ch*0.22} width={cw*0.15} height={ch*0.56} fill="none" stroke="white" strokeWidth="2" />
      {/* Goal areas */}
      <rect x={cx} y={cy + ch*0.37} width={cw*0.065} height={ch*0.26} fill="none" stroke="white" strokeWidth="2" />
      <rect x={cx + cw*0.935} y={cy + ch*0.37} width={cw*0.065} height={ch*0.26} fill="none" stroke="white" strokeWidth="2" />
      {/* Goals */}
      <rect x={cx - 8} y={cy + ch*0.39} width={8} height={ch*0.22} fill="none" stroke="white" strokeWidth="2" />
      <rect x={cx + cw} y={cy + ch*0.39} width={8} height={ch*0.22} fill="none" stroke="white" strokeWidth="2" />
      {/* Penalty spots */}
      <circle cx={cx + cw*0.107} cy={H/2} r={3} fill="white" />
      <circle cx={cx + cw*0.893} cy={H/2} r={3} fill="white" />
      {/* Corner arcs */}
      <path d={`M ${cx} ${cy+8} A 8 8 0 0 1 ${cx+8} ${cy}`} fill="none" stroke="white" strokeWidth="1.5" />
      <path d={`M ${cx+cw-8} ${cy} A 8 8 0 0 1 ${cx+cw} ${cy+8}`} fill="none" stroke="white" strokeWidth="1.5" />
      {showMeasurements && (
        <>
          <text x={W/2} y={cy - 8} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">105m</text>
          <text x={cx - 12} y={H/2 + 4} textAnchor="end" fill="white" fontSize="11" fontWeight="600" transform={`rotate(-90,${cx-12},${H/2})`}>68m</text>
        </>
      )}
    </svg>
  );
}

function CricketPitch({ showMeasurements, height }: DiagramProps) {
  const W = 560, H = height;
  const cr = Math.min(W, H) * 0.42;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} fill="#15803d" />
      <ellipse cx={W/2} cy={H/2} rx={cr} ry={cr*0.7} fill="#16a34a" stroke="white" strokeWidth="2" />
      {/* 30-yard circle */}
      <ellipse cx={W/2} cy={H/2} rx={cr*0.55} ry={cr*0.55*0.7} fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="5,4" />
      {/* Pitch */}
      <rect x={W/2 - 20} y={H/2 - H*0.3} width={40} height={H*0.6} fill="#c2a060" stroke="white" strokeWidth="1.5" rx="2" />
      {/* Creases */}
      <line x1={W/2 - 22} y1={H/2 - H*0.22} x2={W/2 + 22} y2={H/2 - H*0.22} stroke="white" strokeWidth="2" />
      <line x1={W/2 - 22} y1={H/2 + H*0.22} x2={W/2 + 22} y2={H/2 + H*0.22} stroke="white" strokeWidth="2" />
      {/* Stumps */}
      {[-6, 0, 6].map(x => (
        <line key={x} x1={W/2 + x} y1={H/2 - H*0.25} x2={W/2 + x} y2={H/2 - H*0.21} stroke="#ff8800" strokeWidth="3" />
      ))}
      {[-6, 0, 6].map(x => (
        <line key={x} x1={W/2 + x} y1={H/2 + H*0.21} x2={W/2 + x} y2={H/2 + H*0.25} stroke="#ff8800" strokeWidth="3" />
      ))}
      {showMeasurements && (
        <>
          <text x={W/2} y={H/2 - H*0.38} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">22 yds (20.12m)</text>
          <text x={W/2 - cr - 10} y={H/2 + 4} textAnchor="end" fill="white" fontSize="10" fontWeight="600">Boundary ~70m</text>
        </>
      )}
    </svg>
  );
}

function HockeyField({ showMeasurements, height }: DiagramProps) {
  const W = 560, H = height;
  const cw = W * 0.92, ch = H * 0.82;
  const cx = (W - cw) / 2, cy = (H - ch) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} fill="#15803d" />
      <rect x={cx} y={cy} width={cw} height={ch} fill="#16a34a" stroke="white" strokeWidth="2.5" />
      <line x1={W/2} y1={cy} x2={W/2} y2={cy+ch} stroke="white" strokeWidth="2" />
      {/* 25-yard lines */}
      <line x1={cx + cw*0.25} y1={cy} x2={cx + cw*0.25} y2={cy+ch} stroke="white" strokeWidth="1.5" strokeDasharray="5,3" />
      <line x1={cx + cw*0.75} y1={cy} x2={cx + cw*0.75} y2={cy+ch} stroke="white" strokeWidth="1.5" strokeDasharray="5,3" />
      {/* Shooting circles (D shape) */}
      <path d={`M ${cx} ${cy + ch*0.3} A ${cw*0.16} ${ch*0.4} 0 0 1 ${cx} ${cy + ch*0.7}`} fill="rgba(255,255,255,0.1)" stroke="white" strokeWidth="2" />
      <path d={`M ${cx + cw} ${cy + ch*0.3} A ${cw*0.16} ${ch*0.4} 0 0 0 ${cx + cw} ${cy + ch*0.7}`} fill="rgba(255,255,255,0.1)" stroke="white" strokeWidth="2" />
      {/* Goals */}
      <rect x={cx - 8} y={cy + ch*0.39} width={8} height={ch*0.22} fill="#555" stroke="white" strokeWidth="1.5" />
      <rect x={cx + cw} y={cy + ch*0.39} width={8} height={ch*0.22} fill="#555" stroke="white" strokeWidth="1.5" />
      {/* Penalty spots */}
      <circle cx={cx + cw*0.07} cy={H/2} r={3} fill="white" />
      <circle cx={cx + cw*0.93} cy={H/2} r={3} fill="white" />
      {showMeasurements && (
        <>
          <text x={W/2} y={cy - 8} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">91.4m</text>
          <text x={cx - 12} y={H/2 + 4} textAnchor="end" fill="white" fontSize="11" fontWeight="600" transform={`rotate(-90,${cx-12},${H/2})`}>55m</text>
          <text x={cx + cw*0.1} y={H/2 - 18} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="9">D Circle</text>
        </>
      )}
    </svg>
  );
}

function KabaddiCourt({ showMeasurements, height }: DiagramProps) {
  const W = 560, H = height;
  const cw = W * 0.82, ch = H * 0.78;
  const cx = (W - cw) / 2, cy = (H - ch) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} fill="#7c3aed" />
      <rect x={cx} y={cy} width={cw} height={ch} fill="#8b5cf6" stroke="white" strokeWidth="2.5" />
      {/* Center line */}
      <line x1={W/2} y1={cy} x2={W/2} y2={cy+ch} stroke="white" strokeWidth="2.5" />
      {/* Baulk lines */}
      <line x1={W/2 - cw*0.285} y1={cy} x2={W/2 - cw*0.285} y2={cy+ch} stroke="yellow" strokeWidth="2" />
      <line x1={W/2 + cw*0.285} y1={cy} x2={W/2 + cw*0.285} y2={cy+ch} stroke="yellow" strokeWidth="2" />
      {/* Bonus lines */}
      <line x1={W/2 - cw*0.385} y1={cy} x2={W/2 - cw*0.385} y2={cy+ch} stroke="cyan" strokeWidth="1.5" strokeDasharray="5,3" />
      <line x1={W/2 + cw*0.385} y1={cy} x2={W/2 + cw*0.385} y2={cy+ch} stroke="cyan" strokeWidth="1.5" strokeDasharray="5,3" />
      {/* Lobby */}
      <rect x={cx} y={cy} width={cw} height={ch*0.1} fill="rgba(0,0,0,0.2)" />
      <rect x={cx} y={cy+ch*0.9} width={cw} height={ch*0.1} fill="rgba(0,0,0,0.2)" />
      {showMeasurements && (
        <>
          <text x={W/2} y={cy - 8} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">13m × 10m (Men)</text>
          <text x={W/2 - cw*0.285} y={cy + ch + 14} textAnchor="middle" fill="yellow" fontSize="9">Baulk</text>
          <text x={W/2 + cw*0.285} y={cy + ch + 14} textAnchor="middle" fill="yellow" fontSize="9">Baulk</text>
          <text x={W/2 - cw*0.385} y={cy + ch + 14} textAnchor="middle" fill="cyan" fontSize="9">Bonus</text>
        </>
      )}
    </svg>
  );
}

function KhoKhoCourt({ showMeasurements, height }: DiagramProps) {
  const W = 560, H = height;
  const cw = W * 0.85, ch = H * 0.78;
  const cx = (W - cw) / 2, cy = (H - ch) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} fill="#854d0e" />
      <rect x={cx} y={cy} width={cw} height={ch} fill="#a16207" stroke="white" strokeWidth="2.5" />
      {/* Central strip */}
      <rect x={cx + cw*0.06} y={cy} width={cw*0.88} height={ch} fill="rgba(255,255,255,0.1)" />
      <line x1={cx + cw*0.06} y1={cy} x2={cx + cw*0.06} y2={cy+ch} stroke="white" strokeWidth="1.5" />
      <line x1={cx + cw*0.94} y1={cy} x2={cx + cw*0.94} y2={cy+ch} stroke="white" strokeWidth="1.5" />
      {/* Cross lanes */}
      {[0.14, 0.27, 0.4, 0.53, 0.67, 0.8].map((p) => (
        <line key={p} x1={cx + cw*0.06} y1={cy + ch*p} x2={cx + cw*0.94} y2={cy + ch*p} stroke="white" strokeWidth="1" strokeDasharray="3,2" />
      ))}
      {/* Posts */}
      <circle cx={cx + cw*0.06} cy={H/2} r={6} fill="brown" stroke="white" strokeWidth="2" />
      <circle cx={cx + cw*0.94} cy={H/2} r={6} fill="brown" stroke="white" strokeWidth="2" />
      {showMeasurements && (
        <>
          <text x={W/2} y={cy - 8} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">29m × 16m (Men)</text>
          <text x={W/2} y={H/2 + 4} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9">Central Strip</text>
        </>
      )}
    </svg>
  );
}

function ThrowballCourt({ showMeasurements, height }: DiagramProps) {
  const W = 560, H = height;
  const cw = W * 0.78, ch = H * 0.82;
  const cx = (W - cw) / 2, cy = (H - ch) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} fill="#0f766e" />
      <rect x={cx} y={cy} width={cw} height={ch} fill="#0d9488" stroke="white" strokeWidth="2.5" />
      {/* Net */}
      <rect x={cx} y={H/2-2} width={cw} height={4} fill="white" opacity="0.9" />
      {/* Service zones (3m from back) */}
      <line x1={cx} y1={cy + ch*0.247} x2={cx+cw} y2={cy + ch*0.247} stroke="yellow" strokeWidth="1.5" />
      <line x1={cx} y1={cy + ch*0.753} x2={cx+cw} y2={cy + ch*0.753} stroke="yellow" strokeWidth="1.5" />
      {/* Baulk lines */}
      <line x1={cx} y1={H/2 - ch*0.22} x2={cx+cw} y2={H/2 - ch*0.22} stroke="white" strokeWidth="1.5" strokeDasharray="5,3" />
      <line x1={cx} y1={H/2 + ch*0.22} x2={cx+cw} y2={H/2 + ch*0.22} stroke="white" strokeWidth="1.5" strokeDasharray="5,3" />
      {showMeasurements && (
        <>
          <text x={W/2} y={cy - 8} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">12.2m × 11m</text>
          <text x={W/2} y={H/2 - 10} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="9">Net: 2.2m (W) / 2.35m (M)</text>
        </>
      )}
    </svg>
  );
}

function HandballCourt({ showMeasurements, height }: DiagramProps) {
  const W = 560, H = height;
  const cw = W * 0.9, ch = H * 0.8;
  const cx = (W - cw) / 2, cy = (H - ch) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} fill="#1e40af" />
      <rect x={cx} y={cy} width={cw} height={ch} fill="#2563eb" stroke="white" strokeWidth="2.5" />
      <line x1={W/2} y1={cy} x2={W/2} y2={cy+ch} stroke="white" strokeWidth="2" />
      {/* 6m goal areas */}
      <path d={`M ${cx} ${cy + ch*0.25} A ${cw*0.15} ${ch*0.5} 0 0 1 ${cx} ${cy + ch*0.75}`} fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="2" />
      <path d={`M ${cx + cw} ${cy + ch*0.25} A ${cw*0.15} ${ch*0.5} 0 0 0 ${cx + cw} ${cy + ch*0.75}`} fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="2" />
      {/* 9m free throw lines */}
      <path d={`M ${cx} ${cy + ch*0.15} A ${cw*0.225} ${ch*0.7} 0 0 1 ${cx} ${cy + ch*0.85}`} fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="6,4" />
      <path d={`M ${cx + cw} ${cy + ch*0.15} A ${cw*0.225} ${ch*0.7} 0 0 0 ${cx + cw} ${cy + ch*0.85}`} fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="6,4" />
      {/* Goals */}
      <rect x={cx - 8} y={cy + ch*0.38} width={8} height={ch*0.24} fill="#555" stroke="white" strokeWidth="1.5" />
      <rect x={cx + cw} y={cy + ch*0.38} width={8} height={ch*0.24} fill="#555" stroke="white" strokeWidth="1.5" />
      {/* 7m spots */}
      <circle cx={cx + cw*0.175} cy={H/2} r={3} fill="white" />
      <circle cx={cx + cw*0.825} cy={H/2} r={3} fill="white" />
      {showMeasurements && (
        <>
          <text x={W/2} y={cy - 8} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">40m × 20m</text>
          <text x={cx + cw*0.07} y={H/2 - 16} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="9">6m</text>
          <text x={cx + cw*0.175} y={H/2 - 14} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="8">7m</text>
        </>
      )}
    </svg>
  );
}

function TableTennisCourt({ showMeasurements, height }: DiagramProps) {
  const W = 560, H = height;
  const cw = W * 0.75, ch = H * 0.72;
  const cx = (W - cw) / 2, cy = (H - ch) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} fill="#1e3a5f" />
      <rect x={cx} y={cy} width={cw} height={ch} fill="#1565c0" stroke="white" strokeWidth="3" rx="4" />
      {/* Net */}
      <line x1={W/2} y1={cy-4} x2={W/2} y2={cy+ch+4} stroke="white" strokeWidth="1" />
      <rect x={W/2-2} y={cy} width={4} height={ch} fill="white" />
      {/* Center line */}
      <line x1={cx} y1={H/2} x2={cx+cw} y2={H/2} stroke="white" strokeWidth="1" strokeDasharray="4,3" />
      {showMeasurements && (
        <>
          <text x={W/2} y={cy - 10} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">2.74m</text>
          <text x={cx - 12} y={H/2 + 4} textAnchor="end" fill="white" fontSize="11" fontWeight="600" transform={`rotate(-90,${cx-12},${H/2})`}>1.525m</text>
          <text x={W/2} y={H/2 - 8} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="9">Net h=15.25cm</text>
        </>
      )}
    </svg>
  );
}

function AthleticsTrack({ showMeasurements, height }: DiagramProps) {
  const W = 560, H = height;
  const ew = W * 0.86, eh = H * 0.82;
  const ex = (W - ew) / 2, ey = (H - eh) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} fill="#292524" />
      {/* Track lanes */}
      {[0,1,2,3,4,5,6,7,8].map(i => {
        const scale = 1 - i*0.1;
        const lw = ew * scale, lh = eh * scale;
        const lx = (W - lw) / 2, ly = (H - lh) / 2;
        return (
          <ellipse key={i} cx={W/2} cy={H/2} rx={lw/2} ry={lh/2}
            fill="none" stroke={i===0 ? "#cc4400" : "rgba(255,255,255,0.3)"} strokeWidth={i===0?2:1} />
        );
      })}
      {/* Track surface */}
      <ellipse cx={W/2} cy={H/2} rx={ew/2} ry={eh/2} fill="none" stroke="#cc4400" strokeWidth="2" />
      {/* Infield */}
      <ellipse cx={W/2} cy={H/2} rx={ew/2 - 50} ry={eh/2 - 50} fill="#16a34a" />
      {/* Finish line */}
      <line x1={W/2} y1={ey} x2={W/2} y2={ey - 10} stroke="white" strokeWidth="3" />
      <rect x={W/2 - 30} y={ey - 2} width={60} height={3} fill="white" opacity="0.9" />
      {/* Long jump runway */}
      <rect x={ex + ew*0.08} y={H/2 - 5} width={ew*0.26} height={10} fill="rgba(194,160,96,0.5)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      {showMeasurements && (
        <>
          <text x={W/2} y={ey - 16} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">400m Track</text>
          <text x={W/2} y={H/2 + 4} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10">8 Lanes • 1.22m each</text>
        </>
      )}
    </svg>
  );
}
