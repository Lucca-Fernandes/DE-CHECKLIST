// src/components/ProfessorDashboard.jsx
import React, { useState } from 'react';
import { Container, Grid, Typography, Box, LinearProgress, Paper, Button } from '@mui/material';
import FileUploadSection from './FileUploadSection';
import ResultsModal from './ResultsModal';
import CorrectionModal from './CorrectionModal';
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// Critérios que terão sugestões de correção (somente critério 15)
const criteriaWithSuggestions = [15];

const ProfessorDashboard = () => {
    const [professorFile, setProfessorFile] = useState(null);
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
        { id: 3, textForAI: "Este critério deve ser SEMPRE 'Aprovado'. Apenas identifique se o nome de um curso ou componente curricular (CC) é mencionado. Na 'justificativa', descreva o que encontrou e onde. Exemplo: 'O componente curricular \"Motion Design\" foi citado na seção INFORMAÇÕES GERAIS.' Se nada for encontrado, a justificativa deve ser uma string vazia.", displayText: "Verificar se é citado o nome do curso, já que o CC pode ser comum a outro Cursos.", type: 'auto' },        
        { id: 4, textForAI: "Sua análise deve se basear nas evidências textuais da presença de uma imagem (tags como '#IMAGEM#', legendas como 'Figura 1', etc.), já que você não pode ver a imagem em si. Para cada evidência de imagem encontrada, verifique no texto adjacente (geralmente abaixo) se há uma linha de 'Fonte:' com a referência completa. Se você encontrar evidências de uma ou mais imagens que NÃO possuem uma linha de 'Fonte:' completa e adjacente, o critério deve ser 'Reprovado' e a justificativa deve citar a localização da imagem sem fonte. Se todas as imagens identificadas possuírem uma fonte completa, ou se nenhuma imagem for identificada no texto, o critério é 'Aprovado'.", displayText: "Verificar se há referência e Fonte completa nas imagens e recursos visuais utilizados pelo autor. (Obs: Preferência por Shutterstock com indicação de ID).", type: 'auto' },        
        { id: 5, textForAI: "Você não consegue ler o conteúdo de tabelas que estão em formato de imagem. Portanto, sua tarefa é apenas verificar se existe a seção textual 'Planejamento de ensino' ou 'Planejamento das aulas'. Se você encontrar o título ou menções a essa seção/tabela no documento, o critério deve ser 'Aprovado', pois devemos assumir que a imagem da tabela está presente e preenchida. O critério só deve ser 'Reprovado' se não houver NENHUMA menção a essa seção no documento.", displayText: "Verificar se o quadro inicial (Planejamento das aulas) com Conhecimentos e estratégias de ensino está preenchido.", type: 'auto' },        
        { id: 6, displayText: "Verificar se consta no livro os objetivos de aprendizagem.", type: 'auto' },
        { id: 7, textForAI: "Para CADA capítulo do documento, verificar se as seis seções a seguir estão presentes e NA ORDEM CORRETA: 1 Contextualizando, 1 Conectando, 1 Aprofundando, 1 Praticando, 1 Recapitulando e 1 Exercitando.", displayText: "Verificar a ordem de seções por capítulo: 1 Contextualizando, 1 Conectando, 1 Aprofundando, 1 Praticando, 1 Recapitulando e 1 Exercitando.", type: 'auto' },
        { id: 8, displayText: "Verificar se o conteúdo abordado em cada seção didática atende à proposta e à sua função.", type: 'auto' },
        { id: 9, displayText: "Verificar se o conteúdo abordado no livro do professor está coerente e compatível com o que foi abordado no livro do estudante.", type: 'manual' },
        { id: 10, displayText: "Verificar se a linguagem está clara, coerente e com fluxo lógico apresentando os conceitos de forma progressiva.", type: 'auto' },
        { id: 11, displayText: "Verificar se os links estão funcionando e ativos e se estão adequados ao tema.", type: 'manual' },
        { id: 12, displayText: "Verificar se há indicações para os professores de materiais de apoio, como sugestões de recursos adicionais, slides, gráficos ou ferramentas digitais.", type: 'auto' },
        { id: 13, displayText: "Verificar se há analogias e exemplos com o cotidiano, para relacionar os conceitos do livro a situações práticas.", type: 'auto' },
        { id: 14, displayText: "Verificar se há indicações de discussões e interações propostas, como dinâmicas, perguntas norteadoras ou debates para facilitar o trabalho do professor.", type: 'auto' },
        { id: 15, displayText: "Verificar se há gabarito comentado e justificativa das respostas corretas e incorretas nas questões dos exercícios.", type: 'auto' },
        { id: 16, displayText: "Verificar se há conteúdos extras ou complementares para auxiliar o professor, como indicações de vídeos, livros, filmes, artigos, simuladores, tutoriais.", type: 'auto' },
        { id: 17, displayText: "Verificar se há indicação de Atividades extras e Bibliografia complementar para o professor.", type: 'auto' },
        { id: 18, displayText: "Verificar referências bibliográficas no final do livro.", type: 'auto' },
        { id: 19, textForAI: `Sua tarefa é verificar a formatação correta das marcações (tags) no documento. A regra principal é que toda tag DEVE começar com '#' e terminar com '#', sem espaços entre o símbolo e a palavra (ex: #SAIBAMAIS#). O critério deve ser 'Reprovado' APENAS se você encontrar tags mal formatadas (ex: '#SAIBAMAIS' ou 'DICAS#'). Se todas as tags encontradas seguirem o padrão '#PALAVRA#', ou se nenhuma tag da lista abaixo for utilizada, o critério deve ser 'Aprovado'. A simples ausência de subtags não é motivo para reprovação. Para sua referência, as tags esperadas são: #SAIBAMAIS#, #SAIBA MAIS#, #CURIOSIDADE#, #DICAS#, #FIQUEATENTO#, #FIQUE ATENTO#, #ATENCAO#, #ATENÇÃO#, #AQUINOMARANHAO#, #AQUINOMARANHÃO#, #AQUI NO MARANHAO#, #FIQUELIGADO#, #FIQUE LIGADO#, #DESTAQUE#, #QUADRO#, #CITACAO#, #TOOLTIP#, #TOOLTIPTITULO#, #Capítulo#, #CAPITULO#, #FONTE#, #QUEBRADEPAGINA#, #TITULO2#, #TITULO3#, #TITULOTABELA#.`, displayText: "Verificar se há as Marcações de Capítulos, Seções e SubTags (#) nos livros.", type: 'auto' },        
        { id: 20, displayText: "Verificar o padrão de nomeação dos arquivos, conforme encaminhado pela Ponto Edu.", type: 'manual' },
        { id: 21, displayText: "Indicar para o coordenador do eixo quando houver alto índice de textos gerados por IA.", type: 'auto' },
        { id: 22, displayText: "Verificar se o conteúdo do PPT destinado à videoaula do professor, está coerente com o conteúdo trabalhado no livro do professor.", type: 'manual' },
        { id: 23, displayText: "Verificar e organizar o Documento de pendências para os autores, quando necessário, conforme o padrão estabelecido pela Ponto Edu.", type: 'manual' },
        { id: 24, displayText: "Resolver as pendências/ajustes nos livros, conforme as respostas dos autores.", type: 'manual' }
    ];

    const extractTextFromFile = (file) => {
        return new Promise((resolve, reject) => {
            if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const arrayBuffer = event.target.result;
                    try {
                        const result = await mammoth.extractRawText({ arrayBuffer });
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

    const handleProfessorAnalysis = async () => {
        if (!professorFile) return;
        setIsLoading(true);
        setAnalysisResult(null);
        setError(null);
        
        const criteriaForAI = fullCriteriaList.filter(c => c.type === 'auto');
        
        try {
            const extractedText = await extractTextFromFile(professorFile);
            setFileContent(extractedText);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `
                Você é um especialista em análise de conteúdo pedagógico para materiais de professores. Sua tarefa é analisar a APOSTILA DO PROFESSOR e avaliá-la com base nos seguintes critérios.
                Sua resposta deve ser APENAS UM OBJETO JSON VÁLIDO.
                Para cada critério, determine o status como "Aprovado" ou "Reprovado".
                
                INSTRUÇÃO PARA JUSTIFICATIVA:
                - Para critérios APROVADOS, a 'justificativa' deve ser uma string vazia "".
                - Para critérios REPROVADOS, a 'justificativa' deve ser curta e cirúrgica, apontando apenas um ou dois exemplos claros do problema e sua localização (Capítulo e Seção, se possível). Não liste todas as ocorrências.

                LISTA DE CRITÉRIOS PARA ANÁLISE:
                ${criteriaForAI.map(c => `${c.id}. ${c.textForAI || c.displayText}`).join('\n')}

                APOSTILA COMPLETA PARA ANÁLISE:
                ---
                ${extractedText}
                ---

                FORMATO JSON DE SAÍDA OBRIGATÓRIO:
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
                    justificativa: autoResult ? autoResult.justificativa : '',
                    manualEdit: false
                };
            });

            setAnalysisResult({
                pontuacaoFinal: score,
                analise: finalAnalysis
            });
            setIsModalOpen(true);
        } catch (e) {
            console.error(e);
            setError("Ocorreu um erro ao analisar o documento.");
        } finally {
            setIsLoading(false);
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

    const handleGenerateCorrection = async (criterion) => {
        setIsGeneratingSuggestion(true);
        setSuggestion(null);
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `
                Gere sugestões de correção para o critério reprovado: "${criterion.descricao}".
                Identifique trechos específicos no texto onde o problema ocorre e sugira correções.
                Responda APENAS com um objeto JSON válido no formato:
                {"correcoes": [{"contexto": "<contexto do problema>", "original": "<trecho original>", "sugestao": "<sugestão de correção>"}]}

                Texto completo da apostila para análise:
                ---
                ${fileContent}
                ---
            `;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonSuggestion = JSON.parse(text);
            setSuggestion(jsonSuggestion);
        } catch (e) {
            console.error(e);
            setSuggestion({ error: "Erro ao gerar sugestões de correção." });
        } finally {
            setIsGeneratingSuggestion(false);
        }
    };

    const handleStatusUpdate = (criterioId, newStatus) => {
        setAnalysisResult(prev => {
            const newAnalise = prev.analise.map(item => {
                if (item.criterio === criterioId) {
                    return { ...item, status: newStatus, manualEdit: true };
                }
                return item;
            });
            // Opcional: Recalcular pontuação se necessário, mas mantendo como no original
            return { ...prev, analise: newAnalise };
        });
        setIsCorrectionModalOpen(false);
    };

    const handleExportPDF = () => {
        if (!analysisResult) return;

        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text("Relatório de Análise - Versão Professor", 14, 22);
        
        doc.setFontSize(12);
        doc.text(`Pontuação Final: ${analysisResult.pontuacaoFinal}%`, 14, 32);

        const tableColumn = ["ID", "Critério", "Status", "Justificativa"];
        const tableRows = analysisResult.analise.map(item => [
            item.criterio,
            item.descricao,
            item.manualEdit ? `${item.status} (Editado)` : item.status,
            item.justificativa || "N/A"
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'striped',
            headStyles: { fillColor: [22, 160, 133] },
            styles: { fontSize: 8 },
        });

        doc.save("relatorio-analise-professor.pdf");
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Grid container justifyContent="center">
                <Grid item xs={12} md={8}>
                    <FileUploadSection
                        title="Versão do Professor"
                        onFileSelect={setProfessorFile}
                        onAnalyze={handleProfessorAnalysis}
                        isLoading={isLoading}
                    />
                </Grid>
            </Grid>

            {isLoading && (
                <Box sx={{ width: '100%', mt: 4 }}>
                    <Typography textAlign="center" sx={{ mb: 1 }}>Analisando documento...</Typography>
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
                        Pontuação da Análise Automática: {analysisResult.pontuacaoFinal}% (Aprovado)
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

export default ProfessorDashboard;