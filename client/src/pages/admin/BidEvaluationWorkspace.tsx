import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  TrendingUp,
  FileCheck,
  DollarSign,
  Calculator,
  ArrowRight,
  ShieldAlert,
  Send,
  Star,
  FolderLock,
  ChevronDown
} from 'lucide-react';
import { api } from '../../api/client';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

interface Props {
  tenderId?: string;
  onBack?: () => void;
  onNavigateToAwards?: () => void;
}

export const BidEvaluationWorkspace: React.FC<Props> = ({ tenderId: initialTenderId, onBack, onNavigateToAwards }) => {
  const [tenders, setTenders] = useState<any[]>([]);
  const [selectedTenderId, setSelectedTenderId] = useState<string>(initialTenderId || '');
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<'Technical' | 'Commercial' | 'Rankings'>('Rankings');
  const [calculating, setCalculating] = useState(false);

  // Scoring modal
  const [selectedBid, setSelectedBid] = useState<any | null>(null);
  const [selectedCriteria, setSelectedCriteria] = useState<any | null>(null);
  const [scoreInput, setScoreInput] = useState<number>(85);
  const [scoreComments, setScoreComments] = useState('');

  // Award Recommendation modal
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [awardSupplier, setAwardSupplier] = useState<any | null>(null);
  const [awardReason, setAwardReason] = useState('Highest composite weighted score and full compliance with RFP specifications');
  const [awarding, setAwarding] = useState(false);

  // 1. Load All Sourcing Events on mount
  useEffect(() => {
    loadTenders();
  }, []);

  const loadTenders = async () => {
    try {
      const res = await api.getTenders();
      setTenders(res);
      if (!selectedTenderId && res.length > 0) {
        // Pick first tender with bids or first tender
        const preferred = res.find((t: any) => t.bid_count > 0) || res[0];
        setSelectedTenderId(preferred.id);
      }
    } catch (err) {
      console.error('Failed to load tenders:', err);
    }
  };

  // 2. Load Evaluation Workspace data for active tender
  useEffect(() => {
    if (selectedTenderId) {
      loadWorkspace(selectedTenderId);
    }
  }, [selectedTenderId]);

  const loadWorkspace = async (tId: string) => {
    setLoading(true);
    try {
      const res = await api.getEvaluationWorkspace(tId);
      setData(res);
    } catch (err) {
      console.error(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateScores = async () => {
    if (!selectedTenderId) return;
    setCalculating(true);
    try {
      await api.calculateRankings(selectedTenderId);
      alert('Technical & Commercial scores calculated! Final rankings updated.');
      loadWorkspace(selectedTenderId);
    } catch (err: any) {
      alert(err.message || 'Calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveScore = async () => {
    if (!selectedBid || !selectedCriteria) return;
    try {
      await api.submitEvaluationScore({
        bidId: selectedBid.id,
        criteriaId: selectedCriteria.id,
        score: scoreInput,
        comments: scoreComments
      });
      setSelectedBid(null);
      setSelectedCriteria(null);
      if (selectedTenderId) loadWorkspace(selectedTenderId);
    } catch (err: any) {
      alert(err.message || 'Failed to submit score');
    }
  };

  const handleCreateAwardRecommendation = async () => {
    if (!awardSupplier || !selectedTenderId) return;
    setAwarding(true);
    try {
      await api.createAward({
        eventId: selectedTenderId,
        supplierId: awardSupplier.supplier_id,
        bidId: awardSupplier.id,
        awardedAmount: awardSupplier.total_bid_amount,
        reason: awardReason,
        committeeRecommendation: `Recommended by evaluation committee as Rank #1 (${awardSupplier.total_weighted_score}%)`
      });

      alert('Award recommendation submitted for multi-level executive sign-off in Approval Center!');
      setShowAwardModal(false);
      if (onNavigateToAwards) onNavigateToAwards();
    } catch (err: any) {
      alert(err.message || 'Failed to recommend award');
    } finally {
      setAwarding(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Event Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-white tracking-tight">Bid Evaluation Workspace</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
              Committee Console
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Multi-stage scoring matrix: Technical (60%) + Commercial (40%) weighted formula.
          </p>
        </div>

        {/* Sourcing Event Selector Dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-850 border border-slate-700 px-3 py-1.5 rounded-xl">
            <FolderLock className="w-4 h-4 text-blue-400" />
            <select
              value={selectedTenderId}
              onChange={(e) => setSelectedTenderId(e.target.value)}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer pr-2"
            >
              {tenders.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                  {t.event_number} — {t.title} ({t.bid_count || 0} Bids)
                </option>
              ))}
            </select>
          </div>

          <button
            disabled={calculating || !data?.bids || data.bids.length === 0}
            onClick={handleCalculateScores}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all"
          >
            <Calculator className="w-4 h-4" />
            <span>{calculating ? 'Calculating...' : 'Recalculate Weighted Scores'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400">Loading evaluation matrix...</div>
      ) : !data || !data.event ? (
        <div className="p-16 text-center bg-slate-850 rounded-3xl border border-slate-800 space-y-3">
          <FileCheck className="w-10 h-10 text-slate-500 mx-auto" />
          <p className="text-sm font-bold text-white">No active sourcing event selected</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Please select a published RFQ or Tender from the dropdown above to begin committee evaluation.
          </p>
        </div>
      ) : (
        <>
          {/* Sourcing Event Status Banner */}
          <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-400">{data.event.event_number}</span>
                  <h3 className="text-sm font-bold text-white">{data.event.title}</h3>
                  <StatusBadge status={data.event.status} />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Category: {data.event.procurement_category} • Estimated Budget: ${data.event.estimated_budget?.toLocaleString()} USD
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Submitted Bids</span>
                <span className="font-bold text-white text-sm">{data.bids?.length || 0}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Technical Weight</span>
                <span className="font-bold text-blue-400 text-sm">60%</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Commercial Weight</span>
                <span className="font-bold text-emerald-400 text-sm">40%</span>
              </div>
            </div>
          </div>

          {/* Stage Selector Pills */}
          <div className="flex items-center gap-2 bg-slate-850 p-1.5 rounded-2xl border border-slate-800 w-fit">
            <button
              onClick={() => setActiveStage('Rankings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeStage === 'Rankings' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Final Ranks & Side-by-Side Comparison
            </button>
            <button
              onClick={() => setActiveStage('Technical')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeStage === 'Technical' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Technical Scoring Matrix (60%)
            </button>
            <button
              onClick={() => setActiveStage('Commercial')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeStage === 'Commercial' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Commercial Cost Matrix (40%)
            </button>
          </div>

          {/* If 0 Bids */}
          {(!data.bids || data.bids.length === 0) && (
            <div className="p-12 text-center bg-slate-850 rounded-3xl border border-slate-800 space-y-3">
              <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-sm font-bold text-white">No Sealed Bids Received Yet</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No suppliers have submitted bids for this sourcing event yet, or the bids are currently in draft. Switch to the Supplier Portal to submit sealed bids.
              </p>
            </div>
          )}

          {/* VIEW 1: FINAL COMPARISON & RANKINGS */}
          {data.bids && data.bids.length > 0 && activeStage === 'Rankings' && (
            <div className="rounded-3xl bg-slate-850 border border-slate-800 overflow-hidden shadow-xl space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Comparative Bids Ranking</h3>
                <span className="text-xs text-slate-400 font-mono">{data.bids.length} Evaluated Bids</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="px-5 py-3.5">Rank</th>
                      <th className="px-5 py-3.5">Supplier</th>
                      <th className="px-5 py-3.5">Total Bid Price</th>
                      <th className="px-5 py-3.5">Technical (60%)</th>
                      <th className="px-5 py-3.5">Commercial (40%)</th>
                      <th className="px-5 py-3.5">Composite Score</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {data.bids.map((b: any) => {
                      const isFirst = b.final_rank === 1;
                      return (
                        <tr key={b.id} className={isFirst ? 'bg-blue-600/10' : 'hover:bg-slate-800/40'}>
                          <td className="px-5 py-4">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                isFirst
                                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                                  : b.final_rank === 2
                                  ? 'bg-slate-700 text-slate-200'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              #{b.final_rank || '—'}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-bold text-white text-sm">{b.supplier_name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{b.supplier_code} • {b.country || 'Global'}</p>
                          </td>

                          <td className="px-5 py-4 font-mono font-bold text-emerald-400 text-sm">
                            ${(b.total_bid_amount || 0).toLocaleString()}
                          </td>

                          <td className="px-5 py-4 font-mono font-semibold text-slate-200">
                            {b.technical_score || 0}%
                          </td>

                          <td className="px-5 py-4 font-mono font-semibold text-slate-200">
                            {b.commercial_score || 0}%
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-blue-400 text-sm">{b.total_weighted_score || 0}%</span>
                              {isFirst && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                  Recommended
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => {
                                setAwardSupplier(b);
                                setShowAwardModal(true);
                              }}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                                isFirst
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              }`}
                            >
                              Recommend Award →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: TECHNICAL SCORING MATRIX */}
          {data.bids && data.bids.length > 0 && activeStage === 'Technical' && (
            <div className="rounded-3xl bg-slate-850 border border-slate-800 p-6 space-y-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Technical Criteria Evaluation</h3>
                  <p className="text-xs text-slate-400">Click any cell to submit or update individual evaluator scores (0-100)</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Evaluation Criteria</th>
                      <th className="px-4 py-3">Weight</th>
                      {data.bids.map((b: any) => (
                        <th key={b.id} className="px-4 py-3 text-center">
                          {b.supplier_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {data.criteria && data.criteria.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-white">{c.name}</p>
                          <p className="text-[11px] text-slate-400">{c.description}</p>
                        </td>

                        <td className="px-4 py-3.5 font-mono font-bold text-blue-400">
                          {c.weight}%
                        </td>

                        {data.bids.map((b: any) => {
                          const existingScore = data.scores?.find(
                            (s: any) => s.bid_id === b.id && s.criteria_id === c.id
                          );
                          const scoreVal = existingScore ? existingScore.score : null;

                          return (
                            <td key={b.id} className="px-4 py-3.5 text-center">
                              <button
                                onClick={() => {
                                  setSelectedBid(b);
                                  setSelectedCriteria(c);
                                  setScoreInput(scoreVal !== null ? scoreVal : 85);
                                  setScoreComments(existingScore?.comments || '');
                                }}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                                  scoreVal !== null
                                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                }`}
                              >
                                {scoreVal !== null ? `${scoreVal} / 100` : '+ Score'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 3: COMMERCIAL COST MATRIX */}
          {data.bids && data.bids.length > 0 && activeStage === 'Commercial' && (
            <div className="rounded-3xl bg-slate-850 border border-slate-800 p-6 space-y-6 shadow-xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Commercial Comparison Matrix</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.bids.map((b: any) => (
                  <div key={b.id} className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-sm">{b.supplier_name}</h4>
                        <p className="text-xs text-slate-400 font-mono">{b.supplier_code}</p>
                      </div>
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                        {b.commercial_score || 0}% Score
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-700/80 space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Quotation:</span>
                        <span className="font-bold text-emerald-400">${(b.total_bid_amount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Delivery Lead Time:</span>
                        <span className="text-white">{b.delivery_lead_time_days || 14} Days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Warranty Period:</span>
                        <span className="text-white">{b.warranty_months || 12} Months</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Individual Scoring Modal */}
      {selectedBid && selectedCriteria && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedBid(null);
            setSelectedCriteria(null);
          }}
          title={`Score: ${selectedCriteria.name}`}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 text-xs space-y-1">
              <p className="text-slate-400">Vendor: <strong className="text-white">{selectedBid.supplier_name}</strong></p>
              <p className="text-slate-400">Criteria Weight: <strong className="text-blue-400">{selectedCriteria.weight}%</strong></p>
              <p className="text-slate-400">Description: {selectedCriteria.description}</p>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                <span>Score (0 - 100)</span>
                <span className="font-mono text-blue-400 font-bold">{scoreInput} / 100</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={scoreInput}
                onChange={(e) => setScoreInput(parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Evaluator Remarks / Justification</label>
              <textarea
                rows={3}
                value={scoreComments}
                onChange={(e) => setScoreComments(e.target.value)}
                placeholder="Add technical compliance justification..."
                className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSelectedBid(null);
                  setSelectedCriteria(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveScore}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30"
              >
                Save Score
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Award Recommendation Modal */}
      {showAwardModal && awardSupplier && (
        <Modal
          isOpen={true}
          onClose={() => setShowAwardModal(false)}
          title={`Recommend Award for ${awardSupplier.supplier_name}`}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Supplier:</span>
                <span className="font-bold text-white font-sans">{awardSupplier.supplier_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Award Amount:</span>
                <span className="font-bold text-emerald-400">${(awardSupplier.total_bid_amount || 0).toLocaleString()} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Composite Score:</span>
                <span className="font-bold text-blue-400">{awardSupplier.total_weighted_score}% (Rank #{awardSupplier.final_rank})</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Committee Award Justification *</label>
              <textarea
                rows={3}
                value={awardReason}
                onChange={(e) => setAwardReason(e.target.value)}
                className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAwardModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={awarding}
                onClick={handleCreateAwardRecommendation}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30"
              >
                {awarding ? 'Submitting to Approvals...' : 'Submit Award Recommendation'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
