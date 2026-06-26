@echo off

mkdir src
mkdir src\pages
mkdir src\components
mkdir src\components\ui
mkdir src\lib
mkdir src\hooks
mkdir src\styles

move _app.tsx src\pages\
move login.tsx src\pages\
move index.tsx src\pages\
move apontamento.tsx src\pages\
move produtos.tsx src\pages\
move clientes.tsx src\pages\
move funcionarios.tsx src\pages\
move estoque.tsx src\pages\
move relatorios.tsx src\pages\
move gargalos.tsx src\pages\
move correlacoes.tsx src\pages\
move configuracoes.tsx src\pages\
move relatorios-avancados.tsx src\pages\

move Button.tsx src\components\ui\
move Card.tsx src\components\ui\
move Modal.tsx src\components\ui\
move Alert.tsx src\components\ui\
move FormInput.tsx src\components\ui\
move FormSelect.tsx src\components\ui\
move Table.tsx src\components\ui\
move Badge.tsx src\components\ui\
move Spinner.tsx src\components\ui\

move Layout.tsx src\components\

move supabase.ts src\lib\
move calculations.ts src\lib\
move types.ts src\lib\

move useProducao.ts src\hooks\
move useClientes.ts src\hooks\
move useEstoque.ts src\hooks\
move useForm.ts src\hooks\
move useDebounce.ts src\hooks\

move globals.css src\styles\

echo PRONTO!
pause