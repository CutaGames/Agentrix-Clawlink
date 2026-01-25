# 🎨 Agentrix UI/UX Systematic Optimization Plan V4

> **Status**: Draft
> **Focus**: Systematization, Usability, Production-Readiness
> **Target**: Main Website & All Workbench Modules (Merchant, Personal, Developer)

---

## 1. Executive Summary: From "Hackathon" to "Enterprise"

The current Agentrix V2 UI has evolved rapidly, resulting in a mix of styling patterns, hardcoded values (e.g., `text-[10px]`), and inconsistent component behaviors. To prepare for public launch, we must standardize the design system and refactor the key workflows.

**Core Objectives:**
1.  **Eliminate "Hackathon Code"**: Remove hardcoded pixels, inline styles, and inconsistent fonts.
2.  **Visual Unification**: Ensure the Landing Page, Merchant Portal, and Personal Workbench feel like one cohesive product.
3.  **Accessibility & Usability**: Increase minimum font size to 12px (`text-xs`), clarify empty states, and improve contrast.
4.  **Internationalization (i18n) Standardization**: Move away from inline `{zh: '', en: ''}` objects to proper resource files.

---

## 2. Design System: The "Visual Constitution"

### 2.1 Typography Hierarchy
We will strictly enforce Tailwind utility classes. **Direct use of arbitrary values (e.g., `text-[11px]`) is forbidden.**

| Role | Tailwind Class | Size/Weight | Usage |
|------|---------------|-------------|-------|
| **Page Title** | `text-2xl font-bold` | 24px Bold | Main page headers |
| **Section Title** | `text-xl font-semibold` | 20px Semi | Card headers, modal titles |
| **Subtitle** | `text-lg font-medium` | 18px Med | Sub-sections |
| **Body (Default)** | `text-sm` | 14px Reg | Standard content, table data |
| **Body (Small)** | `text-xs` | 12px Reg/Med | Secondary text, time, badges |
| **Caption** | `text-xs font-bold uppercase` | 12px Bold | Field labels, column headers |
| **Tiny (FORBIDDEN)**| `text-[10px]` | 10px | **DEPRECATED** - Upgrade to `text-xs` |

### 2.2 Color Palette (Semantic)
Defined in `tailwind.config.js` to ensure consistency.

- **Backgrounds**:
    - `bg-slate-900`: Main app capability.
    - `bg-slate-800/50`: Content Cards.
    - `bg-slate-950`: Modals/Overlays.
- **Primary Action**:
    - `bg-blue-600` hover `bg-blue-500`: Primary buttons.
    - `text-blue-400`: Links, highlights.
- **Status Indicators**:
    - **Success**: `text-emerald-400` / `bg-emerald-500/20`.
    - **Warning**: `text-amber-400` / `bg-amber-500/20`.
    - **Error**: `text-red-400` / `bg-red-500/20`.
    - **Neutral**: `text-slate-400` / `bg-slate-700/50`.

### 2.3 Component Primitives (To Be Created)
Stop copying implementation details. Build reusable atoms in `frontend/components/ui/`.

- `<Button variant="primary|secondary|ghost|danger" size="sm|md|lg" />`
- `<Card> <CardHeader> <CardContent> </Card>`
- `<Badge variant="success|warning|error|neutral" />`
- `<EmptyState icon={Icon} title="" description="" action={<Button>} />`

---

## 3. Workbench Organization Strategy

### 3.1 Personal Workbench (Consumer Focused)
*Simplify. Focus on Assets & Shopping.*

*   **Dashboard**: Wallet Balance (Big), Recent Activity, Quick Actions (Scan QR).
*   **My Agents**: Grid view of active personal agents.
*   **Wallet**:
    *   Consulate MPC, EOA, and Exchange Accounts.
    *   Unified Transaction History.
*   **Shopping (Orders)**:
    *   Consumer view of orders (Tracking, Refund Request).

### 3.2 Merchant Workbench (Business Focused)
*Data-Dense. Focus on Management & Analytics.*

*   **Refactor `MerchantModuleV2.tsx`**: Break this 2000-line file into sub-components:
    *   `MerchantDashboard.tsx`
    *   `ProductManagement.tsx`
    *   `OrderManagement.tsx`
    *   `FinanceModule.tsx`
*   **Navigation**: Keep the L2 Sidebar but clean up the icons and grouping.
*   **Tables**: Implement a standard `<DataTable>` with pagination, sorting, and bulk actions.

### 3.3 Developer Console (Technical Focused)
*Code-Centric. Focus on API & Integration.*

*   **API Keys**: Management with scoped permissions.
*   **Webhooks**: Debugger & Log Viewer (See recent delivery attempts).
*   **Skill Builder**: JSON Editor for MCP configuration.
*   **Docs**: Embedded API reference.

---

## 4. Main Website / Landing Page Optimization

The public face of Agentrix must communicate trust and high-tech capability.

### 4.1 Page Structure
1.  **Hero Section**: Clear value prop ("The AI Agent Payment Protocol").
    *   *Action*: "Start Building" (Dev) | "Open Wallet" (User).
2.  **Social Proof**: Tickers, Partner logos, Transaction volume stats.
3.  **Features Grid**:
    *   Payment Automation
    *   Agent Economy (Auto-Earn)
    *   Merchant Tools
4.  **How It Works**: 3-Step diagram (Connect -> Configure -> Earn).
5.  **Pricing/Tiers**: Free (Dev), Pro (Merchant), Enterprise.

---

## 5. Implementation Roadmap (Phased)

### Phase 1: Sanitation (Current Focus)
*   [x] Fix Mojibake (Encoding issues).
*   [x] Fix `text-[10px]` tiny fonts in Merchant Module.
*   [ ] Refactor `LoginModal` for better UX.
*   [ ] Extract `MerchantModuleV2` giant component into manageable files.

### Phase 2: Component Standardization
*   [ ] Create `components/ui/Button.tsx`.
*   [ ] Create `components/ui/Badge.tsx`.
*   [ ] Create `components/ui/Card.tsx`.
*   [ ] Replace all raw HTML button/div usages in Workbenches with these components.

### Phase 3: Infrastructure
*   [ ] **i18n Refactor**: Extract all `{ zh: '...', en: '...' }` into `locales/zh.json` and `locales/en.json`.
*   [ ] **Theme Config**: Finalize `tailwind.config.js` colors.

---

## 6. Specific Page Suggestions

| Page Path | Current Issue | Optimization Suggestion |
|-----------|---------------|-------------------------|
| `/agent-builder` | Too much text, confusing flow | Convert to a multi-step "Wizard" with progress bar. |
| `/merchant/orders` | Simple list, no bulk actions | Add filters, date range picker, and bulk export. |
| `/login` (Modal) | Hidden email option, small touch targets | Layout updated (Done), add Social Proof or Trust Badges below. |
| `/dashboard` | Empty states look broken | Use SVG illustrations for empty states, add "Get Started" buttons. |

---

**Next Steps**:
1.  Approve this standard.
2.  Begin "Phase 2: Component Standardization" while continuing to fix critical bugs in Phase 1.
