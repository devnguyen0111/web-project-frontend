# Front-end Design System v1

**Project:** Personal Website Platform (Blog + Wallet + Subscription + Admin)  
**Version:** 1.0  
**Style Direction:** Modern Minimal + Data-first SaaS  
**Tech:** Next.js (App Router) + React + Tailwind (khuyến nghị)

---

## 1) Design Principles

1. **Content & data first**: UI ưu tiên đọc nhanh, thao tác nhanh.
2. **One style only**: Không trộn nhiều phong cách (glass/neumorphism/brutalism) trong cùng sản phẩm.
3. **Consistency over novelty**: Cùng loại component phải cùng hành vi + cùng visual rule.
4. **Accessible by default**: Contrast, focus, keyboard, touch target là bắt buộc.
5. **Scalable system**: Dùng token + primitives + page template để mở rộng phase sau.

---

## 2) Brand & Visual Tone

- **Tone:** Professional, clean, trustworthy
- **Density:** Medium (đủ thoáng nhưng không lãng phí diện tích)
- **Shape language:** bo góc vừa (10–12px), border mảnh, shadow nhẹ
- **Icon style:** 1 bộ icon duy nhất (Lucide/Heroicons), stroke consistent

---

## 3) Design Tokens (Semantic)

> Dùng token semantic, không hardcode hex trực tiếp trong component.

### 3.1 Color Tokens

:root {
--bg: #F8FAFC;
--surface: #FFFFFF;
--surface-muted: #F1F5F9;

--text-primary: #0F172A;
--text-secondary: #475569;
--text-muted: #64748B;

--border: #E2E8F0;
--border-strong: #CBD5E1;

--primary: #2563EB;
--primary-hover: #1D4ED8;
--primary-soft: #DBEAFE;

--success: #16A34A;
--success-soft: #DCFCE7;

--warning: #D97706;
--warning-soft: #FEF3C7;

--danger: #DC2626;
--danger-soft: #FEE2E2;

--info: #0284C7;
--info-soft: #E0F2FE;

--focus-ring: #93C5FD;
}

### 3.2 Radius / Shadow / Spacing

:root {
--radius-sm: 8px;
--radius-md: 10px;
--radius-lg: 12px;
--radius-xl: 16px;

--shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
--shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08);

--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
}

---

## 4) Typography System

### 4.1 Font Family

- **Primary:** Inter
- **Optional heading accent:** Manrope

### 4.2 Type Scale

| Token     | Size | Weight | Line-height | Use                   |
| --------- | ---: | -----: | ----------: | --------------------- |
| `display` | 32px |    700 |         1.2 | Hero / page highlight |
| `h1`      | 28px |    700 |        1.25 | Major page title      |
| `h2`      | 24px |    700 |         1.3 | Section title         |
| `h3`      | 20px |    600 |        1.35 | Card section title    |
| `h4`      | 18px |    600 |         1.4 | Subsection            |
| `body-lg` | 16px |    400 |         1.6 | Default body          |
| `body-sm` | 14px |    400 |         1.5 | Metadata              |
| `caption` | 12px |    500 |         1.4 | Label/helper          |

**Rules**

- Body text không dưới 16px trên mobile cho nội dung chính.
- Tối đa 2 font family toàn hệ thống.

---

## 5) Layout System

### 5.1 Grid & Container

- Desktop: 12-column grid
- Tablet: 8-column
- Mobile: 4-column
- Max content width: `1200px` hoặc `1280px`
- Gutter: 16px (mobile), 24px (tablet), 24–32px (desktop)

### 5.2 Breakpoints (khuyến nghị)

sm: 640
md: 768
lg: 1024
xl: 1280
2xl: 1536

### 5.3 Page Skeleton

- `TopNav` (global)
- `MainContent`
- `OptionalRightPanel` (filter/stats/context actions)
- `Footer` (public pages)

---

## 6) Core Components Spec

### 6.1 Button

Variants:

- `primary` (solid)
- `secondary` (outline)
- `ghost`
- `danger`

Sizes:

- `sm` (36px), `md` (40px), `lg` (44px)

States:

- default / hover / active / focus / disabled / loading

Rules:

- Touch target tối thiểu 44x44
- Loading phải disable click và có spinner

