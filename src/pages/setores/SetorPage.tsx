// src/pages/SetorPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import api from "../../services/api"; // ajuste o caminho, se necessário

// Helpers para conversão de datas e horas:
const MES_KEYS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez"
];

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
 * Converte string “HH:MM” para o formato “Xh:Ymin”
 * (para exibir campos vindos do backend)
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

interface SetorInfo {
  id: number;
  nome: string;
  slug: string;
}

export default function SetorPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  // 1) Estado para carregar informações do setor (id, nome) a partir do slug
  const [setorInfo, setSetorInfo] = useState<SetorInfo | null>(null);
  const [loadingSetor, setLoadingSetor] = useState(true);

  // 2) Estado para controlar ano selecionado e linhas da tabela
  const [selectedYear, setSelectedYear] = useState("2025");
  const [rows, setRows] = useState<any[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  const token = localStorage.getItem("token");

  // ---------------------------------------------------------------------
  //  Fetch do setor (id, nome) com base no slug
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!slug) return;

    setLoadingSetor(true);
    api
      .get(`/setores/${slug}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        setSetorInfo(res.data.setoresSlug as SetorInfo);
      })
      .catch((err) => {
        console.error("Erro ao carregar dados do setor:", err);
        setSetorInfo(null);
      })
      .finally(() => {
        setLoadingSetor(false);
      });
  }, [slug]);

  // ---------------------------------------------------------------------
  //  Quando tivermos o setorInfo, buscamos os indicadores para a tabela
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (loadingSetor || !setorInfo) return;

    const fetchIndicadores = async () => {
      setLoadingRows(true);
      try {
        // -------------------------------------------------------------
        //  2.1) Busca resumo de jornadas por mês para este setor
        // -------------------------------------------------------------
        const resumoRes = await api.get(
          `/jornadas/retornar-resumo/${setorInfo.id}?ano=${selectedYear}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const resumoData = resumoRes.data;

        // Montamos as linhas fixas “Profissionais” e “Horas”
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

        if (resumoData.resumoPorMes.length > 0) {
          linhaProfissionais.indicadores = resumoData.resumoPorMes[0].indicadorProfissionais;
          linhaHoras.indicadores = resumoData.resumoPorMes[0].indicadorHoras;
        }

        let somaProfissionaisTotal = 0;
        let somaHorasTotalDecimal = 0;

        resumoData.resumoPorMes.forEach((item: any) => {
          const idx = item.mes - 1;
          if (idx >= 0 && idx < 12) {
            // Preenche colunas de “Profissionais”
            linhaProfissionais[MES_KEYS[idx]] = Number(item.colaboradores).toLocaleString("pt-BR");
            somaProfissionaisTotal += Number(item.colaboradores) || 0;

            // Preenche colunas de “Horas” (exibe “Xh:Ymin”)
            const horasDecimal = hhmmParaDecimal(item.horasTrabalhadas);
            linhaHoras[MES_KEYS[idx]] = `${Math.floor(horasDecimal)}h`;
            somaHorasTotalDecimal += horasDecimal;
          }
        });

        // -------------------------------------------------------------
        //  2.2) Busca “itens/valor” para demais indicadores
        // -------------------------------------------------------------
        const valoresRes = await api.get(
          `itens/valor/${setorInfo.id}/?ano=${selectedYear}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const indicadoresFromApi = valoresRes.data.indicadores;

        // -------------------------------------------------------------
        //  2.3) Monta linha para cada indicador, somando todas as instituições por mês
        // -------------------------------------------------------------
        const outrasRows = indicadoresFromApi.map((indicador: any) => {
          const linhaBase: any = {
            indicadores: indicador.nome,
            jan: "-", fev: "-", mar: "-", abr: "-", mai: "-", jun: "-",
            jul: "-", ago: "-", set: "-", out: "-", nov: "-", dez: "-",
            acumulado: { fieam: "-", sesi: "-", senai: "-", iel: "-", "total geral": "-" }
          };

          // Para cada mês, somamos TODOS os valores daquele mês (todas as instituições)
          MES_KEYS.forEach((mesKey, idx) => {
            const somaDoMes = indicador.valores
              .filter((v: any) => v.mes === idx + 1)
              .reduce((acc: number, cur: any) => {
                // Usa parseFloat para respeitar casas decimais
                const numero = parseFloat(cur.valor);
                return acc + (isNaN(numero) ? 0 : numero);
              }, 0);

            if (somaDoMes > 0) {
              // -> Se indicador.moeda === true, exibe como R$ x.xxx,xx
              if (indicador.moeda) {
                linhaBase[mesKey] = somaDoMes.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                });
              } else {
                // Caso contrário, formata numérico “x.xxx,xx”
                linhaBase[mesKey] = somaDoMes.toLocaleString("pt-BR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                });
              }
            } else {
              linhaBase[mesKey] = "-";
            }
          });

          // 2) Acumulado por instituição (mantendo a mesma ideia de parseFloat)
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

          // Formata acumulados com “R$” se moeda; senão numérico
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

          return {
            ...linhaBase,
            atividade: indicador.atividade,
            moeda: indicador.moeda, // guardamos a flag para uso futuro
          };
        });

        // -------------------------------------------------------------
        //  2.4) Soma das “atividades” (linhas com atividade = true) mês a mês
        // -------------------------------------------------------------
        const somaPorMes: number[] = MES_KEYS.map((_, idx) => {
          return outrasRows.reduce((acc: number, row: any) => {
            if (!row.atividade) return acc;
            const val = row[MES_KEYS[idx]];
            if (val !== "-" && val !== undefined) {
              // val já está em string no formato pt-BR; removemos separadores
              const numero = parseFloat(val.replace(/\./g, "").replace(",", "."));
              if (!isNaN(numero)) return acc + numero;
            }
            return acc;
          }, 0);
        });

        const somaAtividadesTotal = somaPorMes.reduce((a, b) => a + b, 0);

        const linhaSomaAtividades: any = {
          indicadores: "Total de ações executadas no mês",
          jan: somaPorMes[0] > 0 ? somaPorMes[0].toLocaleString("pt-BR") : "-",
          fev: somaPorMes[1] > 0 ? somaPorMes[1].toLocaleString("pt-BR") : "-",
          mar: somaPorMes[2] > 0 ? somaPorMes[2].toLocaleString("pt-BR") : "-",
          abr: somaPorMes[3] > 0 ? somaPorMes[3].toLocaleString("pt-BR") : "-",
          mai: somaPorMes[4] > 0 ? somaPorMes[4].toLocaleString("pt-BR") : "-",
          jun: somaPorMes[5] > 0 ? somaPorMes[5].toLocaleString("pt-BR") : "-",
          jul: somaPorMes[6] > 0 ? somaPorMes[6].toLocaleString("pt-BR") : "-",
          ago: somaPorMes[7] > 0 ? somaPorMes[7].toLocaleString("pt-BR") : "-",
          set: somaPorMes[8] > 0 ? somaPorMes[8].toLocaleString("pt-BR") : "-",
          out: somaPorMes[9] > 0 ? somaPorMes[9].toLocaleString("pt-BR") : "-",
          nov: somaPorMes[10] > 0 ? somaPorMes[10].toLocaleString("pt-BR") : "-",
          dez: somaPorMes[11] > 0 ? somaPorMes[11].toLocaleString("pt-BR") : "-",
          acumulado: { fieam: "-", sesi: "-", senai: "-", iel: "-", "total geral": "-" }
        };

        // -------------------------------------------------------------
        //  2.5) Média de horas por mês (horas ÷ ações) e acumulado de tempo médio
        // -------------------------------------------------------------
        const horasPorMesDecimal: number[] = MES_KEYS.map((_, idx) => {
          const entry = resumoData.resumoPorMes.find((r: any) => r.mes === idx + 1);
          return entry ? hhmmParaDecimal(entry.horasTrabalhadas) : 0;
        });

        const mediaPorMes: string[] = somaPorMes.map((soma, idx) => {
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
        //  2.6) Junta as quatro linhas fixas com os outros indicadores
        // -------------------------------------------------------------
        const todasRows: any[] = [
          linhaProfissionais,
          linhaHoras,
          linhaSomaAtividades,
          linhaMediaHoras,
          ...outrasRows,
        ];

        // -------------------------------------------------------------
        //  2.7) Ajusta acumulados fixos das 4 primeiras linhas
        // -------------------------------------------------------------
        // Profissionais: somaProfissionaisTotal
        
        const mediaColaboradores = somaProfissionaisTotal / (hoje.getMonth() + 1)
        //                              26 / 
        const mediaColaboradoresArredondada = Math.ceil(mediaColaboradores)
        todasRows[0].acumulado.fieam =
          somaProfissionaisTotal > 0
            ? Number(mediaColaboradoresArredondada).toLocaleString("pt-BR")
            : "-";
        todasRows[0].acumulado["total geral"] =
          somaProfissionaisTotal > 0
            ? mediaColaboradoresArredondada.toLocaleString("pt-BR")
            : "-";

        // Horas: exibir **somente** as horas (sem minutos) na linha acumulado
        const totalHorasApenasHoras = apenasHoras(totalHorasAcumuladasDecimal);
        todasRows[1].acumulado.fieam = totalHorasApenasHoras;
        todasRows[1].acumulado["total geral"] = totalHorasApenasHoras;

        // Soma Atividades: totalAcoesAcumuladas
        todasRows[2].acumulado.fieam =
          totalAcoesAcumuladas > 0
            ? totalAcoesAcumuladas.toLocaleString("pt-BR")
            : "-";
        todasRows[2].acumulado["total geral"] =
          totalAcoesAcumuladas > 0
            ? totalAcoesAcumuladas.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
            : "-";

        // Tempo médio
        todasRows[3].acumulado.fieam = tempoMedioHhmmAcumulado;
        todasRows[3].acumulado["total geral"] = tempoMedioHhmmAcumulado;

        setRows(todasRows);
      } catch (err) {
        console.error("Erro ao buscar indicadores:", err);
        setRows([]);
      } finally {
        setLoadingRows(false);
      }
    };

    fetchIndicadores();
  }, [selectedYear, loadingSetor, setorInfo]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    setSelectedYear(newValue);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loadingSetor) {
    return <Typography>Carregando dados do setor…</Typography>;
  }
  if (!setorInfo) {
    return <Typography>Setor “{slug}” não encontrado.</Typography>;
  }

  const hoje = new Date();

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h4" gutterBottom>
          Setor: {setorInfo.nome}
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
              {loadingRows ? (
                <TableRow>
                  <TableCell colSpan={1 + 12 + 5} align="center" style={{ padding: "16px" }}>
                    Carregando…
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

                    {/* Renderiza cada coluna de mês, exibindo moeda se row.moeda === true */}
                    {MES_KEYS.map((key) => (
                      <TableCell align="center" key={key}>
                        {row[key] !== undefined ? row[key] : "-"}
                      </TableCell>
                    ))}

                    {/* Renderiza as 5 colunas de Acumulado (já formatadas) */}
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
        {hoje.getFullYear()} às {hoje.getHours()}:{hoje.getMinutes().toString().padStart(2, "0")}
      </h4>
    </div>
  );
}
