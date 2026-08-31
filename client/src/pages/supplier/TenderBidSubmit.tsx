import React, { useState, useEffect } from 'react';
import {
  FolderLock,
  ArrowLeft,
  Calendar,
  DollarSign,
  CheckCircle2,
  Lock,
  Send,
  HelpCircle,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../api/client';
import { StatusBadge } from '../../components/common/StatusBadge';

interface Props {
  tenderId: string;
  onBack: () => void;
  onSuccess: () => void;
}

export const TenderBidSubmit: React.FC<Props> = ({ tenderId, onBack, onSuccess }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // Form State
  const [itemsPricing, setItemsPricing] = useState<any[]>([]);
  const [technicalResponses, setTechnicalResponses] = useState<any[]>([]);
  const [deliveryTimelineDays, setDeliveryTimelineDays] = useState<number>(30);
  const [warrantyPeriodMonths, setWarrantyPeriodMonths] = useState<number>(12);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  // Ask question state
  const [questionText, setQuestionText] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  useEffect(() => {
    loadTender();
  }, [tenderId]);

  const loadTender = async () => {
    try {
      const res = await api.getTenderDetail(tenderId);
      setData(res);

      // Initialize line items pricing
      const mappedItems = res.items.map((it: any) => ({
        eventItemId: it.id,
        description: it.description,
        offeredQuantity: it.quantity,
        unitPrice: it.estimated_price || 1000,
        brandModel: 'Enterprise Standard Spec',
        leadTimeDays: 20
      }));
      setItemsPricing(mappedItems);

      // Initialize technical responses
      const mappedTech = res.technicalRequirements.map((tr: any) => ({
        requirementId: tr.id,
        title: tr.requirement_title,
        type: tr.requirement_type,
        responseValue: 'Yes, fully compliant with technical specification.'
      }));
      setTechnicalResponses(mappedTech);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostQuestion = async () => {
    if (!questionText.trim()) return;
    setSubmittingQuestion(true);
    try {
      await api.postClarification(tenderId, { question: questionText, isPublic: true });
      setQuestionText('');
      alert('Your question has been posted to the procurement officer.');
      loadTender();
    } catch (err: any) {
      alert(err.message || 'Failed to post question');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const totalBidAmount = itemsPricing.reduce((sum, it) => sum + (it.offeredQuantity || 0) * (it.unitPrice || 0), 0);

  const handleSubmitBid = async (isDraft = false) => {
    if (!isDraft && !declarationAccepted) {
      alert('Please accept the bid submission declaration.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitBid({
        eventId: tenderId,
        items: itemsPricing,
        technicalResponses,
        deliveryTimelineDays,
        warrantyPeriodMonths,
        isDraft
      });

      setSuccessResult(res);
    } catch (err: any) {
      alert(err.message || 'Failed to submit bid');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !data) {
    return <div className="p-12 text-center text-slate-400">Loading tender specifications...</div>;
  }

  const { event, items, technicalRequirements, clarifications } = data;

  if (successResult) {
    return (
      <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl max-w-2xl mx-auto space-y-6 animate-in zoom-in-95">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">Sealed Bid Submitted & Locked!</h2>
          <p className="text-sm text-slate-300">
            Your bid has been encrypted and securely locked. Commercial details remain blind until the official Bid Opening ceremony.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-700 font-mono text-xs text-left space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Acknowledgement Code:</span>
            <span className="font-bold text-emerald-400">{successResult.acknowledgementCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Total Bid Value:</span>
            <span className="font-bold text-white">${totalBidAmount.toLocaleString()} USD</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Opening Date:</span>
            <span className="text-slate-300">{new Date(event.bid_submission_deadline).toLocaleString()}</span>
          </div>
        </div>

        <button
          onClick={onSuccess}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all"
        >
          View My Bids
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Opportunities
        </button>
        <span className="text-xs text-amber-400 font-mono font-bold flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" /> Deadline: {new Date(event.bid_submission_deadline).toLocaleString()}
        </span>
      </div>

      {/* Tender Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-blue-400">{event.event_number}</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">{event.event_type}</span>
          <StatusBadge status={event.status} size="sm" />
        </div>
        <h2 className="text-2xl font-black text-white">{event.title}</h2>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">{event.description}</p>
      </div>

      {/* Section 1: Commercial Bill of Quantities */}
      <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">1. Commercial Pricing Proposal</h3>
            <p className="text-xs text-slate-400">Enter unit price and brand/model for each line item</p>
          </div>
          <span className="font-mono text-base font-black text-emerald-400">
            Total Quotation: ${totalBidAmount.toLocaleString()} USD
          </span>
        </div>

        <div className="space-y-3">
          {itemsPricing.map((it, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 grid grid-cols-12 gap-3 items-center text-xs">
              <div className="col-span-5">
                <p className="font-bold text-white text-sm">{it.description}</p>
                <input
                  type="text"
                  placeholder="Offered Brand / Make"
                  value={it.brandModel}
                  onChange={(e) => {
                    const upd = [...itemsPricing];
                    upd[idx].brandModel = e.target.value;
                    setItemsPricing(upd);
                  }}
                  className="mt-1 w-full px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 text-[11px]"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] text-slate-400">Quantity</label>
                <input
                  type="number"
                  disabled
                  value={it.offeredQuantity}
                  className="mt-1 w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded font-mono text-slate-400"
                />
              </div>
              <div className="col-span-3">
                <label className="text-[11px] text-slate-400">Unit Price ($ USD) *</label>
                <input
                  type="number"
                  value={it.unitPrice}
                  onChange={(e) => {
                    const upd = [...itemsPricing];
                    upd[idx].unitPrice = parseFloat(e.target.value) || 0;
                    setItemsPricing(upd);
                  }}
                  className="mt-1 w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-emerald-400 font-mono font-bold"
                />
              </div>
              <div className="col-span-2 text-right">
                <label className="text-[11px] text-slate-400">Line Total</label>
                <p className="mt-1 font-mono font-bold text-emerald-400 text-sm">
                  ${((it.offeredQuantity || 0) * (it.unitPrice || 0)).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Technical Response Questionnaire */}
      <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">2. Technical Compliance Questionnaire</h3>
        <div className="space-y-3">
          {technicalResponses.map((tr, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="font-bold text-white">{tr.title}</span>
                <span className="text-[10px] text-blue-400 font-mono">{tr.type}</span>
              </div>
              <input
                type="text"
                value={tr.responseValue}
                onChange={(e) => {
                  const upd = [...technicalResponses];
                  upd[idx].responseValue = e.target.value;
                  setTechnicalResponses(upd);
                }}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Commercial Terms & Declaration */}
      <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">3. Commercial Terms & Submission Declaration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400">Delivery Lead Time (Days)</label>
            <input
              type="number"
              value={deliveryTimelineDays}
              onChange={(e) => setDeliveryTimelineDays(parseInt(e.target.value, 10) || 30)}
              className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400">Warranty Period (Months)</label>
            <input
              type="number"
              value={warrantyPeriodMonths}
              onChange={(e) => setWarrantyPeriodMonths(parseInt(e.target.value, 10) || 12)}
              className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono"
            />
          </div>
        </div>

        {/* Validation Checklist */}
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={declarationAccepted}
              onChange={(e) => setDeclarationAccepted(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-300 leading-relaxed font-medium">
              I certify that this quotation is final and binding, all technical qualifications are accurate, and commercial pricing will remain firm for 90 days.
            </span>
          </label>
        </div>
      </div>

      {/* Section 4: Clarifications Q&A */}
      <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">4. Ask a Question to Procurement Officer</h3>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Type your clarification question regarding specifications, delivery terms..."
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
          />
          <button
            disabled={submittingQuestion}
            onClick={handlePostQuestion}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white"
          >
            Post Question
          </button>
        </div>
      </div>

      {/* Footer Submit Bar */}
      <div className="p-6 bg-slate-850 rounded-3xl border border-slate-800 flex items-center justify-between shadow-2xl">
        <button
          type="button"
          onClick={() => handleSubmitBid(true)}
          className="px-5 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
        >
          Save Draft
        </button>

        <div className="flex items-center gap-4">
          <span className="font-mono text-sm font-bold text-emerald-400">
            Total: ${totalBidAmount.toLocaleString()} USD
          </span>
          <button
            type="button"
            disabled={submitting || !declarationAccepted}
            onClick={() => handleSubmitBid(false)}
            className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition-all"
          >
            <Lock className="w-4 h-4" />
            <span>{submitting ? 'Encrypting & Sealing Bid...' : 'Submit Sealed Bid'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