---

### 6.2 Input / Form Controls

- Label luôn visible (không dùng placeholder thay label)
- Helper text dưới input
- Error text dưới field liên quan
- Border mặc định `--border`, focus dùng `--focus-ring`
- Field height: 40–44px

---

### 6.3 Card

- Background: `--surface`
- Border: 1px `--border`
- Radius: `--radius-lg`
- Shadow: `--shadow-sm` (hover có thể `--shadow-md`)
- Padding chuẩn: 16–24px

---

### 6.4 Badge / Status Chip

Variants:

- success, warning, danger, info, neutral

Use cases:

- subscription status
- payment status
- order status
- moderation status

---

### 6.5 Table (Admin/Data page)

- Header rõ ràng, sticky nếu dài
- Row hover nhẹ
- Actions column cố định bên phải
- Empty state bắt buộc có CTA

---

### 6.6 Modal / Drawer

- Backdrop rõ (40–60% black)
- Có nút close rõ ràng
- Esc + click outside (nếu không destructive flow)
- Focus trap trong modal

---

## 7) Motion & Interaction

- Duration: 150–250ms (micro), tối đa 300ms
- Easing: `ease-out` cho enter, `ease-in` cho exit
- Chỉ animate `opacity`, `transform`
- Tôn trọng `prefers-reduced-motion`

---

## 8) Accessibility Standards (Non-negotiable)

1. Contrast body text >= 4.5:1
2. Focus ring visible cho mọi interactive element
3. Keyboard navigation đầy đủ (Tab/Shift+Tab/Enter/Esc)
4. Icon-only button bắt buộc có `aria-label`
5. Không dùng màu là tín hiệu duy nhất (kèm icon/text)
6. Touch target >= 44px

---

## 9) Page-Level Guidelines

### 9.1 Public Pages (Home/Blog/Post/Profile)

- Hero tối giản, tập trung giá trị chính
- Bài viết dạng card clean, metadata rõ
- TOC/tag/filter không lấn át content

### 9.2 Auth Pages

- Layout đơn giản, ít nhiễu
- Ưu tiên trust cues: secure login, 2FA support

### 9.3 Wallet & Subscription (Phase 3 core)

- Thứ tự ưu tiên:
  1. Current balance / plan
  2. Main CTA (Deposit / Upgrade / Renew)
  3. History / details
- Status màu semantic chuẩn

### 9.4 Admin Pages

- Data-first: table + filters + quick actions
- KPI cards trên cùng
- Empty/loading/error states đầy đủ

---

## 10) Content & Copy Rules (UI Writing)

- Ngắn, rõ, action-oriented
- Nút dùng động từ rõ: “Nạp coin”, “Gia hạn”, “Lưu thay đổi”
- Error nói rõ nguyên nhân + hướng xử lý
- Tránh jargon nội bộ ở UI public

---

## 11) Dark Mode Strategy (Phase 2 của design)

- Code từ đầu theo semantic token
- Không invert màu thủ công
- Đảm bảo contrast riêng cho dark theme
- Có thể rollout sau khi system light ổn định

---

## 12) Implementation Architecture (khuyến nghị)

src/
design/
tokens.ts
themes/
light.ts
dark.ts
components/
ui/
Button.tsx
Input.tsx
Card.tsx
Badge.tsx
Modal.tsx
Table.tsx
layouts/
PublicLayout.tsx
DashboardLayout.tsx
AuthLayout.tsx

---

## 13) PR Review Checklist (copy cho team)

- [ ] Có dùng token thay vì hardcode màu/spacing?
- [ ] Component có đúng variant/size chuẩn?
- [ ] Focus/keyboard/accessibility đủ chưa?
- [ ] Responsive mobile/tablet/desktop ổn chưa?
- [ ] Loading/empty/error states đủ chưa?
- [ ] Không dùng emoji làm icon UI?
- [ ] Không phá consistency với page khác?

---

## 14) Anti-patterns cần tránh

1. Trộn nhiều style trong một app
2. Hardcode màu từng chỗ
3. Placeholder-only forms
4. Nút nhỏ, khó bấm
5. Animation quá nhiều / quá dài
6. Data table không có empty/loading state
7. Lệch spacing giữa các section tương đương
