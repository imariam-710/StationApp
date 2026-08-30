const express = require('express');
const router = express.Router();
const MonthData = require('../models/MonthData');

const FUEL_KEYS = ['super', 'regular', 'diesel', 'vpower'];

const DEFAULT_GRADES = [
  { key: 'super', name: 'Super', buy: 0, priceCash: 0, priceCard: 0, openingStock: 0, deliveries: 0, actualStock: 0 },
  { key: 'regular', name: 'Regular', buy: 0, priceCash: 0, priceCard: 0, openingStock: 0, deliveries: 0, actualStock: 0 },
  { key: 'diesel', name: 'Diesel', buy: 0, priceCash: 0, priceCard: 0, openingStock: 0, deliveries: 0, actualStock: 0 },
  { key: 'vpower', name: 'V-Power', buy: 0, priceCash: 0, priceCard: 0, openingStock: 0, deliveries: 0, actualStock: 0 },
];

// Matches the station's own "Monthly report" Excel sheet's expense list.
const DEFAULT_EXPENSES = [
  'Electrical Bill',
  'Telephone Bill',
  'Room Rent',
  'Omani Insurance',
  'Sewage Center Removal',
  'Salary',
  'Tax Return',
  'F/S Stationery',
  'Other',
].map((name) => ({ name, amount: 0 }));

// Matches the two Shell-related deduction lines on the Excel sheet: a
// litres x rate reduction, and a separately-entered flat commission amount.
const DEFAULT_DEDUCTIONS = [
  { name: 'Shell Card Reduction', liters: 0, rate: 0, amount: 0 },
  { name: 'Shell Deduct Commission', liters: 0, rate: 0, amount: 0 },
];

const DEFAULT_OIL_PRODUCTS = [
  'Hilux Ultra 4L', 'Hilux Ultra 1L',
  'Hilux HX7 4L', 'Hilux HX7 1L',
  'Hilux HX5 4L', 'Hilux HX5 1L',
  'Hilux HX3 4L', 'Hilux HX3 1L',
  'Rimula RX4 20L', 'Rimula RX4 4L',
  'Rimula R2 5L', 'Rimula R2 4L', 'Rimula R2 1L',
  'Spirax 90 4L', 'Spirax 140 4L',
  'ATF 4L', 'ATF 1L',
  'Engine Coolant 4L', 'Engine Coolant 1L',
  'Brake Oils 4L',
].map((name) => ({ name, buy: 0, sell: 0, qtyCash: 0, qtyCard: 0, openingStock: 0, deliveries: 0 }));

function emptyDay() {
  return { date: '', entries: [] };
}

function defaultDoc(month) {
  return {
    month,
    grades: DEFAULT_GRADES.map((g) => ({ ...g })),
    dailySales: [emptyDay()],
    oilProducts: DEFAULT_OIL_PRODUCTS.map((p) => ({ ...p })),
    deductions: DEFAULT_DEDUCTIONS,
    expenses: DEFAULT_EXPENSES,
    partners: 2,
    cashToBank: 0,
  };
}

// "2026-07" -> "2026-06", "2026-01" -> "2025-12"
function prevMonthStr(month) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1); // JS months are 0-indexed; m-1 is this month, -1 more for previous
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}`;
}

// Closing stock per fuel for a saved month = opening + deliveries - litres sold that month.
function computeClosingStock(doc) {
  const sold = { super: 0, regular: 0, diesel: 0, vpower: 0 };
  (doc.dailySales || []).forEach((day) => {
    (day.entries || []).forEach((e) => {
      if (sold[e.fuel] !== undefined) sold[e.fuel] += e.liters || 0;
    });
  });
  const closing = {};
  (doc.grades || []).forEach((g) => {
    closing[g.key] = (g.openingStock || 0) + (g.deliveries || 0) - (sold[g.key] || 0);
  });
  return closing;
}

// Closing stock per oil product for a saved month, keyed by product name
// (oil products are a free-form list, not fixed keys like fuel grades).
function computeOilClosingStock(doc) {
  const closing = {};
  (doc.oilProducts || []).forEach((p) => {
    const sold = (p.qtyCash || 0) + (p.qtyCard || 0);
    closing[p.name] = (p.openingStock || 0) + (p.deliveries || 0) - sold;
  });
  return closing;
}

// GET /api/months -> list of months that have saved data, oldest first
router.get('/', async (req, res) => {
  try {
    const docs = await MonthData.find({}, 'month').sort({ month: 1 });
    res.json(docs.map((d) => d.month));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/months/:month -> one month's data. If this month has never been
// saved, its opening stock is carried forward from last month's closing
// stock (if last month exists), otherwise it starts at 0.
router.get('/:month', async (req, res) => {
  try {
    const existing = await MonthData.findOne({ month: req.params.month });
    if (existing) return res.json(existing);

    const base = defaultDoc(req.params.month);
    const prevDoc = await MonthData.findOne({ month: prevMonthStr(req.params.month) });
    if (prevDoc) {
      const closing = computeClosingStock(prevDoc);
      base.grades = base.grades.map((g) => ({
        ...g,
        openingStock: closing[g.key] || 0,
      }));

      const oilClosing = computeOilClosingStock(prevDoc);
      base.oilProducts = base.oilProducts.map((p) => ({
        ...p,
        openingStock: oilClosing[p.name] || 0,
      }));
    }
    res.json(base);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/months/:month -> create or update (upsert) a month's data
router.put('/:month', async (req, res) => {
  try {
    const body = { ...req.body };
    delete body._id;
    delete body.month;
    delete body.createdAt;
    delete body.updatedAt;
    delete body.__v;

    const doc = await MonthData.findOneAndUpdate(
      { month: req.params.month },
      { $set: body, $setOnInsert: { month: req.params.month } },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;