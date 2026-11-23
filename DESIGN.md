# Norte · Guía de diseño ("Musgo")

**Para agentes y personas que modifiquen la UI.** Leé esto antes de tocar cualquier `.vue` o `.css`.
La meta es que toda la app se vea **una sola**: mismos tamaños, mismos colores, mismos patrones.
Si algo nuevo no encaja en lo que está acá, extendé el sistema (tokens/clases globales) y actualizá este archivo; no lo resuelvas con estilos sueltos.

- Tokens y clases globales: [`frontend/src/styles/main.css`](frontend/src/styles/main.css)
- Íconos: [`frontend/src/components/ui/AppIcon.vue`](frontend/src/components/ui/AppIcon.vue)

---

## 1. Principios

1. **Pocas cajas.** El fondo es la página. La barra superior y los campos para agregar van sueltos sobre el fondo. Las filas se agrupan en **un** bloque (`.group`) con separadores finos, nunca una tarjeta con sombra por ítem.
2. **Sin sombras**, salvo lo que flota de verdad: FAB, modales, diálogo de confirmación (`--shadow-float`).
3. **Un solo color de acción** (`--accent`, verde musgo): botón primario, pestaña activa, FAB, links. El rojo (`--danger`) es solo para borrar/archivar/errores y nunca es el color principal.
4. **Íconos antes que texto** en acciones repetidas o evidentes: cerrar ✕, agregar +, editar lápiz, archivar, mover, pegar, enviar. El texto queda para la acción principal de un formulario ("Guardar") y para acciones destructivas o ambiguas.
5. **El título aparece una vez**: lo pone la barra superior (`AppShell`). Las pantallas **no** dibujan su propio `<h1>/<h2>` de página.
6. **Emojis**: se usan solo como ícono de lista (🏠 Casa, 🚗 Auto…), para 📥 Bandeja y en el selector 🛒 Comprar / ✅ Hacer. En el resto de la interfaz van íconos de `AppIcon`.

## 2. Tokens

Todos en `:root` (claro) y `:root[data-theme='dark']` (oscuro) dentro de `main.css`. **No uses valores literales** (hex, px de tipografía, radios) en componentes; usá estas variables.

### Color

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--bg` | `#f3f4ef` | `#111613` | Fondo de página y de la barra superior |
| `--surface` | `#fbfbf8` | `#18201b` | Grupos, tarjetas, inputs, modales, barra inferior/lateral |
| `--inset` | `#e8eae2` | `#202a23` | Hover/pressed, segmentado, fondo de íconos de fila, miniaturas vacías |
| `--text` | `#1c231e` | `#e6ece4` | Texto principal |
| `--muted` | `#67705f` | `#95a291` | Texto secundario, meta, íconos apagados |
| `--border` | `#dde0d5` | `#28332b` | Bordes y separadores (1px) |
| `--accent` | `#2f6b4f` | `#7fc29c` | Acción principal, activo, links |
| `--accent-on` | `#f4faf6` | `#0c1a12` | Texto/ícono sobre `--accent` |
| `--accent-soft` | `#dceadf` | `#1f3528` | Chip activo, fila en edición |
| `--danger` / `--danger-soft` | `#b3412f` / `#f6e3df` | `#ef8a78` / `#3a211c` | Eliminar, archivar, errores, vencido |
| `--ok` | = accent | = accent | Check hecho, sincronizado |
| `--scrim` | | | Fondo detrás de modales |

Colores de marca de terceros (Instagram, Pinterest, Mercado Libre) solo como puntito `.src-dot` en `SourceLink.vue`.

### Tipografía

- UI: **DM Sans** (variable, `@fontsource-variable/dm-sans`) → `--font`
- Títulos: **Newsreader** 500/600 (`@fontsource/newsreader`) → `--display`. Solo para título de pantalla, nombre de marca y la cifra del presupuesto. Nunca en itálica.

| Token | Tamaño | Uso |
|---|---|---|
| `--fs-xs` | 12px | Encabezados de sección (MAYÚSCULAS), meta de filas, badges, labels de campo |
| `--fs-sm` | 14px | Botones, texto secundario, hints |
| `--fs-md` | 16px | Texto base, título de fila, inputs |
| `--fs-lg` | 20px | Título de modal, cifras destacadas |
| `--fs-xl` | 28px | Título de pantalla (display) |
| `--fs-2xl` | 40px | Cifra héroe (Presupuesto) |

