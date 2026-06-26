# 🚀 GUIA DE DEPLOYMENT - FUNDIÇÃO PRO

## 📋 ÍNDICE

1. [Pré-requisitos](#pré-requisitos)
2. [Configuração Supabase](#configuração-supabase)
3. [Configuração GitHub](#configuração-github)
4. [Instalação Local](#instalação-local)
5. [Deployment Hostgator](#deployment-hostgator)
6. [Testes Finais](#testes-finais)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 PRÉ-REQUISITOS

- Conta Supabase criada ✓
- Repositório GitHub criado ✓
- Acesso SSH Hostgator ✓
- Node.js 18+ instalado (para testes locais)
- Git instalado

---

## 1️⃣ CONFIGURAÇÃO SUPABASE

### Passo 1: Criar Banco de Dados

1. Acesse seu projeto Supabase
2. Vá para `SQL Editor`
3. Clique em `New Query`
4. Copie e cole TODO o conteúdo do arquivo `01-schema.sql`
5. Clique em `Run` para executar

```
✓ Isso criará:
  - 11 tabelas
  - Functions automatizadas
  - Triggers para cálculos
  - Dados iniciais
  - Índices de performance
```

### Passo 2: Configurar Autenticação

1. Vá para `Authentication` > `Providers`
2. Habilite `Email/Password`
3. Vá para `Users` > `Add User`
4. Crie usuário DEMO:
   - Email: `demo@fundicao.com`
   - Password: `demo123456`
   - Confirm password

### Passo 3: Obter Credenciais

1. Vá para `Settings` > `API`
2. Copie:
   - **Project URL**: `https://ingskuamhwvjiytzswmi.supabase.co`
   - **Anon public key**: `eyJ...`
   - **Service role secret**: `eyJ...`
3. Guarde essas informações (já foram passadas, mas confirme que estão corretas)

---

## 2️⃣ CONFIGURAÇÃO GITHUB

### Passo 1: Preparar Repositório

No seu computador, na pasta do projeto:

```bash
# Inicializar git (se não tiver)
git init

# Adicionar remote
git remote add origin https://github.com/marcelimnunes-ops/fundicao-pro.git

# Adicionar todos os arquivos
git add .

# Commit inicial
git commit -m "Initial commit: Fundição PRO v1.0"

# Push para GitHub
git push origin main
```

### Passo 2: Verificar no GitHub

1. Acesse: `https://github.com/marcelimnunes-ops/fundicao-pro`
2. Confirme que todos os arquivos estão lá:
   ```
   ├── src/
   │   ├── pages/
   │   ├── components/
   │   ├── lib/
   │   ├── hooks/
   │   └── styles/
   ├── package.json
   ├── next.config.js
   ├── .env.local
   └── README.md
   ```

---

## 3️⃣ INSTALAÇÃO LOCAL (TESTES)

### Passo 1: Clonar Repositório

```bash
git clone https://github.com/marcelimnunes-ops/fundicao-pro.git
cd fundicao-pro
```

### Passo 2: Instalar Dependências

```bash
npm install
```

### Passo 3: Configurar .env.local

Crie arquivo `.env.local` na raiz com:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ingskuamhwvjiytzswmi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Passo 4: Rodar em Desenvolvimento

```bash
npm run dev
```

Acesse: `http://localhost:3000`

Login com:
- Email: `demo@fundicao.com`
- Senha: `demo123456`

---

## 4️⃣ DEPLOYMENT HOSTGATOR

### Passo 1: Conectar via SSH

```bash
ssh -i /caminho/para/id_rsa senun491@senunmetal.com.br
```

### Passo 2: Preparar Ambiente

```bash
# Atualizar sistema
sudo apt update
sudo apt upgrade -y

# Instalar Node.js (se não tiver)
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar versão
node -v
npm -v

# Instalar PM2 (gerenciador de processos)
sudo npm install -g pm2

# Instalar Git (se não tiver)
sudo apt install -y git
```

### Passo 3: Clonar Repositório no Servidor

```bash
cd /home/senun491
git clone https://github.com/marcelimnunes-ops/fundicao-pro.git
cd fundicao-pro
```

### Passo 4: Instalar Dependências

```bash
npm install
npm install --save-dev @types/node @types/react typescript
```

### Passo 5: Configurar Variáveis de Ambiente

```bash
# Criar arquivo .env.production
cat > .env.production.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://ingskuamhwvjiytzswmi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
EOF
```

### Passo 6: Build do Next.js

```bash
npm run build
```

### Passo 7: Configurar PM2

```bash
# Criar arquivo ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'fundicao-pro',
    script: 'npm',
    args: 'start',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Iniciar com PM2
pm2 start ecosystem.config.js

# Salvar configuração
pm2 save

# Setup para restart automático
sudo pm2 startup systemd -u senun491 --hp /home/senun491
```

### Passo 8: Configurar Nginx (Reverse Proxy)

```bash
# Instalar Nginx
sudo apt install -y nginx

# Criar config para subdomínio
sudo tee /etc/nginx/sites-available/sistema.senunmetal.com.br > /dev/null <<EOF
server {
    listen 80;
    server_name sistema.senunmetal.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/sistema.senunmetal.com.br /etc/nginx/sites-enabled/

# Test nginx
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx

# Enable nginx on boot
sudo systemctl enable nginx
```

### Passo 9: Configurar SSL (HTTPS - Opcional mas Recomendado)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d sistema.senunmetal.com.br

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Passo 10: Verificar Status

```bash
# Verificar PM2
pm2 status

# Ver logs
pm2 logs fundicao-pro

# Verificar Nginx
sudo systemctl status nginx
```

---

## 5️⃣ TESTES FINAIS

### Teste 1: Acesso Local

```bash
# No servidor
curl http://localhost:3000
```

### Teste 2: Acesso Remoto (HTTP)

Abra navegador e acesse:
```
http://sistema.senunmetal.com.br
```

Deveria mostrar página de login.

### Teste 3: Login

1. Email: `demo@fundicao.com`
2. Senha: `demo123456`
3. Clique em "Entrar"

Deveria ir para Dashboard.

### Teste 4: Criar Apontamento

1. Vá para "Apontamento"
2. Preencha formulário com dados fictícios
3. Clique "Salvar Apontamento"
4. Deveria salvar e mostrar mensagem de sucesso

### Teste 5: Verificar Banco de Dados

No Supabase:
1. Vá para `Table Editor`
2. Clique em `producao`
3. Deveria ter 1+ registro novo

---

## 6️⃣ UPDATES FUTUROS

### Para Fazer Update do Código:

```bash
# No servidor
cd /home/senun491/fundicao-pro

# Pull do GitHub
git pull origin main

# Instalar novas dependências (se houver)
npm install

# Rebuild
npm run build

# Restart PM2
pm2 restart fundicao-pro

# Verificar logs
pm2 logs fundicao-pro
```

---

## 7️⃣ TROUBLESHOOTING

### Erro: "Cannot find module"

```bash
npm install
npm run build
pm2 restart fundicao-pro
```

### Erro: "Port 3000 already in use"

```bash
# Encontrar processo
sudo lsof -i :3000

# Matar processo
sudo kill -9 PID

# Ou usar PM2
pm2 delete fundicao-pro
pm2 start ecosystem.config.js
```

### Erro: "Connection refused" no Supabase

1. Verificar .env.local está correto
2. Verificar credenciais Supabase
3. Verificar rede (firewall)

```bash
# Testar conexão
curl https://ingskuamhwvjiytzswmi.supabase.co/rest/v1/
```

### Nginx não redireciona

```bash
# Verificar config
sudo nginx -t

# Ver erro
sudo tail -20 /var/log/nginx/error.log

# Restart
sudo systemctl restart nginx
```

---

## 📞 SUPORTE RÁPIDO

**Comando para ver status geral:**
```bash
pm2 status && sudo systemctl status nginx
```

**Reiniciar tudo:**
```bash
pm2 restart fundicao-pro && sudo systemctl restart nginx
```

**Ver logs em tempo real:**
```bash
pm2 logs fundicao-pro -f
```

---

## ✅ CHECKLIST FINAL

- [ ] Supabase: Schema criado e dados iniciais
- [ ] GitHub: Repositório com código
- [ ] Hostgator: Node.js instalado
- [ ] PM2: App rodando
- [ ] Nginx: Configurado e ativo
- [ ] SSL: Certificado instalado (opcional)
- [ ] DNS: `sistema.senunmetal.com.br` apontando corretamente
- [ ] Login: Funcionando com usuário demo
- [ ] Dashboard: Carregando dados do Supabase
- [ ] Apontamento: Consegue criar novo registro
- [ ] Banco: Dados salvando corretamente no Supabase

---

**Tudo pronto! 🚀 Sistema está online e funcionando!**

Para qualquer dúvida, revise este guia ou verifique os logs.
