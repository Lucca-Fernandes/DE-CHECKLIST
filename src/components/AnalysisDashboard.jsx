import React, { useState, useEffect } from 'react';
// 1. Adicionado CircularProgress para o novo indicador de carregamento de links
import { Container, Grid, Typography, Box, LinearProgress, Paper, Button, FormControl, Autocomplete, TextField, CircularProgress } from '@mui/material';
import FileUploadSection from './FileUploadSection';
import ResultsModal from './ResultsModal';
import CorrectionModal from './CorrectionModal';
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const BACKEND_API_URL = 'https://backend-apostila.onrender.com'; 
const genAI = new GoogleGenerativeAI(API_KEY);

const criteriaWithSuggestions = [1, 2, 5, 11, 15];

const AnalysisDashboard = () => {
    const [studentFile, setStudentFile] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
    const [correctionTarget, setCorrectionTarget] = useState(null);
    const [fileContent, setFileContent] = useState('');
    const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
    const [suggestion, setSuggestion] = useState(null);
    const [selectedEmenta, setSelectedEmenta] = useState(null); // Modificado para null
    const [ementas, setEmentas] = useState([]);
    const [isLoadingEmentas, setIsLoadingEmentas] = useState(true);

    // 2. Novos estados para controlar a análise de links
    const [isAnalyzingLinks, setIsAnalyzingLinks] = useState(false);
    const [linkAnalysisMessage, setLinkAnalysisMessage] = useState('');


    useEffect(() => {
        const fetchEmentas = async () => {
            try {
                const response = await fetch(`${BACKEND_API_URL}/api/ementas`);
                if (!response.ok) {
                    throw new Error('Erro ao carregar ementas');
                }
                const data = await response.json();
                setEmentas(data);
            } catch (err) {
                console.error('Erro ao buscar ementas:', err);
                setError('Erro ao carregar ementas do banco de dados');
            } finally {
                setIsLoadingEmentas(false);
            }
        };
        fetchEmentas();
    }, []);

    const fullCriteriaList = [
        {
            "id": 0,
            "displayText": "Validar conformidade com a ementa",
            "type": "auto",
            "textForAI": `
                Você é um especialista educacional em alinhamento curricular para materiais didáticos do ensino médio no Maranhão. Sua tarefa é realizar uma análise minuciosa, detalhada e extremamente acurada para verificar se a apostila está completamente alinhada com a ementa selecionada, considerando TODOS os seus elementos (objetivos e conteúdo programático). Esta é a análise mais importante, exigindo 100% de certeza na avaliação. A apostila e a ementa devem ser lidas integralmente.

                **EMENTA SELECIONADA:**
                - Nome da Disciplina: ${selectedEmenta ? selectedEmenta.nome_disciplina : '[NOME_DA_DISCIPLINA]'}
                - Objetivos: ${selectedEmenta ? selectedEmenta.objetivos : '[OBJETIVOS]'}
                - Conteúdo Programático: ${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}

                **INSTRUÇÕES GERAIS:**
                Sua análise deve responder a duas perguntas fundamentais:
                1. **"Se eu ler toda a apostila, vou aprender a fazer o que o objetivo da ementa espera?"**
                   - Para cada objetivo da ementa, verifique se a apostila contém conteúdo suficiente (explicações, exemplos, exercícios, ou atividades práticas) para que um estudante do ensino médio alcance o aprendizado esperado.
                   - Considere a clareza, profundidade e progressão do conteúdo em relação a cada objetivo.
                2. **"Todo o conteúdo programático está sendo explorado?"**
                   - Para cada item ou tema listado no conteúdo programático da ementa, verifique se ele está presente na apostila, com o mesmo nome (ou sinônimo claro) e no contexto correto (ex.: se o conteúdo programático menciona "sustentabilidade no Maranhão", a apostila deve abordar esse tema com exemplos ou referências locais).
                   - Analise se a estrutura e os termos da apostila correspondem exatamente ou são equivalentes aos da ementa.

                **PASSOS PARA A ANÁLISE:**
                1. **Leitura da ementa**:
                   - Extraia e liste todos os objetivos da ementa, identificando os resultados de aprendizado esperados (ex.: "desenvolver competências em álgebra" implica explicações, exemplos e exercícios práticos de álgebra).
                   - Extraia e liste todos os itens do conteúdo programático, incluindo nomes e contextos (ex.: "geometria: triângulos e círculos" implica seções específicas sobre esses tópicos).
                2. **Leitura da apostila**:
                   - Analise o texto completo da apostila, capítulo por capítulo, seção por seção, incluindo introduções, explicações, exemplos, exercícios e atividades.
                   - Identifique os temas abordados, sua profundidade e sua relação com os objetivos e conteúdos da ementa.
                3. **Comparação detalhada**:
                   - Para cada objetivo, mapeie as seções da apostila que o abordam. Avalie se o conteúdo é suficiente para alcançar o objetivo (ex.: explicações claras, exemplos práticos, exercícios relevantes).
                   - Para cada item do conteúdo programático, confirme se ele aparece na apostila com o mesmo nome ou sinônimo e no contexto correto.
                4. **Determinação do status**:
                   - **Aprovado**: Se TODOS os objetivos da ementa forem completamente atendidos (com conteúdo suficiente para o aprendizado) E TODOS os itens do conteúdo programático forem abordados na apostila com os mesmos nomes e contextos.
                   - **Reprovado**: Se pelo menos UM objetivo não for atendido com conteúdo suficiente OU pelo menos UM item do conteúdo programático estiver ausente, incompleto ou fora de contexto.
                5. **Justificativa**:
                   - Se **Aprovado**, a justificativa deve ser uma string vazia ("").
                   - Se **Reprovado**, a justificativa deve listar TODAS as lacunas ou discrepâncias encontradas, com exemplos específicos e localizações (capítulo e seção, se possível). Para cada problema, indique:
                     - Qual objetivo ou item do conteúdo programático está faltando ou desalinhado.
                     - Onde na apostila o problema ocorre (ex.: "Capítulo 2 não aborda o objetivo de análise crítica").
                     - Um exemplo claro, como "O conteúdo programático menciona 'estatística descritiva', mas a apostila não inclui seções sobre médias ou desvios".

                **FORMATO JSON DE SAÍDA OBRIGATÓRIO:**
                {"analise": [{"criterio": 0, "status": "<Aprovado ou Reprovado>", "justificativa": "<string>"}]}

                **APOSTILA COMPLETA PARA ANÁLISE:**
                ---
                ${fileContent}
                ---
            `
        },
        {
            "id": 1,
            "displayText": "Verificar se o sumário está de acordo com os temas abordados no decorrer do livro.",
            "type": "auto",
            "textForAI": `Você é um especialista em análise pedagógica de materiais educacionais para o ensino médio no Maranhão. Sua tarefa é verificar se o sumário da apostila reflete com precisão os temas e conteúdos abordados ao longo do livro, considerando a ementa selecionada: ${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}. Passo 1: Extraia o sumário do documento. Passo 2: Identifique os temas principais em cada capítulo e seção. Passo 3: Compare o sumário com o conteúdo real e com a ementa, procurando por discrepâncias como temas omitidos, adicionados indevidamente ou descritos incorretamente. Aprove se o sumário for fiel e abrangente; reprove se houver mismatches. Se reprovado, na justificativa, cite um ou dois exemplos específicos, como 'O tema de sustentabilidade no Capítulo 3 não está listado no sumário'.`
        },
        {
            "id": 2,
            "displayText": "Verificar se possui a palavra 'Aluno' e substituir por 'Estudante'.",
            "type": "auto",
            "textForAI": "Você é um revisor linguístico especializado em linguagem inclusiva para materiais didáticos do ensino médio no Maranhão. Sua tarefa é escanear todo o texto da apostila em busca da palavra 'Aluno' (em qualquer forma, como 'aluno', 'alunos', etc.). Passo 1: Localize todas as ocorrências. Passo 2: Determine se elas precisam ser substituídas por 'Estudante' para promover neutralidade de gênero. Aprove se não houver ocorrências ou se já estiverem corretas; reprove se encontrar 'Aluno'. Se reprovado, na justificativa, mencione um ou dois exemplos com localização, como 'A palavra \"Aluno\" aparece na introdução do Capítulo 1'."
        },
        {
            "id": 3,
            "displayText": "Verificar se há conteúdo específico #aquinomaranhão#.",
            "type": "auto",
            "textForAI": `Você é um curador de conteúdo regional para apostilas educacionais no Maranhão. Sua tarefa é verificar a presença de conteúdo específico marcado com a tag #aquinomaranhão# ou similar, focado em exemplos, casos ou referências locais ao estado do Maranhão, alinhado com a ementa: ${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}. Passo 1: Busque por tags como #aquinomaranhão#, #AQUINOMARANHAO# ou menções explícitas a contextos maranhenses. Passo 2: Avalie se o conteúdo é relevante e integrado aos temas. Aprove se houver pelo menos uma instância apropriada; reprove se ausente ou inadequado. Se reprovado, na justificativa, indique brevemente a ausência, como 'Nenhuma tag ou conteúdo específico sobre o Maranhão foi encontrado'.`
        },
        {
            "id": 4,
            "displayText": "Verificar se é citado o nome do curso ou eixo.",
            "type": "auto",
            "textForAI": "Você é um avaliador pedagógico. Verifique se a apostila cita a disciplina correta: \"${selectedEmenta ? selectedEmenta.nome_disciplina : '[NOME_DA_DISCIPLINA]'}\".\n\nRegras:\n1. Ignore diferenças de maiúsculas e minúsculas na comparação.\n2. APROVE se o nome estiver correto ou se nenhum nome de disciplina for citado.\n3. REPROVE APENAS se encontrar um nome de disciplina substancialmente diferente.\n\nSe reprovar, a justificativa deve citar o nome incorreto encontrado. Exemplo: 'Reprovado. Foi encontrado o nome \"Matemática Financeira\" em vez de \"${selectedEmenta ? selectedEmenta.nome_disciplina : '[NOME_DA_DISCIPLINA]'}\".'"
        },
        {
            "id": 5,
            "displayText": "Verificar se os livros possuem uma Introdução geral, acompanhada dos objetivos de aprendizagem.",
            "type": "auto",
            "textForAI": `Você é um designer instrucional para materiais do ensino médio. Sua tarefa é confirmar a presença de uma introdução geral na apostila, que deve incluir objetivos de aprendizagem claros, alinhados com a ementa: ${selectedEmenta ? selectedEmenta.objetivos : '[OBJETIVOS]'}. Passo 1: Localize a seção de introdução. Passo 2: Verifique se ela apresenta objetivos explícitos. Aprove se ambos estiverem presentes e alinhados; reprove se faltar. Se reprovado, na justificativa, especifique o problema, como 'Introdução presente, mas sem objetivos de aprendizagem'.`
        },
        {
            "id": 6,
            "displayText": "Verificar se o conteúdo abordado no livro atende aos Objetivos de aprendizagem.",
            "type": "auto",
            "textForAI": `Você é um avaliador pedagógico especializado em alinhamento curricular. Sua tarefa é verificar se o conteúdo da apostila atende aos objetivos de aprendizagem e ao conteúdo programático da ementa selecionada. Ementa: Objetivos - "${selectedEmenta ? selectedEmenta.objetivos : '[OBJETIVOS]'}"; Conteúdo Programático - "${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}". Passo 1: Extraia os objetivos e o conteúdo programático da ementa. Passo 2: Compare os termos e a estrutura do conteúdo da apostila com os da ementa, verificando alinhamento exato. Passo 3: Aprove se o conteúdo da apostila cobrir completamente os objetivos e o conteúdo programático, usando os mesmos termos e estrutura; reprove se houver lacunas ou divergências. Se reprovado, na justificativa, cite um exemplo específico, como 'O conteúdo do Capítulo 2 não aborda o tópico "Sustentabilidade" listado no conteúdo programático da ementa'.`
        },
        {
            "id": 7,
            "displayText": "Verificar se há exemplos ou cases relacionados aos conteúdos e aos conceitos para facilitar compreensão.",
            "type": "auto",
            "textForAI": `Você é um expert em pedagogia ativa para o ensino médio. Sua tarefa é verificar a inclusão de exemplos ou cases reais relacionados aos conceitos na apostila, considerando a ementa: ${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}. Passo 1: Identifique conceitos chave em cada capítulo. Passo 2: Busque exemplos ou cases ilustrativos. Aprove se houver em quantidade suficiente; reprove se escassos. Se reprovado, na justificativa, mencione um ou dois capítulos afetados, como 'Capítulo 2 carece de exemplos para conceitos de física'.`
        },
        {
            "id": 8,
            "displayText": "Verificar se há conteúdos de curadoria como vídeos, livros, filmes, artigos, para complementar os estudos.",
            "type": "auto",
            "textForAI": `Você é um curador de recursos suplementares para apostilas. Sua tarefa é verificar a presença de curadoria como vídeos, livros, filmes ou artigos recomendados, considerando a ementa: ${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}. Passo 1: Escaneie por listas de recursos adicionais. Passo 2: Avalie relevância e variedade. Aprove se houver curadoria adequada; reprove se insuficiente. Se reprovado, na justificativa, mencione um exemplo de falta, como 'Nenhum vídeo ou artigo curado no Capítulo 5'.`
        },
        {
            "id": 9,
            "displayText": "Verificar a quantidade de questões e a carga horária correspondente.",
            "type": "auto",
            "textForAI": `Você é um avaliador pedagógico para materiais do ensino médio no Maranhão. Este critério deve ser SEMPRE 'Aprovado'. Sua tarefa é contar o número total de questões na seção 'Exercitando' de toda a apostila e verificar a carga horária da ementa selecionada, que é "${selectedEmenta ? selectedEmenta.carga_horaria : '[CARGA_HORARIA]'}". Na justificativa, informe o número de questões encontradas e a carga horária da ementa, no formato: 'Foram encontradas X questões no total. Carga horária da ementa: Y horas.'`
        },
        {
            "id": 10,
            "displayText": "Verificar se há conteúdo e informações suficientes no Livro que dê base para o aluno realizar tanto os exercícios, quanto as atividades do Praticando.",
            "type": "auto",
            "textForAI": `Você é um analista de suficiência pedagógica. Sua tarefa é avaliar se o conteúdo da apostila fornece base suficiente para exercícios e atividades em 'Praticando', considerando a ementa: ${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}. Passo 1: Mapeie conteúdos a exercícios. Passo 2: Verifique cobertura informacional. Aprove se suficiente; reprove se gaps. Se reprovado, na justificativa, cite um exemplo, como 'Conteúdo no Capítulo 3 insuficiente para exercício 2 em Praticando'.`
        },
        {
            "id": 11,
            "displayText": "Validar questões.",
            "type": "auto",
            "textForAI": `Você é um criador de avaliações educacionais para o ensino médio no Maranhão. Sua tarefa é analisar as seções 'Exercitando' da apostila, verificando se todas as questões objetivas atendem aos seguintes padrões, considerando a ementa: ${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}: (1) possuem exatamente 4 opções de respostas (A, B, C, D); (2) as opções têm tamanhos semelhantes (aproximadamente o mesmo número de palavras ou caracteres, com pequenas variações aceitáveis; uma opção significativamente mais longa ou curta indica enviesamento); (3) os enunciados estão contextualizados em situações reais, relevantes para estudantes do ensino médio (ex.: cenários do cotidiano, profissões, ou questões locais do Maranhão, como agricultura, cultura ou geografia local). Passo 1: Extraia todas as seções 'Exercitando'. Passo 2: Para cada questão objetiva, verifique os quatro padrões. Passo 3: Aprove se todas as questões atenderem a todos os padrões; reprove se houver qualquer questão que falhe em pelo menos um padrão. Se reprovado, na justificativa, cite um ou dois exemplos específicos, como 'Questão 1 no Exercitando do Capítulo 2 tem apenas 3 opções' or 'Enunciado da questão 4 no Exercitando do Capítulo 1 carece de contexto real'.`
        },
        {
            "id": 12,
            "displayText": "Verificar a ordem de seções por capítulo: 1 Contextualizando, 1 Conectando, 1 Aprofundando, 1 Praticando, 1 Recapitulando e 1 Exercitando.",
            "type": "auto",
            "textForAI": `Você é um especialista em estruturação de materiais didáticos. Sua tarefa é verificar, para CADA capítulo do documento, se as seis seções a seguir estão presentes e NA ORDEM CORRETA: 1 Contextualizando, 1 Conectando, 1 Aprofundando, 1 Praticando, 1 Recapitulando e 1 Exercitando, considerando a ementa: ${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}. Passo 1: Identifique todos os capítulos no documento. Passo 2: Para cada capítulo, liste as seções presentes e verifique se estão na ordem correta. Passo 3: Aprove se todos os capítulos tiverem todas as seções na ordem correta; reprove se algum capítulo estiver com seções faltantes, fora de ordem ou com nomes incorretos (ex: 'EXERCÍCIOS' em vez de 'Exercitando'). Na justificativa, para TODOS os casos (aprovado ou reprovado), inclua uma lista detalhada de todos os capítulos e as seções presentes em cada um, no formato: 'Capítulo X: [lista de seções encontradas]'. If reprovado, adicione uma frase curta indicando o problema, como 'Capítulo 7 possui a seção EXERCÍCIOS em vez de Exercitando'. Exemplo de justificativa: 'Capítulo 1: Contextualizando, Conectando, Aprofundando, Praticando, Recapitulando, Exercitando; Capítulo 2: Contextualizando, Conectando, Aprofundando, Praticando, Recapitulando, Exercitando; Capítulo 7: Contextualizando, Conectando, Aprofundando, Praticando, Recapitulando, EXERCÍCIOS. Capítulo 7 possui a seção EXERCÍCIOS em vez de Exercitando.'`
        },
        {
            "id": 13,
            "displayText": "Verificar se o conteúdo abordado em cada seção didática atende à proposta e à sua função.",
            "type": "auto",
            "textForAI": `Você é um avaliador de estrutura didática. Sua tarefa é verificar se o conteúdo de cada seção atende sua função proposta (ex: Contextualizando introduz contexto), considerando a ementa: ${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}. Passo 1: Defina função de cada seção. Passo 2: Analise alinhamento. Aprove se atendido; reprove se não. Se reprovado, na justificativa, cite um exemplo, como 'Seção Aprofundando no Capítulo 1 não aprofunda conceitos adequadamente'.`
        },
        {
            "id": 14,
            "displayText": "Verificar se a linguagem está clara, coerente e com fluxo lógico apresentando os conceitos de forma progressiva.",
            "type": "auto",
            "textForAI": `Você é um editor linguístico pedagógico. Sua tarefa é avaliar clareza, coerência, fluxo lógico e progressão de conceitos na linguagem, considerando a ementa: ${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}. Passo 1: Leia o texto sequencialmente. Passo 2: Identifique problemas de fluxo ou clareza. Aprove se excelente; reprove se falhas. Se reprovado, na justificativa, aponte um ou dois, como 'Fluxo ilógico na transição do Capítulo 2 para 3'.`
        },
        {
            "id": 15,
            "displayText": "Verificar se a linguagem está adequada para um material didático (Obs.: Não utilizar linguagem coloquial).",
            "type": "auto",
            "textForAI": `Você é um revisor de tom educacional. Sua tarefa é verificar se a linguagem é formal e adequada, evitando coloquialismos, considerando a ementa: ${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}. Passo 1: Escaneie por expressões informais, excluindo tags estilísticas como #FIQUELIGADO# que são usadas para ênfase e não são inerentemente coloquiais. Passo 2: Avalie adequação ao público. Aprove se formal; reprove se coloquial. Se reprovado, na justificativa, cite exemplos, como 'Uso de "conversa boa e agradável com um amigo" na seção CONECTANDO do Capítulo 3 é coloquial'.`
        },
        {
            "id": 16,
            "displayText": "Verificar se o autor indicou Recursos pedagógicos como jogos, games, podcasts, simulações ou tutoriais (Obs.: Facultativo).",
            "type": "auto",
            "textForAI": `Você é um integrador de recursos multimídia. Sua tarefa é verificar indicações de recursos pedagógicos facultativos como jogos ou podcasts, considerando a ementa: ${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}. Passo 1: Busque menções. Passo 2: Note presença. Aprove sempre, pois facultativo; na justificativa, descreva o encontrado, como 'Recursos como podcasts indicados no Capítulo 4' or 'Nenhum recurso facultativo mencionado'.`
        },
        {
            "id": 17,
            "displayText": "Verificar se há recapitulando/mapa mental em todos os capítulos.",
            "type": "auto",
            "textForAI": `Para CADA capítulo do documento, verifique se os títulos das seções 'Mapa Mental' estão presentes textualmente, considerando a ementa: ${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}. A simples menção do título 'Mapa Mental' é suficiente para aprovação, pois o conteúdo da imagem não pode ser analisado. Se algum capítulo não contiver a menção textual, o status deve ser 'Reprovado', e a justificativa deve listar especificamente quais capítulos estão incompletos.`
        },
        {
            "id": 18,
            "displayText": "Verificar se há recapitulando (Obs.: Facultativo).",
            "type": "auto",
            "textForAI": `Este critério é facultativo e deve ser sempre 'Aprovado'. Verifique se existem 'Recapitulando' ao final dos capítulos, considerando a ementa: ${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}. Na justificativa, apenas descreva o que encontrou. Exemplo: 'O documento possui recapitulações ao final de cada capítulo.' Or 'Nenhuma recapitulação foi encontrada.'`
        },
        {
            "id": 19,
            "displayText": "Verificar se há as Marcações de Capítulos, Seções e SubTags (#) nos livros.",
            "type": "auto",
            "textForAI": `Sua tarefa é verificar a formatação correta das marcações (tags) no documento, considerando a ementa: ${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}. A regra principal é que toda tag DEVE começar com '#' e terminar com '#', sem espaços entre o símbolo e a palavra (ex: #SAIBAMAIS#). O critério deve ser 'Reprovado' APENAS se você encontrar tags mal formatadas (ex: '#SAIBAMAIS' or 'DICAS#'). Se todas as tags encontradas seguirem o padrão '#PALAVRA#', ou se nenhuma tag da lista abaixo for utilizada, o critério deve ser 'Aprovado'. A simples ausência de subtags não é motivo para reprovação. Para sua referência, as tags esperadas são: #SAIBAMAIS#, #SAIBA MAIS#, #CURIOSIDADE#, #DICAS#, #FIQUEATENTO#, #FIQUE ATENTO#, #ATENCAO#, #ATENÇÃO#, #AQUINOMARANHAO#, #AQUINOMARANHÃO#, #AQUI NO MARANHAO#, #FIQUELIGADO#, #FIQUE LIGADO#, #DESTAQUE#, #QUADRO#, #CITACAO#, #TOOLTIP#, #TOOLTIPTITULO#, #Capítulo#, #CAPITULO#, #FONTE#, #QUEBRADEPAGINA#, #TITULO2#, #TITULO3#, #TITULOTABELA#.`
        },
        {
            "id": 20,
            "displayText": "Verificar as referências bibliográficas ao final do livro.",
            "type": "auto",
            "textForAI": `Você é um bibliógrafo acadêmico. Sua tarefa é verificar a presença e completude de referências bibliográficas no final da apostila, considerando a ementa: ${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}. Passo 1: Localize a seção de referências. Passo 2: Avalie formato e cobertura. Aprove se completa; reprove se ausente ou incompleta. Se reprovado, na justificativa, indique o problema, como 'Referências ausentes para fontes citadas no Capítulo 2'.`
        },
        {
    "id": 21,
    "displayText": "Validar links externos.",
    "type": "auto",
    "textForAI": `
        Você é um curador de conteúdo educacional especializado em alinhamento curricular para materiais didáticos do ensino médio no Maranhão. Sua tarefa é analisar os links externos da apostila com base no relatório pré-analisado, verificando se o conteúdo de cada link está alinhado com o contexto e os temas da apostila sobre 'Gestão operacional e logística em eventos'. Ignore se o conteúdo é 'educacional' de forma genérica; foque apenas no alinhamento específico com a apostila.

        **RELATÓRIO DA ANÁLISE DE LINKS (FEITA POR UMA FERRAMENTA EXTERNA QUE ACESSOU CADA LINK):**
        ---
        \${link_summaries}
        ---

        **SUA TAREFA:**
        1. **Revisão do Relatório:** Leia o relatório acima, que inclui descrições do conteúdo de cada link.
        2. **Análise de Alinhamento:**
           - Para cada link com status "Pendente", compare a descrição do seu conteúdo com os temas abordados na apostila (ex.: logística de eventos, acessibilidade, gestão financeira, criação de artes gráficas, indicadores de desempenho).
           - Verifique se o conteúdo do link complementa, exemplifica ou aprofunda temas presentes na apostila (ex.: um link sobre eventos culturais no Maranhão é alinhado se a apostila discutir eventos culturais).
           - Considere contexto: Links para eventos, notícias ou recursos práticos são aceitáveis se diretamente relacionados aos tópicos da apostila.
           - **Aprovado por link:** Se o conteúdo se alinha com pelo menos um tema da apostila.
           - **Reprovado por link:** If the content is irrelevant, misaligned, or contradictory to the apostila’s themes.
        3. **Links com Status "Reprovado":**
           - Inclua todos os links com status "Reprovado" (ex.: redes sociais ou links inacessíveis) na lista de "Análise Manual", mantendo a descrição fornecida pelo relatório.
        4. **Determinação do Status Final:**
           - **Aprovado:** Se TODOS os links com status "Pendente" estiverem alinhados.
           - **Reprovado:** Se pelo menos UM link com status "Pendente" não estiver alinhado.
        5. **Saída Estruturada:**
           - Retorne um objeto JSON com:
             - "status": "Aprovado" ou "Reprovado".
             - "detalhes": Um objeto com duas listas:
               - "Aprovados": Links com status "Pendente" que são relevantes, com justificativa de relevância.
               - "Análise Manual": Links com status "Reprovado", com a descrição do relatório.
           - Se "Aprovado", a justificativa pode ser uma string vazia ("").
           - Se "Reprovado", a justificativa deve listar os links "Pendente" reprovados com uma breve explicação de desalinhamento.

        **FORMATO JSON DE SAÍDA OBRIGATÓRIO:**
        {
          "analise": [{
            "criterio": 21,
            "status": "<Aprovado ou Reprovado>",
            "justificativa": "<string>",
            "detalhes": {
              "Aprovados": [
                {"link": "<URL>", "descricao": "<descrição do relatório>", "justificativa": "<razão do alinhamento>"},
                ...
              ],
              "Análise Manual": [
                {"link": "<URL>", "descricao": "<descrição do relatório>"},
                ...
              ]
            }
          }]
        }

        **EXEMPLO DE SAÍDA:**
        {
          "analise": [{
            "criterio": 21,
            "status": "Aprovado",
            "justificativa": "",
            "detalhes": {
              "Aprovados": [
                {"link": "https://example.com", "descricao": "Artigo sobre logística", "justificativa": "Alinhado com logística de eventos"},
                {"link": "https://youtube.com/watch?v=abc", "descricao": "Vídeo sobre planejamento de eventos", "justificativa": "Complementa o tema de gestão de eventos"}
              ],
              "Análise Manual": [
                {"link": "https://tiktok.com/abc", "descricao": "Conteúdo de rede social requer verificação manual: https://tiktok.com/abc"},
                {"link": "https://example.org", "descricao": "Conteúdo inacessível após tentativas. Verifique manualmente o link: https://example.org"}
              ]
            }
          }]
        }

        **APOSTILA COMPLETA PARA ANÁLISE (USE PARA COMPARAÇÃO DE ALINHAMENTO):**
        ---
        \${fileContent}
        ---
    `
}
    ];
    const handleStatusUpdate = (criterionId, newStatus) => {
        const updatedAnalysis = analysisResult.analise.map(item => {
            if (item.criterio === criterionId) {
                return { ...item, status: newStatus, manualEdit: true };
            }
            return item;
        });
        const criteriaForAI = fullCriteriaList.filter(c => c.type === 'auto');
        const totalAutoCriteria = criteriaForAI.length;
        const approvedCount = updatedAnalysis.filter(item => {
            const originalCriterion = fullCriteriaList.find(c => c.id === item.criterio);
            return originalCriterion && originalCriterion.type === 'auto' && item.status === 'Aprovado';
        }).length;
        const newScore = totalAutoCriteria > 0 ? Math.round((approvedCount / totalAutoCriteria) * 100) : 0;
        setAnalysisResult({
            pontuacaoFinal: newScore,
            analise: updatedAnalysis
        });
        setIsCorrectionModalOpen(false);
    };

    const handleGenerateCorrection = async (criterion) => {
        setSuggestion(null);
        setIsGeneratingSuggestion(true);
        let correctionTask = '';
        let persona = '';
        let outputFormat = `Sua resposta deve ser APENAS UM OBJETO JSON VÁLIDO. O objeto deve conter uma única chave, "correcoes", que é um array de objetos. Cada objeto deve ter TRÊS chaves: "original", "sugestao" e "contexto" (descrevendo onde a frase original está no documento, como capítulo e seção, ou indicando a ausência de conteúdo).`;

        switch (criterion.criterio) {
            case 0:
                persona = "Você é um especialista em alinhamento curricular para materiais didáticos do ensino médio no Maranhão.";
                correctionTask = `
                    Sua tarefa é sugerir correções para alinhar a apostila com a ementa selecionada, considerando as lacunas identificadas na justificativa: "${criterion.justificativa}". 
                    Ementa: 
                    - Objetivos: "${selectedEmenta ? selectedEmenta.objetivos : '[OBJETIVOS]'}"
                    - Conteúdo Programático: "${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}"
                    Para cada lacuna ou discrepância mencionada na justificativa, sugira:
                    - Um trecho de conteúdo a ser adicionado ou revisado na apostila, incluindo explicações, exemplos ou exercícios que atendam ao objetivo ou item do conteúdo programático ausente.
                    - O contexto onde o conteúdo deve ser inserido (ex.: "Adicionar ao Capítulo 2, seção Aprofundando").
                    - Se o problema for ausência total de um tema, sugira a criação de uma nova seção ou capítulo.
                `;
                outputFormat += ` Exemplo: {"correcoes": [
                    {"original": "Ausência de conteúdo sobre estatística descritiva", "sugestao": "Adicionar seção no Capítulo 2 com explicações sobre médias, medianas e desvios, incluindo exemplos práticos como cálculo de média de notas de uma turma em São Luís.", "contexto": "Capítulo 2, após a seção Aprofundando"},
                    {"original": "Objetivo de análise crítica não abordado", "sugestao": "Incluir atividade prática na seção Praticando do Capítulo 3, com exercícios que peçam aos estudantes para analisar um texto sobre cultura maranhense.", "contexto": "Capítulo 3, seção Praticando"}
                ]}`;
                break;
            case 1:
                persona = "Você é um assistente de editoração e organização de documentos, atento a detalhes de estrutura e consistência.";
                correctionTask = `Sua tarefa é ler o sumário e os títulos dos capítulos no corpo do texto e criar uma versão corrigida do sumário, considerando a ementa: ${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}. A sugestão deve ser um ARRAY DE STRINGS, onde cada string é uma linha do novo sumário, refletindo com precisão os temas abordados nos capítulos.`;
                outputFormat += ` Exemplo: {"correcoes": [{"original": "Sumário atual com inconsistências.", "sugestao": ["1. Introdução ao Meio Ambiente", "2. Sustentabilidade no Maranhão"], "contexto": "O sumário precisa ser atualizado para refletir os títulos reais dos capítulos."}]}`;
                break;
            case 2:
                persona = "Você é um revisor linguístico especializado em linguagem inclusiva para materiais didáticos.";
                correctionTask = "Sua tarefa é identificar ocorrências da palavra 'Aluno' (ou suas variações, como 'aluno', 'alunos') e sugerir a substituição por 'Estudante' (ou 'estudantes') para promover neutralidade de gênero. Forneça a frase original, a frase revisada e o contexto.";
                outputFormat += ` Exemplo: {"correcoes": [{"original": "O aluno deve estudar.", "sugestao": "O estudante deve estudar.", "contexto": "Encontrado na introdução do Capítulo 1."}]}`;
                break;
            case 5:
                persona = "Você é um designer instrucional especializado em materiais educacionais para o ensino médio.";
                correctionTask = `Sua tarefa é sugerir uma introdução geral para a apostila, incluindo objetivos de aprendizagem claros, caso esteja ausente ou incompleta, considerando a ementa: ${selectedEmenta ? selectedEmenta.objetivos : '[OBJETIVOS]'}. Se a introdução existir mas não tiver objetivos claros, sugira uma reformulação com objetivos explícitos e alinhados ao conteúdo.`;
                outputFormat += ` Exemplo: {"correcoes": [{"original": "Bem-vindo ao curso.", "sugestao": "Bem-vindo ao curso. Esta apostila visa desenvolver competências em análise crítica, com os seguintes objetivos: 1) Compreender conceitos fundamentais; 2) Aplicar conhecimentos em exercícios práticos.", "contexto": "Introdução geral da apostila."}]}`;
                break;
            case 11:
                persona = "Você é um especialista em aprendizagem aplicada para o ensino médio no Maranhão.";
                correctionTask = `Sua tarefa é identificar enunciados nas seções 'Exercitando' que não estão contextualizados em situações reais, considerando a ementa: ${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}. Para cada enunciado problemático, sugira uma versão revisada com um contexto realista e relevante para estudantes do ensino médio (ex.: cenários do cotidiano, profissões, ou questões locais do Maranhão), mantendo 4 opções de respostas de tamanhos semelhantes e indicando o gabarito.`;
                outputFormat += ` Exemplo: {"correcoes": [{"original": "Questão 2: Qual é a fórmula da água?", "sugestao": "Questão 2: Durante uma aula prática no laboratório de uma escola em Imperatriz, os estudantes analisam amostras de água. Qual é a fórmula química da água? a) H2O b) CO2 c) NaCl d) O2 (Gabarito: A)", "contexto": "Exercitando do Capítulo 2"}]}`;
                break;
            case 15:
                persona = "Você é um revisor de textos didáticos, especializado em linguagem clara e adequada para materiais educacionais.";
                correctionTask = `Sua tarefa é identificar frases ou expressões coloquiais no texto, excluindo tags estilísticas como #FIQUELIGADO# que são usadas para ênfase e não são inerentemente coloquiais, considerando a ementa: ${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}. Sugira revisões que adotem um tom formal e didático, mantendo a clareza para estudantes do ensino médio. As sugestões devem ser simples, diretas e evitar termos técnicos complexos, usando linguagem acessível e apropriada para o contexto educacional.`;
                outputFormat += ` Exemplo: {"correcoes": [{"original": "Lemba daquela conversa boa e agradável com um amigo no qual você tomou conhecimento de uma situação que ocorreu?", "sugestao": "Pense em uma conversa com um colega que facilitou a compreensão de uma situação ou história.", "contexto": "Encontrado na seção CONECTANDO do Capítulo 3, no parágrafo que discute a comunicação verbal e o storytelling."}]}`
                break;
            default:
                setIsGeneratingSuggestion(false);
                return;
        }

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const correctionPrompt = `
                ${persona}
                Contexto: Uma análise de IA em um material didático encontrou uma falha no critério "${criterion.descricao}", com a justificativa "${criterion.justificativa}".
                Tarefa: ${correctionTask} Para cada correção, você DEVE fornecer o contexto da localização do texto original.
                ${outputFormat}
                ---
                MATERIAL COMPLETO PARA ANÁLISE:
                ${fileContent}
                ---
            `;
            const result = await model.generateContent(correctionPrompt);
            const response = await result.response;
            let text = response.text();

            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const startIndex = text.indexOf('{');
            const endIndex = text.lastIndexOf('}');
            if (startIndex > -1 && endIndex > -1) {
                const jsonString = text.substring(startIndex, endIndex + 1);
                setSuggestion(JSON.parse(jsonString));
            } else {
                throw new Error("Resposta da IA não continha um JSON válido para as sugestões.");
            }
        } catch (e) {
            console.error("Erro ao gerar sugestão:", e);
            setSuggestion({ error: "Não foi possível gerar uma sugestão estruturada." });
        } finally {
            setIsGeneratingSuggestion(false);
        }
    };

    const handleEditClick = (criterion) => {
        setCorrectionTarget(criterion);
        setIsCorrectionModalOpen(true);
        if (criteriaWithSuggestions.includes(criterion.criterio)) {
            handleGenerateCorrection(criterion);
        } else {
            setSuggestion(null);
        }
    };

    const extractTextFromFile = (file) => {
        return new Promise((resolve, reject) => {
            if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const arrayBuffer = event.target.result;
                    try {
                        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                        resolve(result.value);
                    } catch (err) { reject(err); }
                };
                reader.onerror = (error) => reject(error);
                reader.readAsArrayBuffer(file);
            } else {
                reject(new Error("Formato de arquivo não suportado. Use .docx"));
            }
        });
    };

    const handleRealLinkValidation = async (links) => {
        if (!links || links.length === 0) {
            return "Nenhum link externo encontrado no documento.";
        }

        setIsAnalyzingLinks(true);
        setLinkAnalysisMessage(`Analisando ${links.length} link(s) em tempo real...`);
        setError(null);

        try {
            const response = await fetch(`${BACKEND_API_URL}/api/analyze-links`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ links }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao validar links no backend.');
            }

            const data = await response.json();

            // Formata o resultado para injetar no prompt do Gemini
            const linkSummaries = data.analysis.map(
                r => `- Link: ${r.link}\n  - Status: ${r.status}\n  - Descrição: ${r.descricao}`
            ).join('\n');

            return linkSummaries;

        } catch (err) {
            console.error(err);
            setError(`Erro na validação de links: ${err.message}`);
            // Retorna null para indicar que a análise principal deve ser interrompida
            return null;
        } finally {
            setIsAnalyzingLinks(false);
            setLinkAnalysisMessage('');
        }
    };

    const extractLinks = async (extractedText) => {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const linkExtractionPrompt = `
            Você é um extrator de links especializado. Sua tarefa é analisar o texto fornecido e extrair TODOS os URLs presentes (padrões como http://, https://, ou www.). Ignore qualquer texto que não seja um URL válido. Retorne apenas uma lista de URLs em formato JSON.

            **INSTRUÇÕES:**
            - Inclua apenas URLs completos (ex.: "https://example.com", "http://site.org", "www.example.com").
            - Não modifique ou valide os URLs, apenas extraia-os como aparecem no texto.
            - Retorne um objeto JSON com uma única chave "links" que contém um array de strings (os URLs).
            - Se não houver URLs, retorne um array vazio.

            **FORMATO JSON DE SAÍDA OBRIGATÓRIO:**
            {"links": ["<URL1>", "<URL2>", ...]}

            **TEXTO PARA ANÁLISE:**
            ---
            ${extractedText}
            ---
        `;
        try {
            const linkResult = await model.generateContent(linkExtractionPrompt);
            const linkResponse = await linkResult.response;
            let linkText = linkResponse.text();
            linkText = linkText.replace(/```json/g, '').replace(/```/g, '').trim();
            const startIndex = linkText.indexOf('{');
            const endIndex = linkText.lastIndexOf('}');
            if (startIndex > -1 && endIndex > -1 && endIndex > startIndex) {
                const jsonString = linkText.substring(startIndex, endIndex + 1);
                const linkJson = JSON.parse(jsonString);
                const links = linkJson.links || [];
                console.log("Links extraídos do documento:", links);
                return links;
            } else {
                console.error("Resposta da IA para extração de links não continha um JSON válido.");
                return [];
            }
        } catch (linkError) {
            console.error("Erro ao extrair links:", linkError);
            return [];
        }
    };

    const handleStudentAnalysis = async () => {
        if (!studentFile || !selectedEmenta) {
            setError('Por favor, selecione um arquivo e uma ementa.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        try {
            const extractedText = await extractTextFromFile(studentFile);
            setFileContent(extractedText);

            // 5. INTEGRAÇÃO DA VALIDAÇÃO DE LINKS NA ANÁLISE PRINCIPAL
            // Etapa 1: Extrair links do texto
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const links = extractedText.match(urlRegex) || [];
            const uniqueLinks = [...new Set(links)];

            // Etapa 2: Chamar o backend para validar os links
            const linkSummaries = await handleRealLinkValidation(uniqueLinks);

            // Se a validação de links falhar, interrompe a análise
            if (linkSummaries === null) {
                setIsLoading(false);
                return;
            }

            // Etapa 3: Preparar o prompt final para o Gemini
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Ou o modelo que preferir
            const prompt = `
                Você é um especialista educacional na criação e curadoria de apostilas para estudantes do ensino médio do estado do Maranhão. Sua tarefa é analisar a APOSTILA e avaliá-la criteriosamente, usando conceitos de análise e pedagogia e com base nos seguintes critérios. Para os critérios que dependem da ementa, utilize as informações abaixo.

                **EMENTA SELECIONADA:**
                - Nome da Disciplina: ${selectedEmenta.nome_disciplina}
                - Objetivos: ${selectedEmenta.objetivos}
                - Conteúdo Programático: ${selectedEmenta.conteudo_programatico}
                - Carga Horária: ${selectedEmenta.carga_horaria}

                **LISTA DE CRITÉRIOS PARA ANÁLISE:**
                ${fullCriteriaList.map(c => {
                let textForAI = c.textForAI;
                // Injeta o resumo dos links no critério 21
                if (c.id === 21) {
                    textForAI = textForAI.replace('${link_summaries}', linkSummaries);
                }
                return `${c.id}. ${textForAI}`;
            }).join('\n\n')}
                
                **APOSTILA COMPLETA PARA ANÁLISE:**
                ---
                ${extractedText}
                ---
                
                **FORMATO JSON DE SAÍDA OBRIGATÓRIO (sem pontuacaoFinal):**
                {"analise": [{"criterio": <number>, "status": "<Aprovado ou Reprovado>", "justificativa": "<string>"}]}
            `;

            // ... (continua com a chamada ao Gemini e processamento do resultado)
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();

            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const startIndex = text.indexOf('{');
            const endIndex = text.lastIndexOf('}');
            if (startIndex === -1 || endIndex === -1) {
                throw new Error("Resposta da IA não continha um JSON válido.");
            }
            const jsonString = text.substring(startIndex, endIndex + 1);
            const jsonResponse = JSON.parse(jsonString);

            const approvedCount = jsonResponse.analise.filter(item => item.status === 'Aprovado').length;
            const score = fullCriteriaList.length > 0 ? Math.round((approvedCount / fullCriteriaList.length) * 100) : 0;

            const finalAnalysis = fullCriteriaList.map(criterion => {
                const autoResult = jsonResponse.analise.find(item => item.criterio === criterion.id);
                return {
                    criterio: criterion.id,
                    descricao: criterion.displayText,
                    status: autoResult ? autoResult.status : 'Erro',
                    justificativa: autoResult ? autoResult.justificativa : 'Critério não retornado pela IA.'
                };
            });

            setAnalysisResult({
                pontuacaoFinal: score,
                analise: finalAnalysis
            });
            setIsModalOpen(true);

        } catch (e) {
            console.error(e);
            setError("Ocorreu um erro ao analisar o documento. Se o problema persistir, verifique sua chave de API e as permissões do modelo.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleExerciseAnalysis = async () => {
        if (!studentFile) {
            setError("Por favor, selecione um arquivo para análise.");
            return;
        }
        if (!selectedEmenta) {
            setError("Por favor, selecione uma ementa antes de realizar a análise.");
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);
        setError(null);
        try {
            const extractedText = await extractTextFromFile(studentFile);
            setFileContent(extractedText);

            const links = await extractLinks(extractedText);
            console.log("Links extraídos (Análise de Exercícios - Professor):", links);

            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `
                Você é um especialista educacional na criação e curadoria de apostilas para estudantes do ensino médio do estado do Maranhão. Sua tarefa é analisar apenas as seções 'Exercitando' da APOSTILA, extraindo-as e avaliando-as minuciosa, detalhada e extremamente acurada com base no seguinte critério. Foque apenas nessas seções, ignorando o resto do documento.

                **INSTRUÇÕES GERAIS:**
                - Passo 1: Identifique e extraia todas as seções 'Exercitando' (uma por capítulo, se houver múltiplas), listando-as por capítulo se possível.
                - Passo 2: Para cada seção 'Exercitando', analise cada questão individualmente:
                  - **Critério: Validar questões**:
                    - Verifique se as questões objetivas têm exatamente 4 opções de respostas (A, B, C, D).
                    - Verifique se as opções têm tamanhos semelhantes (aproximadamente o mesmo número de palavras ou caracteres, com pequenas variações aceitáveis; uma opção significativamente mais longa ou curta indica enviesamento).
                    - Verifique se os enunciados estão contextualizados em situações reais, relevantes para estudantes do ensino médio (ex.: cenários do cotidiano, profissões, ou questões locais do Maranhão, como agricultura, cultura ou geografia local), considerando a ementa: ${selectedEmenta ? selectedEmenta.conteudo_programatico : '[CONTEUDO_PROGRAMATICO]'}.
                    - Confirme se o gabarito está indicado (ex.: 'Gabarito: A').
                - Passo 3: Determine o status do critério como "Aprovado" ou "Reprovado":
                  - Aprove se todas as questões atenderem a todos os padrões (4 opções, tamanhos semelhantes, contextualização e gabarito).
                  - Reprove se houver qualquer questão que falhe em pelo menos um padrão.
                - Passo 4: Se reprovado, sugira correções perfeitas e eficazes. Para cada seção 'Exercitando' problemática, forneça:
                  - Um novo contexto realista e relevante para o tema do capítulo.
                  - Uma ou mais questões revisadas com 4 opções de tamanhos semelhantes, enunciado contextualizado e gabarito indicado.

                **INSTRUÇÃO IMPORTANTE PARA JUSTIFICATIVA:**
                - Para o critério APROVADO, a 'justificativa' deve ser uma string vazia "".
                - Para o critério REPROVADO, a 'justificativa' deve ser curta e cirúrgica, apontando apenas um ou dois exemplos claros do problema e sua localização (Capítulo e Seção). Inclua as sugestões de correção no final da justificativa, no formato: 'Sugestão: [novo contexto e questões revisadas].'

                **CRITÉRIO PARA ANÁLISE:**
                1. Validar questões: Verificar se todas as questões objetivas nas seções 'Exercitando' têm exatamente 4 opções de respostas (A, B, C, D), com tamanhos semelhantes, enunciados contextualizados em situações reais e gabarito indicado.

                **APOSTILA COMPLETA PARA ANÁLISE:**
                ---
                ${extractedText}
                ---
                
                **FORMATO JSON DE SAÍDA OBRIGATÓRIO:**
                {"analise": [{"criterio": 11, "status": "<Aprovado ou Reprovado>", "justificativa": "<string>"}]}
            `;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();
            let jsonResponse;
            try {
                text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                const startIndex = text.indexOf('{');
                const endIndex = text.lastIndexOf('}');
                if (startIndex > -1 && endIndex > -1 && endIndex > startIndex) {
                    const jsonString = text.substring(startIndex, endIndex + 1);
                    jsonResponse = JSON.parse(jsonString);
                } else {
                    throw new Error("Nenhum objeto JSON válido foi encontrado na resposta.");
                }
            } catch (parseError) {
                console.error("Erro ao fazer o parse do JSON da API:", parseError);
                console.error("Texto recebido da API:", text);
                throw new Error("A resposta da API não estava em um formato JSON válido.");
            }
            const approvedCount = jsonResponse.analise.filter(item => item.status === 'Aprovado').length;
            const totalCriteria = jsonResponse.analise.length;
            const score = totalCriteria > 0 ? Math.round((approvedCount / totalCriteria) * 100) : 0;
            const finalAnalysis = jsonResponse.analise.map(item => ({
                criterio: item.criterio,
                descricao: "Validar questões.",
                status: item.status,
                justificativa: item.justificativa
            }));
            setAnalysisResult({
                pontuacaoFinal: score,
                analise: finalAnalysis
            });
            setIsModalOpen(true);
        } catch (e) {
            console.error(e);
            setError("Ocorreu um erro ao analisar os exercícios. Se o problema persistir, verifique sua chave de API e as permissões do modelo.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportPDF = () => {
        if (!analysisResult) return;

        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text(`Relatório de Análise - Versão Estudante (${selectedEmenta ? selectedEmenta.nome_disciplina : 'Sem Ementa'})`, 14, 22);

        doc.setFontSize(12);
        doc.text(`Pontuação Final: ${analysisResult.pontuacaoFinal}%`, 14, 32);
        if (selectedEmenta) {
            doc.text(`Ementa Selecionada: ${selectedEmenta.nome_disciplina}`, 14, 40);
            doc.text(`Objetivos da Ementa: ${selectedEmenta.objetivos}`, 14, 48);
            doc.text(`Conteúdo Programático: ${selectedEmenta.conteudo_programatico}`, 14, 56);
        }

        const tableColumn = ["ID", "Critério", "Status", "Justificativa"];

        const sortedAnalysis = [...analysisResult.analise].sort((a, b) => {
            const aIsReprovado = a.status.includes('Reprovado');
            const bIsReprovado = b.status.includes('Reprovado');

            if (aIsReprovado && !bIsReprovado) return -1;
            if (!aIsReprovado && bIsReprovado) return 1;

            return a.criterio - b.criterio;
        });

        const tableRows = sortedAnalysis.map(item => [
            item.criterio,
            item.descricao,
            item.manualEdit ? `${item.status} (Editado)` : item.status,
            item.justificativa || "N/A"
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: selectedEmenta ? 64 : 40,
            headStyles: { fillColor: [41, 128, 185] },
            styles: { fontSize: 8 },
            didParseCell: function (data) {

                if (data.section === 'body') {
                    const status = data.row.raw[2].toString();

                    if (status.includes('Aprovado')) {
                        data.cell.styles.fillColor = [220, 245, 220];
                    } else if (status.includes('Reprovado')) {
                        data.cell.styles.fillColor = [255, 220, 220];
                    }
                }
            }
        });

        doc.save(`relatorio-analise-estudante-${selectedEmenta ? selectedEmenta.nome_disciplina : 'sem-ementa'}.pdf`);
    };


    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={4} justifyContent="center">
                <Grid item xs={12} md={8}>
                    <Box sx={{ mb: 2 }}>
                        <FormControl fullWidth>
                            <Autocomplete
                                id="ementa-autocomplete"
                                options={ementas}
                                getOptionLabel={(option) => option.nome_disciplina || ''}
                                value={selectedEmenta}
                                onChange={(event, newValue) => {
                                    setSelectedEmenta(newValue);
                                }}
                                loading={isLoadingEmentas}
                                loadingText="Carregando ementas..."
                                noOptionsText="Nenhuma ementa encontrada"
                                disabled={isLoadingEmentas || isLoading}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Selecionar Ementa"
                                        placeholder="Digite para pesquisar uma disciplina"
                                        variant="outlined"
                                    />
                                )}
                            />
                        </FormControl>
                    </Box>
                    <FileUploadSection
                        title="Versão do Estudante"
                        onFileSelect={setStudentFile}
                        onAnalyze={handleStudentAnalysis}
                        onExerciseAnalyze={handleExerciseAnalysis}
                        isLoading={isLoading}
                    />
                </Grid>
            </Grid>

            {/* 6. INDICADOR DE CARREGAMENTO PARA A ANÁLISE DE LINKS */}
            {(isAnalyzingLinks || isLoading) && (
                <Box sx={{ width: '100%', mt: 13 }}>
                    <Typography textAlign="center" sx={{ mb: 2 }}>
                        {isAnalyzingLinks ? linkAnalysisMessage : "Analisando documento completo..."}
                    </Typography>
                    {isAnalyzingLinks ? <CircularProgress sx={{ display: 'block', margin: 'auto' }} /> : <LinearProgress />}
                </Box>
            )}

            {error && (
                <Typography color="error" sx={{ textAlign: 'center', mt: 12 }}>
                    {error}
                </Typography>
            )}

            {!isLoading && analysisResult && (
                <Paper
                    elevation={3}
                    sx={{ mt: 15, p: { xs: 2, md: 3 }, textAlign: 'center' }}
                >
                    <Typography variant="h5" gutterBottom>Análise Concluída</Typography>
                    <Typography variant="h6">
                        Pontuação da Análise Automática: {analysisResult.pontuacaoFinal}% de Aprovação
                    </Typography>
                    <Button
                        variant="contained"
                        sx={{ mt: 2 }}
                        onClick={() => setIsModalOpen(true)}
                    >
                        Ver Relatório Detalhado
                    </Button>
                </Paper>
            )}

            <ResultsModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                results={analysisResult}
                onEditCriterion={handleEditClick}
                criteriaWithSuggestions={criteriaWithSuggestions}
                onExportPDF={handleExportPDF}
            />
            <CorrectionModal
                open={isCorrectionModalOpen}
                onClose={() => setIsCorrectionModalOpen(false)}
                criterion={correctionTarget}
                onUpdateStatus={handleStatusUpdate}
                isGenerating={isGeneratingSuggestion}
                suggestion={suggestion}
            />
        </Container>
    );
};

export default AnalysisDashboard;