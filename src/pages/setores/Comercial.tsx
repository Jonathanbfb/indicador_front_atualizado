// src/pages/Comercial.tsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Paper,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Box,
  Tooltip,
} from "@mui/material";
import api from "../../services/api";

// Helper para converter número de mês (1–12) em campo de objeto “jan”, “fev” etc
const MES_KEYS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez"
];

const hoje = new Date();

/**
 * Converte horas decimais em “Xh:Ymin” (por exemplo: 1.5 → “1h:30min”)
 */
const decimalParaHoraMin = (decimalHoras: number): string => {
  const horasInteiras = Math.floor(decimalHoras);
  const minutos = Math.round((decimalHoras - horasInteiras) * 60);
  return `${horasInteiras}h:${minutos}min`;
};

/**
 * Converte string “HH:MM” em decimal de horas (por exemplo: “2:30” → 2.5)
 */
const hhmmParaDecimal = (hhmm: string): number => {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  return isNaN(h) || isNaN(m) ? 0 : h + m / 60;
};

/**
 * Converte decimal em string “Xh:Ymin” (exatamente como decimalParaHoraMin)
 */
const decimalParaHhmm = (decimal: number): string => {
  const horas = Math.floor(decimal);
  const minutos = Math.round((decimal - horas) * 60);
  return `${horas}h:${minutos}min`;
};

/**
 * Converte string “HH:MM” para “Xh:Ymin”
 */
const hhmmParaFormato = (hhmm: string): string => {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  return isNaN(h) || isNaN(m) ? "-" : `${h}h:${m}min`;
};

/**
 * Exibe apenas a parte inteira (horas) de um valor decimal
 * (por exemplo: 2.75 → “2h”)
 */
const apenasHoras = (decimalHoras: number): string => {
  const horasInteiras = Math.floor(decimalHoras);
  return `${horasInteiras}h`;
};

interface ComercialProps {
  setorId?: number;
}

