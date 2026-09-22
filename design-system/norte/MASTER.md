# Norte — Master design system

Un sistema, dos temas: **Brújula** (papel de día) y **Bitácora** (diario de noche).
PWA personal offline-first de casa y auto. No es un SaaS.

## Concepto

Diario de bordo doméstico. El nombre es una aguja: rumbo, no dashboard.
Casa y Auto son mundos, no pestañas. El presupuesto habla de lo que **queda**.

## Typography

- Display: **Fraunces** italic for the wordmark and hero numbers
- UI: **Figtree** 400–700
- Production PWA may keep system-ui; mockups use this pairing to lock the voice
- Never Inter, never Plus Jakarta as the brand face

## Color — Brújula (paper)

| Role | Hex | Token |
|------|-----|-------|
| Background | `#F1EBE0` | `--bg` |
| Surface | `#F7F2E8` | `--surface` |
| Inset | `#E7E0D3` | `--inset` |
| Ink | `#1C1914` | `--ink` |
| Muted | `#6A6256` | `--muted` |
| Accent / needle | `#B42318` | `--accent` |
| On accent | `#FFF8F0` | `--accent-on` |
| OK | `#3F5D4E` | `--ok` |
| Line | `#D4CBBA` | `--line` |

## Color — Bitácora (night)

| Role | Hex | Token |
|------|-----|-------|
| Background | `#12161C` | `--bg` |
| Surface | `#1B212B` | `--surface` |
| Inset | `#0E1218` | `--inset` |
| Cream | `#EDE4D4` | `--ink` |
| Muted | `#A39480` | `--muted` |
| Accent / brass | `#C4A574` | `--accent` |
| On accent | `#16120C` | `--accent-on` |
| OK | `#8FB59C` | `--ok` |
| Line | `#2C3542` | `--line` |

Accent **changes with theme**: cardinal by day, brass by night. That is the compass.

## Layout / IA

- Header: wordmark + theme + Casa | Auto
- Tab bar (5): Ítems, Tareas, Ideas, Presupuesto, Más
- Compras, categorías, conflictos live in Más
- Item actions (edit / buy / archive) live in a bottom sheet, not on every card
- FAB for new item
- Budget hero = remaining money, then combinations

## Shape and texture

- Radius 16–18px cards, 22px tab bar, pills for filters
- Light: paper grain ~12%, soft warm shadow
- Dark: overlay grain, no neon, no glassmorphism
- Icons: 1.8px stroke, one family, no emoji

## Motion

- 150–200ms ease
- Respect `prefers-reduced-motion`
- Pressed controls do not shift layout

## Anti-patterns

- Six-item bottom nav
- Neumorphism as the brand (kept only as discarded "Taller" exploration)
- Teal/orange SaaS palettes
- Three action buttons on every card
- Budget screens that lead with a form
- Google fonts in the shipped PWA unless we decide to load them

## Mockups

- Gallery: `docs/mockups/index.html`
- Unified prototype: `docs/mockups/brujula.html` (theme toggle → Bitácora)
- Explorations kept: `taller.html`, `bitacora.html`
