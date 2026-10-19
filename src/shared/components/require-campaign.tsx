import { router } from 'expo-router';
import { Button, Card, Copy } from './ui';
export function RequireCampaign() { return <Card><Copy>Crie ou selecione uma campanha para continuar.</Copy><Button title="Ir para campanhas" onPress={() => router.push('/campaigns')} /></Card>; }
