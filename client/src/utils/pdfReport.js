import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PAYMENT_TYPES, revenueByGrade, fuelProfitByGrade, fuelProfitTotal, buyAmountByGrade,
  totalLiters, totalPayments, oilProfitTotal, oilCashTotal, oilCardTotal, oilQty,
  deductionsTotal, expensesTotal, stockLossByGrade, stockLossTotal,
  cardReductionByGrade, cardReductionTotal, pumpLitersByGrade,
  monthLabel, n, fmt,
} from './calc.js';

const NAVY = [15, 42, 68];

function sectionHeading(doc, text, x, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(text, x, y);
}

function drawHeader(doc, { stationName, currentMonth, title, margin }) {
  let y = 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.text(stationName || 'Station', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`${title} — ${monthLabel(currentMonth)}`, margin, y + 18);
  doc.setTextColor(0);

  y += 34;
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  return y + 24;
}

export function downloadMonthlySummaryPDF({ stationName, currentMonth, data }) {
  if (!data) return;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  const grades = data.grades || [];
  const dailyLiters = totalLiters(data.dailySales);
  const pumpLiters = pumpLitersByGrade(data.pumps || []);
  const revenue = revenueByGrade(data.dailySales, grades);
  const profitByGrade = fuelProfitByGrade(grades, data.dailySales);
  const payments = totalPayments(data.dailySales, grades);
  const paymentsTotal = PAYMENT_TYPES.reduce((sum, p) => sum + (payments[p.key] || 0), 0);

  const fuel = fuelProfitTotal(grades, data.dailySales);
  const oil = oilProfitTotal(data.oilProducts);
  const ded = deductionsTotal(data.deductions);
  const exp = expensesTotal(data.expenses);
  const totalProfitPlusOil = fuel + oil;
  const lossByGrade = stockLossByGrade(grades, data.dailySales);
  const evaporationLoss = stockLossTotal(grades, data.dailySales);
  const totalLosses = ded + exp;
  const net = totalProfitPlusOil - totalLosses;
  const partners = data.partners || 1;

  const revenueTotal = grades.reduce((s, g) => s + (revenue[g.key] || 0), 0);
  const profitTotal = grades.reduce((s, g) => s + (profitByGrade[g.key] || 0), 0);

  let y = drawHeader(doc, { stationName, currentMonth, title: 'Monthly Report', margin });

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - 50) {
      doc.addPage();
      y = 50;
    }
  };

  // --- Pump meters ---
  sectionHeading(doc, 'Pump Meters', margin, y);
  y += 8;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['', ...grades.map((g) => g.name)]],
    body: [
      ['Pump Meter Litres', ...grades.map((g) => fmt(pumpLiters[g.key], 0))],
      ['Daily Sales Litres', ...grades.map((g) => fmt(dailyLiters[g.key], 0))],
    ],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: NAVY },
    theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 24;

  // --- Payments received ---
  sectionHeading(doc, 'Payments Received', margin, y);
  y += 8;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [[...PAYMENT_TYPES.map((p) => p.label), 'Total']],
    body: [[...PAYMENT_TYPES.map((p) => fmt(payments[p.key])), fmt(paymentsTotal)]],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: NAVY },
    theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 24;

  // --- Cash reconciliation ---
  ensureSpace(60);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Cash collected', 'Cash deposited to bank', 'Difference']],
    body: [[fmt(payments.cash), fmt(n(data.cashToBank)), fmt(payments.cash - n(data.cashToBank))]],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: NAVY },
    theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 24;

  // --- Sales by grade ---
  ensureSpace(100);
  sectionHeading(doc, 'Sales by Grade', margin, y);
  y += 8;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['', ...grades.map((g) => g.name), 'Total']],
    body: [
      ['Total Sale', ...grades.map((g) => fmt(revenue[g.key])), fmt(revenueTotal)],
      ['Profit', ...grades.map((g) => fmt(profitByGrade[g.key])), fmt(profitTotal)],
    ],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: NAVY },
    theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 24;

  // --- Deductions ---
  if ((data.deductions || []).some((r) => r.name)) {
    ensureSpace(100);
    sectionHeading(doc, 'Deductions', margin, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Description', 'Litres', 'Rate', 'Amount']],
      body: data.deductions
        .filter((r) => r.name)
        .map((r) => {
          const calc = n(r.liters) && n(r.rate);
          const amt = calc ? n(r.liters) * n(r.rate) : n(r.amount);
          return [r.name, n(r.liters) ? fmt(r.liters, 0) : '—', n(r.rate) ? fmt(r.rate) : '—', fmt(amt)];
        }),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: NAVY },
      theme: 'grid',
    });
    y = doc.lastAutoTable.finalY + 24;
  }

  // --- Oil & lubricants ---
  if ((data.oilProducts || []).some((r) => r.name)) {
    ensureSpace(100);
    sectionHeading(doc, 'Oil & Lubricants', margin, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Grade', 'Buy Price', 'Sell Price', 'Cash Sold', 'Card Sold', 'Total Sold', 'Cash', 'Card', 'Profit']],
      body: data.oilProducts
        .filter((r) => r.name)
        .map((r) => {
          const totalQty = oilQty(r);
          return [
            r.name,
            fmt(r.buy),
            fmt(r.sell),
            fmt(r.qtyCash, 0),
            fmt(r.qtyCard, 0),
            fmt(totalQty, 0),
            fmt(n(r.qtyCash) * n(r.sell)),
            fmt(n(r.qtyCard) * n(r.sell)),
            fmt(totalQty * (n(r.sell) - n(r.buy))),
          ];
        }),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: NAVY },
      theme: 'grid',
    });
    y = doc.lastAutoTable.finalY + 24;
  }

  // --- Expenses ---
  if ((data.expenses || []).some((r) => r.name)) {
    ensureSpace(100);
    sectionHeading(doc, 'Expenses', margin, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Item', 'Amount']],
      body: data.expenses.filter((r) => r.name).map((r) => [r.name, fmt(r.amount)]),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: NAVY },
      theme: 'grid',
    });
    y = doc.lastAutoTable.finalY + 24;
  }

  // --- Evaporation & leakage loss ---
  ensureSpace(100);
  sectionHeading(doc, 'Evaporation & Leakage Loss', margin, y);
  y += 8;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['', ...grades.map((g) => g.name), 'Total Value']],
    body: [
      ['Book Stock (L)', ...grades.map((g) => fmt(lossByGrade[g.key]?.book, 0)), ''],
      ['Actual Stock (L)', ...grades.map((g) => fmt(lossByGrade[g.key]?.actual, 0)), ''],
      ['Loss (L)', ...grades.map((g) => fmt(lossByGrade[g.key]?.litres, 0)), fmt(evaporationLoss)],
    ],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: NAVY },
    theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 24;

  // --- Summary ---
  ensureSpace(160);
  sectionHeading(doc, 'Summary', margin, y);
  y += 12;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [
      ['Total fuel profit (after evaporation/leakage loss)', fmt(fuel) + ' OMR'],
      ['Oil & lubricant profit', fmt(oil) + ' OMR'],
      [
        { content: 'Total profit (fuel + oil)', styles: { fontStyle: 'bold' } },
        { content: fmt(totalProfitPlusOil) + ' OMR', styles: { fontStyle: 'bold' } },
      ],
      ['Deductions (commission & fees)', fmt(ded) + ' OMR'],
      ['Expenses', fmt(exp) + ' OMR'],
      [
        { content: 'Total losses (deductions + expenses)', styles: { fontStyle: 'bold' } },
        { content: fmt(totalLosses) + ' OMR', styles: { fontStyle: 'bold' } },
      ],
      [
        { content: 'Net profit', styles: { fontStyle: 'bold' } },
        { content: fmt(net) + ' OMR', styles: { fontStyle: 'bold' } },
      ],
      [
        { content: `Per one partner profit (${partners} partner(s))`, styles: { fontStyle: 'bold' } },
        { content: fmt(net / partners) + ' OMR', styles: { fontStyle: 'bold' } },
      ],
    ],
    styles: { fontSize: 10, cellPadding: 6 },
    theme: 'plain',
  });
  y = doc.lastAutoTable.finalY + 20;

  // --- Footer ---
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Generated ${new Date().toLocaleString()}`, margin, pageHeight - 24);

  const safeStation = (stationName || 'station').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const filenameMonth = currentMonth || 'summary';
  doc.save(`${safeStation}-summary-${filenameMonth}.pdf`);
}

// Admin-only report — same overall shape as the monthly summary, but with
// buying prices and buying amounts exposed per grade (cost/margin detail
// not shown on the regular Summary tab).
export function downloadAdminReportPDF({ stationName, currentMonth, data }) {
  if (!data) return;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  const grades = data.grades || [];
  const liters = totalLiters(data.dailySales);
  const pumpLiters = pumpLitersByGrade(data.pumps || []);
  const revenue = revenueByGrade(data.dailySales, grades);
  const buyAmount = buyAmountByGrade(grades, data.dailySales);
  const profitByGrade = fuelProfitByGrade(grades, data.dailySales);

  const fuel = fuelProfitTotal(grades, data.dailySales);
  const oil = oilProfitTotal(data.oilProducts);
  const oilCash = oilCashTotal(data.oilProducts);
  const oilCard = oilCardTotal(data.oilProducts);
  const ded = deductionsTotal(data.deductions);
  const exp = expensesTotal(data.expenses);
  const totalProfitPlusOil = fuel + oil;
  const lossByGrade = stockLossByGrade(grades, data.dailySales);
  const evaporationLoss = stockLossTotal(grades, data.dailySales);
  const cardReductionByGradeMap = cardReductionByGrade(grades, data.dailySales);
  const cardReduction = cardReductionTotal(grades, data.dailySales);
  const totalLosses = ded + exp + cardReduction;
  const net = totalProfitPlusOil - totalLosses;
  const partners = data.partners || 1;

  const buyAmountTotal = grades.reduce((s, g) => s + (buyAmount[g.key] || 0), 0);
  const revenueTotal = grades.reduce((s, g) => s + (revenue[g.key] || 0), 0);
  const profitTotal = grades.reduce((s, g) => s + (profitByGrade[g.key] || 0), 0);

  let y = drawHeader(doc, { stationName, currentMonth, title: 'Admin Report', margin });

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - 50) {
      doc.addPage();
      y = 50;
    }
  };

  // --- Pump meters ---
  sectionHeading(doc, 'Pump Meters', margin, y);
  y += 8;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['', ...grades.map((g) => g.name)]],
    body: [
      ['Pump Meter Litres', ...grades.map((g) => fmt(pumpLiters[g.key], 0))],
      ['Daily Sales Litres', ...grades.map((g) => fmt(liters[g.key], 0))],
      ['Difference', ...grades.map((g) => fmt((pumpLiters[g.key] || 0) - (liters[g.key] || 0), 0))],
    ],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: NAVY },
    theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 24;

  // --- Fuel cost & margin by grade ---
  sectionHeading(doc, 'Fuel Cost & Margin by Grade', margin, y);
  y += 8;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Grade', 'Litres Sold', 'Buy Price /L', 'Buying Amount', 'Selling Amount', 'Profit']],
    body: [
      ...grades.map((g) => [
        g.name,
        fmt(liters[g.key], 0),
        fmt(g.buy),
        fmt(buyAmount[g.key]),
        fmt(revenue[g.key]),
        fmt(profitByGrade[g.key]),
      ]),
      [
        { content: 'Total', colSpan: 3, styles: { fontStyle: 'bold' } },
        { content: fmt(buyAmountTotal), styles: { fontStyle: 'bold' } },
        { content: fmt(revenueTotal), styles: { fontStyle: 'bold' } },
        { content: fmt(profitTotal), styles: { fontStyle: 'bold' } },
      ],
    ],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: NAVY },
    theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 24;

  // --- Deductions ---
  if ((data.deductions || []).some((r) => r.name)) {
    ensureSpace(100);
    sectionHeading(doc, 'Deductions', margin, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Description', 'Litres', 'Rate', 'Amount']],
      body: data.deductions
        .filter((r) => r.name)
        .map((r) => {
          const calc = n(r.liters) && n(r.rate);
          const amt = calc ? n(r.liters) * n(r.rate) : n(r.amount);
          return [r.name, n(r.liters) ? fmt(r.liters, 0) : '—', n(r.rate) ? fmt(r.rate) : '—', fmt(amt)];
        }),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: NAVY },
      theme: 'grid',
    });
    y = doc.lastAutoTable.finalY + 24;
  }

  // --- Card reduction ---
  ensureSpace(100);
  sectionHeading(doc, 'Card Reduction', margin, y);
  y += 8;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Grade', 'Litres', 'Rate', 'Amount']],
    body: [
      ...grades.map((g) => {
        const c = cardReductionByGradeMap[g.key] || { litres: 0, rate: 0, amount: 0 };
        return [g.name, fmt(c.litres, 0), fmt(c.rate), fmt(c.amount)];
      }),
      [
        { content: 'Total', colSpan: 3, styles: { fontStyle: 'bold' } },
        { content: fmt(cardReduction), styles: { fontStyle: 'bold' } },
      ],
    ],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: NAVY },
    theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 24;

  // --- Oil & lubricants ---
  ensureSpace(80);
  sectionHeading(doc, 'Oil & Lubricants', margin, y);
  y += 8;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Cash', 'Card', 'Profit']],
    body: [[fmt(oilCash), fmt(oilCard), fmt(oil)]],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: NAVY },
    theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 24;

  // --- Evaporation & leakage loss ---
  ensureSpace(100);
  sectionHeading(doc, 'Evaporation & Leakage Loss', margin, y);
  y += 8;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Grade', 'Book Stock (L)', 'Actual Stock (L)', 'Loss (L)', 'Rate (buy price)', 'Value']],
    body: [
      ...grades.map((g) => {
        const l = lossByGrade[g.key] || { book: 0, actual: 0, litres: 0, value: 0 };
        return [g.name, fmt(l.book, 0), fmt(l.actual, 0), fmt(l.litres, 0), fmt(g.buy), fmt(l.value)];
      }),
      [
        { content: 'Total loss value', colSpan: 5, styles: { fontStyle: 'bold' } },
        { content: fmt(evaporationLoss), styles: { fontStyle: 'bold' } },
      ],
    ],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: NAVY },
    theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 24;

  // --- Expenses ---
  if ((data.expenses || []).some((r) => r.name)) {
    ensureSpace(100);
    sectionHeading(doc, 'Expenses', margin, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Item', 'Amount']],
      body: data.expenses.filter((r) => r.name).map((r) => [r.name, fmt(r.amount)]),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: NAVY },
      theme: 'grid',
    });
    y = doc.lastAutoTable.finalY + 24;
  }

  // --- Summary ---
  ensureSpace(160);
  sectionHeading(doc, 'Summary', margin, y);
  y += 12;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [
      ['Total fuel profit (after evaporation/leakage loss)', fmt(fuel) + ' OMR'],
      ['Oil & lubricant profit', fmt(oil) + ' OMR'],
      [
        { content: 'Total profit (fuel + oil)', styles: { fontStyle: 'bold' } },
        { content: fmt(totalProfitPlusOil) + ' OMR', styles: { fontStyle: 'bold' } },
      ],
      ['Deductions', fmt(ded) + ' OMR'],
      ['Card reduction', fmt(cardReduction) + ' OMR'],
      ['Expenses', fmt(exp) + ' OMR'],
      [
        { content: 'Total losses', styles: { fontStyle: 'bold' } },
        { content: fmt(totalLosses) + ' OMR', styles: { fontStyle: 'bold' } },
      ],
      [
        { content: 'Net profit', styles: { fontStyle: 'bold' } },
        { content: fmt(net) + ' OMR', styles: { fontStyle: 'bold' } },
      ],
      [
        { content: `Per one partner profit (${partners} partner(s))`, styles: { fontStyle: 'bold' } },
        { content: fmt(net / partners) + ' OMR', styles: { fontStyle: 'bold' } },
      ],
    ],
    styles: { fontSize: 10, cellPadding: 6 },
    theme: 'plain',
  });
  y = doc.lastAutoTable.finalY + 20;

  // --- Footer ---
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Generated ${new Date().toLocaleString()} — Admin only`, margin, pageHeight - 24);

  const safeStation = (stationName || 'station').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const filenameMonth = currentMonth || 'summary';
  doc.save(`${safeStation}-admin-report-${filenameMonth}.pdf`);
}
