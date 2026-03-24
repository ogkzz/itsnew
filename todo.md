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
- [x] Testes unitários do backend (vitest) - 38 testes passando

## Correções - Isolamento por Usuário
- [x] Adicionar coluna username nas tabelas analyses e logs para isolamento por usuário
- [x] Backend: filtrar análises, logs e dashboard por username do usuário logado
- [x] Exposed continua público (visível para todos)
- [x] Limpar dados de teste do banco de dados
- [x] Reiniciar servidor após correções

## Melhorias v2 - Design, Scanner, Segurança, Performance
- [x] Bug fix: Exposed não aparece após criação (invalidar cache/refetch)
- [x] Bug fix: Erros TypeScript de isolamento por usuário no server/_core/index.ts
- [x] Scanner: Adicionar detecção WebRTC leak
- [x] Scanner: Adicionar detecção DNS leak
- [x] Scanner: Adicionar detecção timezone mismatch
- [x] Scanner: Adicionar detecção canvas fingerprint
- [x] Scanner: Adicionar detecção battery API anomaly
- [x] Scanner: Adicionar detecção connection type analysis
- [x] Scanner: Adicionar detecção screen resolution anomaly
- [x] Scanner: Adicionar detecção language mismatch
- [x] Segurança: Headers de segurança (HSTS, CSP, X-Frame-Options)
- [x] Segurança: Rate limiting mais robusto
- [x] Segurança: Sanitização de inputs
- [x] Design: Melhorar interface do Dashboard com cards mais profissionais
- [x] Design: Melhorar animações e transições
- [x] Design: Melhorar página de Análises com mais detalhes visuais
- [x] Design: Melhorar página Exposed com grid de cards
- [x] Design: Melhorar página de Logs com timeline visual estilo terminal
- [x] Design: Melhorar página de Configurações
- [x] Design: Melhorar página de Login
- [x] Performance: Otimizar queries do banco
- [x] Testes: Atualizar testes com novos métodos de detecção (38 testes passando)
