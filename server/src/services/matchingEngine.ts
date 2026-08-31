import { db } from '../config/database';
import { logAudit } from './auditService';
import { sendNotification } from './notificationService';

export interface MatchingResult {
  isMatched: boolean;
  status: 'Matched' | 'Exception';
  discrepancies: {
    itemNumber: number;
    description: string;
    poQty: number;
    grnQty: number;
    invQty: number;
    poUnitPrice: number;
    invUnitPrice: number;
    priceVariance: number;
    quantityVariance: number;
    reason: string;
  }[];
  totalVarianceAmount: number;
}

export function perform3WayMatch(invoiceId: string): MatchingResult {
  const invoice = db.prepare(`
    SELECT i.*, p.total_amount as po_total, p.id as po_pk
    FROM invoices i
    JOIN purchase_orders p ON p.id = i.po_id
    WHERE i.id = ?
  `).get(invoiceId) as any;

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const invoiceItems = db.prepare(`
    SELECT ii.*, poi.quantity as po_quantity, poi.unit_price as po_unit_price, poi.item_number, poi.description as po_description
    FROM invoice_items ii
    JOIN purchase_order_items poi ON poi.id = ii.po_item_id
    WHERE ii.invoice_id = ?
  `).all(invoiceId) as any[];

  // Get total accepted quantities from all GRNs for this PO
  const grnItems = db.prepare(`
    SELECT gri.po_item_id, SUM(gri.accepted_quantity) as total_received_qty
    FROM goods_receipt_items gri
    JOIN goods_receipts gr ON gr.id = gri.grn_id
    WHERE gr.po_id = ?
    GROUP BY gri.po_item_id
  `).all(invoice.po_id) as any[];

  const grnMap = new Map<string, number>();
  for (const g of grnItems) {
    grnMap.set(g.po_item_id, g.total_received_qty || 0);
  }

  const discrepancies: MatchingResult['discrepancies'] = [];
  let totalVarianceAmount = 0;

  for (const item of invoiceItems) {
    const receivedQty = grnMap.get(item.po_item_id) || 0;
    const qtyDiff = item.quantity - receivedQty;
    const priceDiff = item.unit_price - item.po_unit_price;

    let hasIssue = false;
    let reasons: string[] = [];

    // 1. Quantity Check (Invoiced quantity cannot exceed received goods in GRN)
    if (qtyDiff > 0.001) {
      hasIssue = true;
      reasons.push(`Invoiced qty (${item.quantity}) exceeds GRN received qty (${receivedQty})`);
    }

    // 2. Price Check (Invoiced unit price cannot exceed PO agreed unit price)
    if (priceDiff > 0.001) {
      hasIssue = true;
      reasons.push(`Invoiced price ($${item.unit_price}) exceeds PO contracted price ($${item.po_unit_price})`);
    }

    // Update item variance in DB
    db.prepare(`
      UPDATE invoice_items 
      SET variance_qty = ?, variance_price = ? 
      WHERE id = ?
    `).run(qtyDiff, priceDiff, item.id);

    if (hasIssue) {
      const lineVariance = Math.abs(qtyDiff * item.unit_price) + Math.abs(item.quantity * priceDiff);
      totalVarianceAmount += lineVariance;

      discrepancies.push({
        itemNumber: item.item_number,
        description: item.description || item.po_description,
        poQty: item.po_quantity,
        grnQty: receivedQty,
        invQty: item.quantity,
        poUnitPrice: item.po_unit_price,
        invUnitPrice: item.unit_price,
        priceVariance: priceDiff,
        quantityVariance: qtyDiff,
        reason: reasons.join('; ')
      });
    }
  }

  const isMatched = discrepancies.length === 0;
  const matchStatus: 'Matched' | 'Exception' = isMatched ? 'Matched' : 'Exception';

  db.prepare(`
    UPDATE invoices 
    SET matching_status = ?, status = ?, discrepancy_details = ? 
    WHERE id = ?
  `).run(
    matchStatus,
    matchStatus === 'Matched' ? 'Matched' : 'Exception',
    isMatched ? null : JSON.stringify(discrepancies),
    invoiceId
  );

  logAudit({
    action: '3_WAY_MATCH_RUN',
    module: 'INVOICE',
    recordId: invoiceId,
    comments: `3-Way Match Result: ${matchStatus}. Found ${discrepancies.length} discrepancy items.`
  });

  return {
    isMatched,
    status: matchStatus,
    discrepancies,
    totalVarianceAmount
  };
}
