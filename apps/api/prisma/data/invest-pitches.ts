// Playbook comercial CAIS — 8 pitches por segmento (PJ/Digital/Private/Wealth).
// Fonte: playbook_pitches_cais.html (v1). Usado no seed idempotente.

export interface PitchSeed {
  faixa: "pj" | "digital" | "private" | "wealth";
  titulo: string;
  gancho: string;
  padraoDoSegmento: boolean;
  conteudo: {
    sdr: {
      missao: string;
      aberturaLigacao: string;
      qualificacao: string[];
      objecoes: { q: string; a: string }[];
      fechamentoAgenda: string;
    };
    assessor: {
      preparacao: string[];
      aberturaReuniao: string;
      descoberta: string[];
      racional: string;
      arsenal: string[];
      objecoes: { q: string; a: string }[];
      proximoPasso: string;
    };
  };
}

export const INVEST_PITCH_SEED: PitchSeed[] = [
  {
    faixa: "pj",
    titulo: "Caixa que Trabalha — Tesouraria PJ",
    padraoDoSegmento: true,
    gancho:
      "Quanto o caixa da sua empresa rendeu ontem? Se a resposta for “nada”, temos uma conversa de 15 minutos que vale dinheiro.",
    conteudo: {
      sdr: {
        missao:
          "Vender a reunião, não o produto. Ligação de até 3 minutos. Saia com dia e hora marcados com o decisor.",
        aberturaLigacao:
          "Bom dia, [nome], aqui é [SDR] da CAIS Investimentos, escritório do BTG Pactual aqui no Espírito Santo. Te ligo por um motivo específico: a maioria das empresas da região mantém o caixa parado em conta corrente — e com o juro onde está, isso é um custo invisível de milhares de reais por mês. Nosso especialista em tesouraria faz um diagnóstico gratuito disso, com os números da própria empresa. Consigo 20 minutos dele com você essa semana?",
        qualificacao: [
          "Hoje o caixa da empresa fica parado em conta ou aplicado em algo?",
          "Quem cuida dessa decisão — você ou o financeiro junto?",
        ],
        objecoes: [
          {
            q: "Me manda por WhatsApp.",
            a: "→ Mando sim um resumo — mas o diagnóstico só faz sentido com o caixa médio de vocês, e isso o [assessor] calcula na hora, em 20 minutos. Prefere terça de manhã ou quinta à tarde?",
          },
          {
            q: "Já temos banco que cuida disso.",
            a: "→ Perfeito, não é pra substituir seu banco de crédito — é uma segunda opinião só da tesouraria, sem custo e sem compromisso. Se o seu banco já estiver ótimo, o diagnóstico confirma. Terça ou quinta?",
          },
          {
            q: "Não tenho interesse.",
            a: "→ Entendo. Só uma provocação antes de desligar: o senhor sabe quanto o caixa rendeu no mês passado, líquido? Se essa resposta não vier de bate-pronto, os 20 minutos se pagam. Posso propor um horário?",
          },
        ],
        fechamentoAgenda:
          "Fechado então: [dia] às [hora], o [assessor] te liga/visita. Só me confirma: qual o melhor e-mail pra enviar o convite? E se puder ter em mãos o caixa médio aproximado do mês, a conversa rende o dobro.",
      },
      assessor: {
        preparacao: [
          "Revisar as notas do SDR (caixa médio, quem decide, banco atual)",
          "Abrir a Calculadora Compromissada com o CDI do dia",
          "Consultar CNPJ (porte, setor, sócios) e possíveis conexões em comum",
          "Levar 1 caso real anonimizado de empresa da região",
        ],
        aberturaReuniao:
          "[Nome], obrigado pelo tempo. Combinamos 20 minutos: vou te fazer 4 perguntas sobre o fluxo de caixa, te mostrar na calculadora quanto está na mesa, e no final você decide se faz sentido um teste. Pode ser?",
        descoberta: [
          "Qual o caixa médio que dorme em conta ao longo do mês? E o pico (antes de folha/fornecedores)?",
          "Qual a rotina de pagamentos — dias fixos de folha, impostos, fornecedores?",
          "Onde aplica hoje e a quanto (% do CDI)? Sofre IOF quando resgata?",
          "Quantos dias, em média, o dinheiro fica parado entre entrar e sair?",
          "Quem além de você valida essa mudança?",
        ],
        racional:
          "Mostrar na calculadora, com o caixa real deles: (1) o custo diário do dinheiro parado; (2) a compromissada BTG isenta de IOF rendendo desde o 1º dia útil, com liquidez diária — 85% do CDI até 30 MM e 90% acima; (3) a virada matemática pro CDB por volta do dia 26, e como a CAIS opera essa combinação (giro na compromissada, sobra estável no CDB) sem mudar a rotina do financeiro. Fechar com solidez: o caixa fica no maior banco de investimentos da América Latina, com R$ 2,6 trilhões sob gestão e administração — e o BTG colocou cash management como prioridade estratégica.",
        arsenal: [
          "BTG = maior banco de investimentos da América Latina · R$ 2,6 tri em AuM/AuA · lucro recorde e rentabilidade ~27%",
          "Compromissada isenta de IOF · liquidez diária · 85–90% do CDI",
          "Conta PJ BTG sem custo — não substitui o banco de crédito",
          "Cross-sell: sócio PF ganha acesso ao cartão Black (anuidade zerável por investimento) e à esteira Private/Wealth",
          "Ecossistema CAIS: câmbio, seguros, consórcio e crédito na mesma mesa local",
        ],
        objecoes: [
          {
            q: "85% do CDI é pouco.",
            a: "→ No giro curto ela vence CDB de 100% justamente por não pagar IOF — até o dia ~26 é matemática, não opinião. Está aqui na tela, com os seus números.",
          },
          {
            q: "Dá trabalho pro meu financeiro.",
            a: "→ Zero mudança de rotina: a CAIS programa aplicações e resgates junto com o calendário de pagamentos de vocês. Seu financeiro só confere.",
          },
          {
            q: "E a segurança?",
            a: "→ O dinheiro fica custodiado no BTG — banco listado em bolsa, R$ 2,6 trilhões sob gestão, o maior da América Latina no segmento. Mais sólido que a maioria dos bancos onde o caixa está hoje.",
          },
        ],
        proximoPasso:
          "Fechar um teste: abrir a conta PJ (sem custo) e rodar 30 dias com parte do caixa. Entregar por escrito o diagnóstico do custo do caixa parado + projeção do 1º mês.",
      },
    },
  },
  {
    faixa: "pj",
    titulo: "Câmbio + Tesouraria Integrada",
    padraoDoSegmento: false,
    gancho:
      "Quanto do resultado foi pro spread de câmbio no último ano? Quase nenhuma empresa sabe — e é sempre mais do que imagina.",
    conteudo: {
      sdr: {
        missao:
          "Agendar uma cotação comparativa na próxima operação real de câmbio. Ligação de 3 minutos.",
        aberturaLigacao:
          "[Nome], aqui é [SDR] da CAIS, escritório BTG no ES. Vi que vocês importam/exportam — vou direto: na próxima operação de câmbio de vocês, nossa mesa faz uma cotação em paralelo com a do seu banco. Se não ganharmos no custo total, nunca mais te ligo. Se ganharmos, você descobre quanto estava deixando na mesa. Topa o teste?",
        qualificacao: [
          "Qual o volume aproximado de câmbio por ano?",
          "Com que frequência fecham operação?",
        ],
        objecoes: [
          {
            q: "Já tenho corretora de câmbio.",
            a: "→ Melhor ainda — você tem base de comparação. A cotação paralela custa zero e leva 10 minutos. Quando é a próxima operação de vocês?",
          },
          {
            q: "Manda a taxa por e-mail.",
            a: "→ Taxa de câmbio muda a cada minuto — cotação por e-mail de ontem não prova nada. O teste justo é ao vivo, na operação real. Me avisa 1 dia antes da próxima?",
          },
        ],
        fechamentoAgenda:
          "Combinado: quando surgir a próxima operação, você me chama no WhatsApp e nossa mesa cota em paralelo na hora. Vou deixar meu contato salvo com você agora.",
      },
      assessor: {
        preparacao: [
          "Alinhar com a mesa de câmbio BTG a janela da operação",
          "Levantar histórico de dólar/moeda do cliente",
          "Preparar exemplo de NDF simples para o setor dele",
        ],
        aberturaReuniao:
          "Vamos fazer o teste combinado: você cota com seu banco, eu coto aqui na mesa, e comparamos o custo total — taxa + tarifas + spread — na sua frente.",
        descoberta: [
          "Volume anual e moedas?",
          "Fecha à vista ou tem prazo (pagamento futuro)?",
          "Já travou taxa alguma vez? Como decide o timing hoje?",
          "O caixa em reais entre operações fica rendendo onde?",
        ],
        racional:
          "Ganhar a operação no custo total e imediatamente ampliar: (1) o caixa entre operações rende em compromissada isenta de IOF; (2) NDF simples dá previsibilidade de custo pro orçamento; (3) tudo numa mesa só, com atendimento local CAIS + estrutura do maior banco de investimentos da América Latina.",
        arsenal: [
          "Mesa de câmbio BTG com spread transparente",
          "Compromissada isenta de IOF pro caixa entre liquidações",
          "Hedge (NDF) descomplicado para PME",
          "Cartões BTG com IOF zero em compras internacionais — útil pros sócios que viajam a negócios",
        ],
        objecoes: [
          {
            q: "Meu volume é pequeno pra mesa.",
            a: "→ A mesa atende a partir de volumes de PME — e é exatamente em volume menor que o bancão cobra os maiores spreads. O teste comparativo resolve a dúvida.",
          },
          {
            q: "Câmbio é tudo igual.",
            a: "→ O spread real varia de 0,3% a 2%. Em R$ 5 MM/ano, essa diferença paga um salário. Por isso o teste é na operação real, não no discurso.",
          },
        ],
        proximoPasso:
          "Executar a 1ª operação vencedora → propor rotina: câmbio + caixa remunerado + trava de orçamento pros próximos 6 meses.",
      },
    },
  },
  {
    faixa: "digital",
    titulo: "Raio-X da Carteira",
    padraoDoSegmento: true,
    gancho:
      "Com a Selic a 14,25%, carteira que não rende ~1% ao mês líquido está vazando dinheiro. O Raio-X mostra onde — de graça.",
    conteudo: {
      sdr: {
        missao:
          "Conseguir o extrato (ou print da carteira) e agendar 15 minutos pra apresentação do Raio-X. Não discutir produto.",
        aberturaLigacao:
          "[Nome], aqui é [SDR] da CAIS Investimentos, escritório do BTG aqui na região. Uma pergunta honesta: você sabe quanto seus investimentos renderam nos últimos 12 meses — líquido de taxa e imposto? 9 em cada 10 pessoas não sabem. A gente faz um Raio-X gratuito da carteira: você manda o extrato, nosso especialista devolve um relatório de uma página, e aí vocês conversam 15 minutos sobre o resultado. Sem compromisso nenhum. Posso te mandar o passo a passo no WhatsApp?",
        qualificacao: [
          "Hoje você investe mais pelo banco ou por corretora?",
          "Prefere receber o resultado por ligação ou presencial?",
        ],
        objecoes: [
          {
            q: "Já tenho gerente no banco.",
            a: "→ Justamente — o gerente vende o produto do banco dele. O Raio-X compara com o mercado inteiro. Se sua carteira estiver ótima, o relatório confirma e você ganha tranquilidade de graça.",
          },
          {
            q: "Não passo meu extrato.",
            a: "→ Total razão em ser criterioso. Pode ocultar saldos e mandar só os produtos e taxas — o diagnóstico já sai. E nada fica com a gente: o relatório é seu.",
          },
          {
            q: "Quanto custa?",
            a: "→ Nada — nem o Raio-X, nem a assessoria depois. O escritório é remunerado pelo BTG, igual o seu banco remunera o gerente. A diferença é que aqui você enxerga tudo.",
          },
        ],
        fechamentoAgenda:
          "Vou te mandar agora no WhatsApp o que precisamos (2 prints resolvem). Assim que enviar, agendo o retorno do [assessor]: quinta 10h ou sexta 16h, qual prefere?",
      },
      assessor: {
        preparacao: [
          "Montar o Raio-X: rentabilidade líquida 12m vs CDI, custos totais (adm/perf/previdência), exposição a come-cotas, % em isentos, liquidez, concentração por instituição (FGC)",
          "Separar 2–3 alternativas concretas equivalentes em risco",
          "Cartão Black como bônus: simular isenção de anuidade com o valor investido",
        ],
        aberturaReuniao:
          "[Nome], fiz o dever de casa. Em uma página: quanto rendeu, quanto você pagou, e onde está o vazamento. Depois te mostro o que eu faria no seu lugar — e você decide com calma.",
        descoberta: [
          "Qual foi o rendimento líquido real dos últimos 12 meses? (o que caiu na conta, não o prometido)",
          "Quais as taxas de administração dos fundos? Tem taxa de performance? E a previdência — adm e carregamento?",
          "Quanto saiu de come-cotas em maio e novembro?",
          "Já usa isentos de IR — LCI, LCA, CRI, CRA, debêntures incentivadas?",
          "Quanto você precisa com liquidez imediata (D+0)? Existe reserva de emergência separada?",
          "Está tudo numa instituição só? Acima do limite do FGC (R$ 250 mil por CPF/banco)?",
          "Esse dinheiro é para quê e para quando — aposentadoria, imóvel, renda?",
          "Declara IR no modelo completo ou simplificado?",
          "Nas quedas de mercado, o que você fez — vendeu, segurou, comprou?",
        ],
        racional:
          "Apresentar o vazamento em R$/ano (taxa + imposto ineficiente + % CDI baixo) e a realocação equivalente em risco: isentos IPCA+, CDBs de bancos médios com FGC, previdência moderna (portabilidade sem IR). Fechar com o pacote BTG: plataforma do maior banco de investimentos da América Latina e o cartão Black de bônus — anuidade que zera com o investimento (cada R$ 10 mil investidos = R$ 10 de desconto/mês), IOF zero em compras internacionais e limite lastreado na própria carteira.",
        arsenal: [
          "Raio-X em 1 página: rendeu X, pagou Y, vazamento Z",
          "Isentos: LCI/LCA/CRI/CRA/incentivadas — IPCA+7~8% líquido no cenário atual",
          "Cartão Black: anuidade zerável por investimento · IOF zero internacional · limite por investimento · fundo exclusivo sem taxa de adm",
          "Assessoria sem custo ao cliente (modelo BTG)",
          "Transferência de custódia sem vender ativos (sem IR na migração)",
        ],
        objecoes: [
          {
            q: "Vou perder liquidez saindo do banco.",
            a: "→ A carteira nova é desenhada com a sua régua de liquidez: reserva D+0 primeiro, prazo depois. Nada trava sem você saber o porquê.",
          },
          {
            q: "Trocar de banco dá trabalho.",
            a: "→ Portabilidade e transferência de custódia: os ativos migram sem venda, sem IR, e o trabalho operacional é nosso.",
          },
          {
            q: "E se o BTG quebrar?",
            a: "→ Maior banco de investimentos da América Latina, listado em bolsa, R$ 2,6 trilhões sob gestão e administração. E os títulos com FGC têm a mesma garantia de qualquer banco — a diferença é a taxa que você recebe.",
          },
        ],
        proximoPasso:
          "Aprovar a realocação em duas etapas (reserva primeiro, objetivo depois) e abrir a conta na hora — 10 minutos pelo app, com o Black solicitado junto.",
      },
    },
  },
  {
    faixa: "digital",
    titulo: "Renda Todo Mês, Isenta de IR",
    padraoDoSegmento: false,
    gancho:
      "Uma carteira que deposita “aluguel” todo mês — sem inquilino, sem reforma e sem IR. Quer ver quanto o seu valor geraria?",
    conteudo: {
      sdr: {
        missao:
          "Agendar 20 minutos pra apresentar a simulação da carteira de renda com o valor do cliente.",
        aberturaLigacao:
          "[Nome], [SDR] da CAIS/BTG. Rapidinho: R$ 1 milhão numa carteira de renda bem montada gera hoje entre R$ 9 e 11 mil por mês, isentos de IR, pingando na conta — quase o dobro de um aluguel, sem inquilino te ligando. Nosso especialista monta essa simulação com o seu valor, ativo por ativo, de graça. 20 minutos essa semana?",
        qualificacao: [
          "Você tem imóvel de renda hoje ou pensa em ter?",
          "A ideia seria usar a renda ou reinvestir?",
        ],
        objecoes: [
          {
            q: "Imóvel é mais seguro.",
            a: "→ A simulação compara os dois lado a lado — rendimento líquido, vacância, liquidez. Você decide com número, não com discurso. Quinta ou sexta?",
          },
          {
            q: "FII caiu muito em 2022.",
            a: "→ Cota oscila, mas o aluguel seguiu caindo na conta todo mês — e é dele que a carteira vive. O [assessor] te mostra o histórico real dos rendimentos. Posso agendar?",
          },
        ],
        fechamentoAgenda:
          "Perfeito — só me diz o valor aproximado que você quer simular (pode ser uma faixa) pro material já vir pronto. Quinta 10h ou sexta 15h?",
      },
      assessor: {
        preparacao: [
          "Montar simulação com o valor real: FIIs de tijolo/papel + CRI/CRA + incentivadas, com yield mensal líquido",
          "Tabela comparativa: carteira de renda vs imóvel (yield, vacância, custos, liquidez, ITBI)",
          "Histórico de 24 meses de proventos dos FIIs escolhidos",
        ],
        aberturaReuniao:
          "Trouxe a sua carteira de renda pronta, ativo por ativo, com o rendimento que ela teria depositado nos últimos 24 meses. Depois comparamos com o imóvel, número contra número.",
        descoberta: [
          "Tem imóvel alugado? Qual o rendimento líquido real (descontando vacância, condomínio, manutenção, IR)?",
          "Precisa da renda mensal agora ou é pra construir?",
          "Qual o valor disponível e o horizonte?",
          "Que nível de oscilação de cota te tira o sono?",
        ],
        racional:
          "Carteira de renda: FIIs (rendimento mensal isento pra PF) + CRI/CRA/incentivadas IPCA+ isentas — hoje na faixa de 0,9–1,1% ao mês líquido, com diversificação (dezenas de imóveis/devedores) e liquidez em dias. Bônus tangível: o valor investido também zera a anuidade do cartão Black e vira limite de crédito lastreado.",
        arsenal: [
          "Yield líquido mensal simulado com histórico real de proventos",
          "Isenção de IR em FII/CRI/CRA/incentivadas para PF",
          "Liquidez em D+2 vs meses de um imóvel",
          "Cartão Black de bônus: anuidade zerável + IOF zero internacional",
        ],
        objecoes: [
          {
            q: "E se o fundo cortar o rendimento?",
            a: "→ Por isso a carteira tem 8–12 fontes de renda diferentes, não uma. Corte em um ativo mexe pouco no total — bem diferente de um imóvel vazio, que zera.",
          },
          {
            q: "Prefiro o tijolo que eu vejo.",
            a: "→ O FII de tijolo É tijolo — galpão, laje, shopping — só que fracionado, com gestão profissional e sem você atender inquilino. E a parte de papel (CRI) paga IPCA+ garantido por contrato.",
          },
        ],
        proximoPasso:
          "Aprovar a carteira, abrir conta e programar a 1ª compra — com a régua de reinvestimento ou de saque mensal definida em conjunto.",
      },
    },
  },
  {
    faixa: "private",
    titulo: "Eficiência Tributária + Experiência Private",
    padraoDoSegmento: true,
    gancho:
      "Entre R$ 5 e 10 milhões, o maior custo não é o mercado — é imposto e taxa. Dá pra recuperar 1 a 2% ao ano sem mudar o risco. E o tratamento muda de patamar.",
    conteudo: {
      sdr: {
        missao: "Agendar diagnóstico de eficiência com o assessor sênior. Tom consultivo, zero pressão.",
        aberturaLigacao:
          "[Nome], aqui é [SDR] da CAIS Investimentos, escritório do BTG Pactual no ES. Trabalhamos com investidores do seu perfil num diagnóstico específico: quanto sai por ano em taxa escondida, come-cotas e imposto mal planejado. Numa carteira de R$ 7 milhões, cada 1% de ineficiência são R$ 70 mil/ano. Nosso sócio faz esse diagnóstico pessoalmente, sem custo. Posso agendar uma conversa de 30 minutos — presencial ou vídeo?",
        qualificacao: [
          "Hoje o patrimônio está mais em banco tradicional, corretora ou dividido?",
          "Prefere reunião presencial ou por vídeo?",
        ],
        objecoes: [
          {
            q: "Meu private já cuida disso.",
            a: "→ Ótimo — então o diagnóstico só confirma, e segunda opinião em patrimônio é padrão de mercado, não deslealdade. Se acharmos algo, você acabou de encontrar dinheiro. Que dia fica bom?",
          },
          {
            q: "Não quero mudar de banco.",
            a: "→ O diagnóstico não pede mudança nenhuma — é uma fotografia. O que fazer com ela é decisão sua, no seu tempo.",
          },
        ],
        fechamentoAgenda:
          "Vou agendar com o [sócio/assessor sênior] — ele atende pessoalmente esse perfil. [Dia] às [hora], no escritório ou onde for melhor pra você. Confirmo por WhatsApp com a pauta.",
      },
      assessor: {
        preparacao: [
          "Diagnóstico de eficiência pronto: custos totais em R$/ano, come-cotas, % CDI real, oportunidades em isentos",
          "Mapa de acesso: emissões primárias em pauta (CRI/CRA IPCA+), previdência moderna",
          "Simular o Ultrablue: com R$ 1 MM+ investidos no BTG o cliente acessa o cartão de metal — salas VIP ilimitadas com 12 convidados/ano, concierge dedicado no WhatsApp",
          "Preparar o concierge de viagens CAIS como diferencial do escritório",
        ],
        aberturaReuniao:
          "[Nome], preparei duas coisas: o diagnóstico de eficiência — quanto está saindo por ano e onde — e um retrato de como fica o seu dia a dia como cliente private nosso. Começo pelos números.",
        descoberta: [
          "Como o patrimônio está estruturado — PF direta, fundos, previdência antiga, holding?",
          "Qual foi o retorno líquido consolidado dos últimos 12 meses?",
          "Quanto foi de come-cotas no último ano? Sabe a taxa da previdência atual?",
          "Já recebeu oferta primária de CRI/CRA/debênture do seu banco — ou só produto de prateleira?",
          "Qual o horizonte e o próximo grande evento de liquidez (venda de bem, dividendos)?",
          "Declara completo? Já usa PGBL no limite dos 12%?",
        ],
        racional:
          "Duas alavancas: (1) DINHEIRO — realocar para isentos IPCA+, previdência sem come-cotas com alíquota regressiva de 10%, e acesso a emissões primárias que distribuímos via BTG; recuperação típica de 1–2% a.a. sem subir risco. (2) EXPERIÊNCIA — com R$ 1 milhão investido, entra no Ultrablue: cartão de metal com salas VIP ilimitadas (12 convidados/ano), concierge dedicado via WhatsApp, e condições especiais em helicóptero Revo. Por cima, o concierge exclusivo de viagens da própria CAIS cuida do roteiro da família de ponta a ponta.",
        arsenal: [
          "Diagnóstico em R$/ano (taxa + come-cotas + IR ineficiente)",
          "Isentos IPCA+ e emissões primárias BTG",
          "Previdência moderna: portabilidade sem IR, regressiva 10%, sem come-cotas",
          "Ultrablue (R$ 1 MM+): metal · LoungeKey ilimitado + 12 convidados · concierge WhatsApp · Revo em condições especiais",
          "Concierge de viagens CAIS: curadoria de roteiros e experiências exclusiva do escritório",
          "BTG: maior banco de investimentos da América Latina · R$ 2,6 tri AuM/AuA",
        ],
        objecoes: [
          {
            q: "Meu banco me dá crédito por causa dos investimentos.",
            a: "→ O BTG também — inclusive com limite lastreado na carteira, sem precisar vender ativo. E crédito bom se negocia melhor quando o banco sabe que você tem alternativa.",
          },
          {
            q: "Trocar tudo de uma vez me assusta.",
            a: "→ Nem deve ser de uma vez: migramos por etapas, começando pelo que tem ganho óbvio (previdência e caixa), sem vender nada com IR desnecessário.",
          },
        ],
        proximoPasso:
          "Aprovar o plano de migração em etapas com cronograma de 60 dias — e já ativar Ultrablue + concierge na primeira tranche.",
      },
    },
  },
  {
    faixa: "wealth",
    titulo: "Experiência Wealth — Patrimônio, Acesso e Legado",
    padraoDoSegmento: true,
    gancho:
      "O nível de serviço que o maior banco de investimentos da América Latina reserva a pouquíssimas famílias — performance, acesso e blindagem no mesmo lugar.",
    conteudo: {
      sdr: {
        missao:
          "Conseguir a reunião com o sócio da CAIS. Tom de convite exclusivo, nunca de venda. Jamais abrir com sucessão/morte.",
        aberturaLigacao:
          "[Nome], aqui é [SDR] da CAIS Investimentos, escritório do BTG Pactual. Vou ser direto e breve: o [Wallan/sócio] está convidando um grupo muito restrito de famílias do Espírito Santo pra conhecer a estrutura wealth do BTG — o mesmo banco que administra R$ 2,6 trilhões — com atendimento de sócio aqui da região. É uma conversa de uma hora, no lugar que preferir, sobre como famílias desse porte estão estruturando patrimônio, acesso internacional e a proteção da família. Posso reservar uma data com ele?",
        qualificacao: [
          "Prefere no seu escritório, na sua casa ou na CAIS?",
          "Faz sentido incluir sua esposa/sócio nessa conversa?",
        ],
        objecoes: [
          {
            q: "Já sou atendido por private de outro banco.",
            a: "→ Imagino — nesse porte, todos os bancos ligam. A diferença aqui é o desenho: sócio local + estrutura do maior banco de investimentos da América Latina + coisas que só existem por convite. Uma hora de conversa não compromete nada e costuma render comparação boa.",
          },
          {
            q: "Não tenho tempo.",
            a: "→ Por isso o formato é o inverso do usual: nós vamos até você, na hora que servir — inclusive fora do horário comercial. O [sócio] abre a agenda pra esse perfil.",
          },
        ],
        fechamentoAgenda:
          "Reservo então [dia] às [hora] com o [sócio]. Ele leva um material preparado sobre a sua estrutura — nada genérico. Confirmo por WhatsApp.",
      },
      assessor: {
        preparacao: [
          "Estudar a família: empresas, imóveis, herdeiros, eventos de liquidez à vista",
          "Mapa Patrimonial em branco pronto pra preencher junto",
          "Levar o tripé impresso: Performance & Acesso · Experiência · Legado",
          "Casos reais anonimizados: Whole Life de capital alto + holding implementados pela CAIS na região",
        ],
        aberturaReuniao:
          "[Nome], famílias do seu porte nos procuram por três coisas, e eu vou passar pelas três: fazer o patrimônio render com acesso que o varejo não tem; viver o patrimônio — serviço, viagem, conveniência; e garantir que ele chegue inteiro em quem você ama. Me diga qual das três te tira mais o sono, e começamos por ela.",
        descoberta: [
          "Como o patrimônio está dividido — empresa, imóveis, líquido, algo fora do país?",
          "Qual foi a última vez que alguém consolidou tudo numa visão só?",
          "Quem toca o quê na família hoje? Os filhos estão preparados/envolvidos?",
          "Existe evento de liquidez no radar (venda de empresa, imóvel, dividendo grande)?",
          "O que já existe de estrutura — holding, previdência, seguro, testamento?",
          "Se você ficar 6 meses fora do ar, o que acontece com as contas da família?",
        ],
        racional:
          "O tripé: (1) PERFORMANCE & ACESSO — carteira institucional com emissões primárias, crédito lombard lastreado nos investimentos, e diversificação internacional (dólar, bonds) pelo BTG. (2) EXPERIÊNCIA — Ultrablue garantido e, com o relacionamento, o horizonte do BTG Partners: o cartão por convite, acima do Ultrablue — que não se compra, se conquista. Por cima, o concierge exclusivo de viagens da CAIS desenha as viagens da família de ponta a ponta. (3) LEGADO — holding + previdência (fora do inventário, regressiva 10%) + Whole Life MAG de capital alto pra dar liquidez imediata à sucessão. Inventário custa 8–15% e trava anos; a estrutura certa transforma isso num não-evento.",
        arsenal: [
          "BTG: maior banco de investimentos da América Latina · R$ 2,6 tri AuM/AuA · ~R$ 1,2 tri no wealth de alta renda",
          "Crédito lombard: liquidez sem vender ativos",
          "Internacional: conta, bonds e dólar como seguro patrimonial",
          "Ultrablue garantido · Partners no horizonte (por convite: 4–7 pts/US$, Terminal BTG, helicóptero Revo anual)",
          "Concierge de viagens CAIS — exclusividade do escritório, de roteiro a experiência",
          "Legado: holding + previdência sucessória + Whole Life MAG (estruturas já implantadas pela CAIS)",
        ],
        objecoes: [
          {
            q: "Sucessão eu resolvo com meu advogado.",
            a: "→ E deve — nós trabalhamos COM ele. O jurídico desenha a estrutura; nós entregamos a camada financeira: liquidez pro inventário, previdência, seguro e a carteira. São peças diferentes do mesmo quebra-cabeça.",
          },
          {
            q: "Esses cartões e mordomias não me impressionam.",
            a: "→ Justo — então fica no que é matemática: acesso a emissões que o varejo não vê, crédito sem vender ativo, dólar estruturado e 1–2% a.a. de eficiência. As mordomias vêm de graça por cima.",
          },
          {
            q: "Já tenho tudo espalhado em 3 bancos.",
            a: "→ Espalhado não é diversificado — é sem visão consolidada e sem poder de negociação. A consolidação parcial já muda o seu preço em todos os três.",
          },
        ],
        proximoPasso:
          "Sair com o Mapa Patrimonial preenchido e agendar a devolutiva em 15 dias com o plano do tripé — investimento, experiência e legado — em uma página.",
      },
    },
  },
  {
    faixa: "wealth",
    titulo: "Diversificação Internacional + Caixa de Holding",
    padraoDoSegmento: false,
    gancho:
      "Patrimônio 100% em real é aposta concentrada num único país. Famílias 10 MM+ costumam ter 15–30% fora — o seu está?",
    conteudo: {
      sdr: {
        missao:
          "Agendar conversa sobre alocação internacional com o sócio. Enquadrar como proteção, não trade.",
        aberturaLigacao:
          "[Nome], [SDR] da CAIS/BTG. Uma provocação rápida: se o Brasil andar de lado por 5 anos, o seu padrão de vida muda? As famílias que atendemos estão levando 15 a 30% do patrimônio pra fora — dólar, bonds — como seguro, não como aposta. O [sócio] mostra como isso se monta de forma gradual e 100% declarada. Uma hora, onde preferir?",
        qualificacao: [
          "Já tem algo fora — conta, imóvel, estrutura?",
          "A holding de vocês costuma ter caixa parado?",
        ],
        objecoes: [
          {
            q: "Dólar está caro.",
            a: "→ Seguro não se compra pelo preço do dia — se compra pela proteção. Por isso a entrada é gradual, preço médio, sem timing. O [sócio] mostra o desenho.",
          },
          {
            q: "Isso é coisa de offshore complicada?",
            a: "→ Zero complicação: conta internacional BTG, declarada, com informe pronto pro IR. Mais simples que administrar um imóvel alugado.",
          },
        ],
        fechamentoAgenda:
          "Agendo com o [sócio] pra [dia]. Ele leva a régua de alocação internacional usada com famílias do seu porte e o diagnóstico do caixa da holding junto.",
      },
      assessor: {
        preparacao: [
          "Régua de alocação internacional por perfil (15/20/30%)",
          "Curva de bonds/treasuries do dia",
          "Diagnóstico do caixa da holding (link com compromissada)",
        ],
        aberturaReuniao:
          "Duas frentes hoje: o seguro internacional do patrimônio e o caixa da holding que está dormindo. As duas se resolvem com a mesma estrutura.",
        descoberta: [
          "Qual % do patrimônio depende do Brasil somando empresa + imóveis + carteira?",
          "Já tem conta/ativos fora? Como declara?",
          "A holding tem caixa recorrente? Quanto e por quanto tempo fica parado?",
          "Objetivo do internacional: proteção, gasto futuro em dólar (filhos, imóvel), ou ambos?",
        ],
        racional:
          "Internacional como seguro: conta BTG em dólar com bonds/treasuries pagando juro real relevante, entrada gradual por preço médio, tudo declarado com informe pronto. Em paralelo, o caixa da holding entra em compromissada isenta de IOF — o mesmo motor do pitch PJ — e o relacionamento consolidado destrava a esteira Ultrablue/Partners e o concierge de viagens CAIS pra família.",
        arsenal: [
          "Conta internacional BTG: dólar, bonds, treasuries — informe de IR pronto",
          "Entrada gradual (preço médio) — sem apostar em câmbio",
          "Compromissada isenta de IOF pro caixa da holding",
          "Ultrablue/Partners + concierge de viagens CAIS no pacote de relacionamento",
        ],
        objecoes: [
          {
            q: "Pago imposto duas vezes lá fora?",
            a: "→ Não — a tributação é a brasileira sobre o que você declara, e a estrutura já sai desenhada com o contador. Levamos o passo a passo pronto.",
          },
          {
            q: "Prefiro esperar o dólar cair.",
            a: "→ Esperar preço é trade; proteção é disciplina. A régua gradual resolve exatamente isso: você nunca compra tudo no topo nem fica 100% exposto ao Brasil.",
          },
        ],
        proximoPasso:
          "Definir o % alvo internacional, abrir a conta global e programar as 3 primeiras tranches — junto com o teste da compromissada no caixa da holding.",
      },
    },
  },
];
