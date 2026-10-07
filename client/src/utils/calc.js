export const FUEL_KEYS = ['super', 'regular', 'diesel', 'vpower'];

export const PAYMENT_TYPES = [
  { key: 'cash', label: 'Cash' },
  { key: 'card', label: 'Card' },
  { key: 'subsidy', label: 'Subsidy' },
  { key: 'siteCredit', label: 'Site Credit' },
  { key: 'chitties', label: 'Chitties' },
  { key: 'telephoneCard', label: 'Telephone Card' },
];

export function n(v) {
  v = parseFloat(v);
  return isNaN(v) ? 0 : v;
}

export function fmt(v, d = 3) {
  v = Number(v) || 0;
  return (v < 0 ? '-' : '') + Math.abs(v).toFixed(d);
}

// { super: { cash: 0.239, card: 0.249 }, ... } — cash and card prices per
// grade, set once for the month. Every sale uses the price matching its
// payment method (subsidy/site credit/chitties fall back to the cash price).
export function priceMap(grades = []) {
  const m = {};
  grades.forEach((g) => {
    m[g.key] = { cash: n(g.priceCash), card: n(g.priceCard) };
  });
  return m;
}

export function priceForEntry(prices, fuel, paymentType) {
  const p = prices[fuel] || { cash: 0, card: 0 };
  return paymentType === 'card' ? p.card : p.cash;
}

// Opening pump-meter reading totals per fuel, summed across every pump —
// the baseline day 1 of the month is measured against.
function pumpOpeningTotals(monthlyPumps = []) {
  const t = { super: 0, regular: 0, diesel: 0, vpower: 0 };
  monthlyPumps.forEach((p) => {
    FUEL_KEYS.forEach((k) => { t[k] += n(p[k]?.opening); });
  });
  return t;
}

// Litres sold per grade, for the whole month so far, derived from the
// day-sheet pump meter readings (this is now the one source of litres sold
// — there's no separate manual sale-entry table any more). Meters only ever
// go up, so the total is simply the HIGHEST day-total reached this month
// minus the month's opening reading. This stays correct even mid-month,
// when the remaining days are still blank (reading 0) — summing day-to-day
// differences instead would wrongly subtract once the readings drop back to
// 0 on a not-yet-filled-in day.
export function totalLiters(dailySales = [], monthlyPumps = []) {
  const opening = pumpOpeningTotals(monthlyPumps);
  const highest = { ...opening };
  dailySales.forEach((day) => {
    const t = dayPumpTotalsByGrade(day);
    FUEL_KEYS.forEach((k) => { if (t[k] > highest[k]) highest[k] = t[k]; });
  });
  const t = {};
  FUEL_KEYS.forEach((k) => { t[k] = highest[k] - opening[k]; });
  return t;
}

// Sales revenue per grade = litres sold (from the pump meters) x this
// grade's current selling price. There's one price per litre now (cash and
// card sell the same), so there's nothing to lock in per-transaction any
// more — changing a grade's price changes this month's revenue for litres
// already sold too, same as the station's own day-sheet (its Amount row is
// a live formula, not a stored figure).
export function revenueByGrade(dailySales = [], grades = [], monthlyPumps = []) {
  const liters = totalLiters(dailySales, monthlyPumps);
  const t = {};
  grades.forEach((g) => { t[g.key] = (liters[g.key] || 0) * n(g.priceCash); });
  return t;
}

// Per-day totals by payment method — the day-sheet's "Payment breakdown".
// Shell card credit is litres entered manually for that day x each fuel's
// price; Sub (subsidy) is entered directly in currency. Cash is the
// balancing figure — today's Total Sale minus Sub minus Shell card credit —
// same as counting the till at day's end. Site Credit, Other (chitties) and
// Telephone Card are separate, independently-tracked figures (not part of
// the fuel-sale split): entered directly in currency, same as the station's
// own sheet, where they don't change Cash.
export function dailyPaymentTotals(dailySales = [], grades = [], monthlyPumps = []) {
  const priceByFuel = {};
  grades.forEach((g) => { priceByFuel[g.key] = n(g.priceCash); });
  const perDay = dailyPumpSalesLiters(dailySales, monthlyPumps);
  return dailySales.map((day, i) => {
    const liters = perDay[i]?.liters || {};
    let totalSale = 0;
    FUEL_KEYS.forEach((k) => { totalSale += (liters[k] || 0) * (priceByFuel[k] || 0); });

    const shellCardLiters = day.shellCardLiters || {};
    let card = 0;
    FUEL_KEYS.forEach((k) => { card += n(shellCardLiters[k]) * (priceByFuel[k] || 0); });

    const subsidy = n(day.subsidyAmount);
    const cash = Math.max(totalSale - card - subsidy, 0);

    const siteCredit = n(day.siteCredit);
    const chitties = n(day.other);
    const telephoneCard = n(day.telephoneCard);

    return { date: day.date, cash, card, subsidy, siteCredit, chitties, telephoneCard, totalSale };
  });
}

