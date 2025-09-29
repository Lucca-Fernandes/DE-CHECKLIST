// src/components/ResultsModal.jsx
import React from 'react';
import { Modal, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

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
    if (!results) return null;

    const getStatusChip = (status, manualEdit) => {
        const color = status === 'Aprovado' ? 'success' : status === 'Reprovado' ? 'error' : 'default';
        const label = manualEdit ? `${status} (Editado)` : status;
        return <Chip label={label} color={color} size="small" />;
    };

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={style}>
                <Box>
                    <Typography variant="h5" gutterBottom>Relatório de Análise Detalhado</Typography>
                    <Typography variant="h6" gutterBottom>Pontuação Final: {results.pontuacaoFinal}%</Typography>
                </Box>
                <TableContainer component={Paper} sx={{ flexGrow: 1, overflowY: 'auto', mt: 2 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: '35%' }}>Critério</TableCell>
                                <TableCell sx={{ width: '15%'}}>Status</TableCell>
                                <TableCell>Justificativa / Observações</TableCell>
                                <TableCell align="center" sx={{ width: '10%'}}>Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {results.analise.map((item) => {
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