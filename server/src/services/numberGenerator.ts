import { db } from '../config/database';

export function getNextNumber(module: string): string {
  const year = new Date().getFullYear().toString();

  const getStmt = db.prepare(`SELECT * FROM numbering_configs WHERE module = ?`);
  let config = getStmt.get(module) as any;

  if (!config) {
    const defaults: Record<string, { prefix: string; padding: number }> = {
      SUPPLIER: { prefix: 'SUP', padding: 6 },
      TENDER: { prefix: 'TND', padding: 6 },
      RFQ: { prefix: 'RFQ', padding: 6 },
      RFP: { prefix: 'RFP', padding: 6 },
      BID: { prefix: 'BID', padding: 6 },
      CON: { prefix: 'CON', padding: 6 },
      PO: { prefix: 'PO', padding: 6 },
      INV: { prefix: 'INV', padding: 6 },
      GRN: { prefix: 'GRN', padding: 6 },
      PR: { prefix: 'PR', padding: 6 },
      AWD: { prefix: 'AWD', padding: 6 },
      PAY: { prefix: 'PAY', padding: 6 }
    };

    const def = defaults[module] || { prefix: module.substring(0, 3).toUpperCase(), padding: 6 };
    const id = `NUM-${module}`;
    db.prepare(`
      INSERT INTO numbering_configs (id, module, prefix, current_number, padding, format_pattern)
      VALUES (?, ?, ?, 0, ?, '{PREFIX}-{YEAR}-{NUM}')
    `).run(id, module, def.prefix, def.padding);

    config = getStmt.get(module) as any;
  }

  const nextNum = (config.current_number || 0) + 1;
  db.prepare(`UPDATE numbering_configs SET current_number = ? WHERE module = ?`).run(nextNum, module);

  const padded = nextNum.toString().padStart(config.padding || 6, '0');
  return `${config.prefix}-${year}-${padded}`;
}
