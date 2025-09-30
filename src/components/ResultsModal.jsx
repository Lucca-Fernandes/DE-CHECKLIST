// src/components/ResultsModal.jsx
import React, { useState, useEffect } from 'react';
import { 
    Modal, 
    Box, 
    Typography, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    Paper, 
    Chip, 
    IconButton, 
    Tooltip, 
    Button 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

// Bibliotecas para gerar o PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // <-- MUDANÇA NA IMPORTAÇÃO

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '1200px',
    height: '90vh',
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
    display: 'flex',
    flexDirection: 'column'
};

const ResultsModal = ({ open, onClose, results, onEditCriterion, criteriaWithSuggestions = [] }) => {
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        setShowAll(false);
    }, [results]);

    if (!results) return null;

    const getStatusChip = (status, manualEdit) => {
        const color = status === 'Aprovado' ? 'success' : status === 'Reprovado' ? 'error' : 'default';
        const label = manualEdit ? `${status} (Editado)` : status;
        return <Chip label={label} color={color} size="small" />;
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text("Relatório de Análise Detalhado", 14, 22);
        
        doc.setFontSize(12);
        doc.text(`Pontuação Final: ${results.pontuacaoFinal}%`, 14, 32);

        const tableColumn = ["Critério", "Status", "Justificativa / Observações"];
        
        const tableRows = results.analise.map(item => [
            item.descricao,
            item.manualEdit ? `${item.status} (Editado)` : item.status,
            item.justificativa || "N/A"
        ]);

        // ✅ CORREÇÃO AQUI: Chamamos autoTable como uma função, passando o 'doc'
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'striped',
            headStyles: { fillColor: [22, 160, 133] },
            styles: {
                cellPadding: 2,
                fontSize: 8,
                valign: 'middle',
                overflow: 'linebreak',
            },
            columnStyles: {
                0: { cellWidth: 50 },
                2: { cellWidth: 'auto' }, 
            }
        });

        doc.save("relatorio-de-analise.pdf");
    };

    const reprovados = results.analise.filter(item => item.status === 'Reprovado');
    const itemsToDisplay = showAll ? results.analise : reprovados;

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={style}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h5" gutterBottom>Relatório de Análise Detalhado</Typography>
                        <Typography variant="h6" gutterBottom>Pontuação Final: {results.pontuacaoFinal}%</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button 
                            variant="outlined" 
                            size="small"
                            onClick={() => setShowAll(!showAll)}
                            sx={{ flexShrink: 0 }}
                        >
                            {showAll ? `Mostrar Apenas Reprovados (${reprovados.length})` : `Mostrar Todos os Critérios (${results.analise.length})`}
                        </Button>
                        <Tooltip title="Exportar Relatório em PDF">
                            <IconButton onClick={handleExportPDF} color="primary">
                                <PictureAsPdfIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                <TableContainer component={Paper} sx={{ flexGrow: 1, overflowY: 'auto', mt: 2 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: '35%', fontWeight: 'bold' }}>Critério</TableCell>
                                <TableCell sx={{ width: '15%', fontWeight: 'bold'}}>Status</TableCell>
                                <TableCell sx={{fontWeight: 'bold'}}>Justificativa / Observações</TableCell>
                                <TableCell align="center" sx={{ width: '10%', fontWeight: 'bold'}}>Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {itemsToDisplay.map((item) => {
                                const hasSuggestion = onEditCriterion && criteriaWithSuggestions.includes(item.criterio);

                                return (
                                    <TableRow key={item.criterio}>
                                        <TableCell>{item.descricao}</TableCell>
                                        <TableCell>
                                            {getStatusChip(item.status, item.manualEdit)}
                                        </TableCell>
                                        <TableCell sx={{ wordBreak: 'break-word' }}>{item.justificativa}</TableCell>
                                        <TableCell align="center">
                                            {item.status === 'Reprovado' && onEditCriterion && (
                                                <Tooltip title={hasSuggestion ? "Ver Sugestão de Correção (IA)" : "Marcar como Corrigido"}>
                                                    <IconButton size="small" onClick={() => onEditCriterion(item)}>
                                                        <EditIcon color={hasSuggestion ? "success" : "action"} />
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
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Modal>
    );
};

export default ResultsModal;