No hay otros tamaños. Pesos: 400 (texto), 500 (títulos de fila), 600 (botones, labels, énfasis). Evitá 700+.

### Forma, alturas y espacio

| Token | Valor | Uso |
|---|---|---|
| `--r-sm` | 8px | Botón chico, miniaturas, ícono de fila, ítems de la barra lateral |
| `--r-md` | 12px | Grupos, tarjetas, inputs, botones |
| `--r-lg` | 16px | Modales, FAB |
| `--r-pill` | 999px | Chips, segmentado, botón ícono, badges |
| `--h-sm` | 32px | `.btn-sm`, chip, segmentado, ícono dentro de un input |
| `--h-icon` | 36px | `.icon-btn` |
| `--h-ctl` | 40px | `.btn`, inputs, `.composer` |
| `--h-row` | 52px | Alto mínimo de `.list-row` |
| `--sp-1…6` | 4 · 8 · 12 · 16 · 24 · 32 | Espaciados. Entre bloques de una pantalla: `--sp-5` |
| `--nav-h` | 60px | Barra inferior (celular) |
| `--side-w` | 240px | Barra lateral (escritorio, ≥ 900px) |

## 3. Layout (`AppShell.vue`)

- **Celular (< 900px)**: barra superior *sticky* plana (fondo `--bg`, sin borde) con título + acciones de la pantalla + sync + tema. Barra inferior fija, plana, `--surface` con borde superior, 5 pestañas: Lista, Comprar, Bandeja, Presupuesto, Más.
- **Escritorio (≥ 900px)**: barra lateral fija (`--surface`, borde derecho). La barra superior queda arriba del contenido (sin sync/tema, que están en la lateral). Contenido centrado, `max-width: 720px`.
- **Título de pantalla**: se toma de `route.meta.title` (en `app/router.ts`). En listas, es el nombre de la lista y abre el selector de listas (en celular).
- **Volver**: si la ruta tiene `meta.back` (subpantallas de Más), la barra muestra una flecha ‹.
- **Acciones de pantalla** (ej. ⋯ "Editar lista"): no van en el contenido; se teletransportan a la barra superior:

```vue
<Teleport defer to="#page-actions">
  <button class="icon-btn" type="button" aria-label="Editar lista" @click="…"><AppIcon name="more" /></button>
</Teleport>
```

- Raíz de cada pantalla: `<section class="page">` (grid con `gap: --sp-5`).

## 4. Componentes y clases globales

Usá estas clases. Los `<style scoped>` de cada componente deberían quedar cortos y solo para lo propio de esa pantalla.

| Necesito… | Usá |
|---|---|
| Lista de cosas (ítems, tareas, menús, ajustes) | `.group` > `.list-row` (con `.row-main` > `.row-title` + `.row-meta`, y `.row-end` para el precio) |
| Ícono al inicio de una fila de menú | `<span class="row-icon"><AppIcon name="…" :size="18" /></span>` |
| Flecha de navegación en una fila | `<AppIcon class="row-chevron" name="chevron-right" :size="16" />` |
| Fila destructiva en un menú | `.list-row.is-danger` |
| Encabezado de sección | `<h2 class="sec-h">Para comprar <span class="count">3</span><span class="aside">$ 10.000</span></h2>` |
| Bloque suelto (resumen, héroe) | `.card` (+ `.card-pad`) o `<AppCard>` |
| Botón de texto | `.btn`, `.btn-primary`, `.btn-danger`, `.btn-ghost`, `.btn-sm`, `.btn-block` |
| Botón solo ícono | `.icon-btn` (+ `.is-muted`, `.is-danger`, `.is-fill`, `.is-sm`). **Siempre con `aria-label`** y, si ayuda, `title` |
| Campo + botón (alta rápida, Bandeja, crear lista) | `.composer` con `<input>` y un `.icon-btn.is-fill` adentro |
| Formulario | `<form class="form">`, `.field` (label con `<span>` en mayúsculas), `.grid-2`, `.check-row`, `.form-actions` (con `<span class="spacer">` para separar Eliminar a la izquierda y Guardar a la derecha) |
| Opciones excluyentes chicas (Comprar/Hacer, pestañas) | `.segmented` con `aria-pressed` o `aria-selected` |
| Filtro / etiqueta / select compacto | `.chip` (activo con `aria-pressed="true"` o `.is-on`); `select.chip` |
| Crear algo en pantallas de colección | `.fab` con `<AppIcon name="plus" :size="24" :stroke="2.2" />` |
| Textos vacíos / ayudas | `.empty-state` (centrado), `.hint` (pequeño, alineado a la izquierda), `.lead` (bajada de pantalla) |
| Contadores | `.badge` (`.is-danger` para conflictos), `.badge-dot` para avisos sin número |
| Check de fila | `<button class="row-check" :aria-pressed="hecho">` (redondo para ítems, `.is-square` para tareas) |