// Whole-month totals by payment method, for the Payments and Summary tabs.
export function totalPayments(dailySales = [], grades = [], monthlyPumps = []) {
  const byDay = dailyPaymentTotals(dailySales, grades, monthlyPumps);
  const t = { cash: 0, card: 0, subsidy: 0, siteCredit: 0, chitties: 0, telephoneCard: 0 };
  byDay.forEach((d) => {
    t.cash += d.cash; t.card += d.card; t.subsidy += d.subsidy;
    t.siteCredit += d.siteCredit; t.chitties += d.chitties; t.telephoneCard += d.telephoneCard;
  });
  return t;
}

// Profit per grade = revenue (litres x selling price) minus the cost of the
// litres sold (litres x buying price) minus the value of any evaporation/
// leakage loss for that grade (book stock vs actual stock, at buying price).
// This means loss is already reflected here — it isn't subtracted again
// separately anywhere else.
export function fuelProfitByGrade(grades = [], dailySales = [], monthlyPumps = []) {
  const liters = totalLiters(dailySales, monthlyPumps);
  const revenue = revenueByGrade(dailySales, grades, monthlyPumps);
  const loss = stockLossByGrade(grades, dailySales, monthlyPumps);
  const result = {};
  grades.forEach((g) => {
    const cost = (liters[g.key] || 0) * n(g.buy);
    const lossValue = loss[g.key]?.value || 0;
    result[g.key] = (revenue[g.key] || 0) - cost - lossValue;
  });
  return result;
}

export function fuelProfitTotal(grades = [], dailySales = [], monthlyPumps = []) {
  const byGrade = fuelProfitByGrade(grades, dailySales, monthlyPumps);
  return Object.values(byGrade).reduce((sum, v) => sum + v, 0);
}

// Cost of litres sold per grade (litres x buying price) — admin/cost-facing
// figure, not shown on the regular Summary tab.
export function buyAmountByGrade(grades = [], dailySales = [], monthlyPumps = []) {
  const liters = totalLiters(dailySales, monthlyPumps);
  const result = {};
  grades.forEach((g) => {
    result[g.key] = (liters[g.key] || 0) * n(g.buy);
  });
  return result;
}

// An oil/lubricant product's total quantity sold this month = cash sales + card sales.
export function oilQty(r) {
  return n(r.qtyCash) + n(r.qtyCard);
}

export function oilProfitTotal(oilProducts = []) {
  return oilProducts.reduce((sum, r) => sum + oilQty(r) * (n(r.sell) - n(r.buy)), 0);
}

// Cash actually collected from oil/lubricant sales this month (card sales aren't cash-in-hand).
export function oilCashTotal(oilProducts = []) {
  return oilProducts.reduce((sum, r) => sum + n(r.qtyCash) * n(r.sell), 0);
}

// Amount taken via card from oil/lubricant sales this month.
export function oilCardTotal(oilProducts = []) {
  return oilProducts.reduce((sum, r) => sum + n(r.qtyCard) * n(r.sell), 0);
}

// Per-product oil stock accounting for the month:
//   opening (carried over from last month's closing, matched by product
//   name, or set manually) + deliveries (new stock brought in this month,
//   entered manually) − units sold (cash + card) = closing (becomes next
//   month's opening automatically, matched by name).
export function oilStockSummary(oilProducts = []) {
  return oilProducts.map((r) => {
    const opening = n(r.openingStock);
    const deliveries = n(r.deliveries);
    const sold = oilQty(r);
    return {
      name: r.name,
      opening,
      deliveries,
      available: opening + deliveries,
      sold,
      closing: opening + deliveries - sold,
    };
  });
}

