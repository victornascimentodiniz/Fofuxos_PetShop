# Fofuxos PDV Desktop — Projeto Independente

Este projeto é um **aplicativo Windows separado** do sistema Fofuxos Gestão Web. NÃO abre o painel gerencial em uma janela, NÃO importa as páginas do gerencial e NÃO usa o front-end web existente. Usa Electron + React + TypeScript.

## Estado atual

Protótipo visual e interativo **sem vendas reais**: produtos de demonstração em memória, carrinho, digitação de quantidade em KG, abertura/fechamento de caixa simulados, visualização de formas de pagamento. A tela avisa explicitamente que nada é salvo. NÃO utilize para vendas reais.

## Pasta do projeto

Extraia em `C:\Fofuxos-PetShop\pdv-desktop` (a pasta precisa conter o `package.json`).

## Desenvolvimento

No PowerShell:

```powershell
cd C:\Fofuxos-PetShop\pdv-desktop
npm.cmd install
npm.cmd run dev
```

A tela abrirá em janela nativa do Windows. Porta de desenvolvimento: 5180, apenas para o app, não o gerencial.

## Gerar instalador Windows (protótipo)

```powershell
npm.cmd run build
npm.cmd run dist:win
```

O instalador NSIS ficará na pasta `release` e poderá criar atalho na área de trabalho. `dist:win` compila novamente, então `build` separado é opcional. É recomendável adicionar ícone e assinatura digital antes de distribuir comercialmente. O build deve ser feito no Windows.

## Próxima etapa obrigatória: funcionamento real

Criar API de caixa e vendas no backend NestJS existente, sem mudar o gerencial:

1. Sessão autenticada do operador no PDV (reutilizar autorização e validações da API; não guardar senhas no aplicativo).
2. Abertura e fechamento de caixa, sangrias e suprimentos, permissões e auditoria.
3. Consulta do catálogo real via API, preço vigente, quantidade por UN ou KG com 3 casas, validação de estoque.
4. Registro transacional e idempotente da venda, itens, pagamentos, impostos aplicáveis e movimentos de estoque, com baixa de estoque somente no servidor.
5. Histórico de vendas na API para ambos os clientes (PDV e gerencial web).
6. Tratamento de quedas de conexão, segurança, teste de concorrência, impressão e requisitos fiscais, antes de produção.

**Importante:** não conectar diretamente ao PostgreSQL pelo desktop, não copiar credenciais do banco e não expor endpoints administrativos sem autorização.
