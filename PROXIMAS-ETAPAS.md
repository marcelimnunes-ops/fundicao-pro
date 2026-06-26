╔══════════════════════════════════════════════════════════════════════════╗
║                    PRÓXIMAS ETAPAS - FUNDIÇÃO PRO                      ║
║              Siga estes passos para colocar o sistema online            ║
╚══════════════════════════════════════════════════════════════════════════╝

# 🎯 VOCÊ TEM TUDO PRONTO!

Os seguintes arquivos foram gerados para você:

```
✅ 01-schema.sql                - Script para criar banco Supabase
✅ src/pages/                   - Todas as páginas do sistema
✅ src/lib/                     - Lógica de cálculos e tipos
✅ src/hooks/                   - Hooks para acesso aos dados
✅ package.json                 - Dependências do projeto
✅ .env.local                   - Variáveis de ambiente
✅ next.config.js, tailwind.config.js - Configurações
✅ README.md                    - Documentação completa
✅ DEPLOYMENT.md                - Guia de instalação
```

---

# 📋 PASSO A PASSO

## ETAPA 1: Configurar Supabase (5 min)

### 1.1 Executar Script SQL

1. Abra seu projeto Supabase: https://app.supabase.com
2. Vá para: `SQL Editor` → `New Query`
3. Copie TUDO do arquivo `01-schema.sql`
4. Cole na query
5. Clique em: `Run`
6. Aguarde executar (pode levar alguns segundos)

```
✓ Quando terminar, verá: "Query executed successfully"
```

### 1.2 Criar usuário Demo

1. Vá para: `Authentication` → `Users`
2. Clique em: `Add User`
3. Preencha:
   - Email: `demo@fundicao.com`
   - Password: `demo123456`
   - Confirm Password: `demo123456`
4. Clique: `Create User`

```
✓ Agora tem usuário para testar o sistema
```

---

## ETAPA 2: Preparar GitHub (10 min)

### 2.1 Criar Pasta e Arquivos Localmente

1. Crie pasta: `C:\fundicao-pro` (ou `/home/seu-usuario/fundicao-pro`)
2. Copie todos os arquivos do projeto para lá:
   - `src/` folder
   - `package.json`
   - `.env.local`
   - `next.config.js`
   - `tailwind.config.js`
   - `tsconfig.json`
   - `postcss.config.js`
   - `README.md`
   - `DEPLOYMENT.md`
   - `01-schema.sql`
   - `.gitignore` (create com conteúdo abaixo)

### 2.2 Criar .gitignore

Crie arquivo `.gitignore` com:

```
node_modules/
.next/
.env.local
.env.*.local
*.log
.DS_Store
dist/
build/
```

### 2.3 Fazer Push para GitHub

Abra terminal na pasta `fundicao-pro`:

```bash
# Inicializar repositório
git init

# Adicionar remote (seu repositório)
git remote add origin https://github.com/marcelimnunes-ops/fundicao-pro.git

# Adicionar todos os arquivos
git add .

# Fazer commit
git commit -m "Initial commit: Fundição PRO v1.0 - Sistema ERP completo"

# Push para GitHub
git push -u origin main
```

```
✓ Código agora está no GitHub!
Verifique em: https://github.com/marcelimnunes-ops/fundicao-pro
```

---

## ETAPA 3: Testar Localmente (OPCIONAL - 15 min)

Se quiser testar antes de colocar no servidor:

### 3.1 Instalar Node.js

1. Baixe em: https://nodejs.org (versão LTS)
2. Instale (próximo, próximo, instalar)
3. Abra terminal e rode:

```bash
node -v
npm -v
```

Devem mostrar versões.

### 3.2 Testar Localmente

```bash
# Na pasta fundicao-pro
npm install

# Iniciar servidor
npm run dev

# Abrir navegador
http://localhost:3000
```

Login com:
- Email: `demo@fundicao.com`
- Senha: `demo123456`

Se funcionar, dashboard carregará com dados fictícios ✓

---

## ETAPA 4: Deployment no Hostgator (20-30 min)

Siga o guia completo em `DEPLOYMENT.md`, mas aqui está o resumo:

### 4.1 Conectar SSH

```bash
# Conectar ao servidor
ssh -i /caminho/para/id_rsa senun491@senunmetal.com.br
```

### 4.2 Instalar Dependências do Servidor

```bash
# Atualizar
sudo apt update
sudo apt upgrade -y

# Instalar Node.js
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2 e Git
sudo npm install -g pm2
sudo apt install -y git
```

### 4.3 Clonar Repositório

```bash
cd /home/senun491
git clone https://github.com/marcelimnunes-ops/fundicao-pro.git
cd fundicao-pro
```

### 4.4 Instalar e Build

```bash
npm install
npm run build
```

### 4.5 Iniciar com PM2

```bash
# Criar arquivo ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'fundicao-pro',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Iniciar
pm2 start ecosystem.config.js
pm2 save

# Setup para auto-restart
sudo pm2 startup systemd -u senun491 --hp /home/senun491
```

