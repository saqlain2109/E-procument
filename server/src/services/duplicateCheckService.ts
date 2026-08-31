import { db } from '../config/database';

export interface DuplicateCheckParams {
  registrationNumber?: string;
  taxNumber?: string;
  vatNumber?: string;
  legalName?: string;
  email?: string;
  accountNumber?: string;
  excludeSupplierId?: string;
}

export interface DuplicateMatch {
  field: string;
  value: string;
  matchedSupplierId: string;
  matchedSupplierName: string;
  matchedSupplierCode: string;
}

export function checkSupplierDuplicates(params: DuplicateCheckParams): { isDuplicate: boolean; matches: DuplicateMatch[] } {
  const matches: DuplicateMatch[] = [];

  // 1. Check Registration Number
  if (params.registrationNumber) {
    let q = `SELECT id, legal_name, supplier_code, registration_number FROM suppliers WHERE LOWER(registration_number) = LOWER(?)`;
    const p: any[] = [params.registrationNumber.trim()];
    if (params.excludeSupplierId) {
      q += ` AND id != ?`;
      p.push(params.excludeSupplierId);
    }
    const res = db.prepare(q).get(...p) as any;
    if (res) {
      matches.push({
        field: 'Registration Number',
        value: params.registrationNumber,
        matchedSupplierId: res.id,
        matchedSupplierName: res.legal_name,
        matchedSupplierCode: res.supplier_code
      });
    }
  }

  // 2. Check Tax Number
  if (params.taxNumber) {
    let q = `SELECT id, legal_name, supplier_code, tax_number FROM suppliers WHERE LOWER(tax_number) = LOWER(?)`;
    const p: any[] = [params.taxNumber.trim()];
    if (params.excludeSupplierId) {
      q += ` AND id != ?`;
      p.push(params.excludeSupplierId);
    }
    const res = db.prepare(q).get(...p) as any;
    if (res) {
      matches.push({
        field: 'Tax ID / VAT',
        value: params.taxNumber,
        matchedSupplierId: res.id,
        matchedSupplierName: res.legal_name,
        matchedSupplierCode: res.supplier_code
      });
    }
  }

  // 3. Check Company Legal Name
  if (params.legalName) {
    let q = `SELECT id, legal_name, supplier_code FROM suppliers WHERE LOWER(legal_name) = LOWER(?)`;
    const p: any[] = [params.legalName.trim()];
    if (params.excludeSupplierId) {
      q += ` AND id != ?`;
      p.push(params.excludeSupplierId);
    }
    const res = db.prepare(q).get(...p) as any;
    if (res) {
      matches.push({
        field: 'Legal Company Name',
        value: params.legalName,
        matchedSupplierId: res.id,
        matchedSupplierName: res.legal_name,
        matchedSupplierCode: res.supplier_code
      });
    }
  }

  // 4. Check Email in contacts
  if (params.email) {
    let q = `
      SELECT s.id, s.legal_name, s.supplier_code, sc.email
      FROM supplier_contacts sc
      JOIN suppliers s ON s.id = sc.supplier_id
      WHERE LOWER(sc.email) = LOWER(?)
    `;
    const p: any[] = [params.email.trim()];
    if (params.excludeSupplierId) {
      q += ` AND s.id != ?`;
      p.push(params.excludeSupplierId);
    }
    const res = db.prepare(q).get(...p) as any;
    if (res) {
      matches.push({
        field: 'Contact Email',
        value: params.email,
        matchedSupplierId: res.id,
        matchedSupplierName: res.legal_name,
        matchedSupplierCode: res.supplier_code
      });
    }
  }

  // 5. Check Bank Account Number
  if (params.accountNumber) {
    let q = `
      SELECT s.id, s.legal_name, s.supplier_code, ba.account_number
      FROM supplier_bank_accounts ba
      JOIN suppliers s ON s.id = ba.supplier_id
      WHERE ba.account_number = ?
    `;
    const p: any[] = [params.accountNumber.trim()];
    if (params.excludeSupplierId) {
      q += ` AND s.id != ?`;
      p.push(params.excludeSupplierId);
    }
    const res = db.prepare(q).get(...p) as any;
    if (res) {
      matches.push({
        field: 'Bank Account Number',
        value: params.accountNumber,
        matchedSupplierId: res.id,
        matchedSupplierName: res.legal_name,
        matchedSupplierCode: res.supplier_code
      });
    }
  }

  return {
    isDuplicate: matches.length > 0,
    matches
  };
}
