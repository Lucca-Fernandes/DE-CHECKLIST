// src/components/FileUploadSection.jsx
import React, { useState } from 'react';
import { Paper, Typography, Button, Box } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const FileUploadSection = ({ title, onFileSelect, onAnalyze, isLoading }) => {
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            if (onFileSelect) {
                onFileSelect(file);
            }
        }
    };

    const isAnalyzeDisabled = !selectedFile || isLoading || !onAnalyze;

    return (
        <Paper elevation={3} sx={{ p: 3, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Typography variant="h6" gutterBottom>{title}</Typography>
            <Box
                sx={{
                    border: '2px dashed grey',
                    borderRadius: 2,
                    p: 3,
                    mb: 2,
                    bgcolor: '#f9f9f9',
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}
            >
                <CloudUploadIcon sx={{ fontSize: 40, color: 'grey.500', mx: 'auto' }} />
                <Typography sx={{ mt: 1, color: 'text.secondary', wordBreak: 'break-all' }}>
                    {selectedFile ? selectedFile.name : 'Arraste um arquivo ou clique para selecionar'}
                </Typography>
                <Button
                    variant="contained"
                    component="label"
                    sx={{ mt: 2, mx: 'auto' }}
                >
                    Escolher Arquivo
                    <input
                        type="file"
                        hidden
                        accept=".docx"
                        onChange={handleFileChange}
                    />
                </Button>
            </Box>
            {onAnalyze && (
                 <Button
                    variant="contained"
                    color="primary"
                    onClick={onAnalyze}
                    disabled={isAnalyzeDisabled}
                    fullWidth
                >
                    {isLoading ? 'Analisando...' : 'Analisar'}
                </Button>
            )}
        </Paper>
    );
};

export default FileUploadSection;