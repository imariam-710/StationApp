const express = require('express');
const router = express.Router();
const MonthData = require('../models/MonthData');

const FUEL_KEYS = ['super', 'regular', 'diesel', 'vpower'];

const DEFAULT_GRADES = [
  { key: 'super', name: 'Super', buy: 0, priceCash: 0, priceCard: 0, cardReductionRate: 0, openingStock: 0, deliveries: [], actualStock: 0 },
  { key: 'regular', name: 'Regular', buy: 0, priceCash: 0, priceCard: 0, cardReductionRate: 0, openingStock: 0, deliveries: [], actualStock: 0 },
  { key: 'diesel', name: 'Diesel', buy: 0, priceCash: 0, priceCard: 0, cardReductionRate: 0, openingStock: 0, deliveries: [], actualStock: 0 },
  { key: 'vpower', name: 'V-Power', buy: 0, priceCash: 0, priceCard: 0, cardReductionRate: 0, openingStock: 0, deliveries: [], actualStock: 0 },
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

function emptyMeter() {
  return { opening: 0, closing: 0 };
}

// Matches the 8-pump layout on the station's own pump-meter sheet. Add or
// remove pumps freely afterward — this is just the starting point.
function defaultPumps() {
  return Array.from({ length: 8 }, (_, i) => ({
    pumpNo: i + 1,
    super: emptyMeter(),
    regular: emptyMeter(),
    diesel: emptyMeter(),
    vpower: emptyMeter(),
  }));
}

function emptyShellCardLiters() {
  return { super: 0, regular: 0, diesel: 0, vpower: 0 };
}

function emptyDay() {
  return {
    date: '',
    entries: [],
    pumps: [],
    shellCardLiters: emptyShellCardLiters(),
    subsidyAmount: 0,
    siteCredit: 0,
    other: 0,
    telephoneCard: 0,
    visaCard: 0,
    cashToBank: 0,
  };
}

// One row per pump in that day's pump-reading cross-check table, matching
// whichever pump numbers the month currently has.
function defaultDayPumps(pumps) {
  return (pumps || []).map((p) => ({ pumpNo: p.pumpNo, super: 0, regular: 0, diesel: 0, vpower: 0 }));
}

// One Daily Sales "page" per calendar day of the month — mirrors the
// station's own Excel ledger, which has one sheet tab per day (DAY 1, DAY 2, …).
function buildMonthDays(month, pumps) {
  const [y, mo] = month.split('-').map(Number);
  const dim = new Date(y, mo, 0).getDate();
  const days = [];
  for (let d = 1; d <= dim; d++) {
    days.push({
      date: `${month}-${String(d).padStart(2, '0')}`,
      entries: [],
      pumps: defaultDayPumps(pumps),
      shellCardLiters: emptyShellCardLiters(),
      subsidyAmount: 0,
      siteCredit: 0,
      other: 0,
      telephoneCard: 0,
      visaCard: 0,
      cashToBank: 0,
    });
  }
  return days;
}

function defaultDoc(month) {
  const pumps = defaultPumps();
  return {
    month,
    grades: DEFAULT_GRADES.map((g) => ({ ...g, deliveries: [] })),
    dailySales: buildMonthDays(month, pumps),
    oilProducts: DEFAULT_OIL_PRODUCTS.map((p) => ({ ...p })),
    deductions: DEFAULT_DEDUCTIONS,
    expenses: DEFAULT_EXPENSES,
    partners: 2,
    cashToBank: 0,
    pumps,
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

// Months saved before "deliveries" became a list stored it as a single
// number. Mongoose would throw a cast error trying to load those documents
// against the new array schema, so documents are read with .lean() (raw,
// un-cast) and passed through here first. A legacy number is kept, not
// dropped — it becomes one delivery dated the 1st of that month so the
// total already entered isn't lost.
function normalizeGradeDeliveries(doc) {
  if (!doc || !Array.isArray(doc.grades)) return doc;
  doc.grades.forEach((g) => {
    if (!Array.isArray(g.deliveries)) {
      const legacyAmount = typeof g.deliveries === 'number' ? g.deliveries : 0;
      g.deliveries = legacyAmount ? [{ date: `${doc.month}-01`, amount: legacyAmount }] : [];
    }
  });
  return doc;
}

// Litres sold per fuel for a saved month, derived from the day-sheet pump
// meter readings (replaces the old per-sale "entries" source). Meters only
// ever go up, so the total sold so far this month is simply the HIGHEST
// day-total reached minus the month's opening reading — this stays correct
// even midway through a month, when the remaining days are still blank
// (reading 0), unlike summing day-to-day differences, which would wrongly
// subtract once the readings drop back to 0 on a not-yet-filled-in day.
function monthSoldByFuel(doc) {
  const opening = { super: 0, regular: 0, diesel: 0, vpower: 0 };
  (doc.pumps || []).forEach((p) => {
    FUEL_KEYS.forEach((k) => { opening[k] += (p[k] && p[k].opening) || 0; });
  });
  const highest = { ...opening };
  (doc.dailySales || []).forEach((day) => {
    (day.pumps || []).forEach((p) => {
      FUEL_KEYS.forEach((k) => {
        const v = p[k] || 0;
        if (v > highest[k]) highest[k] = v;
      });
    });
  });
  const sold = {};
  FUEL_KEYS.forEach((k) => { sold[k] = highest[k] - opening[k]; });
  return sold;
}

// Closing stock per fuel for a saved month = opening + every delivery that
// month (a grade can receive stock more than once) - litres sold that month.
function computeClosingStock(doc) {
  const sold = monthSoldByFuel(doc);
  const closing = {};
  (doc.grades || []).forEach((g) => {
    const deliveredTotal = (g.deliveries || []).reduce((sum, d) => sum + (d.amount || 0), 0);
    closing[g.key] = (g.openingStock || 0) + deliveredTotal - (sold[g.key] || 0);
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

// Closing meter readings per pump for a saved month, keyed by pump number —
// becomes next month's opening readings automatically (meters are
// cumulative and never reset).
function computePumpClosingReadings(doc) {
  const closing = {};
  (doc.pumps || []).forEach((p) => {
    closing[p.pumpNo] = {
      super: p.super?.closing || 0,
      regular: p.regular?.closing || 0,
      diesel: p.diesel?.closing || 0,
      vpower: p.vpower?.closing || 0,
    };
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
    // .lean() returns the raw stored document instead of a cast/validated
    // Mongoose document — needed so a month saved under the old
    // (pre-array) "deliveries" format can still be read instead of
    // crashing with a cast error.
    const existing = await MonthData.findOne({ month: req.params.month }).lean();
    if (existing) return res.json(normalizeGradeDeliveries(existing));

    const base = defaultDoc(req.params.month);
    const prevDoc = await MonthData.findOne({ month: prevMonthStr(req.params.month) }).lean();
    if (prevDoc) {
      normalizeGradeDeliveries(prevDoc);
      const closing = computeClosingStock(prevDoc);
      const prevGradesByKey = {};
      (prevDoc.grades || []).forEach((g) => { prevGradesByKey[g.key] = g; });

      base.grades = base.grades.map((g) => {
        const prevGrade = prevGradesByKey[g.key];
        return {
          ...g,
          openingStock: closing[g.key] || 0,
          // Prices and the card reduction rate carry forward from last
          // month and stay fixed until the user changes them — they do NOT
          // reset to 0 every month.
          buy: prevGrade ? prevGrade.buy : g.buy,
          priceCash: prevGrade ? prevGrade.priceCash : g.priceCash,
          priceCard: prevGrade ? prevGrade.priceCard : g.priceCard,
          cardReductionRate: prevGrade ? (prevGrade.cardReductionRate || 0) : g.cardReductionRate,
        };
      });

      const oilClosing = computeOilClosingStock(prevDoc);
      base.oilProducts = base.oilProducts.map((p) => ({
        ...p,
        openingStock: oilClosing[p.name] || 0,
      }));

      const pumpClosing = computePumpClosingReadings(prevDoc);
      base.pumps = base.pumps.map((p) => {
        const prevReadings = pumpClosing[p.pumpNo];
        if (!prevReadings) return p;
        return {
          ...p,
          super: { opening: prevReadings.super, closing: 0 },
          regular: { opening: prevReadings.regular, closing: 0 },
          diesel: { opening: prevReadings.diesel, closing: 0 },
          vpower: { opening: prevReadings.vpower, closing: 0 },
        };
      });
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
