---
tags: [pdf, exportação, impressão, whatsapp]
updated: 2026-03-21
---

# 20 — PDF e Exportação

> [[00 - MOC (Índice)|← Índice]]

## 📤 Funcionalidades de Exportação

| Funcionalidade | Tecnologia | Ficheiro |
|---|---|---|
| PDF Escala Mensal | jsPDF + autoTable | EscalaMensal.tsx |
| PDF Escala Semanal | jsPDF + autoTable | EscalaSemanal.tsx |
| Impressão Mensal | Browser Print API | EscalaMensal.tsx |
| Impressão Semanal | Browser Print API | EscalaSemanal.tsx |
| Partilha WhatsApp | html2canvas + Clipboard API | Ambos |

---

## 📄 PDF Escala Mensal

### Função: `exportPDF()`
```typescript
// Configuração jsPDF
orientation: "landscape"
format: "a4"
// Ficheiro: Escala_Mensal_YYYY-MM.pdf
```

### Estrutura do PDF
- **Cabeçalho:** Nome empresa + departamento + "Escala Mensal — [Mês Ano]"
- **Tabela:** Auxiliares × Dias
  - Coluna: Nº mec.
  - Coluna: Nome
  - Colunas: 1 por dia do mês (1-28/31)
- **Cores:** Convertidas de hex para RGB (jsPDF)
- **Centrado:** auto-centra com base na largura do mês

### Cores dos Turnos no PDF
Usa `hexToRgb()` para converter as cores hex dos turnos para RGB necessário pelo jsPDF.

---

## 📄 PDF Escala Semanal

### Função: `exportPDF()`
```typescript
// Configuração jsPDF
orientation: "landscape"
format: "a4"
totalWidth: 277  // mm
// Ficheiro: Escala_Semanal_YYYY-MM-DD.pdf
```

### Estrutura do PDF

```
[Cabeçalho: título + semana]
[3 linhas de header: Dia | T | RX URG | TAC2 | TAC1 | EXAM1 | EXAM2 | SALA6 | SALA7 | TRANSPORT]
[Corpo: 7 dias × 3 turnos por linha]
[Rodapé: 3 notas operacionais]
```

### Larguras de Colunas (mm)
| Coluna | Largura |
|---|---|
| Dia | 20 |
| T (turno) | 8 |
| RX URG | 32 |
| TAC2 | 30 |
| TAC1 | 27 |
| EXAM1 | 33 |
| EXAM2 | 34 |
| SALA6 | 27 |
| SALA7 | 27 |
| TRANSPORT | 39 |

### Cores das Linhas por Turno
- **N** → `#BDD7EE` (azul claro)
- **M** → `#C6EFCE` (verde claro)
- **T** → `#FFC000` (amarelo)
- **Médico** → cinzento

---

## 🖨️ Impressão (Browser Print)

### Função: `printEscala()`
```typescript
const html = generateTableHTML()  // HTML completo com CSS inline
const win = window.open("", "_blank")
win.document.write(html)
win.document.close()
setTimeout(() => {
  win.print()
  win.close()
}, 400)
```

### generateTableHTML()
Gera HTML completo com:
- `@page { size: A4 landscape; }`
- `color-adjust: exact; -webkit-print-color-adjust: exact;`
- Tabela com cores inline para cada célula

---

## 📱 Partilha WhatsApp

### Função: `shareWA()`
```typescript
// 1. Captura tableRef com html2canvas
const canvas = await html2canvas(tableRef.current, { scale: 2 })

// 2. Converte para Blob PNG
canvas.toBlob(async (blob) => {
  // 3a. Tenta copiar para clipboard
  await navigator.clipboard.write([
    new ClipboardItem({ "image/png": blob })
  ])
  // Toast: "Imagem copiada! WhatsApp aberto."

  // 3b. Fallback: download directo
  // Toast: "A descarregar imagem..."
}, "image/png")

// 4. Abre grupo WhatsApp
window.open("https://chat.whatsapp.com/...", "_blank")
```

### Links WhatsApp
- **Mensal:** `https://chat.whatsapp.com/L3sgtM9ZkP046xVbkBi5gH`
- **Semanal:** `https://chat.whatsapp.com/FUWDNsJBbgn3n6sa6YR6a6`

---

## 🔗 Ver Também

- [[06 - Escala Mensal]] — exportPDF mensal
- [[07 - Escala Semanal]] — exportPDF semanal
- [[22 - Dependências]] — jsPDF, html2canvas
