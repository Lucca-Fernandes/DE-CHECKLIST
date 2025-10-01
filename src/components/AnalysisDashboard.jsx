// src/components/AnalysisDashboard.jsx
import React, { useState } from 'react';
import { Container, Grid, Typography, Box, LinearProgress, Paper, Button } from '@mui/material';
import FileUploadSection from './FileUploadSection';
import ResultsModal from './ResultsModal';
import CorrectionModal from './CorrectionModal';
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import jsPDF from 'jspdf'; // <-- IMPORTADO
import 'jspdf-autotable'; // <-- IMPORTADO

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// ATUALIZADO: O critério 3 foi removido desta lista.
const criteriaWithSuggestions = [2, 18, 22];

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

    const fullCriteriaList = [
      { id: 1, displayText: "Verificação no Plágius.", type: 'manual' },
      { id: 2, displayText: "Verificar se o sumário está de acordo com os temas abordados no decorrer do livro.", type: 'auto' },
      { id: 3, displayText: "Verificar se possui a palavra 'Aluno' e substituir por 'Estudante'.", type: 'auto' },
      { id: 4, displayText: "Verificar se há conteúdo específico #aquinomaranhão#.", type: 'auto' },
      { id: 5, textForAI: "Este critério deve ser SEMPRE 'Aprovado'. Sua tarefa é apenas identificar se o nome de um curso ou eixo específico (ex: 'Engenharia Civil', 'Gastronomia') é mencionado no texto. Se encontrar, a justificativa deve indicar qual curso e onde foi encontrado (ex: 'O curso \"Análise de Sistemas\" foi citado na introdução.'). Se não encontrar, a justificativa deve ser 'Nenhuma menção a um curso específico foi encontrada.'",displayText: "Verificar se é citado o nome do curso ou eixo.", type: 'auto'},
      { id: 6, displayText: "Verificar se há referência e Fonte completa nas imagens e recursos visuais utilizados pelo autor. (Obs: Preferência por Shutterstock com ID).", type: 'auto' },
      { id: 7, displayText: "Verificar se as imagens atendem à acessibilidade com as descrições detalhadas (Obs.: A descrição deve estar no campo 'Comentários' do documento).", type: 'manual' },
      { id: 8, displayText: "Verificar se os livros possuem uma Introdução geral, acompanhada dos objetivos de aprendizagem.", type: 'auto' },
      { id: 9, displayText: "Verificar se o conteúdo abordado no livro atende aos Objetivos de aprendizagem.", type: 'auto' },
      { id: 10, displayText: "Verificar se há exemplos ou cases relacionados aos conteúdos e aos conceitos para facilitar compreensão.", type: 'auto' },
      { id: 11, displayText: "Verificar se todos os links estão funcionando e ativos e se estão adequados ao tema.", type: 'manual' },
      { id: 12, displayText: "Verificar se há interações indicadas para aplicar na versão web.", type: 'manual' },
      { id: 13, displayText: "Verificar se há indicações para o Design criar o QR Code das interações para o livro off.", type: 'manual' },
      { id: 14, displayText: "Verificar se há conteúdos de curadoria como vídeos, livros, filmes, artigos, para complementar os estudos.", type: 'auto' },
      { id: 15, textForAI: `Este critério deve ser SEMPRE 'Aprovado'. Sua tarefa é contar o número total de questões na seção 'Exercitando' de TODA a apostila. Após contar, classifique a carga horária com base na regra: 4+ questões = 33h, 7+ questões = 67h, 10+ questões = 100h. Use a faixa que melhor se encaixa (ex: 8 questões = 67h). Na 'justificativa', informe o resultado. Exemplo: 'Foram encontradas 8 questões no total, compatível com um componente de 67h.' Se encontrar menos de 4 questões, informe. Exemplo: 'Foram encontradas apenas 3 questões, o que é insuficiente para a carga horária mínima.'`, displayText: "Verificar a quantidade de questões e a carga horária correspondente.",  type: 'auto'},      
      { id: 16, displayText: "Verificar se há conteúdo e informações suficientes no Livro que dê base para o aluno realizar tanto os exercícios, quanto as atividades do Praticando.", type: 'auto' },
      { id: 17, displayText: "Verificar se os exercícios com questões objetivas seguem o padrão de 4 opções de respostas (Obs.: Indicar no campo 'Comentários' o Gabarito).", type: 'auto' },
      { id: 18, displayText: "Verificar se os enunciados dos exercícios estão contextualizados, se aplicando a situações reais.", type: 'auto' },
      { id: 19, textForAI: "Para CADA capítulo do documento, verificar se as seis seções a seguir estão presentes e NA ORDEM CORRETA: 1 Contextualizando, 1 Conectando, 1 Aprofundando, 1 Praticando, 1 Recapitulando e 1 Exercitando. Na justificativa, caso reprovado, liste especificamente qual capítulo está com seções faltantes ou fora de ordem.", displayText: "Verificar a ordem de seções por capítulo: 1 Contextualizando, 1 Conectando, 1 Aprofundando, 1 Praticando, 1 Recapitulando e 1 Exercitando.", type: 'auto' },
      { id: 20, displayText: "Verificar se o conteúdo abordado em cada seção didática atende à proposta e à sua função.", type: 'auto' },
      { id: 21, displayText: "Verificar se a linguagem está clara, coerente e com fluxo lógico apresentando os conceitos de forma progressiva.", type: 'auto' },
      { id: 22, displayText: "Verificar se a linguagem está adequada para um material didático (Obs.: Não utilizar linguagem coloquial).", type: 'auto' },
      { id: 23, displayText: "Verificar se o autor indicou Recursos pedagógicos como jogos, games, podcasts, simulações ou tutoriais (Obs.: Facultativo).", type: 'auto' },
      { id: 24, textForAI: "Para CADA capítulo do documento, verifique se os títulos das seções 'Mapa Mental' estão presentes textualmente. A simples menção do título 'Mapa Mental' é suficiente para aprovação, pois o conteúdo da imagem não pode ser analisado. Se algum capítulo não contiver a menção textual, o status deve ser 'Reprovado', e a justificativa deve listar especificamente quais capítulos estão incompletos.",displayText: "Verificar se há recapitulando/mapa mental em todos os capítulos.", type: 'auto' },
      { id: 25, textForAI: "Este critério é facultativo e deve ser sempre 'Aprovado'. Verifique se, existem 'Recapitulando' aos finais dos capítulos. Na justificativa, apenas descreva o que encontrou. Exemplo: 'O documento possui recapitulações ao final de cada capítulo.' Ou 'Nenhuma recapitulação foi encontrada.'", displayText: "Verificar se há recapitulando (Obs.: Facultativo).", type: 'auto' },
    { id: 26, textForAI: `Sua tarefa é verificar a formatação correta das marcações (tags) no documento. A regra principal é que toda tag DEVE começar com '#' e terminar com '#', sem espaços entre o símbolo e a palavra (ex: #SAIBAMAIS#). O critério deve ser 'Reprovado' APENAS se você encontrar tags mal formatadas (ex: '#SAIBAMAIS' ou 'DICAS#'). Se todas as tags encontradas seguirem o padrão '#PALAVRA#', ou se nenhuma tag da lista abaixo for utilizada, o critério deve ser 'Aprovado'. A simples ausência de subtags não é motivo para reprovação. Para sua referência, as tags esperadas são: #SAIBAMAIS#, #SAIBA MAIS#, #CURIOSIDADE#, #DICAS#, #FIQUEATENTO#, #FIQUE ATENTO#, #ATENCAO#, #ATENÇÃO#, #AQUINOMARANHAO#, #AQUINOMARANHÃO#, #AQUI NO MARANHAO#, #FIQUELIGADO#, #FIQUE LIGADO#, #DESTAQUE#, #QUADRO#, #CITACAO#, #TOOLTIP#, #TOOLTIPTITULO#, #Capítulo#, #CAPITULO#, #FONTE#, #QUEBRADEPAGINA#, #TITULO2#, #TITULO3#, #TITULOTABELA#.`, displayText: "Verificar se há as Marcações de Capítulos, Seções e SubTags (#) nos livros.", type: 'auto' },        
      { id: 27, displayText: "Verificar o padrão de nomeação dos arquivos, conforme encaminhado pela Ponto Edu.", type: 'manual' },
      { id: 28, displayText: "Verificar as referências bibliográficas ao final do livro.", type: 'auto' },
      { id: 29, displayText: "Verificar se o conteúdo do PPT destinado à videoaula do professor, está coerente com o conteúdo trabalhado no livro do professor.", type: 'manual' },
      { id: 30, displayText: "Indicar para o coordenador do eixo quando houver alto índice de textos gerados por IA.", type: 'manual' },
      { id: 31, displayText: "Verificar e organizar o Documento de pendências para os autores, quando necessário, conforme o padrão estabelecido pela Ponto Edu.", type: 'manual' },
      { id: 32, displayText: "Resolver as pendências/ajustes nos livros, conforme as respostas dos autores.", type: 'manual' }
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
            return originalCriterion.type === 'auto' && item.status === 'Aprovado';
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
        let outputFormat = `Sua resposta deve ser APENAS UM OBJETO JSON VÁLIDO. O objeto deve conter uma única chave, "correcoes", que é um array de objetos. Cada objeto deve ter TRÊS chaves: "original", "sugestao" e "contexto" (descrevendo onde a frase original está no documento, como capítulo e seção).`;

        switch (criterion.criterio) {
            case 2:
                persona = "Você é um assistente de editoração e organização de documentos, atento a detalhes de estrutura e consistência.";
                correctionTask = "Sua tarefa é ler o sumário e os títulos dos capítulos no corpo do texto e criar uma versão corrigida do sumário. A sugestão deve ser um ARRAY DE STRINGS, onde cada string é uma linha do novo sumário.";
                outputFormat += ` Exemplo: {"correcoes": [{"original": "Sumário atual com inconsistências.", "sugestao": ["1. Título do Capítulo 1 Corrigido", "2. Título do Capítulo 2 Corrigido"], "contexto": "O sumário precisa ser atualizado para refletir os títulos reais dos capítulos."}]}`;
                break;
            case 18:
                persona = "Você é um especialista em design instrucional e um redator pedagógico criativo.";
                correctionTask = "Sua tarefa é REESCREVER os enunciados de exercícios que não estão contextualizados para que se apliquem a situações do mundo real.";
                outputFormat += ` Exemplo: {"correcoes": [{"original": "Faça uma pesquisa sobre X.", "sugestao": "Imagine que você é um consultor e precisa pesquisar sobre X para um cliente. Apresente seus resultados em um parágrafo.", "contexto": "Encontrado no Exercitando do Capítulo 2."}]}`;
                break;
            case 22:
                persona = "Você é um editor de textos didáticos sênior, especialista em linguagem acadêmica e formal.";
                correctionTask = "Sua tarefa é REESCREVER as frases com linguagem coloquial para que adotem um tom mais formal e didático.";
                outputFormat += ` Exemplo: {"correcoes": [{"original": "Pois é, são problemas...", "sugestao": "De fato, esses problemas...", "contexto": "Encontrado na Introdução."}]}`;
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

    const handleStudentAnalysis = async () => {
        if (!studentFile) return;
        setIsLoading(true);
        setAnalysisResult(null);
        setError(null);
        const criteriaForAI = fullCriteriaList.filter(c => c.type === 'auto');
        try {
            const extractedText = await extractTextFromFile(studentFile);
            setFileContent(extractedText);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `
                Você é um especialista em análise de conteúdo pedagógico para materiais de estudantes. Sua tarefa é analisar a APOSTILA e avaliá-la com base nos seguintes critérios.
                Sua resposta deve ser APENAS UM OBJETO JSON VÁLIDO.
                Para cada critério, determine o status como "Aprovado" ou "Reprovado".

                **INSTRUÇÃO IMPORTANTE PARA JUSTIFICATIVA:**
                - Para critérios APROVADOS, a 'justificativa' deve ser uma string vazia "".
                - Para critérios REPROVADOS, a 'justificativa' deve ser **curta e cirúrgica**, apontando **apenas um ou dois exemplos claros** do problema e sua localização (Capítulo e Seção, se possível). Não liste todas as ocorrências.

                **LISTA DE CRITÉRIOS PARA ANÁLISE:**
                ${criteriaForAI.map(c => `${c.id}. ${c.textForAI || c.displayText}`).join('\n')}
                
                **APOSTILA COMPLETA PARA ANÁLISE:**
                ---
                ${extractedText}
                ---
                
                **FORMATO JSON DE SAÍDA OBRIGATÓRIO (sem pontuacaoFinal):**
                {"analise": [{"criterio": <number>, "status": "<Aprovado ou Reprovado>", "justificativa": "<string>"}]}
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
                console.error("Texto recebido da API que causou o erro:", text);
                throw new Error("A resposta da API não estava em um formato JSON válido.");
            }
            const approvedCount = jsonResponse.analise.filter(item => item.status === 'Aprovado').length;
            const totalAutoCriteria = criteriaForAI.length;
            const score = totalAutoCriteria > 0 ? Math.round((approvedCount / totalAutoCriteria) * 100) : 0;
            const finalAnalysis = fullCriteriaList.map(criterion => {
                const autoResult = jsonResponse.analise.find(item => item.criterio === criterion.id);
                return {
                    criterio: criterion.id,
                    descricao: criterion.displayText,
                    status: criterion.type === 'manual' ? 'Análise Manual' : (autoResult ? autoResult.status : 'Erro'),
                    justificativa: autoResult ? autoResult.justificativa : ''
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

    const handleExportPDF = () => {
        if (!analysisResult) return;

        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text("Relatório de Análise - Versão Estudante", 14, 22);
        
        doc.setFontSize(12);
        doc.text(`Pontuação Final: ${analysisResult.pontuacaoFinal}%`, 14, 32);

        const tableColumn = ["ID", "Critério", "Status", "Justificativa"];
        const tableRows = analysisResult.analise.map(item => [
            item.criterio_id,
            item.criterio,
            item.manualEdit ? `${item.status} (Editado)` : item.status,
            item.justificativa || "N/A"
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { fontSize: 8 },
        });

        doc.save("relatorio-analise-estudante.pdf");
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={4} justifyContent="center">
                <Grid item xs={12} md={8}>
                    <FileUploadSection
                        title="Versão do Estudante"
                        onFileSelect={setStudentFile}
                        onAnalyze={handleStudentAnalysis}
                        isLoading={isLoading}
                    />
                </Grid>
            </Grid>

            {isLoading && (
                <Box sx={{ width: '100%', mt: 4 }}>
                    <Typography textAlign="center" sx={{ mb: 1 }}>Analisando documento completo...</Typography>
                    <LinearProgress />
                </Box>
            )}
            {error && (
                <Typography color="error" sx={{ textAlign: 'center', mt: 4 }}>
                    {error}
                </Typography>
            )}
            {!isLoading && analysisResult && (
                <Paper elevation={3} sx={{ mt: 4, p: 3, textAlign: 'center' }}>
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