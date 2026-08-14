import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, CircularProgress,
  Table, TableHead, TableBody, TableRow, TableCell,
  TextField, MenuItem,
} from "@mui/material";
import api from "../../services/api";

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function formatarValor(valor: number, formato: string): string {
  if (valor === 0 || valor === null || valor === undefined) return '-';
  if (formato === 'moeda') return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (formato === 'porcentagem') return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
  if (formato === 'horas') return `${Math.floor(valor)}h`;
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

const mesAtual = new Date().getMonth() + 1;

const Geral: React.FC = () => {
  const token = localStorage.getItem('token');
  const currentYear = new Date().getFullYear();
  const [ano, setAno] = useState(String(currentYear));
  const [loading, setLoading] = useState(true);
  const [grupos, setGrupos] = useState<any[]>([]);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        const [itensRes, setoresRes, panoramaConfigRes] = await Promise.all([
          api.get('/itens', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/setores', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/panorama-config', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const itens: any[] = itensRes.data;
        const setores: any[] = setoresRes.data;
        const panoramaConfigs: any[] = panoramaConfigRes.data;

        const itensPanorama = itens.filter(
          (i: any) => i.panorama && String(i.ano) === String(ano)
        );

        // Setores com itens normais marcados como panorama
        const setorIdsNormais = [...new Set(itensPanorama.map((i: any) => i.setor_id))] as number[];

        // Setores com indicadores especiais ativos no panorama_config
        const configsAtivas = panoramaConfigs.filter((c: any) => c.ativo);
        const setorIdsEspeciais = [...new Set(configsAtivas.map((c: any) => c.setorId))] as number[];

        // União de todos os setorIds que aparecem no panorama
        const todosSetorIds = [...new Set([...setorIdsNormais, ...setorIdsEspeciais])];

        const valoresPorSetor: Record<number, any[]> = {};
        await Promise.all(
          setorIdsNormais.map(async (setorId) => {
            try {
              const res = await api.get(`itens/valor/${setorId}/?ano=${ano}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              valoresPorSetor[setorId] = res.data.indicadores || [];
            } catch {
              valoresPorSetor[setorId] = [];
            }
          })
        );

        // Propostas do Comercial (para indicadores especiais)
        let propostasData: any = null;
        const setorComercial = setores.find((s: any) =>
          s.nome?.toLowerCase().includes('comercial') && setorIdsEspeciais.includes(s.id)
        );
        if (setorComercial) {
          try {
            const res = await api.get(`/propostas?ano=${ano}`, { headers: { Authorization: `Bearer ${token}` } });
            propostasData = res.data;
          } catch { /* propostas indisponíveis */ }
        }

        // Monta valor por mês a partir do array de propostas [{Mes, Total}]
        const montarValoresMes = (array: { Mes: number; Total: number }[]): Record<number, number> => {
          const map: Record<number, number> = {};
          for (let m = 1; m <= 12; m++) map[m] = 0;
          array.forEach(({ Mes, Total }) => { map[Mes] = Total; });
          return map;
        };

        // Mapa de nome -> valoresPorMes para indicadores especiais do Comercial
        const especialPorNome: Record<string, { valoresPorMes: Record<number, number>; formato: string }> = {};
        if (propostasData) {
          const mapa: Record<string, { dados: { Mes: number; Total: number }[]; formato: string }> = {
            'Total de Proposta Qtd.':         { dados: propostasData.totalPropostas || [],          formato: 'numero' },
            'Propostas Geradas R$':            { dados: propostasData.totalValorPropostas || [],     formato: 'moeda'  },
            'Total de Propostas Ganhas':       { dados: propostasData.totalPropostasGanhas || [],    formato: 'numero' },
            'Valor Total de Propostas Ganhas': { dados: propostasData.totalValorPropostasGanhas || [], formato: 'moeda' },
            'Total de Propostas Ativas':       { dados: propostasData.totalPropostasAtivas || [],    formato: 'numero' },
            'Valor Total de Propostas Ativas': { dados: propostasData.totalValorPropostasAtivas || [], formato: 'moeda' },
          };
          Object.entries(mapa).forEach(([nome, { dados, formato }]) => {
            especialPorNome[nome] = { valoresPorMes: montarValoresMes(dados), formato };
          });
        }

        const gruposMontar = todosSetorIds.map((setorId) => {
          const setor = setores.find((s: any) => s.id === setorId);

          // Indicadores normais
          const itensDoSetor = itensPanorama
            .filter((i: any) => i.setor_id === setorId)
            .sort((a: any, b: any) => (a.ordem ?? 0) - (b.ordem ?? 0));

          const indicadoresNormais = itensDoSetor.map((item: any) => {
            const indAPI = valoresPorSetor[setorId]?.find((ind: any) => ind.nome === item.nome);
            const valores: any[] = indAPI?.valores || [];
            const valoresPorMes: Record<number, number> = {};
            for (let m = 1; m <= 12; m++) {
              valoresPorMes[m] = valores
                .filter((v: any) => v.mes === m)
                .reduce((acc: number, v: any) => acc + (parseFloat(v.valor) || 0), 0);
            }
            const acumulado = Object.values(valoresPorMes).slice(0, mesAtual).reduce((a, b) => a + b, 0);
            return { ...item, valoresPorMes, acumulado };
          });

          // Indicadores especiais (Comercial CRM)
          const configsDoSetor = configsAtivas.filter((c: any) => c.setorId === setorId);
          const indicadoresEspeciais = configsDoSetor
            .filter((c: any) => especialPorNome[c.nome])
            .map((c: any) => {
              const { valoresPorMes, formato } = especialPorNome[c.nome];
              const acumulado = Object.values(valoresPorMes).slice(0, mesAtual).reduce((a, b) => a + b, 0);
              return { id: `especial-${c.nome}`, nome: c.nome, formato, valoresPorMes, acumulado };
            });

          return {
            setorId,
            setorNome: setor?.nome || `Setor ${setorId}`,
            indicadores: [...indicadoresNormais, ...indicadoresEspeciais],
          };
        }).filter(g => g.indicadores.length > 0);

        setGrupos(gruposMontar);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, [ano]);

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a2744' }}>
          Panorama Geral
        </Typography>
        <TextField
          select size="small" value={ano}
          onChange={e => setAno(e.target.value)}
          sx={{ width: 110, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          label="Ano"
        >
          {[currentYear - 1, currentYear, currentYear + 1].map(y => (
            <MenuItem key={y} value={String(y)}>{y}</MenuItem>
          ))}
        </TextField>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : grupos.length === 0 ? (
        <Paper elevation={0} sx={{ border: '1px solid #e8edf5', borderRadius: 3, p: 5, textAlign: 'center' }}>
          <Typography sx={{ color: '#9ca3af', fontSize: 15 }}>
            Nenhum indicador marcado para o Panorama Geral em {ano}.
          </Typography>
          <Typography sx={{ color: '#9ca3af', fontSize: 13, mt: 1 }}>
            Acesse Cadastro de Indicadores e marque os indicadores desejados com o ícone de gráfico.
          </Typography>
        </Paper>
      ) : (() => {
        const todosIndicadores = grupos.flatMap(g => g.indicadores);
        return (
          <Paper elevation={0} sx={{ border: '1px solid #e8edf5', borderRadius: 3, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ background: '#f0f4ff' }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13, color: '#1a2744', py: 1.5 }}>Indicador</TableCell>
                  {MESES.map((m, i) => (
                    <TableCell
                      key={m}
                      align="center"
                      sx={{
                        fontWeight: 700, fontSize: 11,
                        color: i + 1 === mesAtual ? '#1976d2' : '#6b7280',
                        py: 1.5, minWidth: 52,
                      }}
                    >
                      {m}
                    </TableCell>
                  ))}
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: 13, color: '#1a2744', py: 1.5, minWidth: 90 }}>
                    Acumulado
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {todosIndicadores.map((ind: any, idx: number) => (
                  <TableRow
                    key={`${ind.id}-${idx}`}
                    sx={{ background: idx % 2 === 0 ? '#f8fafc' : '#fff', '&:hover': { background: '#eef4fd' }, '& td': { borderBottom: '1px solid #f1f5f9' } }}
                  >
                    <TableCell sx={{ fontSize: 13, color: '#374151', fontWeight: 500, py: 1.2 }}>
                      {ind.nome}
                    </TableCell>
                    {MESES.map((_, i) => {
                      const mes = i + 1;
                      const val = ind.valoresPorMes[mes] || 0;
                      return (
                        <TableCell
                          key={mes}
                          align="center"
                          sx={{
                            fontSize: 12,
                            color: val > 0 ? '#374151' : '#d1d5db',
                            py: 1.2,
                            fontWeight: mes === mesAtual && val > 0 ? 600 : 400,
                          }}
                        >
                          {val > 0 ? formatarValor(val, ind.formato) : '-'}
                        </TableCell>
                      );
                    })}
                    <TableCell align="center" sx={{ fontSize: 13, fontWeight: 700, color: '#1976d2', py: 1.2 }}>
                      {formatarValor(ind.acumulado, ind.formato)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        );
      })()}
    </Box>
  );
};

export default Geral;
