import { useEffect, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  Toolbar,
  Typography,
  Alert,
  LinearProgress,
} from '@mui/material';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockIcon from '@mui/icons-material/Lock';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import GavelIcon from '@mui/icons-material/Gavel';
import type { RuntimeConfig } from 'blindoracle-api';

export function App() {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/config.json')
      .then((r) => r.json())
      .then((c: RuntimeConfig) => {
        setConfig(c);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: 'rgba(20,20,31,0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(157,78,221,0.2)',
        }}
      >
        <Toolbar>
          <VisibilityOffIcon sx={{ mr: 1.5, color: 'primary.light' }} />
          <Typography
            variant="h5"
            component="div"
            sx={{
              flexGrow: 1,
              fontFamily: '"Cinzel", serif',
              fontWeight: 700,
              letterSpacing: '0.1em',
            }}
          >
            BLINDORACLE
          </Typography>
          <Chip
            label={config?.networkId?.toUpperCase() ?? 'LOADING'}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Button
            variant="contained"
            color="primary"
            sx={{ ml: 2, fontFamily: '"Cinzel", serif', letterSpacing: '0.1em' }}
          >
            Connect Wallet
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        {/* Hero */}
        <Stack spacing={3} alignItems="center" textAlign="center" sx={{ mb: 8 }}>
          <Chip
            icon={<AutoAwesomeIcon />}
            label="Gimbalabs Hackathon 2026 Entry"
            color="secondary"
            variant="outlined"
          />
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.5rem', md: '4.5rem' },
              background: 'linear-gradient(135deg, #c77dff 0%, #ffd60a 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.05em',
            }}
          >
            Truth Exists.
            <br />
            Visibility Is Optional.
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 720 }}>
            A privacy-preserving prediction game on the Midnight Network. Commit your secret.
            Guess in the dark. Let the oracle judge.
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              size="large"
              color="primary"
              sx={{ fontFamily: '"Cinzel", serif', letterSpacing: '0.1em', px: 4 }}
            >
              Enter Round
            </Button>
            <Button
              variant="outlined"
              size="large"
              color="secondary"
              sx={{ fontFamily: '"Cinzel", serif', letterSpacing: '0.1em', px: 4 }}
            >
              How It Works
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            Failed to load runtime config: {error}
          </Alert>
        )}

        {loading && <LinearProgress color="primary" sx={{ mb: 4 }} />}

        {/* Three Pillars */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%', borderTop: '3px solid #9d4edd' }}>
              <CardContent>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <LockIcon color="primary" />
                  <Typography variant="h5" sx={{ fontFamily: '"Cinzel", serif' }}>
                    Commit
                  </Typography>
                </Stack>
                <Typography color="text.secondary">
                  Choose a secret number. Commit it to the chain as a hiding commitment. The raw
                  value never leaves your browser.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%', borderTop: '3px solid #9d4edd' }}>
              <CardContent>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <VisibilityOffIcon color="primary" />
                  <Typography variant="h5" sx={{ fontFamily: '"Cinzel", serif' }}>
                    Guess
                  </Typography>
                </Stack>
                <Typography color="text.secondary">
                  Predict what your future opponent chose. You have no knowledge. Only intuition.
                  Only nerve. Submit blind.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%', borderTop: '3px solid #ffd60a' }}>
              <CardContent>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <GavelIcon color="secondary" />
                  <Typography variant="h5" sx={{ fontFamily: '"Cinzel", serif' }}>
                    Settle
                  </Typography>
                </Stack>
                <Typography color="text.secondary">
                  The round locks. Players are paired. The oracle judges. You receive proof of the
                  outcome — without seeing everyone else's private state.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Status Banner */}
        <Alert severity="info" variant="outlined" sx={{ mb: 4, borderColor: 'primary.main' }}>
          <strong>Scaffold mode.</strong> Wallet connection, commit UX, match display, and God
          Window are stubbed. Round lifecycle wiring comes next.
        </Alert>

        {/* Config Display */}
        {config && (
          <Card variant="outlined" sx={{ borderColor: 'rgba(157,78,221,0.3)' }}>
            <CardContent>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ letterSpacing: '0.2em' }}
              >
                Runtime Configuration
              </Typography>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Network
                  </Typography>
                  <Typography variant="body2">{config.networkId}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Contract
                  </Typography>
                  <Typography variant="body2">{config.contractAddress ?? 'Not deployed'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Proof Server
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {config.proofServerUrl}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Indexer
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {config.indexerUrl}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </Container>

      <Box
        component="footer"
        sx={{
          mt: 8,
          py: 4,
          textAlign: 'center',
          borderTop: '1px solid rgba(157,78,221,0.2)',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          BlindOracle · Built for Gimbalabs Hackathon · Powered by Midnight Network
        </Typography>
      </Box>
    </Box>
  );
}
