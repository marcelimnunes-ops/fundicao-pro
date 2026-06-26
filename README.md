# 🏭 FUNDIÇÃO PRO v1.0

Sistema profissional de gestão de fundição com cálculos automáticos, dashboards inteligentes e relatórios avançados.

## 📊 Features

### ✅ Implementado

- **Dashboard** com 5 KPIs principais
- **Apontamento de Produção** com cálculos automáticos
- **Gestão de Produtos** (cadastro, consulta)
- **Gestão de Funcionários** (moldadores, ajudantes, etc)
- **Controle de Estoque** (Lingote, Sucata, Óleo)
- **Relatórios** (Performance, Rentabilidade, Resumo)
- **Configurações** do Sistema (parâmetros ajustáveis)
- **Autenticação** com Supabase
- **Interface responsiva** (mobile, tablet, desktop)
- **Cálculos automáticos** de custos e eficiência

### 🔄 Calculados Automaticamente

```
✓ Alumínio Bruto = peso_galho × caixas × MARGEM
✓ Consumo Óleo = Al_Bruto / LITROS_POR_KG
✓ Custo M.O. = custo_hora × tempo_horas
✓ Custo Alumínio = Al_Bruto × custo_médio
✓ Custo Óleo = consumo_óleo × custo_litro
✓ Custo Total = M.O. + Alumínio + Óleo
✓ Custo/Peça = Custo Total / peças_úteis
✓ Taxa Perda % = (perdas / total_peças) × 100
✓ Eficiência % = (peças_úteis / peças_produzidas) × 100
✓ Caixas/Hora = qtd_caixas / tempo_horas
```

### 🎯 KPIs Disponíveis

1. Peças Produzidas (hoje/semana/mês)
2. Kg Fundidos
3. Taxa de Perda %
4. Custo/Peça
5. Eficiência %
6. Performance Moldadores
7. Rentabilidade por Produto
8. Rentabilidade por Cliente
9. Estoque por Material
10. E mais...

---

## 🚀 QUICK START

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta Supabase
- Conta GitHub

### Instalação Local

```bash
# Clonar repositório
git clone https://github.com/marcelimnunes-ops/fundicao-pro.git
cd fundicao-pro

# Instalar dependências
npm install

# Configurar .env.local com credenciais Supabase
cp .env.local.example .env.local
# Edite .env.local com suas chaves

# Rodar em desenvolvimento
npm run dev

# Acessar
# http://localhost:3000
```

### Credenciais Demo

- **Email**: demo@fundicao.com
- **Senha**: demo123456

---

## 📁 ESTRUTURA DO PROJETO

```
fundição-pro/
├── src/
│   ├── pages/              # Páginas Next.js
│   │   ├── index.tsx       # Dashboard
│   │   ├── login.tsx       # Login
│   │   ├── apontamento.tsx # Apontamento
│   │   ├── produtos.tsx    # Produtos
│   │   ├── funcionarios.tsx # Funcionários
│   │   ├── estoque.tsx     # Estoque
│   │   ├── relatorios.tsx  # Relatórios
│   │   ├── configuracoes.tsx # Configurações
│   │   └── _app.tsx        # App Global
│   ├── components/         # Componentes React
│   │   └── Layout.tsx      # Layout Principal
│   ├── lib/                # Utilitários
│   │   ├── supabase.ts     # Cliente Supabase
│   │   ├── calculations.ts # Cálculos
│   │   ├── types.ts        # Tipos TypeScript
│   │   └── constants.ts    # Constantes
│   ├── hooks/              # Hooks Customizados
│   │   └── useProducao.ts  # Hook de Produção
│   └── styles/             # Estilos CSS
│       └── globals.css     # Estilos Globais
├── public/                 # Arquivos públicos
├── .env.local             # Variáveis de ambiente (local)
├── .env.production        # Variáveis de ambiente (produção)
├── next.config.js         # Config Next.js
├── tailwind.config.js     # Config Tailwind
├── tsconfig.json          # Config TypeScript
├── package.json           # Dependências
├── DEPLOYMENT.md          # Guia de Deployment
└── README.md              # Este arquivo
```

