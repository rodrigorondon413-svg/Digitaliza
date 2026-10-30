# Digitaliza — Scanner de Documentos (Android)

App Android que transforma fotos e PDFs em documentos com aparência de digitalização profissional.

## Recursos
- **Câmera** ou **importação** de fotos (galeria) e PDFs — também recebe arquivos via "Compartilhar" de outros apps
- **Recorte automático** das bordas + ajuste manual dos 4 cantos com lupa
- **Correção de perspectiva** (endireita fotos tiradas de lado)
- **Filtros de digitalização**: Original, Aprimorado, Documento (fundo branco, sem sombras), Cinza, P&B
- Brilho/contraste, girar, reordenar e excluir páginas, aplicar filtro em todas
- **Gerar PDF** em A4, Carta ou proporção original
- **Otimizar PDF** (Leve / Equilibrado / Máximo) — JPEG ajustado por DPI e páginas P&B em 1 bit
- Aba **Documentos**: abrir, compartilhar, salvar em pasta do aparelho, excluir
- Sem permissões especiais; tudo processado no próprio aparelho (offline)

## Gerar o APK

### Opção A — GitHub (sem instalar nada)
1. Crie um repositório no GitHub e envie esta pasta.
2. Abra a aba **Actions** → workflow **Gerar APK** roda sozinho (~4 min).
3. Baixe o artefato **Digitaliza-APK** (arquivo `app-release.apk` dentro do zip).

### Opção B — Android Studio
Abra a pasta no Android Studio → **Build › Build APK(s)**, ou no terminal: `gradle assembleRelease`.
O APK sai em `app/build/outputs/apk/release/app-release.apk`.

## Instalar no celular
Copie o APK para o celular, toque nele e permita "Instalar apps desconhecidos" quando solicitado.

## Estrutura
- `app/src/main/java/app/digitaliza/` — código nativo (câmera, arquivos, leitura de PDF, salvar/compartilhar)
- `app/src/main/assets/web/` — interface e processamento de imagem (detecção de bordas, perspectiva, filtros, gerador de PDF)
- `app/digitaliza.jks` — chave de assinatura (senha `digitaliza2026`); guarde-a para publicar atualizações