export function deductionsTotal(deductions = []) {
  return deductions.reduce((sum, r) => {
    const calc = n(r.liters) && n(r.rate);
    return sum + (calc ? n(r.liters) * n(r.rate) : n(r.amount));
  }, 0);
}

export function expensesTotal(expenses = []) {
  return expenses.reduce((sum, r) => sum + n(r.amount), 0);
}

export function monthLabel(m) {
  const [y, mo] = (m || '').split('-');
  const names = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${names[parseInt(mo, 10) - 1] || ''} ${y || ''}`.trim();
}

// A grade can receive fuel more than once in a month (several tanker
// deliveries) — `deliveries` is a list of { date, amount } entries, and
// every one of them counts. This sums them all.
export function deliveriesTotal(grade) {
  const list = Array.isArray(grade?.deliveries) ? grade.deliveries : [];
  return list.reduce((sum, d) => sum + n(d.amount), 0);
}

// Every delivery for `grade` dated on or before `dateStr` — used to work
// out how much stock had actually arrived by a given day of the month.
export function deliveriesThroughDate(grade, dateStr) {
  const list = Array.isArray(grade?.deliveries) ? grade.deliveries : [];
  return list.reduce((sum, d) => (d.date && d.date <= dateStr ? sum + n(d.amount) : sum), 0);
}

// Per-fuel stock accounting for the month:
//   opening (carried over from last month's closing, or set manually)
// + deliveries (every delivery brought in this month, entered manually —
//   can be more than one)
// - sold (litres sold this month, from Daily Sales)
// = closing (becomes next month's opening automatically)
export function stockSummary(grades = [], dailySales = [], monthlyPumps = []) {
  const sold = totalLiters(dailySales, monthlyPumps);
  const result = {};
  grades.forEach((g) => {
    const opening = n(g.openingStock);
    const deliveries = deliveriesTotal(g);
    const soldQty = sold[g.key] || 0;
    result[g.key] = {
      opening,
      deliveries,
      available: opening + deliveries,
      sold: soldQty,
      closing: opening + deliveries - soldQty,
    };
  });
  return result;
}

// Stock remaining after each day's sales — starts at opening + deliveries,
// and drops by that day's litres sold, day by day, per fuel.
// Litres sold per grade, derived from pump meter readings (closing minus
// opening, summed across all pumps that dispense that fuel) — an
// independent cross-check against the Daily Sales litres total. Purely
// informational; it doesn't feed into any profit calculation.
export function pumpLitersByGrade(pumps = []) {
  const t = { super: 0, regular: 0, diesel: 0, vpower: 0 };
  pumps.forEach((p) => {
    FUEL_KEYS.forEach((k) => {
      const m = p[k];
      if (!m) return;
      const diff = n(m.closing) - n(m.opening);
      if (diff > 0) t[k] += diff;
    });
  });
  return t;
}

// Stock remaining at the end of each day = opening stock, plus every
// delivery dated on or before that day (a grade can receive fuel more than
// once during the month — each one counts from its own date onward), minus
// everything sold from day 1 through that day. "Sold through today" uses the
// same highest-reading-so-far method as totalLiters, so it's unaffected by
// the remaining (blank) days later in the month.
export function dailyRunningStock(grades = [], dailySales = [], monthlyPumps = []) {
  const opening = pumpOpeningTotals(monthlyPumps);
  const highest = { ...opening };
  return dailySales.map((day) => {
    const today = dayPumpTotalsByGrade(day);
    FUEL_KEYS.forEach((k) => { if (today[k] > highest[k]) highest[k] = today[k]; });
    const remaining = {};
    grades.forEach((g) => {
      const soldThroughToday = highest[g.key] - opening[g.key];
      const deliveredThroughToday = deliveriesThroughDate(g, day.date);
      remaining[g.key] = n(g.openingStock) + deliveredThroughToday - soldThroughToday;
    });
    return { date: day.date, remaining };
  });
}

// Litres sold via Shell (fleet) card, per grade, for the whole month —
// entered manually per day (the day-sheet's "Shell card litres" row); this
// is the base the Card Reduction table is calculated from.
export function cardLitersByGrade(dailySales = []) {
  const t = { super: 0, regular: 0, diesel: 0, vpower: 0 };
  dailySales.forEach((day) => {
    const sc = day.shellCardLiters || {};
    FUEL_KEYS.forEach((k) => { t[k] += n(sc[k]); });
  });
  return t;
}

// Card reduction per grade = card litres x this grade's card reduction rate
// — a flat per-litre bank/network commission, entered manually per grade
// (it is NOT the gap between card and cash price: the station can and does
// sell at the same price either way, and the bank's cut is a separate,
// fixed-per-litre charge that doesn't move with the pump price). Litres are
// still pulled automatically from card-paid sales; only the rate is manual.
export function cardReductionByGrade(grades = [], dailySales = []) {
  const liters = cardLitersByGrade(dailySales);
  const result = {};
  grades.forEach((g) => {
    const litres = liters[g.key] || 0;
    const rate = n(g.cardReductionRate);
    result[g.key] = { litres, rate, amount: litres * rate };
  });
  return result;
}

export function cardReductionTotal(grades = [], dailySales = []) {
  const byGrade = cardReductionByGrade(grades, dailySales);
  return Object.values(byGrade).reduce((sum, v) => sum + v.amount, 0);
}

// Evaporation/leakage loss per grade: Book Stock (opening + deliveries -
// litres sold, i.e. what SHOULD be left) minus Actual Stock (what's
// physically measured in the tank, entered manually) = litres lost.
// Valued at this month's buying price for that grade. If actual stock comes
// in ABOVE book stock (a gain, not a loss — e.g. a metering difference),
// that grade simply isn't counted as a loss; a gain on one grade never
// offsets a real loss on another, same as the station's own ledger, which
// leaves a grade off the loss table entirely when it shows a gain rather
// than netting it against the others.
export function stockLossByGrade(grades = [], dailySales = [], monthlyPumps = []) {
  const summary = stockSummary(grades, dailySales, monthlyPumps);
  const result = {};
  grades.forEach((g) => {
    const book = summary[g.key]?.closing || 0;
    const actual = n(g.actualStock);
    const litres = Math.max(book - actual, 0);
    result[g.key] = { book, actual, litres, value: litres * n(g.buy) };
  });
  return result;
}

export function stockLossTotal(grades = [], dailySales = [], monthlyPumps = []) {
  const byGrade = stockLossByGrade(grades, dailySales, monthlyPumps);
  return Object.values(byGrade).reduce((sum, v) => sum + v.value, 0);
}

// --- Day-sheet pump reading cross-check (mirrors the station's own
// per-day "PUMP NO" table) ----------------------------------------------
//
// This is a second, independent way of arriving at litres sold, purely for
// cross-checking the Daily Sales entries — same relationship the monthly
// Pump Meters tab already has to the month as a whole. It never feeds into
// revenue or profit.

// Total of one day's pump readings, per grade (sum across every pump).
export function dayPumpTotalsByGrade(day) {
  const t = { super: 0, regular: 0, diesel: 0, vpower: 0 };
  (day?.pumps || []).forEach((p) => {
    FUEL_KEYS.forEach((k) => {
      t[k] += n(p[k]);
    });
  });
  return t;
}

// Litres sold per grade for each day, derived from that day's pump-reading
// total minus the previous day's (day 1 of the month is measured against
// the monthly Pump Meters tab's opening readings, so it carries over
// correctly from last month without any extra setup). This is a per-day
// figure for display on that day's own page — for a whole-month total, use
// totalLiters, which isn't thrown off by days later in the month still
// being blank.
export function dailyPumpSalesLiters(dailySales = [], monthlyPumps = []) {
  const opening = pumpOpeningTotals(monthlyPumps);
  let prev = opening;
  return dailySales.map((day) => {
    const today = dayPumpTotalsByGrade(day);
    const liters = {};
    FUEL_KEYS.forEach((k) => {
      liters[k] = today[k] - prev[k];
    });
    prev = today;
    return { date: day.date, totals: today, liters };
  });
}

// Cash deposited to the bank, for the whole month — each day's Cash (the
// payment-breakdown balancing figure) minus that day's Visa card, summed.
export function cashToBankTotal(data) {
  const grades = data?.grades || [];
  const dailySales = data?.dailySales || [];
  const monthlyPumps = data?.pumps || [];
  const payments = dailyPaymentTotals(dailySales, grades, monthlyPumps);
  return dailySales.reduce((sum, day, i) => {
    const cash = payments[i]?.cash || 0;
    return sum + Math.max(cash - n(day.visaCard), 0);
  }, 0);
}