Componentes de UI:

- **`AppModal`**: hoja desde abajo en celular (sin tapar la barra inferior), diálogo centrado en escritorio. Cierra con ✕ (`icon-btn`), Esc o tocando afuera. El botón principal del formulario va al final, alineado a la derecha, dentro de `.form-actions`.
- **`ConfirmDialog` / `askConfirm()`**: para toda acción destructiva. El foco arranca en "Cancelar".
- **Hojas de acciones** (`ItemSheet`, `TaskSheet`, inspiración): un `.group` de `button.list-row` con `row-icon`. Eliminar/Archivar siempre al final con `.is-danger`.
- **`ItemCard` / `TaskCard`**: son **filas** (`.list-row`), no tarjetas. Van siempre dentro de un `.group` (o de `<SortableList class="group">`). Tocar la fila abre la hoja de acciones; no agregues botones ⋯ por fila.
- **`AppIcon`**: única fuente de íconos (trazo 1.8px, estilo Lucide). Tamaños: 18 en filas y botones chicos, 20 por defecto, 22 en la barra inferior, 24 en el FAB. Para uno nuevo, agregá su SVG a `ICONS`; no pegues `<svg>` sueltos en las pantallas (excepción: la aguja del logo en `AppShell`).

## 5. Estados e interacción

- Hover solo en dispositivos con puntero (`@media (hover: hover)`); `:active` usa `--inset`.
- Foco visible: `outline: 2px solid var(--focus)`.
- Deshabilitado: `opacity: .45`; el primario deshabilitado se ve gris (`--inset` / `--muted`), no verde lavado.
- Transiciones de 150ms (`--ease`). Todo se apaga con `prefers-reduced-motion`.
- Al presionar, nada cambia de tamaño ni empuja el layout (salvo el FAB, que escala 0.95).
- Áreas táctiles: los botones ícono miden 36px; no bajes de 32px.

## 6. Texto

- Español rioplatense, tuteo con voseo ("Pegá", "Elegí"), frases cortas.
- Botones con verbo ("Guardar", "Sincronizar"), sin signos ni emojis.
- Encabezados de sección en mayúsculas los pone el CSS (`.sec-h`): escribilos normal en el template.

## 7. Qué no hacer

- ❌ Colores, tamaños de fuente, radios o sombras literales en componentes.
- ❌ Una tarjeta con borde y sombra por cada ítem de una lista.
- ❌ Botones de texto para cerrar, agregar o editar cuando alcanza un ícono.
- ❌ Repetir el título de la pantalla dentro del contenido.
- ❌ Varios botones apilados de ancho completo (usá un menú `.group` de filas).
- ❌ Usar `--danger` como color de acción principal, o `--accent` para borrar.
- ❌ Grano, neumorfismo, glassmorphism, gradientes decorativos.
- ❌ Fuentes nuevas, o Newsreader en texto corrido / itálica.

## 8. Checklist antes de terminar un cambio de UI

1. ¿Usé solo tokens y clases de `main.css`? ¿El `<style scoped>` quedó chico?
2. ¿Se ve bien en **claro y oscuro**, en **celular (375px)** y en **escritorio (≥ 900px)**?
3. ¿Cada `.icon-btn` tiene `aria-label`?
4. ¿Las listas están en un `.group` y las acciones de pantalla en `#page-actions`?
5. `pnpm build` (incluye `vue-tsc`) y `pnpm test` pasan.
6. Si agregaste un patrón nuevo, ¿lo documentaste acá?