---

## 🛠️ TECNOLOGIAS

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Gráficos**: Recharts
- **Deploy**: Hostgator (Node.js)
- **Processamento**: PM2
- **Proxy**: Nginx

---

## 📚 DOCUMENTAÇÃO

### Guias Principais

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Guia completo de instalação e deployment
- [01-schema.sql](./01-schema.sql) - Schema do banco de dados
- [package.json](./package.json) - Dependências do projeto

### Documentação por Módulo

#### Cálculos (`src/lib/calculations.ts`)

```typescript
import { calcularApontamentoCompleto, formatarMoeda } from '@/lib/calculations';

// Calcular todos os valores de um apontamento
const resultado = calcularApontamentoCompleto(
  produtoData,
  funcionarioData,
  apontamentoData,
  parametrosSistema
);

console.log(resultado.custo_por_peca); // R$ 12.50
```

#### Hook de Produção (`src/hooks/useProducao.ts`)

```typescript
import { useProducao } from '@/hooks/useProducao';

function MeuComponente() {
  const {
    producoes,
    funcionarios,
    produtos,
    criarProducao,
    calcularProducao,
  } = useProducao();

  // ... usar dados
}
```

---

## 🔐 SEGURANÇA

### Variáveis de Ambiente

As chaves sensíveis ficam em `.env.local` (nunca commitado):

```env
# PUBLIC (seguro expor)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# PRIVATE (nunca expor)
SUPABASE_SERVICE_ROLE_KEY=...
```

### Row Level Security (RLS)

As tabelas têm RLS habilitado no Supabase por padrão. Adicione políticas conforme necessário.

### Autenticação

- Login via email/password (Supabase Auth)
- Sessões gerenciadas automaticamente
- Logout disponível em todas as páginas

---

## 📈 ESCALABILIDADE

O sistema foi projetado para:

- ✅ 100+ produtos
- ✅ 100+ clientes
- ✅ 50+ funcionários
- ✅ 10.000+ apontamentos mensais
- ✅ Múltiplas tabelas de preço por cliente

---

## 🐛 TROUBLESHOOTING

### Erro: "Cannot find module 'supabase'"

```bash
npm install @supabase/supabase-js
```

### Erro: "Connection to Supabase failed"

1. Verificar `.env.local` com credenciais corretas
2. Verificar URL do Supabase está correta
3. Verificar conexão de internet

### Erro: "Port 3000 already in use"

```bash
lsof -i :3000  # Encontrar processo
kill -9 PID    # Matar processo
```

---

## 📝 CHANGELOG

### v1.0.0 (25/06/2025)

- ✅ Dashboard com 5 KPIs
- ✅ Apontamento de produção
- ✅ Gestão de produtos
- ✅ Gestão de funcionários
- ✅ Controle de estoque
- ✅ Relatórios
- ✅ Configurações do sistema
- ✅ Autenticação Supabase
- ✅ Interface responsiva
- ✅ Cálculos automáticos

---

## 🎯 ROADMAP FUTURO

### v1.1 (Próximo)

- [ ] Integração com Nomus Tablets
- [ ] Mais gráficos avançados
- [ ] Análise de correlações
- [ ] Detecção automática de gargalos
- [ ] Alertas inteligentes
- [ ] Previsões (forecast)

### v2.0 (Médio Prazo)

- [ ] Multi-tenant (vários clientes)
- [ ] App mobile
- [ ] API pública
- [ ] Webhooks
- [ ] Integrações externas

---

## 💬 SUPORTE

Para dúvidas sobre:

- **Deployment**: Veja [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Desenvolvimento**: Consulte código comentado
- **Banco de Dados**: Veja [01-schema.sql](./01-schema.sql)
- **Cálculos**: Veja `src/lib/calculations.ts`

---

## 📄 LICENÇA

Proprietário - Marcelo Nunes / Fundição PRO

---

## 🙏 AGRADECIMENTOS

- Supabase (banco de dados)
- Next.js (framework)
- Tailwind CSS (estilos)
- Recharts (gráficos)

---

**Desenvolvido com ❤️ para fundições**

Fundição PRO v1.0 © 2025
