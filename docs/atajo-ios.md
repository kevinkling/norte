# Atajo de iOS: “Guardar en Norte”

Safari no deja que una PWA aparezca en la hoja **Compartir** del iPhone. Para guardar links desde Instagram, Pinterest o Mercado Libre se usa un Atajo que abre Norte con el link:

```
https://kevinkling.github.io/norte/nuevo?url=<link>
```

Norte guarda el link en la **Bandeja** y lo sincroniza en el momento.

## Armarlo (una sola vez)

1. Abrí la app **Atajos** → **+** (nuevo atajo).
2. Tocá el nombre de arriba → **Renombrar** → `Guardar en Norte`.
3. En el ícono **ⓘ** (detalles), activá **Mostrar en la hoja Compartir**.
   - En “Tipos de hoja Compartir” dejá solo **URL** y **Texto**.
   - Si no recibe nada: **Detener y responder**.
4. Agregá estas acciones, en orden:
   1. **Obtener URL de la entrada** (Get URLs from Input).
      Instagram a veces comparte texto con el link adentro; esta acción saca el link.
   2. **Obtener elemento de la lista** → **Primer elemento**.
   3. **Codificar URL** (URL Encode) → modo **Codificar**.
   4. **Texto** → escribí `https://kevinkling.github.io/norte/nuevo?url=` y, al final, insertá la variable **Texto codificado** del paso anterior.
   5. **Abrir URL** (Open URLs) con el resultado del paso 4.
5. Listo.

## Usarlo

En Instagram, Pinterest o Mercado Libre: **Compartir** → **Guardar en Norte**. Se abre Norte con “Guardado ✓”, y desde ahí podés:

- moverlo a una lista (por ejemplo, Setup);
- agregarle precio o cambiarle el nombre;
- dejarlo en la Bandeja y ordenarlo después.

## Cosas a saber

- **El Atajo abre Safari, no la app instalada.** Safari y la PWA tienen datos locales separados. Por eso Norte sincroniza con Supabase apenas guarda: en la app instalada lo vas a ver después del siguiente sync (al abrirla, o con el botón de sincronizar).
- **Sin conexión:** el link queda en Safari y se sube la próxima vez que abras Norte en Safari con internet.
- **Mercado Libre:** el nombre se arma con el título que viene en el link. Los links cortos (`meli.la/…`) no lo traen, así que quedan como “Producto de Mercado Libre”; podés renombrarlos.
- **Duplicados:** si guardás dos veces el mismo link, Norte te avisa y no lo duplica.
