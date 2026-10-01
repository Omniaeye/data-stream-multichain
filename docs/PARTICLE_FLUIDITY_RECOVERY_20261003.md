# Recuperação da fluidez de partículas — 03/10/2026

Mudança aplicada localmente ao viewer canônico a partir da release congelada em artifacts/jev-flow-20261003/viewer-release. Esta nota não confirma publicação nem saúde do provider. O manifesto, backups, logs e recibo estão em C:/Users/PC/Desktop/ArbitrageStocks/artifacts/jev-flow-20261003.

## Retenção de tokens e observações

A admissão de novas identidades/evidências continua exigindo qualidade global estrita: timestamp atual, atividade da janela correta, market cap, liquidez, volume, swaps e ausência de flags de risco. O cohort visual mantém a última observação já admitida durante um 429/interrupção, sem evaporar após três minutos e sem renovar firstSeenAt, receivedAt, captureId ou captureHash. Filtros de Discovery/Global não apagam uma observação globalmente válida. Uma evidência nova fresca inválida remove a admissão antiga.

Um bootstrap histórico explícito e único pode reconstruir o visual do snapshot já verificado e dentro dos limites existentes de cache. Exige identidade, SHA256, timestamp válido não futuro e qualidade na observação original; ranking futuro ao envelope é recusado. Uma primeira normalização real posterior ao recebimento pode fornecer lifecycleAt, enquanto evidence asOf permanece original. O bootstrap não alimenta a elegibilidade fresca do Momentum, eventos NEW, ingest ou contadores. A retenção de tokens ausentes distingue fonte atrasada/ausente de omissão em fonte fresca, que continua seguindo o prazo normal de saída.

As observações reais concluem sua viagem e permanecem em órbita residente. Sua evidência, birth e identidade continuam os mesmos; não são recebimentos novos, trades ou mudanças de preço. O armazenamento e o renderer preservam a baseline de até 1.200 identidades de token e 24.576 slots visuais de observações. Sob pressão de capacidade, registros residentes antigos podem sair depois de concluir a viagem verdadeira. Não há promessa de retenção ilimitada.

## Movimento e freshness

O movimento de dados já observados pode continuar durante cooldown. Isso não certifica coleta atual. Status usa os timestamps originais por endpoint/rede: recente, parcial, stale ou desconhecido. Um capture agregado antigo não marca injustamente uma rede com evidência explícita recente. A expiração operacional da fonte continua 2x cadence + 10 s; a elegibilidade estrita de entrada continua 45 s. Nenhum timer altera timestamps, SHA ou total de campos recebidos.

O pacer serve frames atrasados de forma limitada e justa entre redes, evitando flush de toda a fila em um único frame. Supersessão continua contabilizada; exibir animação não incrementa novamente o ledger de recebimentos. Sem observações verificadas existentes, a visualização não cria uma fonte artificial para ocupar o campo.

## Perda de GPU e Pause

A evidência lógica e as observações residentes pertencem à página e sobrevivem à reconstrução de recursos gráficos. Uma nova geração da GPU reenvia esses registros ao buffer com os mesmos IDs e birth, sem novo brain.ingest nem replay de receipts/counters. Uma reconstrução não equivale a nova coleta. Reload/fechamento da página e limites de capacidade/cache continuam sendo fronteiras reais de retenção.

Pause explícito continua parando o movimento. Páginas ocultas ou suspensas não são tratadas como falha apenas por essa condição. Retomar usa as regras existentes de fila limitada; recuperação não consegue animar enquanto o thread JavaScript está suspenso. Respeitar redução de movimento continua separado de freshness.

## Verificação e limites

A release candidata passou 125 testes automatizados e typecheck. Após aplicação, os resultados canônicos de npm test e typecheck são registrados em canonical-apply-receipt.json e nos logs correspondentes; somente status de saída zero confirma sucesso. Regressões exercitam 429 de cinco minutos, retenção de uma hora, retomada, dados frescos inválidos, bootstrap/proveniência/futuro, primeira normalização posterior, troca de modo, retenção por fonte, distribuição justa, órbita residente e reconstrução sem duplicar evidência.

Fixtures e testes determinísticos não certificam estabilidade de produção, ausência universal de gargalos, latência de provider ou GPU em todo dispositivo. Verificação de navegador, perda física de dispositivo, suspensão do sistema e operação prolongada exigem evidência separada. A aplicação local não muda quota do provider, não reinicia serviços e não publica a release.

## Revisão 2: controle da fila sob sobrecarga

A guarda de admissão observa a capacidade antes de retirar dados do pacer. A fila CPU fica limitada a 8.192 registros; rejeição por falta de capacidade é explícita e atômica, sem consumir parcialmente a evidência nem contar recebimentos novos. Após liberar capacidade, o mesmo registro pode ser aceito uma vez. O pacer mantém seu limite de 65.536 campos pendentes e a contabilidade de supersessão; esses limites não mudam a baseline de 1.200 tokens e 24.576 slots visuais.

O teste sintético de 60 segundos introduz 460.800 campos, distribuídos entre três redes, com admissão guardada e avanço CPU a cada seis frames. O cenário observado aceita cada campo uma vez e drena o trabalho restante cerca de 5,6 segundos após parar a entrada. Os timestamps, IDs e contadores de evidência continuam preservados. Isso demonstra comportamento da fila e da integração lógica nesse cenário; não mede tempo de GPU, FPS real, throughput de provider ou estabilidade em todos os dispositivos.

A revisão 2 será confirmada no canônico por 127 testes e typecheck, com resultados no novo canonical-apply-receipt.json. O recibo original e logs de 125 testes permanecem preservados como primeiro gate. Evidência de perdas GPU, fallback e soak no navegador é coletada separadamente pelo coordenador; não é deduzida do stress CPU.
