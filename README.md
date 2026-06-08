# Visualizador de Google Sheets (SheetsBoard) 📊

Una aplicación web moderna, responsive y muy refinada construida sobre **React**, **TypeScript** y **Tailwind CSS**. Permite cargar datos desde enlaces de Google Sheets compartidos o de archivos CSV locales mediante arrastrar y soltar, interpretando automáticamente los tipos de datos en tiempo real para generar métricas clave (KPIs) y gráficos interactivos con Recharts.

---

## 🚀 Requisitos para Ejecución Local

Para ejecutar esta aplicación en tu propia máquina de desarrollo, asegúrate de tener instalado **Node.js** (versión 18+ recomendada) y sigue estos pasos:

### 1. Clonar o descargar el código
Descarga el código o descomprime el archivo ZIP del proyecto en un directorio local.

### 2. Instalar dependencias
Abre tu terminal en la raíz del proyecto y ejecuta:

```bash
npm install
```

### 3. Iniciar el servidor de desarrollo
Para iniciar la aplicación localmente en modo Hot reload (recarga automática):

```bash
npm run dev
```

Esto levantará el servidor de desarrollo en la dirección:  
**`http://localhost:3000`**

### 4. Generar Build de Producción
Si quieres construir un paquete estático optimizado para producción listo para desplegar:

```bash
npm run build
```

---

## 🌍 Cómo Conectar y Configurar tus Hojas de Cálculo

Por defecto, la aplicación se inicia conectándose de forma segura a la hoja de cálculo de ejemplo proporcionada:  
`https://docs.google.com/spreadsheets/d/1YDCjClzPGpicpCpYqve6jWTaUtMMRQDjBrPc0rvmKPo/edit?usp=sharing`

Si deseas visualizar **cualquier otra hoja de cálculo propia**, sigue las siguientes instrucciones de configuración:

### Opción A: Compartir como Lector Público (Recomendado y más simple)
Google Sheets permite descargar automáticamente libros públicos en formato CSV mediante su URL estándar si están compartidos correctamente.
1. Abre tu hoja de cálculo en Google Sheets.
2. Haz clic en el botón superior derecho **Compartir**.
3. En el apartado de **Acceso General**, cambia la configuración por defecto de "Restringido" a **"Cualquier persona con el enlace"** en modo **Lector**.
4. Copia el enlace de la barra de direcciones de tu navegador (ej: `https://docs.google.com/spreadsheets/d/[ID_DE_HOJA]/edit...`) y pégalo directamente en la barra de búsqueda superior de nuestra aplicación web. ¡La aplicación extraerá el ID automáticamente y recuperará la información!

### Opción B: Compartir mediante Publicación en la Web
Si por algún motivo la opción anterior no descarga la información, puedes publicar la hoja como archivo estructurado CSV:
1. Abre tu documento de Google Sheets.
2. Haz clic en **Archivo > Compartir > Publicar en la Web**.
3. En la ventana emergente, selecciona si deseas publicar **Todo el documento** o una pestaña en particular (ej: *Hoja 1*).
4. Cambia el formato de salida de "Página Web" a **Valores separados por comas (.csv)**.
5. Haz clic en **Publicar** y confirma la acción.
6. Copia el enlace que te brinda Google Sheets (ej. termina con `.../pub?output=csv`) y pégalo directamente en nuestra aplicación de visualización.

---

## 🛠️ Modificar el enlace por defecto en el código fuente

Si quieres que la aplicación cargue **otra hoja por defecto** automáticamente al iniciar sin tener que pegarla cada vez, puedes modificar el valor dentro de la aplicación:

1. Abre el archivo `/src/components/DataLoader.tsx`.
2. Busca la constante llamada `DEFAULT_SHEET_URL` en la parte superior:
   ```typescript
   const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/TU_NUEVO_ID_AQUI/edit?usp=sharing";
   ```
3. Guarda el archivo y el visor cargará tus datos de forma inmediata al iniciar.

---

## 📁 Estructura del Código Creado

La arquitectura elegida separa meticulosamente los distintos bloques del visualizador para garantizar escalabilidad:

- **`/src/types.ts`**: Declaración de interfaces y tipos de datos en TypeScript para tipados estrictos (Columnas, Filtros, Gráficos y Métricas).
- **`/src/lib/sheets.ts`**: Motores lógicos independientes para el parseo RFC 4180 de CSV, normalización, inferencia de tipos automatizada (fechas, porcentajes, números, texto o categorías), filtros columna por columna, agregaciones de métricas (promedio, suma, máximos, mínimos) y conversión para descarga en CSV.
- **`/src/components/DataLoader.tsx`**: Entrada de datos. Gestiona la url de Sheets y expone un sandbox Drag-and-Drop / carga manual para files `.csv`, con un manejador de estados refinado con banners informativos.
- **`/src/components/FiltersPanel.tsx`**: Controles de búsqueda global del set y selectores de rango numérico ajustables a los límites numéricos detectados, selectores de fecha personalizados y menús multi-select de categorías.
- **`/src/components/KPICards.tsx`**: Renderiza paneles resumen (KPIs) calculando promedios y sumas de la primera y segunda columna numérica encontrada.
- **`/src/components/ChartsView.tsx`**: El constructor visual. Configura ejes X e Y, métricas matemáticas sobre los datos filtrados y dibuja gráficos sofisticados de barras, líneas, área, tarta (con limitación a Top 8 + Otros) y barras horizontales usando Recharts.
- **`/src/App.tsx`**: Coorindador principal. Estructura el layout general, maneja el cambio de pestañas ("Tabla" y "Gráficas") compartiendo los estados de filtrados, y habilita el cambio instantáneo entre el **Modo Oscuro** (Cosmic Slate) y **Modo Claro** (Classic Soft) para asegurar confort visual de tus datos.
