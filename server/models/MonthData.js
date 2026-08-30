const mongoose = require('mongoose');

const GradeSchema = new mongoose.Schema(
  {
    key: String,   // super | regular | diesel | vpower
    name: String,  // display name
    buy: { type: Number, default: 0 },        // buying price per litre this month
    priceCash: { type: Number, default: 0 },  // selling price per litre, paid by cash
    priceCard: { type: Number, default: 0 },  // selling price per litre, paid by card

    // Tank stock accounting for this fuel, this month:
    //   openingStock (carried over automatically from last month's closing
    //   stock when a new month is first opened, or set manually) + deliveries
    //   (new stock brought in, entered manually) − litres sold = closing (book) stock.
    openingStock: { type: Number, default: 0 },
    deliveries: { type: Number, default: 0 },
    // Physically measured stock at month end (entered manually). The gap
    // between book stock and this is treated as evaporation/leakage loss.
    actualStock: { type: Number, default: 0 },
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

// One entry per calendar day — mirrors one page of the "Daily Sales" ledger.
const DailySaleSchema = new mongoose.Schema(
  {
    date: String, // "YYYY-MM-DD"
    entries: [SaleEntrySchema],
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
    // How much of the cash collected was deposited to the bank this month
    // (entered manually) — shown for reconciliation on the Summary tab.
    cashToBank: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MonthData', MonthDataSchema);