const Comercial: React.FC<ComercialProps> = ({ setorId: propSetorId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setorId: stateSetorId = null } = (location.state || {}) as { setorId?: number | null };
  const setorId = propSetorId ?? stateSetorId;

  const [selectedYear, setSelectedYear] = useState("2025");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    setSelectedYear(newValue);
  };

  useEffect(() => {
    const fetchIndicadores = async () => {
      setLoading(true);

      try {
        // -------------------------------------------------------------
        //  1) Resumo de jornadas (colaboradores e horas) para todos os meses
        // -------------------------------------------------------------
        const resumoRes = await api.get(
          `/jornadas/retornar-resumo/${setorId}?ano=${selectedYear}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const resumoData = resumoRes.data;

        // Linhas “fixas”:
        const linhaProfissionais: any = {
          indicadores: "",
          jan: "-", fev: "-", mar: "-", abr: "-", mai: "-", jun: "-",
          jul: "-", ago: "-", set: "-", out: "-", nov: "-", dez: "-",
          acumulado: { fieam: "-", sesi: "-", senai: "-", iel: "-", "total geral": "-" }
        };
        const linhaHoras: any = {
          indicadores: "",
          jan: "-", fev: "-", mar: "-", abr: "-", mai: "-", jun: "-",
          jul: "-", ago: "-", set: "-", out: "-", nov: "-", dez: "-",
          acumulado: { fieam: "-", sesi: "-", senai: "-", iel: "-", "total geral": "-" }
        };

        // Preenche nome dos indicadores padronizados (vieram no JSON):
        if (resumoData.resumoPorMes.length > 0) {
          linhaProfissionais.indicadores = resumoData.resumoPorMes[0].indicadorProfissionais;
          linhaHoras.indicadores = resumoData.resumoPorMes[0].indicadorHoras;
        }

        let somaProfissionaisTotal = 0;
        let somaHorasTotalDecimal = 0;

        // Preenche mês a mês e acumula
        resumoData.resumoPorMes.forEach((item: any) => {
          const idx = item.mes - 1;
          if (idx >= 0 && idx < 12) {
            // Profissionais
            linhaProfissionais[MES_KEYS[idx]] = Number(item.colaboradores).toLocaleString("pt-BR");
            somaProfissionaisTotal += Number(item.colaboradores) || 0;

            // Horas (exibe somente “Xh”)
            const horasDec = hhmmParaDecimal(item.horasTrabalhadas);
            linhaHoras[MES_KEYS[idx]] = `${Math.floor(horasDec)}h`;
            somaHorasTotalDecimal += horasDec;
          }
        });

        // -------------------------------------------------------------
        //  1.1) Calcula média de colaboradores (divide pelos meses já passados)
        // -------------------------------------------------------------
        // Se hoje.getMonth() for 0 (Janeiro), usamos 1 para não dividir por zero
        const mesesPassados = hoje.getMonth() > 0 ? hoje.getMonth() : 1;
        const mediaColaboradores = somaProfissionaisTotal / mesesPassados;
        const mediaColaboradoresArredonda = Math.ceil(mediaColaboradores);
        const mediaFormatada = mediaColaboradoresArredonda.toLocaleString("pt-BR");

        linhaProfissionais.acumulado.fieam = somaProfissionaisTotal > 0 ? mediaFormatada : "-";
        linhaProfissionais.acumulado["total geral"] = somaProfissionaisTotal > 0 ? mediaFormatada : "-";

        // -------------------------------------------------------------
        //  1.2) Ajusta acumulado na linha de Horas para exibir apenas inteiro “Xh”
        // -------------------------------------------------------------
        const totalHorasApenasH = apenasHoras(somaHorasTotalDecimal);
        linhaHoras.acumulado.fieam = somaHorasTotalDecimal > 0 ? totalHorasApenasH : "-";
        linhaHoras.acumulado["total geral"] = somaHorasTotalDecimal > 0 ? totalHorasApenasH : "-";

        // -------------------------------------------------------------
        //  2) Busca “itens/valor” para demais indicadores
        // -------------------------------------------------------------
        const valoresRes = await api.get(`itens/valor/${setorId}/?ano=${selectedYear}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const indicadoresFromApi = valoresRes.data.indicadores;

        // Monta as linhas “dinâmicas”:
        const outrasRows = indicadoresFromApi.map((indicador: any) => {
          const linhaBase: any = {
            indicadores: indicador.nome,
            jan: "-", fev: "-", mar: "-", abr: "-", mai: "-", jun: "-",
            jul: "-", ago: "-", set: "-", out: "-", nov: "-", dez: "-",
            acumulado: { fieam: "-", sesi: "-", senai: "-", iel: "-", "total geral": "-" }
          };

          // Para cada mês, preenche valor (soma de todas as instituições)
          MES_KEYS.forEach((mesKey, idx) => {
            const somaDoMes = indicador.valores
              .filter((v: any) => v.mes === idx + 1)
              .reduce((acc: number, cur: any) => {
                const numero = parseFloat(cur.valor);
                return acc + (isNaN(numero) ? 0 : numero);
              }, 0);

            if (somaDoMes > 0) {
              if (indicador.moeda) {
                linhaBase[mesKey] = somaDoMes.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                });
              } else {
                linhaBase[mesKey] = somaDoMes.toLocaleString("pt-BR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                });
              }
            } else {
              linhaBase[mesKey] = "-";
            }
          });

          // Acumulado por instituição
          const somaPorInstituicao = (instId: number) => {
            return indicador.valores
              .filter((v: any) => v.instituicao_id === instId)
              .reduce((acc: number, cur: any) => {
                const numero = parseFloat(cur.valor);
                return acc + (isNaN(numero) ? 0 : numero);
              }, 0);
          };

          const somaFieam = somaPorInstituicao(1);
          const somaSesi = somaPorInstituicao(2);
          const somaSenai = somaPorInstituicao(3);
          const somaIel = somaPorInstituicao(4);
          const somaTotal = somaFieam + somaSesi + somaSenai + somaIel;

          const formatarAcumulado = (valor: number) => {
            if (valor <= 0) return "-";
            return indicador.moeda
              ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
              : valor.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
          };

          linhaBase.acumulado.fieam = formatarAcumulado(somaFieam);
          linhaBase.acumulado.sesi = formatarAcumulado(somaSesi);
          linhaBase.acumulado.senai = formatarAcumulado(somaSenai);
          linhaBase.acumulado.iel = formatarAcumulado(somaIel);
          linhaBase.acumulado["total geral"] = formatarAcumulado(somaTotal);

          return { ...linhaBase, atividade: indicador.atividade };
        });

        // -------------------------------------------------------------
        //  3) Soma das “atividades” (linhas com atividade = true) mês a mês
        // -------------------------------------------------------------
        const somaPorMesAtividades: number[] = MES_KEYS.map((_, idx) => {
          return outrasRows.reduce((acc: number, row: any) => {
            if (!row.atividade) return acc;
            const val = row[MES_KEYS[idx]];
            if (val !== "-" && val !== undefined) {
              const numero = parseFloat(val.replace(/\./g, "").replace(",", "."));
              if (!isNaN(numero)) return acc + numero;
            }
            return acc;
          }, 0);
        });

        const somaAtividadesTotal = somaPorMesAtividades.reduce((a, b) => a + b, 0);

        // Monte a linha “Total de ações executadas no mês”
        const linhaSomaAtividades: any = {
          indicadores: "Total de ações executadas no mês",
          jan: somaPorMesAtividades[0] > 0 ? somaPorMesAtividades[0].toLocaleString("pt-BR") : "-",
          fev: somaPorMesAtividades[1] > 0 ? somaPorMesAtividades[1].toLocaleString("pt-BR") : "-",
          mar: somaPorMesAtividades[2] > 0 ? somaPorMesAtividades[2].toLocaleString("pt-BR") : "-",
          abr: somaPorMesAtividades[3] > 0 ? somaPorMesAtividades[3].toLocaleString("pt-BR") : "-",
          mai: somaPorMesAtividades[4] > 0 ? somaPorMesAtividades[4].toLocaleString("pt-BR") : "-",
          jun: somaPorMesAtividades[5] > 0 ? somaPorMesAtividades[5].toLocaleString("pt-BR") : "-",
          jul: somaPorMesAtividades[6] > 0 ? somaPorMesAtividades[6].toLocaleString("pt-BR") : "-",
          ago: somaPorMesAtividades[7] > 0 ? somaPorMesAtividades[7].toLocaleString("pt-BR") : "-",
          set: somaPorMesAtividades[8] > 0 ? somaPorMesAtividades[8].toLocaleString("pt-BR") : "-",
          out: somaPorMesAtividades[9] > 0 ? somaPorMesAtividades[9].toLocaleString("pt-BR") : "-",
          nov: somaPorMesAtividades[10] > 0 ? somaPorMesAtividades[10].toLocaleString("pt-BR") : "-",
          dez: somaPorMesAtividades[11] > 0 ? somaPorMesAtividades[11].toLocaleString("pt-BR") : "-",
          acumulado: { fieam: "-", sesi: "-", senai: "-", iel: "-", "total geral": "-" }
        };

        // -------------------------------------------------------------
        //  4) Ajusta o acumulado para essa linha de “Total de ações”
        // -------------------------------------------------------------
        // Faz exatamente como em SetorPage: coloca somaAtividadesTotal em fieam e total geral
        linhaSomaAtividades.acumulado.fieam =
          somaAtividadesTotal > 0
            ? somaAtividadesTotal.toLocaleString("pt-BR")
            : "-";
        linhaSomaAtividades.acumulado["total geral"] =
          somaAtividadesTotal > 0
            ? somaAtividadesTotal.toLocaleString("pt-BR")
            : "-";

        // -------------------------------------------------------------
        //  5) Média de horas por mês e acumulado de tempo médio
        // -------------------------------------------------------------
        const horasPorMesDecimal: number[] = MES_KEYS.map((_, idx) => {
          const entry = resumoData.resumoPorMes.find((r: any) => r.mes === idx + 1);
          return entry ? hhmmParaDecimal(entry.horasTrabalhadas) : 0;
        });

        const mediaPorMes: string[] = somaPorMesAtividades.map((soma, idx) => {
          const horasDec = horasPorMesDecimal[idx];
          if (horasDec <= 0 || soma <= 0) return "-";
          const mediaDecimal = horasDec / soma;
          return decimalParaHoraMin(mediaDecimal);
        });

        const totalHorasAcumuladasDecimal = somaHorasTotalDecimal;
        const totalAcoesAcumuladas = somaAtividadesTotal;
        const tempoMedioDecimalAcumulado =
          totalAcoesAcumuladas > 0
            ? totalHorasAcumuladasDecimal / totalAcoesAcumuladas
            : 0;
        const tempoMedioHhmmAcumulado =
          tempoMedioDecimalAcumulado > 0
            ? decimalParaHhmm(tempoMedioDecimalAcumulado)
            : "-";

        const linhaMediaHoras: any = {
          indicadores: "Tempo médio por ação executada",
          jan: mediaPorMes[0], fev: mediaPorMes[1], mar: mediaPorMes[2], abr: mediaPorMes[3],
          mai: mediaPorMes[4], jun: mediaPorMes[5],
          jul: mediaPorMes[6], ago: mediaPorMes[7], set: mediaPorMes[8],
          out: mediaPorMes[9], nov: mediaPorMes[10], dez: mediaPorMes[11],
          acumulado: { fieam: "-", sesi: "-", senai: "-", iel: "-", "total geral": "-" }
        };
        linhaMediaHoras.acumulado.fieam = tempoMedioHhmmAcumulado;
        linhaMediaHoras.acumulado["total geral"] = tempoMedioHhmmAcumulado;

        // -------------------------------------------------------------
        //  6) Monta as quatro linhas fixas iniciais + demais indicadores
        // -------------------------------------------------------------
        const baseRows: any[] = [
          linhaProfissionais,
          linhaHoras,
          linhaSomaAtividades,   // Linha corrigida de total de ações, com acumulado ajustado
          linhaMediaHoras,
          ...outrasRows,
        ];

        // -------------------------------------------------------------
        //  7) Chama /propostas para buscar dados extra (CRM)
        // -------------------------------------------------------------
        const propostasRes = await api.get(
          `/propostas`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const propostasData = propostasRes.data;

        // Helper para construir linha CRM e calcular acumulado:
        const montarLinhaCrm = (
          arrayDeMeses: { Mes: number; Total: number }[],
          label: string,
          formatarComoMoeda: boolean
        ) => {
          const linha: any = {
            indicadores: label,
            jan: "-", fev: "-", mar: "-", abr: "-", mai: "-", jun: "-",
            jul: "-", ago: "-", set: "-", out: "-", nov: "-", dez: "-",
            acumulado: { fieam: "-", sesi: "-", senai: "-", iel: "-", "total geral": "-" }
          };

          // Preenche cada mês
          arrayDeMeses.forEach(({ Mes, Total }) => {
            const idx = Mes - 1;
            if (idx >= 0 && idx < 12) {
              if (formatarComoMoeda) {
                linha[MES_KEYS[idx]] = Total.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                });
              } else {
                linha[MES_KEYS[idx]] = Total.toLocaleString("pt-BR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                });
              }
            }
          });

          // Soma acumulado de todos os Totais originais
          const somaAcumulado = arrayDeMeses.reduce((acc, { Total }) => acc + Total, 0);

          if (somaAcumulado > 0) {
            if (formatarComoMoeda) {
              linha.acumulado.fieam = somaAcumulado.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              });
              linha.acumulado["total geral"] = somaAcumulado.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              });
            } else {
              linha.acumulado.fieam = somaAcumulado.toLocaleString("pt-BR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              });
              linha.acumulado["total geral"] = somaAcumulado.toLocaleString("pt-BR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              });
            }
          }

          return linha;
        };

        // Monta linhas de CRM conforme a resposta
        const crmRows: any[] = [];
        if (propostasData.totalPropostas) {
          crmRows.push(
            montarLinhaCrm(propostasData.totalPropostas, "Total de Propostas", false)
          );
        }
        if (propostasData.totalValorPropostas) {
          crmRows.push(
            montarLinhaCrm(propostasData.totalValorPropostas, "Valor Total de Propostas", true)
          );
        }
        if (propostasData.totalPropostasGanhas) {
          crmRows.push(
            montarLinhaCrm(propostasData.totalPropostasGanhas, "Total de Propostas Ganhas", false)
          );
        }
        if (propostasData.totalValorPropostasGanhas) {
          crmRows.push(
            montarLinhaCrm(propostasData.totalValorPropostasGanhas, "Valor Total de Propostas Ganhas", true)
          );
        }
        if (propostasData.totalPropostasAtivas) {
          crmRows.push(
            montarLinhaCrm(propostasData.totalPropostasAtivas, "Total de Propostas Ativas", false)
          );
        }
        if (propostasData.totalValorPropostasAtivas) {
          crmRows.push(
            montarLinhaCrm(propostasData.totalValorPropostasAtivas, "Valor Total de Propostas Ativas", true)
          );
        }

        // -------------------------------------------------------------
        //  8) Concatena as linhas base + CRM
        // -------------------------------------------------------------
        setRows([...baseRows, ...crmRows]);
      } catch (err) {
        console.error("Erro ao buscar indicadores ou propostas:", err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchIndicadores();
  }, [selectedYear, location.state]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h4" gutterBottom>
          Setor: Comercial
        </Typography>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Tooltip title="Voltar para o menu principal">
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate("/menu")}
              style={{ marginBottom: "20px" }}
            >
              Voltar
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            color="inherit"
            onClick={handlePrint}
            style={{ marginBottom: "20px", marginLeft: "10px" }}
          >
            Imprimir
          </Button>
        </div>
      </div>

      <Box sx={{ width: "100%", marginBottom: "20px" }}>
        <Tabs
          value={selectedYear}
          onChange={handleTabChange}
          textColor="secondary"
          indicatorColor="secondary"
          aria-label="Tabs de anos"
        >
          <Tab value="2024" label="2024" />
          <Tab value="2025" label="2025" />
          <Tab value="2026" label="2026" />
        </Tabs>
      </Box>

      <Paper sx={{ marginTop: "20px" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell
                  rowSpan={2}
                  style={{
                    fontWeight: "bold",
                    backgroundColor: "#ADD8E6",
                    padding: "2px",
                    textAlign: "center",
                    minWidth: "180px",
                    maxWidth: "180px",
                    width: "180px",
                  }}
                >
                  Indicadores
                </TableCell>
                {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map(
                  (month, index) => (
                    <TableCell
                      key={index}
                      rowSpan={2}
                      align="center"
                      style={{
                        fontWeight: "bold",
                        backgroundColor: "#ADD8E6",
                        padding: "8px",
                        minWidth: "60px",
                      }}
                    >
                      {month}
                    </TableCell>
                  )
                )}
                <TableCell
                  colSpan={5}
                  align="center"
                  style={{
                    fontWeight: "bold",
                    backgroundColor: "#4682B4",
                    color: "white",
                    padding: "8px",
                  }}
                >
                  Acumulado
                </TableCell>
              </TableRow>
              <TableRow>
                {["FIEAM", "SESI", "SENAI", "IEL", "TOTAL - MÉDIA"].map((name, index) => (
                  <TableCell
                    key={`acumulado-${index}`}
                    align="center"
                    style={{
                      fontWeight: "bold",
                      backgroundColor: "#4682B4",
                      color: "white",
                      padding: "8px",
                    }}
                  >
                    {name}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={1 + 12 + 5} align="center" style={{ padding: "16px" }}>
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={1 + 12 + 5} align="center" style={{ padding: "16px" }}>
                    Nenhum dado para {selectedYear}.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, rowIndex) => (
                  <TableRow
                    key={`row-${rowIndex}`}
                    sx={{
                      "& .MuiTableCell-root": {
                        padding: "4px 6px",
                        lineHeight: "1",
                      },
                      height: "50px",
                      backgroundColor: rowIndex % 2 === 0 ? "#F5F5F5" : "#FFFFFF",
                    }}
                  >
                    <TableCell
                      style={{
                        fontWeight: "bold",
                        verticalAlign: "middle",
                        textAlign: "left",
                        minWidth: "180px",
                        maxWidth: "180px",
                        width: "180px",
                        padding: "2px",
                      }}
                    >
                      {row.indicadores}
                    </TableCell>

                    {/* Renderiza cada coluna de mês */}
                    {MES_KEYS.map((key) => (
                      <TableCell align="center" key={key}>
                        {row[key] !== undefined ? row[key] : "-"}
                      </TableCell>
                    ))}

                    {/* Renderiza as 5 colunas de Acumulado */}
                    {["fieam", "sesi", "senai", "iel", "total geral"].map((key) => (
                      <TableCell align="center" key={key}>
                        {row.acumulado && row.acumulado[key] !== undefined
                          ? row.acumulado[key]
                          : "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <h4>
        Atualizado até{" "}
        {hoje.getDate().toString().padStart(2, "0")}/
        {(hoje.getMonth() + 1).toString().padStart(2, "0")}/
        {hoje.getFullYear()} às {hoje.getHours()}h:
        {hoje.getMinutes().toString().padStart(2, "0")}
      </h4>
    </div>
  );
};

export default Comercial;
