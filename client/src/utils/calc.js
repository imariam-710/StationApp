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

// Litres sold per grade, summed across every sale, every day. A day can
// have any number of sales for the same fuel (e.g. some paid cash, some
// paid card, or just several separate transactions).
export function totalLiters(dailySales = []) {
  const t = { super: 0, regular: 0, diesel: 0, vpower: 0 };
  dailySales.forEach((day) => {
    (day.entries || []).forEach((e) => {
      if (t[e.fuel] !== undefined) t[e.fuel] += n(e.liters);
    });
  });
  return t;
}

// Sales revenue per grade. Each sale's amount uses the price that was
// locked in on that entry at the time it was created/edited (see
// ledgerSlice's addEntry/updateEntry) — NOT the grade's current price. This
// is what keeps changing a fuel's price from silently rewriting the value
// of sales already recorded earlier in the month.
export function revenueByGrade(dailySales = [], grades = []) {
  const t = { super: 0, regular: 0, diesel: 0, vpower: 0 };
  dailySales.forEach((day) => {
    (day.entries || []).forEach((e) => {
      if (t[e.fuel] !== undefined) t[e.fuel] += n(e.liters) * n(e.price);
    });
  });
  return t;
}

// Every sale is tagged with a payment method — this sums sale amounts into
// totals per payment method, which is what the Payments tab displays.
// There's no separate manual entry for this; it's derived entirely from
// Daily Sales.
export function totalPayments(dailySales = [], grades = []) {
  const t = { cash: 0, card: 0, subsidy: 0, siteCredit: 0, chitties: 0, telephoneCard: 0 };
  dailySales.forEach((day) => {
    (day.entries || []).forEach((e) => {
      const amt = n(e.liters) * n(e.price);
      if (t[e.paymentType] !== undefined) t[e.paymentType] += amt;
    });
  });
  return t;
}

// Per-day totals by payment method (used on the Payments tab's day-by-day
// breakdown, since a day can now have several sales of the same fuel split
// across different payment methods).
export function dailyPaymentTotals(dailySales = [], grades = []) {
  return dailySales.map((day) => {
    const t = { cash: 0, card: 0, subsidy: 0, siteCredit: 0, chitties: 0, telephoneCard: 0 };
    (day.entries || []).forEach((e) => {
      const amt = n(e.liters) * n(e.price);
      if (t[e.paymentType] !== undefined) t[e.paymentType] += amt;
    });
    return { date: day.date, ...t };
  });
}

// Profit per grade = revenue (litres x selling price) minus the cost of the
// litres sold (litres x buying price) minus the value of any evaporation/
// leakage loss for that grade (book stock vs actual stock, at buying price).
// This means loss is already reflected here — it isn't subtracted again
// separately anywhere else.
export function fuelProfitByGrade(grades = [], dailySales = []) {
  const liters = totalLiters(dailySales);
  const revenue = revenueByGrade(dailySales, grades);
  const loss = stockLossByGrade(grades, dailySales);
  const result = {};
  grades.forEach((g) => {
    const cost = (liters[g.key] || 0) * n(g.buy);
    const lossValue = loss[g.key]?.value || 0;
    result[g.key] = (revenue[g.key] || 0) - cost - lossValue;
  });
  return result;
}

export function fuelProfitTotal(grades = [], dailySales = []) {
  const byGrade = fuelProfitByGrade(grades, dailySales);
  return Object.values(byGrade).reduce((sum, v) => sum + v, 0);
}

// Cost of litres sold per grade (litres x buying price) — admin/cost-facing
// figure, not shown on the regular Summary tab.
export function buyAmountByGrade(grades = [], dailySales = []) {
  const liters = totalLiters(dailySales);
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

// Per-fuel stock accounting for the month:
//   opening (carried over from last month's closing, or set manually)
// + deliveries (new stock brought in this month, entered manually)
// - sold (litres sold this month, from Daily Sales)
// = closing (becomes next month's opening automatically)
export function stockSummary(grades = [], dailySales = []) {
  const sold = totalLiters(dailySales);
  const result = {};
  grades.forEach((g) => {
    const opening = n(g.openingStock);
    const deliveries = n(g.deliveries);
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
export function dailyRunningStock(grades = [], dailySales = []) {
  const running = {};
  grades.forEach((g) => {
    running[g.key] = n(g.openingStock) + n(g.deliveries);
  });
  return dailySales.map((day) => {
    const soldToday = { super: 0, regular: 0, diesel: 0, vpower: 0 };
    (day.entries || []).forEach((e) => {
      if (soldToday[e.fuel] !== undefined) soldToday[e.fuel] += n(e.liters);
    });
    const remaining = {};
    FUEL_KEYS.forEach((k) => {
      running[k] = (running[k] || 0) - soldToday[k];
      remaining[k] = running[k];
    });
    return { date: day.date, remaining };
  });
}

// Litres sold via "card" payment, per grade — the base the Card Reduction
// table is calculated from.
export function cardLitersByGrade(dailySales = []) {
  const t = { super: 0, regular: 0, diesel: 0, vpower: 0 };
  dailySales.forEach((day) => {
    (day.entries || []).forEach((e) => {
      if (e.paymentType === 'card' && t[e.fuel] !== undefined) t[e.fuel] += n(e.liters);
    });
  });
  return t;
}

// Card reduction per grade = card litres x the card premium for that grade
// (card price minus cash price, this month). Fully automatic — no manual
// rate entry: if you charge more for card to cover the transaction fee,
// that premium IS the reduction, computed straight from the prices already
// set on Daily Sales / Fuel Margin.
export function cardReductionByGrade(grades = [], dailySales = []) {
  const liters = cardLitersByGrade(dailySales);
  const result = {};
  grades.forEach((g) => {
    const litres = liters[g.key] || 0;
    const rate = n(g.priceCard) - n(g.priceCash);
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
// Valued at this month's buying price for that grade.
export function stockLossByGrade(grades = [], dailySales = []) {
  const summary = stockSummary(grades, dailySales);
  const result = {};
  grades.forEach((g) => {
    const book = summary[g.key]?.closing || 0;
    const actual = n(g.actualStock);
    const litres = book - actual;
    result[g.key] = { book, actual, litres, value: litres * n(g.buy) };
  });
  return result;
}

export function stockLossTotal(grades = [], dailySales = []) {
  const byGrade = stockLossByGrade(grades, dailySales);
  return Object.values(byGrade).reduce((sum, v) => sum + v.value, 0);
}