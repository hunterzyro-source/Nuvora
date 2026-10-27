# Nuvora

Frontend do Nuvora: canais de texto e voz, presença, chamadas, câmera e compartilhamento de tela. A interface é publicada na Vercel; canais e mensagens compartilhados usam o [backend Node.js independente](https://github.com/hunterzyro-source/nuvoraapi).

## Conectar ao backend

Publique o repositório do backend em um host Node.js com WebSockets e PostgreSQL. Defina `COMMUNITY_PASSWORD` nesse serviço e `CORS_ORIGIN` como o domínio exato do site. Depois, configure `VITE_API_URL` nas variáveis do projeto Vercel com a URL HTTPS pública da API (sem barra no final) e faça um novo deploy. Os participantes entram no site com o código de comunidade compartilhado.

## Desenvolvimento local

1. Instale Node.js 20 ou mais recente.
2. Execute `npm install` nesta pasta.
3. Execute `npm run dev` e abra `http://localhost:5173`. O Vite encaminha API e Socket.IO para o servidor Node local.
4. `npm run build` gera os arquivos estáticos para Vercel.

Mensagens, chamadas e transmissões usam a API compartilhada quando `VITE_API_URL` está configurada. Voz, vídeo e tela usam WebRTC diretamente entre os participantes; chamadas mesh funcionam melhor em grupos pequenos. Para redes que bloqueiam conexões diretas, configure TURN; grupos maiores precisam de um SFU.
