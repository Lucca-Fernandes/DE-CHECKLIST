// src/App.jsx
import React, { useState } from 'react';
import { Box, Tab, Tabs, Typography, Container, CssBaseline } from '@mui/material';
import AnalysisDashboard from './components/AnalysisDashboard';
import ProfessorDashboard from './components/ProfessorDashboard';

function App() {
  const [tabIndex, setTabIndex] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  return (
    <>
      <CssBaseline />
      <Container maxWidth="lg">
          <Box sx={{ borderBottom: 1, borderColor: 'divider', my: 2 }}>
              <Typography variant="h3" component="h1" textAlign="center" sx={{ my: 3 }}>
                  Plataforma de Análise de Apostilas
              </Typography>
              <Tabs value={tabIndex} onChange={handleTabChange} centered>
                  <Tab label="Análise do Estudante" />
                  <Tab label="Análise do Professor" />
              </Tabs>
          </Box>

          <Box hidden={tabIndex !== 0} sx={{ py: 2 }}>
              {tabIndex === 0 && <AnalysisDashboard />}
          </Box>

          <Box hidden={tabIndex !== 1} sx={{ py: 2 }}>
              {tabIndex === 1 && <ProfessorDashboard />}
          </Box>
      </Container>
    </>
  );
}

export default App;