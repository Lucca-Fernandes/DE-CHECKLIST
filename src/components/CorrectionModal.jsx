// src/components/CorrectionModal.jsx
import React from 'react';
import { Modal, Box, Typography, Button, Paper, Divider, CircularProgress, List, ListItem, ListItemText } from '@mui/material';

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '70%',
    maxWidth: '900px',
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column'
};

const CorrectionModal = ({ open, onClose, criterion, onUpdateStatus, isGenerating, suggestion }) => {
    if (!criterion) return null;

    const hasSuggestions = suggestion && suggestion.correcoes && suggestion.correcoes.length > 0;

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={style}>
                <Typography variant="h6" component="h2" gutterBottom>
                    Sugestão de Correção para Critério
                </Typography>
                
                <Paper variant="outlined" sx={{ p: 2, mb: 2, flexGrow: 1, overflowY: 'auto' }}>
                    <Typography variant="subtitle1" gutterBottom><strong>Critério:</strong> {criterion.descricao}</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body1" gutterBottom><strong>Justificativa da IA:</strong></Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', mb: 2, whiteSpace: 'pre-wrap' }}>
                        {criterion.justificativa || "Nenhuma justificativa fornecida."}
                    </Typography>
                    <Divider sx={{ my: 1 }} />

                    {isGenerating ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2 }}>
                            <CircularProgress size={24} />
                            <Typography variant="body1">Gerando sugestões...</Typography>
                        </Box>
                    ) : (
                        hasSuggestions ? (
                            <>
                                <Typography variant="body1" gutterBottom><strong>Sugestões de Correção:</strong></Typography>
                                <List dense sx={{ whiteSpace: 'pre-wrap' }}>
                                    {suggestion.correcoes.map((corr, index) => (
                                        <ListItem key={index} divider sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                            <Typography variant="caption" color="text.secondary"><strong>Contexto:</strong> {corr.contexto}</Typography>
                                            <ListItemText 
                                                primary={<Typography variant="body2" color="error.main">Original: "{corr.original}"</Typography>}
                                                secondary={
                                                    <Typography variant="body2" color="success.main">
                                                        Sugestão: "{Array.isArray(corr.sugestao) ? corr.sugestao.join('\n') : corr.sugestao}"
                                                    </Typography>
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </>
                        ) : (
                           suggestion && <Typography color="error">{suggestion.error || "Nenhuma sugestão foi gerada para este critério."}</Typography>
                        )
                    )}
                </Paper>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1, flexShrink: 0 }}>
                    <Button variant="outlined" onClick={onClose}>
                        Fechar
                    </Button>
                    <Button 
                        variant="contained" 
                        color="success"
                        onClick={() => onUpdateStatus(criterion.criterio, 'Aprovado')}
                    >
                        Marcar Critério como Corrigido
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
};

export default CorrectionModal;