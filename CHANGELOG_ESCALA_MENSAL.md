# Alterações na Escala Mensal - Funcionalidades de PDF

## 📋 Resumo das Mudanças

Foi implementada uma solução completa para **impressão e download em PDF** da tabela mensal com melhor formatação e layout vertical.

---

## ✨ Novas Funcionalidades

### 1. **Botão Imprimir**
- Ícone: 🖨️ Printer
- Abre uma janela de visualização de impressão
- Permite escolher a impressora e configurações de impressão do navegador
- Formata a tabela no padrão vertical (Portrait)
- Mantém as cores e formatação da tabela

### 2. **Botão Baixar PDF**
- Ícone: 📥 File Down
- Baixa o arquivo PDF diretamente
- Nome do arquivo: `Escala_Mensal_YYYY-MM.pdf`
- Formato: Vertical (Portrait) com origem A4
- Otimizado para leitura e impressão posterior

---

## 🔧 Alterações Técnicas

### Dependências Adicionadas
```json
{
  "html2pdf.js": "^0.10.1"
}
```

### Funções Refatoradas

#### `generateTableHTML()`
- Nova função que centraliza a geração do HTML da tabela
- Usa para ambas as funcionalidades (Imprimir e Baixar PDF)
- HTML com estilos CSS otimizados para impressão
- Tabela centralizada e bem formatada

#### `printEscala()`
- Nova função para abrir janela de impressão
- Chama `generateTableHTML()` internamente
- Abre em janela separada com `window.open()`
- Permite controle total de impressão do navegador

#### `exportPDF()`
- Modificada para usar `html2pdf.js`
- Gera arquivo PDF Download
- Configurações:
  - Orientação: Portrait (vertical)
  - Tamanho: A4
  - Margem: 10mm
  - Qualidade: Alta
  - Compressão: Ativada

### Layout da Tabela em PDF

```
┌─────────────────────────────────────────────┐
│     ESCALA MENSAL – MARÇO DE 2026           │
├──────┬────────────────┬───────────────────┤
│ Nº   │ Nome           │ 1  2  3  4   ... 31│
├──────┼────────────────┼───────────────────┤
│ 001  │ João Silva     │ MT MT T  N   ... D │
│ 002  │ Maria Santos   │ T  T  MT MT  ... N │
│ ...  │ ...            │ ...                │
└──────┴────────────────┴───────────────────┘
```

**Características:**
- ✓ Centralizado na página
- ✓ Título com mês e ano em destaque
- ✓ Colunas de números dos auxiliares (Nº) e nomes
- ✓ Dias do mês com números e dias da semana
- ✓ Cores preservadas (Turnos, Descansos, Folgas, etc.)
- ✓ Finais de semana destacados
- ✓ Padding adequado para legibilidade
- ✓ Suporta quebra de página automaticamente

---

## 📱 Interface de Usuário

### Antes (1 botão)
```
[PDF]
```

### Depois (2 botões)
```
[🖨️ Imprimir] [📥 Baixar PDF]
```

Botões adicionados na seção de ações do header, junto aos botões "Gerar Escala", "Limpar" e "WhatsApp".

---

## 🎯 Como Usar

### Para Imprimir:
1. Clique em **"Imprimir"**
2. Será aberta uma janela com a tabela
3. Use `Ctrl+P` ou clique em Imprimir no navegador
4. Configure sua impressora e opções
5. Clique em "Imprimir"

### Para Baixar PDF:
1. Clique em **"Baixar PDF"**
2. O arquivo será baixado automaticamente
3. Salve em seu computador
4. Pode ser impressa depois ou compartilhada

---

## ✅ Vantagens

✓ **Dois formatos de saída**: Impressão direta e download persistente
✓ **Melhor formatação**: Layout otimizado para impressão vertical
✓ **Tabela centralizada**: Aproveitamento melhor da página A4
✓ **Cores preservadas**: Facilita identificação de turnos e códigos especiais
✓ **Arquivo nomeado**: PDF inclui mês e ano no nome
✓ **Compatível**: Funciona em todos os navegadores modernos
✓ **Responsivo**: Adapta-se automaticamente ao tamanho da página

---

## 🐛 Notas de Implementação

- A função `shareWA()` continua funcionando normalmente
- Os botões "Gerar Escala", "Limpar" e "Reverter" não foram afetados
- O PDF é gerado dinamicamente a partir dos dados atuais da tabela
- A impressão abre em nova aba/janela (pode ser bloqueado por navegador)
- O download automático respeita as configurações do navegador

---

## 📦 Estrutura de Arquivos

**Arquivo modificado:**
- `src/pages/EscalaMensal.tsx`

**Importações adicionadas:**
```typescript
import html2pdf from "html2pdf.js"
import { Printer } from "lucide-react"
```

---

**Data:** 11 de março de 2026
**Status:** ✅ Implementado e testado
