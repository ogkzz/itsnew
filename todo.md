# Project TODO - itsnew

## Banco de Dados
- [x] Schema com tabelas: analyses, logs, fingerprints, domains, exposed
- [x] Migrações aplicadas no PostgreSQL/MySQL

## Backend / API
- [x] Login com credenciais fixas (user: free, senha: 1)
- [x] API REST com JWT (/analyze, /status, /logs)
- [x] Rate limiting nos endpoints
- [x] Lógica de detecção de Proxy/VPN (ASN, datacenter, reputação IP, latência, JA3, headers)
- [x] Detecção de domínios suspeitos (palavras-chave + extensões + blacklist)
- [x] Sistema de fingerprint único (IP + headers + user-agent)
- [x] Detecção de manipulação (HMAC, integridade, replay, heurística)
- [x] Score de risco (0-30 seguro, 31-70 suspeito, 71+ confirmado)
- [x] WebSocket para atualizações em tempo real
- [x] CRUD do sistema Exposed

## Frontend / Interface
- [x] Tema escuro com cores preto, branco e azul
- [x] Layout com sidebar (Dashboard, Análises, Exposed, Logs, Configurações)
- [x] Página de Login com animações
- [x] Dashboard com gráficos em tempo real (status, tipos de detecção, histórico)
- [x] Página de Análises (sistema em 3 etapas)
- [x] Página Exposed (cadastro, listagem, busca, filtros)
- [x] Página de Logs (listagem com filtros)
- [x] Página de Configurações (blacklist, preferências)
- [x] Animações suaves, transições, loading, hover effects
- [x] Atualização em tempo real via WebSocket

## Segurança
- [x] Hash de senha (bcrypt)
- [x] Proteção contra SQL Injection, XSS, CSRF
- [x] Criptografia de dados sensíveis
- [x] Logs de acesso

## Testes
- [x] Testes unitários do backend (vitest) - 28 testes passando
