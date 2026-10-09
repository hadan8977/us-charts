# US Charts（Phase 1 MVP）

美股看盘站：Next.js 15 + TypeScript + [@luxalgo/vela](https://velacharts.dev) 图表，服务端用 **Alpaca Market Data REST**（`feed=iex`）拉 K 线。适合部署到 **GitHub → Vercel**。

> 图表库：**Vela**（`@luxalgo/vela`）。Pine 执行（PineTS）留到 Phase 2（`/api/pine` 目前返回 501 stub）。

## 功能

- `GET /api/bars?symbol=AAPL&timeframe=1Day&limit=200` — OHLCV JSON（密钥只在服务端）
- `GET /api/bars?symbol=AAPL&timeframe=1Min&limit=200` — 供近实时轮询
- 深色 UI：代码输入、Day / 1Min 切换、Vela K 线
- **1Min** 由客户端 DataProvider **每 5 秒**轮询 `/api/bars`（适配 Vercel Serverless，无常驻 WebSocket）
- 自选股存在浏览器 **`localStorage`**（无 Supabase / 无服务端数据库）
- `POST /api/pine` — Phase 2 stub

## 本地运行

```bash
cd us-charts
cp .env.example .env.local
# 填入 ALPACA_API_KEY / ALPACA_SECRET_KEY
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

```bash
npm run build   # 生产构建
npm start       # 本地预览生产包
```

## 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `ALPACA_API_KEY` | 是 | Alpaca API Key ID |
| `ALPACA_SECRET_KEY` | 是 | Alpaca Secret Key |
| `ALPACA_DATA_URL` | 否 | 默认 `https://data.alpaca.markets` |

**不要**把真实密钥写进仓库或 `NEXT_PUBLIC_*`。只放在 `.env.local`（本地）和 Vercel Project → Settings → Environment Variables（线上）。

## IEX vs SIP

Phase 1 统一使用 **`feed=iex`**（免费档友好）：

| | IEX（本项目默认） | SIP（付费） |
|--|------------------|-------------|
| 覆盖 | 约 2–4% 成交量的单所行情 | 全市场合并 |
| 实时 | 免费档可用实时 IEX | Algo Trader Plus 等套餐 |
| 价差 | 大票通常几美分内；中小票可能卡住/偏离 | 与券商/TV 更接近 |
| 历史 | 可用 | 免费档对「最近」SIP 历史常有约 15 分钟限制 |

升 SIP 时：Alpaca 账户开通对应数据套餐后，把 API 里的 `feed` 改为 `sip` 即可（前端图表库不用换）。

## 轮询，不是 WebSocket

Vercel Serverless **不能**长期挂着 Alpaca WebSocket。本项目：

1. 浏览器 → `GET /api/bars`（短请求）
2. API Route（Node）→ Alpaca REST
3. 1Min：Vela provider `subscribe()` **每 5s** 拉最新 bar；Day：**每 60s**

以后若要 tick 级真 WS，可另加 Fly/Railway 中继，前端仍可继续用同一套 `/api/bars`。

## 部署：GitHub → Vercel（推荐）

1. 在本机（或 CI）初始化并推到 GitHub（示例用户 `hadan8977`）：

```bash
cd us-charts
git init
git add .
git commit -m "feat: US Charts MVP (Alpaca IEX + Vela)"
# 在 GitHub 新建空仓库 hadan8977/us-charts 后：
git remote add origin git@github.com:hadan8977/us-charts.git
git branch -M main
git push -u origin main
```

2. 打开 [Vercel](https://vercel.com) → **Add New Project** → Import 该 GitHub 仓库。
3. Framework Preset: **Next.js**；Root Directory: 仓库根（若 monorepo 再改）。
4. Environment Variables 添加：
   - `ALPACA_API_KEY`
   - `ALPACA_SECRET_KEY`
5. Deploy。之后每次 `git push` 自动重新部署。

CLI 上传也可以，但本项目按 **Git 连接 Vercel** 设计，密钥只放在 Vercel 控制台。

## 项目结构（节选）

```
src/app/api/bars/route.ts   # Alpaca REST 代理
src/app/api/pine/route.ts   # Pine stub
src/providers/alpacaVelaProvider.ts  # Vela DataProvider → /api/bars
src/components/AppShell.tsx  # UI + localStorage 自选
src/components/ChartPanel.tsx
src/lib/alpaca.ts
```

## Phase 2 备忘

- [ ] 接入 `pinets` / `@luxalgo/vela-pinets`（注意 AGPL），Node runtime
- [ ] 可选 SIP feed
- [ ] 可选常驻 WS 中继

## 许可注意

- 本仓库应用代码：按你自己的仓库许可发布即可。
- **Vela**：Apache-2.0，页面需保留可见的 Vela™ 归属（默认水印或等价链接）。
- **PineTS / vela-pinets**（未装）：AGPL-3.0，对外提供服务前请自行评估合规。
