const mongoose = require('mongoose');

// One delivery of fuel added to a grade's tank during the month. A grade can
// receive stock more than once in a month (several tanker deliveries) — each
// one is recorded separately here and all of them count, from their own
// date onward, toward that grade's stock.
const StockDeliverySchema = new mongoose.Schema(
  {
    date: String, // "YYYY-MM-DD"
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const GradeSchema = new mongoose.Schema(
  {
    key: String,   // super | regular | diesel | vpower
    name: String,  // display name
    buy: { type: Number, default: 0 },        // buying price per litre this month
    priceCash: { type: Number, default: 0 },  // selling price per litre, paid by cash
    priceCard: { type: Number, default: 0 },  // selling price per litre, paid by card

    // Flat per-litre bank/network commission charged on card sales for this
    // grade — set manually, carries forward month to month like the prices
    // above. This is NOT priceCard minus priceCash: cash and card can (and
    // often do) sell at the same price, and the card network's cut is a
    // separate, fixed-per-litre fee that doesn't move with the pump price.
    cardReductionRate: { type: Number, default: 0 },

    // Tank stock accounting for this fuel, this month:
    //   openingStock (carried over automatically from last month's closing
    //   stock when a new month is first opened, or set manually) + every
    //   delivery in `deliveries` (new stock brought in, entered manually,
    //   can happen several times a month) − litres sold = closing (book) stock.
    openingStock: { type: Number, default: 0 },
    deliveries: [StockDeliverySchema],
    // Physically measured stock at month end (entered manually). The gap
    // between book stock and this is treated as evaporation/leakage loss.
    actualStock: { type: Number, default: 0 },
  },
  { _id: false }
);

const MeterReadingSchema = new mongoose.Schema(
  {
    opening: { type: Number, default: 0 }, // carried over from last month's closing reading
    closing: { type: Number, default: 0 }, // entered manually at month end
  },
  { _id: false }
);

// One physical pump can dispense more than one fuel grade (multiple nozzles
// on the same dispenser) — matches the station's own pump-meter sheet.
// Litres sold per fuel per pump = closing reading − opening reading. This
// is purely a cross-check against the Daily Sales litres total; it doesn't
// feed into any profit calculation.
const PumpSchema = new mongoose.Schema(
  {
    pumpNo: { type: Number, required: true },
    super: { type: MeterReadingSchema, default: () => ({}) },
    regular: { type: MeterReadingSchema, default: () => ({}) },
    diesel: { type: MeterReadingSchema, default: () => ({}) },
    vpower: { type: MeterReadingSchema, default: () => ({}) },
  },
  { _id: false }
);

// One sale: a fuel, a quantity, at a specific price, paid for a specific
// way. Price is locked in at the time the sale is entered (or its fuel/
// payment method changed) — it does NOT update if the grade's price is
// changed afterward, so past sales keep the value they actually had.
const SaleEntrySchema = new mongoose.Schema(
  {
    fuel: { type: String, enum: ['super', 'regular', 'diesel', 'vpower'], required: true },
    liters: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    paymentType: {
      type: String,
      enum: ['cash', 'card', 'subsidy', 'siteCredit', 'chitties', 'telephoneCard'],
      default: 'cash',
    },
  },
  { _id: false }
);

// One pump's meter reading for one specific day — mirrors the "PUMP NO"
// table on the station's own day-sheet (one reading per pump per fuel, that
// day). Litres sold per fuel, that day, is this day's total reading across
// every pump minus the previous day's — this IS the day's litres sold (the
// day-sheet has no separate manual litres entry).
const DayPumpReadingSchema = new mongoose.Schema(
  {
    pumpNo: { type: Number, required: true },
    super: { type: Number, default: 0 },
    regular: { type: Number, default: 0 },
    diesel: { type: Number, default: 0 },
    vpower: { type: Number, default: 0 },
  },
  { _id: false }
);

// Litres sold via Shell (fleet) card, per fuel, for one day — entered
// manually (the day-sheet's unlabeled yellow litres row). Its value x each
// fuel's price gives that day's "Shell card credit" amount.
const ShellCardLitersSchema = new mongoose.Schema(
  {
    super: { type: Number, default: 0 },
    regular: { type: Number, default: 0 },
    diesel: { type: Number, default: 0 },
    vpower: { type: Number, default: 0 },
  },
  { _id: false }
);

// One entry per calendar day — mirrors one page of the "Daily Sales" ledger
// exactly: pump meter readings, Shell card litres, and the day's payment
// breakdown. `entries` is kept only so a month saved before this change
// doesn't lose anything; it is no longer written to or read from.
const DailySaleSchema = new mongoose.Schema(
  {
    date: String, // "YYYY-MM-DD"
    entries: [SaleEntrySchema],
    // Each pump's meter reading that day (matches the station's own
    // day-sheet). Litres sold per fuel = this day's total minus the
    // previous day's — the authoritative source of litres sold, replacing
    // the old manual sale-entry table.
    pumps: [DayPumpReadingSchema],
    shellCardLiters: { type: ShellCardLitersSchema, default: () => ({}) },
    // The day-sheet's manually-filled ("yellow") payment figures. "Cash" is
    // not stored — it's the balancing figure (Total Sale minus all of
    // these), same as counting the till at day's end.
    subsidyAmount: { type: Number, default: 0 }, // "sub"
    siteCredit: { type: Number, default: 0 },    // "SITE CR"
    other: { type: Number, default: 0 },         // "OTHER" / chitties
    telephoneCard: { type: Number, default: 0 },
    visaCard: { type: Number, default: 0 },
    // Legacy: used to be a manual entry. Cash to bank is now computed
    // (Cash minus Visa card) — kept only so an old saved month isn't lost.
    cashToBank: { type: Number, default: 0 },
  },
  { _id: false }
);

const OilProductSchema = new mongoose.Schema(
  {
    name: String,
    buy: { type: Number, default: 0 },
    sell: { type: Number, default: 0 },
    qtyCash: { type: Number, default: 0 }, // number sold paid by cash this month
    qtyCard: { type: Number, default: 0 }, // number sold paid by card this month

    // Stock accounting for this product, this month (matched to last
    // month's closing stock by product name when a new month is opened):
    //   openingStock + deliveries - (qtyCash + qtyCard) = closing stock.
    openingStock: { type: Number, default: 0 },
    deliveries: { type: Number, default: 0 },
  },
  { _id: false }
);

const DeductionSchema = new mongoose.Schema(
  {
    name: String,
    liters: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const ExpenseSchema = new mongoose.Schema(
  {
    name: String,
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const MonthDataSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, unique: true, index: true }, // "YYYY-MM"
    grades: [GradeSchema],
    dailySales: [DailySaleSchema],
    oilProducts: [OilProductSchema],
    deductions: [DeductionSchema],
    expenses: [ExpenseSchema],
    partners: { type: Number, default: 2 },
    // Legacy: cash-to-bank used to be entered once for the whole month here.
    // It's now entered per day on Daily Sales (DailySaleSchema.cashToBank)
    // and summed on the Summary tab. This field is kept only so a month
    // saved before that change doesn't lose its figure.
    cashToBank: { type: Number, default: 0 },
    pumps: [PumpSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('MonthData', MonthDataSchema);
