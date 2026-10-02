import type { ShopBrand } from '../types';
import type { SequenceProduct } from '../api/sequenceAdminApi';

/**
 * Excel export / import for the "Arrange products" list.
 *
 * Columns: Position | Product ID | SKU | Name
 *  - Export writes the list in its current on-screen order.
 *  - Import matches rows by Product ID (falling back to SKU), orders the
 *    matched products by Position (falling back to row order), and puts any
 *    product that is not in the file after them, in its current order.
 *    Nothing is saved until the user presses "Save order".
 *
 * exceljs is loaded on demand so it never weighs on the shop bundle.
 */

const HEADERS = ['Position', 'Product ID', 'SKU', 'Name'] as const;

const BRAND_LABEL: Record<ShopBrand, string> = { mrbur: 'MR.BUR', kaneiko: 'Kaneiko' };

export async function exportSequenceToExcel(brand: ShopBrand, items: SequenceProduct[]): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(BRAND_LABEL[brand]);

  ws.columns = [
    { header: HEADERS[0], key: 'position', width: 10 },
    { header: HEADERS[1], key: 'id', width: 12 },
    { header: HEADERS[2], key: 'sku', width: 24 },
    { header: HEADERS[3], key: 'name', width: 70 },
  ];
  items.forEach((p, i) => ws.addRow({ position: i + 1, id: p.id, sku: p.sku || '', name: p.name }));

  const header = ws.getRow(1);
  header.font = { bold: true };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F6F4' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  // SKUs like "5000339" must stay text so Excel does not reformat them.
  ws.getColumn('sku').numFmt = '@';

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const date = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `snabbb-shop-product-order-${brand}-${date}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface SequenceImportResult {
  /** New full order (ids), ready to apply to the list. */
  orderedIds: number[];
  matched: number;
  /** File rows that matched no product in this brand's list. */
  unknownRows: number;
  /** Products in the list that were not in the file (kept after the matched ones). */
  missingFromFile: number;
  /** Rows that matched an already-matched product (first one wins). */
  duplicateRows: number;
}

function cellText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') {
    const o = v as { text?: unknown; result?: unknown; richText?: { text: string }[] };
    if (o.richText) return o.richText.map((r) => r.text).join('').trim();
    if (o.text != null) return String(o.text).trim();
    if (o.result != null) return String(o.result).trim();
  }
  return String(v).trim();
}

export async function importSequenceFromExcel(
  file: File,
  items: SequenceProduct[]
): Promise<SequenceImportResult> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('The file has no sheets.');

  // Locate columns by header name so reordered/extra columns still work.
  const colByName: Record<string, number> = {};
  ws.getRow(1).eachCell((cell, col) => {
    colByName[cellText(cell.value).toLowerCase()] = col;
  });
  const idCol = colByName['product id'];
  const skuCol = colByName['sku'];
  const posCol = colByName['position'];
  if (!idCol && !skuCol) {
    throw new Error('Could not find a "Product ID" or "SKU" column. Use a file exported from this page.');
  }

  const byId = new Map(items.map((p) => [String(p.id), p]));
  const bySku = new Map<string, SequenceProduct>();
  items.forEach((p) => {
    const k = (p.sku || '').trim().toLowerCase();
    if (k && !bySku.has(k)) bySku.set(k, p);
  });

  const seen = new Set<number>();
  const rows: { product: SequenceProduct; position: number; rowIndex: number }[] = [];
  let unknownRows = 0;
  let duplicateRows = 0;

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const idText = idCol ? cellText(row.getCell(idCol).value) : '';
    const skuText = skuCol ? cellText(row.getCell(skuCol).value).toLowerCase() : '';
    if (!idText && !skuText) return; // blank row

    const product = (idText && byId.get(idText)) || (skuText && bySku.get(skuText)) || undefined;
    if (!product) {
      unknownRows += 1;
      return;
    }
    if (seen.has(product.id)) {
      duplicateRows += 1;
      return;
    }
    seen.add(product.id);

    const posNum = posCol ? Number(cellText(row.getCell(posCol).value)) : NaN;
    rows.push({ product, position: Number.isFinite(posNum) ? posNum : Infinity, rowIndex: rowNumber });
  });

  if (rows.length === 0) {
    throw new Error('No rows in the file matched products in this brand\'s list.');
  }

  // Position first; ties / missing positions fall back to file row order.
  rows.sort((a, b) => a.position - b.position || a.rowIndex - b.rowIndex);
  const matchedIds = rows.map((r) => r.product.id);
  const rest = items.filter((p) => !seen.has(p.id)).map((p) => p.id);

  return {
    orderedIds: [...matchedIds, ...rest],
    matched: matchedIds.length,
    unknownRows,
    missingFromFile: rest.length,
    duplicateRows,
  };
}