### 4.6 Configurar Nginx

```bash
# Instalar
sudo apt install -y nginx

# Criar config
sudo tee /etc/nginx/sites-available/sistema.senunmetal.com.br > /dev/null <<'EOF'
server {
    listen 80;
    server_name sistema.senunmetal.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable
sudo ln -s /etc/nginx/sites-available/sistema.senunmetal.com.br /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 4.7 Testar

```bash
# Ver se PM2 está rodando
pm2 status

# Ver logs
pm2 logs fundicao-pro

# Testar localmente no servidor
curl http://localhost:3000
```

---

## ETAPA 5: Acessar Online (5 min)

Depois que tudo estiver configurado:

1. Abra navegador
2. Acesse: **https://sistema.senunmetal.com.br**
3. Login com:
   - Email: `demo@fundicao.com`
   - Senha: `demo123456`

🎉 **PRONTO! Sistema está ONLINE!**

---

# ⚙️ COMANDOS ÚTEIS

### Ver Status Geral

```bash
pm2 status
sudo systemctl status nginx
```

### Reiniciar Tudo

```bash
pm2 restart fundicao-pro
sudo systemctl restart nginx
```

### Ver Logs em Tempo Real

```bash
pm2 logs fundicao-pro -f
```

### Fazer Update do Código

```bash
cd /home/senun491/fundicao-pro
git pull origin main
npm install
npm run build
pm2 restart fundicao-pro
```

### Parar Aplicação

```bash
pm2 stop fundicao-pro
```

### Iniciar Aplicação

```bash
pm2 start fundicao-pro
```

---

# 📞 DÚVIDAS FREQUENTES

## "Dá erro no SQL do Supabase"

1. Copie TUDO o arquivo `01-schema.sql`
2. Certifique que começam com `CREATE TABLE`
3. Execute tudo de uma vez, não em partes

## "Erro ao fazer git push"

```bash
# Verificar remote
git remote -v

# Se não apontar para GitHub:
git remote set-url origin https://github.com/marcelimnunes-ops/fundicao-pro.git

# Tentar novamente
git push origin main
```

## "npm install não funciona"

1. Verificar se Node.js está instalado: `node -v`
2. Limpar cache: `npm cache clean --force`
3. Tentar novamente: `npm install`

## "Nginx não redireciona"

```bash
# Verificar config
sudo nginx -t

# Se houver erro, ver detalhes
sudo tail -50 /var/log/nginx/error.log

# Restart
sudo systemctl restart nginx
```

## "PM2 não inicia"

```bash
# Ver o que está acontecendo
pm2 logs fundicao-pro

# Se precisar reiniciar:
pm2 delete fundicao-pro
pm2 start ecosystem.config.js
```

---

# ✅ CHECKLIST ANTES DE COLOCAR EM PRODUÇÃO

- [ ] Supabase: Script SQL executado com sucesso
- [ ] Supabase: Usuário demo criado (demo@fundicao.com)
- [ ] GitHub: Código commitado e pushado
- [ ] GitHub: Repositório apareça em github.com/marcelimnunes-ops/fundicao-pro
- [ ] Local: npm install funcionou (opcional, mas recomendado)
- [ ] Hostgator: Node.js 18 instalado
- [ ] Hostgator: PM2 instalado e funcionando
- [ ] Hostgator: Nginx instalado e configurado
- [ ] Hostgator: Acesso SSH funcionando
- [ ] Online: sistema.senunmetal.com.br carrega página de login
- [ ] Online: Login com demo@fundicao.com / demo123456 funciona
- [ ] Online: Dashboard carrega com dados
- [ ] Online: Consegue criar novo apontamento
- [ ] Online: Dados aparecem no Supabase

---

# 📊 MÉTRICAS DE SUCESSO

Quando estiver online e funcionar:

- ✓ Você acessa o sistema de qualquer lugar
- ✓ Seus funcionários conseguem apontar produção
- ✓ Os cálculos são automáticos
- ✓ O dashboard mostra os KPIs em tempo real
- ✓ Os dados ficam salvos no Supabase
- ✓ Pode gerar relatórios

---

# 🚀 PRÓXIMOS PASSOS DEPOIS

Quando tiver tudo funcionando:

1. **Testar com dados reais** da sua fundição
2. **Treinar funcionários** a usar o sistema
3. **Ajustar parâmetros** em Configurações (se necessário)
4. **Coletar feedback** e fazer melhorias

---

# 📖 DOCUMENTAÇÃO DISPONÍVEL

- `README.md` - Overview do projeto
- `DEPLOYMENT.md` - Guia detalhado de deployment
- `01-schema.sql` - Estrutura completa do banco
- Código comentado em `src/`

---

**Você tem TUDO pronto! Basta seguir os passos acima! 🎯**

Qualquer dúvida, consulte `DEPLOYMENT.md` para mais detalhes.

Boa sorte! 🚀
