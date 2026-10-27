# Nuvora

Nuvora é um espaço privado para conversar com amigos e equipes, com canais de texto e voz, presença, chamadas, câmera e transmissão de tela. A identidade visual usa os roxos violeta e magenta da logo sobre superfícies grafite.

## Deploy do site na Vercel

1. Envie este repositório ao GitHub e importe `hunterzyro-source/Nuvora` em [Vercel](https://vercel.com/new).
2. Vercel detecta Vite. As definições incluídas usam `npm run build` e `dist`.
3. Para o site funcionar com mensagens, canais e chamadas, hospede também a API Node (`npm start`) em um serviço que mantenha o processo ativo, WebSockets e armazenamento persistente. O arquivo SQLite local não é armazenamento durável para funções serverless.
4. No projeto Vercel, configure `VITE_API_URL` como a URL pública da API Node (por exemplo `https://api.seudominio.com`). No serviço da API, configure `CORS_ORIGIN` com a URL do site Vercel e `DATABASE_PATH` para um arquivo em disco persistente. Depois, redeploy o site.

A Vercel serve o site estático; ela não mantém o arquivo SQLite local entre instâncias. Embora a plataforma suporte WebSockets em Functions, as conexões têm duração máxima, reconectam em instâncias diferentes e exigem estado/pub-sub externo para chamadas e presença distribuídas. Para este backend pequeno, um único serviço Node com WebSockets e disco persistente é o caminho mais simples. Em produção para vários usuários/instâncias, migre o banco para PostgreSQL e a presença/pub-sub para Redis.

## Uso local

1. Instale Node.js 20+.
2. Execute `npm install` nesta pasta.
3. Execute `npm run dev` e acesse `http://localhost:5173`. O Vite encaminha a API e Socket.IO ao servidor Node local.
4. Para iniciar a versão compilada, execute `npm run build` e depois `npm start` (porta 3001).

O botão de convite copia o endereço do site quando estiver publicado e o endereço local detectado no modo local. `server/community.sqlite` guarda os dados locais e não é enviado ao GitHub. Em um servidor, defina `DATABASE_PATH` apontando para um volume persistente. Restrinja `CORS_ORIGIN` ao domínio Vercel do app.

## Preferências e transmissão

As configurações guardam localmente nome, status, tema, modo compacto, microfone, saída de áudio, câmera, cancelamento de eco, redução de ruído e notificações. Antes de transmitir, escolha a origem preferida, resolução até 1080p, 30 ou 60 FPS e áudio do sistema. O navegador pede que a pessoa escolha a tela, janela ou aba; o navegador e o computador determinam a taxa efetiva.

Áudio, vídeo e tela usam WebRTC direto para reduzir atraso. Para chamadas em redes que bloqueiam conexões diretas, configure um servidor TURN em `src/main.jsx`. Chamadas mesh funcionam melhor em grupos pequenos; grupos maiores pedem um SFU.

O app não tem contas, senha de entrada nem criptografia ponta a ponta. O endereço de acesso dá entrada à comunidade; mantenha-o privado e use HTTPS. `python/lan_discovery.py` oferece descoberta opcional na rede local. `native/media_budget.cpp` estima uma taxa inicial de vídeo e pode ser compilado com C++17.
