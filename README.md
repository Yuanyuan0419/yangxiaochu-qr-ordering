# 杨小厨 · 扫码点餐系统

Customers scan a QR code on the table and order from their phone browser (no app to install). The owner runs the restaurant from a mobile back office.

- **Frontend**: React 18, TypeScript, Vite 6, Tailwind CSS 3, shadcn/ui-style components (Radix + vaul), React Router 6, TanStack Query 5, Zustand, Lucide
- **Backend**: Node 20, Express 4, TypeScript, Prisma 6, Zod, JWT in an httpOnly cookie, bcrypt
- **Database**: MySQL / MariaDB (XAMPP)

```
frontend/   React app (customer menu + owner back office)
backend/    Express API
prisma/     schema.prisma, migrations, seed.ts, seed-images/
uploads/    Uploaded images (restaurant/ for logos, products/ for dish photos)
```

## Quick start

```bash
# 1. Start MySQL in XAMPP
# 2. Configure the database connection
cp backend/.env.example backend/.env       # then fill in DATABASE_URL and JWT_SECRET
# 3. Install dependencies, create tables, seed data
npm install
npm run db:migrate
npm run db:seed
# 4. Start the API (4000) and frontend (5173) together
npm run dev
```

> **Port note**: on this machine XAMPP MariaDB listens on **3307**, because a separate MySQL 8 already uses 3306.
> If you use the standard XAMPP port, change `DATABASE_URL` to `mysql://root:@127.0.0.1:3306/yangxiaochu`.

Owner login: `admin@example.com` / `Admin123!`

## Testing on a phone (same Wi-Fi)

1. The terminal shows `Network: http://192.168.x.x:5173/` after `npm run dev`
2. Open `http://<computer-IP>:5173/admin` on the computer and log in → **餐桌** (Tables) → open any table's **二维码** (QR code)
3. Scan the QR code with the phone camera and order → the computer back office plays a chime and shows a new-order notification within about 5 seconds
4. The owner taps 接单 (accept) → 开始制作 (start cooking) → 出餐完成 (ready), and the customer's order page updates automatically

The QR code automatically uses the computer's LAN IP, even when the back office is opened at localhost. To pin a specific address, create `frontend/.env.local`:
`VITE_PUBLIC_APP_URL=http://192.168.1.165:5173`

If the phone can't open the page: allow incoming connections for node in the macOS firewall, and make sure the phone and computer are on the same Wi-Fi.

## Common commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the backend and frontend together |
| `npm run db:migrate` | Create/apply Prisma migrations during development |
| `npm run db:deploy` | Apply existing migrations without touching data (use this after pulling updates) |
| `npm run db:translate` | Fill in missing EN/FR translations for the demo menu (never overwrites) |
| `npm run db:seed` | **Wipe** the database and re-seed the demo data (new QR tokens are generated) |
| `npm run db:studio` | Browse the data in Prisma Studio |
| `npm run typecheck` | Type-check the backend and frontend |
| `npm run build` then `npm start -w backend` | Production mode: Express serves the API and the built frontend on port 4000 |

## Ordering flow

- **Table bills**: a table's first order opens a bill (`TableSession`); every order added later during the meal goes onto the same bill. The owner taps **结账** (check out), picks a payment method (cash / card / other), and the bill closes. The next scan at that table starts a new bill.
- **Four statuses**: 新订单 (new) → 制作中 (preparing) → 上菜中 (some dishes served) → 已上齐 (all served). The last two follow automatically from the per-dish ticks, so the kitchen only taps **接单** (accept) and then ticks dishes (or taps **全部上齐**, all served). Orders become **已完成** (completed) at checkout.
- **Auto-accept** (Settings → Restaurant profile): new orders go straight to "preparing", so the kitchen only ticks dishes.
- **Customers** see each dish ticked on their order page and can open **本桌账单** (table bill) to see everything the table has ordered.
- **Reconciliation** (Settings → Reconciliation): paid bills by day, with totals per payment method.

## Three languages (中文 / English / Français)

- Both the customer and owner interfaces are in Chinese, English and French. The language button is at the top right of the customer pages and under Settings → Interface language; the choice is remembered on the device.
- Dish names and descriptions, category names and descriptions, the restaurant intro and opening hours are each entered in all three languages (tabs in the edit forms). Chinese is required; when a translation is empty, guests see the Chinese.
- Ingredients are translated once in the **配料库** (ingredient library) and every dish picks it up. The 14 EU allergens come with built-in Chinese, English and French names.
- API error messages are returned in the language from the `Accept-Language` header.
- `npm run db:translate` fills in the English and French translations for the demo menu. It only writes empty fields, so it never overwrites anything the owner has edited.

### Automatic translation (DeepL, optional)

1. Sign up at <https://www.deepl.com/pro-api> and pick **DeepL API Free** (500,000 characters a month; the card is only for identity verification and the free plan doesn't charge it).
2. In your account, copy the key from **API Keys** (free keys end in `:fx`).
3. Fill it in in `backend/.env`: `DEEPL_API_KEY="xxxxxxxx-xxxx-...:fx"`, then restart `npm run dev`.
4. Under Settings → Automatic translation (DeepL) it should now say **Connected**. Then:
   - Every Chinese/EN/FR edit form gets a **一键翻译成英文和法文** button (translate to English and French). It only fills empty fields, and the **从中文重新翻译** button (re-translate from Chinese) overwrites the current language.
   - The menu page and the ingredient library show a **一键补全** card (fill in everything) that translates every missing translation at once without overwriting anything you've already written.
- Each request tells DeepL what kind of text it is (dish, category, ingredient, intro, opening hours), which makes short menu terms translate more accurately. That context isn't billed.
- The key is only used on the server and never reaches the browser. Translation endpoints require login and are rate limited.
