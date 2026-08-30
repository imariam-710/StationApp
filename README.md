# Station Profit Tracker

A monthly profit ledger for a fuel station: daily pump sales, payment
breakdown, tank stock, fuel margin, oil/lubricant profit, commission
deductions, expenses, and a net profit split between partners — with
login/registration and an admin account.

**Stack:** React + Redux Toolkit + Reactstrap/Bootstrap (client) · Express +
MongoDB + JWT auth (server).

## What each screen mirrors from the paper ledger

| Tab | Matches |
|---|---|
| **Daily Sales** | The "SALES LT." row per grade on the daily sales sheet |
| **Payments** | The Subsidy / Credit / Cash / Card / Chitties / Site Cr. block, plus the Tank Stock box |
| **Fuel Margin** | Buying/selling price per grade × litres sold |
| **Oil & Lubricants** | The monthly oil sales sheet (buying price, selling price, quantity, profit) |
| **Deductions** | Card sale commission / Shell commission |
| **Expenses** | Electric bill, rent, salary, etc. |
| **Summary** | Net profit and the partner split |

## Project structure

```
station-app-v2/
├── client/                        # React app — runs on its own dev server
│   ├── src/
│   │   ├── main.jsx                # entry point
│   │   ├── App.jsx                 # routes
│   │   ├── store.js                 # Redux store
│   │   ├── index.css
│   │   ├── api/axios.js             # API client, attaches JWT to every request
│   │   ├── features/
│   │   │   ├── auth/authSlice.js     # login/register/logout
│   │   │   └── ledger/ledgerSlice.js # month data, autosave-friendly state
│   │   ├── components/
│   │   │   ├── TopMenu.jsx            # top navbar
│   │   │   ├── PrivateRoute.jsx
│   │   │   └── tabs/                  # one component per tab
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── Dashboard.jsx
│   │   └── utils/calc.js            # profit/deduction calculations
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
├── server/                        # Express + MongoDB API — runs independently
│   ├── server.js
│   ├── models/
│   │   ├── MonthData.js             # one document per month
│   │   ├── Settings.js              # station name
│   │   └── User.js                  # login accounts
│   ├── routes/
│   │   ├── auth.js                  # register / login / me
│   │   ├── months.js                # ledger data (protected)
│   │   └── settings.js              # station name (protected)
│   ├── middleware/auth.js           # JWT verification, admin check
│   ├── seed.js                      # creates the admin account
│   ├── package.json
│   └── .env.example
├── package.json                   # root convenience scripts
└── README.md
```

The client and server are two separate apps on two separate ports:
- **server** → `http://localhost:3000` (the API, talks to MongoDB)
- **client** → `http://localhost:5500` (the web page, calls the API)

CORS is enabled on the server so the client (a different port) can call it.

## 1. Prerequisites

- **Node.js** (v18+) — https://nodejs.org
- **MongoDB** — running locally (https://www.mongodb.com/try/download/community)
  or a free MongoDB Atlas cluster (https://www.mongodb.com/cloud/atlas)
- **VS Code** — https://code.visualstudio.com

## 2. Open in VS Code

Unzip the project and open the `station-app-v2` folder in VS Code, then open a
terminal (`Terminal → New Terminal`).

## 3. Install dependencies

From the root folder:

```bash
npm run install:all
```

If you want the `npm run dev` command (runs both sides together) to work,
also install the root helper:

```bash
npm install
```

## 4. Configure the server

```bash
cd server
cp .env.example .env
```

Open `server/.env` and set:

- `MONGO_URI` — your MongoDB connection string
  - Local: `mongodb+srv://mariammhmmd710_db_user:hr-12345@cluster0.jrldccv.mongodb.net/station_pro`
  - Atlas: use the **standard** connection string (starts with `mongodb://`,
    lists several hosts) rather than `mongodb+srv://` if you've had DNS/SRV
    lookup issues on your network
- `JWT_SECRET` — change this to your own long random string
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` — the admin account created
  automatically the first time the server starts

## 5. Configure the client (optional)

The client defaults to talking to `http://localhost:3000/api`. Only needed if
your server runs somewhere else:

```bash
cd client
cp .env.example .env
# edit VITE_API_URL if needed
```

## 6. Run it

**Option A — one command from the root:**

```bash
npm run dev
```

**Option B — two terminals:**

```bash
# Terminal 1
cd server && npm install && npm start
```

```bash
# Terminal 2
cd client && npm install && npm start
```

Either way, the client opens automatically at `http://localhost:5500` and the
API runs at `http://localhost:3000`.

## 7. Log in

An admin account is created automatically the first time the server connects
to MongoDB, using the credentials from `server/.env`:

```
Email:    admin@station.com      (or your ADMIN_EMAIL)
Password: Admin@12345            (or your ADMIN_PASSWORD)
```

The server console prints these once, the first time it creates the account.
**Log in and consider changing the password / creating your own admin user
directly in MongoDB, then removing the default.**

Anyone else can create their own account from the **Register** page — new
registrations are always regular users, not admins.

## 8. Using the app

- **Daily Sales** — litres sold per grade, per day. Add a row per date.
- **Payments** — cash/card/credit/subsidy/site-credit/chitties for each date,
  plus the day's closing tank stock. Rows follow the dates from Daily Sales.
- **Fuel Margin** — buying/selling price per litre per grade; profit is
  calculated from the litres entered in Daily Sales.
- **Oil & Lubricants** — buying price, selling price, and quantity sold per
  product.
- **Deductions** — commissions/fees; enter litres + rate to auto-calculate,
  or type the amount directly.
- **Expenses** — fixed monthly costs (pre-filled with common categories).
- **Summary** — net profit for the month, the partner split, and total
  payments received.

Changes save automatically to MongoDB shortly after you stop typing — watch
the "Status" indicator in the top bar.

## Where the data lives

Three MongoDB collections in the `station_profit` database:
- `monthdatas` — one document per month (grades, daily sales, oil products,
  deductions, expenses, partner count)
- `settings` — the station name
- `users` — login accounts (passwords are hashed with bcrypt, never stored
  in plain text)

## Troubleshooting

- **"Could not connect to MongoDB"** — make sure MongoDB is running, or that
  `MONGO_URI` in `server/.env` is correct. If using Atlas and you see a
  `querySrv ECONNREFUSED` error, your network is likely blocking the DNS
  lookup `mongodb+srv://` needs — switch to the standard `mongodb://`
  connection string from Atlas instead.
- **Client shows "could not load from server"** — make sure the server is
  running and `VITE_API_URL` in `client/.env` (or the default) points at it.
- **401 / redirected to login unexpectedly** — your token expired (7 days) or
  `JWT_SECRET` changed since you logged in; just log in again.
- **Port already in use** — change `PORT` in `server/.env`, and/or pass a
  different `--port` in `client/package.json`'s start script.
