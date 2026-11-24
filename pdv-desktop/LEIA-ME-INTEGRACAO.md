# Fofuxos PDV Desktop — Etapa 19.5

Este é um aplicativo **separado** do Fofuxos Gestão Web. Ele não inclui telas administrativas. Usa os endpoints da API POS das etapas 19.3 e 19.4.

## Instalar

1. Copie a pasta `pdv-desktop` para `C:\Fofuxos-PetShop\pdv-desktop`. Faça um backup da versão anterior antes de substituir.
2. Inicie a API NestJS em `http://127.0.0.1:3001/api`.
3. No PowerShell:

```powershell
cd C:\Fofuxos-PetShop\pdv-desktop
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

Para outro servidor, configure `PDV_API_URL` **antes de iniciar o Electron**, por exemplo:

```powershell
$env:PDV_API_URL = 'https://api.sualoja.com.br/api'
npm.cmd run dev
```

O app só aceita HTTP para localhost; acesso remoto deve ser via HTTPS. O cookie da sessão é mantido na memória do processo principal do Electron, não em `localStorage`. Ao reiniciar, é necessário fazer login outra vez.

## API necessária

- POST `/api/auth/login`, GET `/api/auth/me` (ou usuário completo na resposta do login), POST `/api/auth/logout` (opcional)
- GET `/api/pos/cash/current?terminalCode=CAIXA-01`
- POST `/api/pos/cash/open`, `/close`, `/supply`, `/withdrawal`
- GET `/api/pos/sales/products`, GET/POST `/api/pos/sales`

**Atenção:** os endpoints de autenticação foram inferidos do histórico do projeto e precisam ser confirmados no back-end. Se o login retornar um formato diferente, adaptar o `App.tsx` é necessário. O usuário deve possuir as permissões `pos.access`, `pos.sell`, e as permissões específicas para operações de caixa.

## Teste controlado

1. Crie um produto de teste com estoque suficiente.
2. Entre no PDV com operador de teste.
3. Abra o caixa CAIXA-01 com valor inicial.
4. Selecione produto por unidade ou por quilo (até três casas decimais).
5. Para dinheiro, informe o valor recebido. Para Pix/cartão, confirme o pagamento **fora do sistema** antes de concluir; não existe TEF/Pix integrado nesta versão.
6. Finalize uma venda de teste e confira as tabelas `sales`, `sale_items`, `sale_payments`, `stock_movements` e o estoque no gerencial.
7. Registre sangria/suprimento e feche o caixa.

**Proteção para falha de rede:** após uma tentativa de venda que gerou erro, o botão passa a reenviar o **mesmo `clientRequestId`**; não limpe os dados nem reinicie o aplicativo antes de confirmar se a operação foi registrada. A API impede duplicações por identificador único.

**Limitações atuais:** apenas uma forma de pagamento por venda; sem descontos, impressão, NFC-e, TEF, confirmação Pix automática ou operação offline. Não instalar para atendimento comercial real antes de validar tudo e implementar os requisitos fiscais.

## Gerar instalador (somente para ambiente de teste)

```powershell
npm.cmd run dist:win
```

O instalador fica em `release`. Para teste em outro computador será necessário configurar `PDV_API_URL` para o HTTPS do servidor; `localhost` no PC da cliente não aponta para a API do desenvolvedor. A configuração do instalador distribuído deve ser definida antes do build.
