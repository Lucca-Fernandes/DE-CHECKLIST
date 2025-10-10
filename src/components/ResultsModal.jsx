// src/components/ResultsModal.jsx
import React, { useState, useEffect } from 'react';
import { 
    Modal, Box, Typography, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Paper, Chip, 
    IconButton, Tooltip, Button 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: { xs: '95%', sm: '90%', md: '80%', lg: '1200px' },
    maxHeight: { xs: '90vh', sm: '85vh' },
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: { xs: 2, sm: 3, md: 4 },
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto' 
};

const ResultsModal = ({ open, onClose, results, onEditCriterion, criteriaWithSuggestions = [] }) => {
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        setShowAll(false);
    }, [results]);

    const handleExportPDF = () => {
        // (A lógica do PDF permanece a mesma, sem alterações)
        try {
            if (!results || !Array.isArray(results.analise)) {
                alert("Não foi possível gerar o PDF. Dados da análise estão ausentes.");
                return;
            }

            const doc = new jsPDF();
            
            doc.setFontSize(20);
            doc.text(`Relatório de Análise Detalhada`, 14, 22);
            doc.setFontSize(12);
            doc.text(`Pontuação Final: ${results.pontuacaoFinal || 'N/A'}%`, 14, 32);

            const tableColumn = ["ID", "Critério", "Status", "Justificativa"];

            const sortedAnalysis = [...results.analise].sort((a, b) => {
                if (a.descricao === 'Validar conformidade com a ementa') return -1;
                if (b.descricao === 'Validar conformidade com a ementa') return 1;
                const aIsReprovado = (a.status || '').includes('Reprovado');
                const bIsReprovado = (b.status || '').includes('Reprovado');
                if (aIsReprovado && !bIsReprovado) return -1;
                if (!aIsReprovado && bIsReprovado) return 1;
                return (a.criterio || 0) - (b.criterio || 0);
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
                startY: 40,
                headStyles: { fillColor: [41, 128, 185] },
                styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
                columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 'auto' }
                },
                didParseCell: function (data) {
                    if (data.section === 'body' && data.column.index === 2) { 
                        const status = (data.row.raw[2] || '').toString();
                        if (status.includes('Aprovado')) {
                            data.cell.styles.fillColor = [220, 245, 220]; 
                        } else if (status.includes('Reprovado')) {
                            data.cell.styles.fillColor = [255, 220, 220]; 
                        }
                    }
                }
            });

            doc.save(`relatorio-detalhado-analise.pdf`);

        } catch (error) {
            console.error("FALHA CRÍTICA AO GERAR O PDF:", error);
            alert(`Ocorreu um erro inesperado ao gerar o PDF. Erro: ${error.message}`);
        }
    };

    if (!results) return null;

    const getStatusChip = (status, manualEdit) => {
        const color = status === 'Aprovado' ? 'success' : status === 'Reprovado' ? 'error' : 'default';
        const label = manualEdit ? `${status} (Editado)` : status;
        return <Chip label={label} color={color} size="small" />;
    };

    // Nenhuma alteração aqui, a lógica de dados da versão anterior já está correta.
    const sortedCriteria = results.analise ? [...results.analise].sort((a, b) => {
        if (a.descricao === 'Validar conformidade com a ementa') return -1;
        if (b.descricao === 'Validar conformidade com a ementa') return 1;
        const aIsReprovado = a.status === 'Reprovado';
        const bIsReprovado = b.status === 'Reprovado';
        if (aIsReprovado && !bIsReprovado) return -1;
        if (!aIsReprovado && bIsReprovado) return 1;
        return 0;
    }) : [];

    const ementaCriterion = sortedCriteria.find(item => item.descricao === 'Validar conformidade com a ementa');
    const otherCriteria = sortedCriteria.filter(item => item.descricao !== 'Validar conformidade com a ementa');
    const reprovados = otherCriteria.filter(item => item.status === 'Reprovado');
    const itemsToDisplay = showAll ? otherCriteria : reprovados;
    const finalItems = ementaCriterion ? [ementaCriterion, ...itemsToDisplay] : itemsToDisplay;

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={style}>
                {/* O cabeçalho do Modal não muda */}
                <Box sx={{
                    display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' },
                    mb: 2, gap: 2
                }}>
                    <Box>
                        <Typography variant="h5" gutterBottom>Relatório de Análise Detalhado</Typography>
                        <Typography variant="h6" gutterBottom>
                            Pontuação Final: {results.pontuacaoFinal}% de Aprovação
                        </Typography>
                    </Box>
                    <Box sx={{ 
                        display: 'flex', gap: 1, flexWrap: 'wrap',
                        justifyContent: { xs: 'space-between', sm: 'flex-end' },
                        width: { xs: '100%', sm: 'auto' }
                    }}>
                        <Button 
                            variant="outlined" size="small"
                            onClick={() => setShowAll(!showAll)}
                            sx={{ flexGrow: 1, maxWidth: { xs: '100%', sm: 200 } }}
                        >
                            {showAll ? `Apenas Reprovados (${reprovados.length})` : `Ver Outros Critérios (${otherCriteria.length})`}
                        </Button>
                        <Button
                            variant="contained" color="primary" size="small"
                            startIcon={<PictureAsPdfIcon />} onClick={handleExportPDF}
                            sx={{ flexGrow: 1, maxWidth: { xs: '100%', sm: 200 } }}
                        >
                            Baixar PDF
                        </Button>
                    </Box>
                </Box>
                
                <TableContainer component={Paper}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: { xs: '30%', sm: '35%' }, fontWeight: 'bold' }}>Critério</TableCell>
                                <TableCell sx={{ width: { xs: '20%', sm: '15%' }, fontWeight: 'bold' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Justificativa / Observações</TableCell>
                                <TableCell align="center" sx={{ width: { xs: '15%', sm: '10%' }, fontWeight: 'bold' }}>Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {finalItems.length > 0 ? (
                                finalItems.map((item) => {
                                    const isEmentaRow = item.descricao === 'Validar conformidade com a ementa';
                                    
                                    // A MÁGICA ACONTECE AQUI DENTRO DO .map()
                                    // Renderização condicional: uma aparência para o critério principal, outra para os demais.
                                    if (isEmentaRow) {
                                        // --- 1. RENDERIZAÇÃO DA LINHA DETALHADA (CRITÉRIO PRINCIPAL) ---
                                        return (
                                            <TableRow key={item.criterio}>
                                                <TableCell 
                                                    colSpan={4} 
                                                    sx={{ 
                                                        p: 2, 
                                                        bgcolor: '#e3f2fd', 
                                                        border: '1px solid #2196f3',
                                                        borderBottom: '2px solid #2196f3' // Borda inferior mais forte para separar
                                                    }}
                                                >
                                                    <Typography variant="h6" gutterBottom>
                                                        Critério Principal: {item.descricao}
                                                    </Typography>
                                                    <Box sx={{ mb: 1, fontSize: '0.875rem', lineHeight: 1.43, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <strong>Status:</strong> {getStatusChip(item.status, item.manualEdit)}
                                                    </Box>
                                                    <Box sx={{ mb: 1, fontSize: '0.875rem', lineHeight: 1.43 }}>
                                                        <strong>Justificativa:</strong> {item.justificativa || "N/A"}
                                                    </Box>
                                                    <Box sx={{ mt: 2, fontSize: '0.875rem', lineHeight: 1.43, fontStyle: 'italic', color: 'text.secondary' }}>
                                                        <strong>Validações realizadas:</strong> Este critério verifica se a apostila está completamente alinhada com a ementa selecionada, considerando todos os seus elementos (objetivos e conteúdo programático). A análise responde a duas perguntas fundamentais:
                                                        <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                                                            <li>
                                                                <strong>"Se eu ler toda a apostila, vou aprender a fazer o que o objetivo da ementa espera?"</strong> Verifica-se se a apostila contém explicações, exemplos, exercícios e atividades práticas suficientes para alcançar cada objetivo da ementa, com clareza, profundidade e progressão adequadas.
                                                            </li>
                                                            <li>
                                                                <strong>"Todo o conteúdo programático está sendo explorado?"</strong> Confirma-se se todos os itens do conteúdo programático estão presentes na apostila, com os mesmos nomes (ou sinônimos claros) e no contexto correto, incluindo referências locais quando aplicável.
                                                            </li>
                                                        </Box>
                                                        <strong>Respostas às perguntas:</strong>
                                                        <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                                                            <li>
                                                                <strong>Objetivos atendidos:</strong> {item.status === 'Aprovado' ? 'Sim, todos os objetivos da ementa foram completamente atendidos com conteúdo suficiente.' : 'Não, pelo menos um objetivo não foi atendido adequadamente. Veja a justificativa para detalhes.'}
                                                            </li>
                                                            <li>
                                                                <strong>Conteúdo programático explorado:</strong> {item.status === 'Aprovado' ? 'Sim, todos os itens do conteúdo programático estão presentes e no contexto correto.' : 'Não, pelo menos um item do conteúdo programático está ausente ou desalinhado. Veja a justificativa para detalhes.'}
                                                            </li>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    } else {
                                        // --- 2. RENDERIZAÇÃO DAS LINHAS PADRÃO (OUTROS CRITÉRIOS) ---
                                        const hasSuggestion = onEditCriterion && criteriaWithSuggestions.includes(item.criterio);
                                        return (
                                            <TableRow key={item.criterio}>
                                                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{item.descricao}</TableCell>
                                                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{getStatusChip(item.status, item.manualEdit)}</TableCell>
                                                <TableCell sx={{ wordBreak: 'break-word', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{item.justificativa}</TableCell>
                                                <TableCell align="center">
                                                    {item.status === 'Reprovado' && onEditCriterion && (
                                                        <Tooltip title={hasSuggestion ? "Ver Sugestão de Correção (IA)" : "Marcar como Corrigido"}>
                                                            <IconButton size="small" onClick={() => onEditCriterion(item)}>
                                                                <EditIcon color={hasSuggestion ? "primary" : "action"} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    {item.manualEdit && (
                                                        <Tooltip title="Corrigido manualmente">
                                                            <CheckCircleIcon color="success" fontSize="small" />
                                                        </Tooltip>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} align="center">
                                        <Typography variant="body2" color="text.secondary">
                                            {showAll ? "Nenhum outro critério disponível para exibição." : "Nenhum outro critério reprovado encontrado."}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Modal>
    );
};

export default ResultsModal;