// src/pages/SetorPage.tsx
import React, { useState, useEffect, useMemo } from "react";
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
  useMediaQuery,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  CircularProgress,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
} from "@mui/material";
import api from "../../services/api";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PrintIcon from "@mui/icons-material/Print";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import CloseIcon from "@mui/icons-material/Close";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

// Helpers para conversão de datas e horas:
const MES_KEYS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez"
];

/**
 * Converte horas decimais em "Xh:Ymin" (por exemplo: 1.5 → "1h:30min")
 */
const decimalParaHoraMin = (decimalHoras: number): string => {
  const horasInteiras = Math.floor(decimalHoras);
  const minutos = Math.round((decimalHoras - horasInteiras) * 60);
  return `${horasInteiras}h:${minutos}min`;
};

/**
 * Converte string "HH:MM" em decimal de horas (por exemplo: "2:30" → 2.5)
 */
const hhmmParaDecimal = (hhmm: string): number => {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  return isNaN(h) || isNaN(m) ? 0 : h + m / 60;
};

/**
 * Converte decimal em string "Xh:Ymin" (exatamente como decimalParaHoraMin)
 */
const decimalParaHhmm = (decimal: number): string => {
  const horas = Math.floor(decimal);
  const minutos = Math.round((decimal - horas) * 60);
  return `${horas}h:${minutos}min`;
};


/**
 * Exibe apenas a parte inteira (horas) de um valor decimal
 * (por exemplo: 2.75 → "2h")
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
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [rows, setRows] = useState<any[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [canonicalNames, setCanonicalNames] = useState<string[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState<number | null>(null);

  useEffect(() => { setMesSelecionado(null); }, [selectedYear]);

  const [showComp, setShowComp] = useState(false);
  const [anoComp1, setAnoComp1] = useState(String(currentYear - 1));
  const [anoComp2, setAnoComp2] = useState(String(currentYear));
  const [dadosComp, setDadosComp] = useState<{ nome: string; v1: number; v2: number; moeda: boolean; porMes1: Record<number,number>; porMes2: Record<number,number> }[]>([]);
  const [loadingComp, setLoadingComp] = useState(false);
  const [abaComp, setAbaComp] = useState<"acumulado"|"pormes">("acumulado");
  const [indComp, setIndComp] = useState("");

  const token = localStorage.getItem("token");
  const hoje = new Date();

  const yearTabs = useMemo(() => {
    return [currentYear - 1, currentYear, currentYear + 1].map(String);
  }, [currentYear]);

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

  const isBackOffice = !!setorInfo && (
    setorInfo.slug === 'back-office' ||
    setorInfo.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes('back office')
  );

  // ---------------------------------------------------------------------
  //  Quando tivermos o setorInfo, buscamos os indicadores para a tabela
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (loadingSetor || !setorInfo) return;

    const fetchIndicadores = async () => {
      setLoadingRows(true);
      try {
        // -------------------------------------------------------------
        //  2.1) Busca resumo de jornadas (falha silenciosa — não aborta)
        // -------------------------------------------------------------
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

        let somaProfissionaisTotal = 0;
        let somaHorasTotalDecimal = 0;
        const horasPorMesDecimalExterno: number[] = Array(12).fill(0);

        try {
          const resumoRes = await api.get(
            `/jornadas/retornar-resumo/${setorInfo.id}?ano=${selectedYear}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const resumoData = resumoRes.data;

          if (resumoData.resumoPorMes.length > 0) {
            linhaProfissionais.indicadores = resumoData.resumoPorMes[0].indicadorProfissionais;
            linhaHoras.indicadores = resumoData.resumoPorMes[0].indicadorHoras;
          }

          resumoData.resumoPorMes.forEach((item: any) => {
            const idx = item.mes - 1;
            if (idx >= 0 && idx < 12) {
              linhaProfissionais[MES_KEYS[idx]] = Number(item.colaboradores).toLocaleString("pt-BR");
              somaProfissionaisTotal += Number(item.colaboradores) || 0;
              const horasDecimal = hhmmParaDecimal(item.horasTrabalhadas);
              linhaHoras[MES_KEYS[idx]] = `${Math.floor(horasDecimal)}h`;
              somaHorasTotalDecimal += horasDecimal;
              horasPorMesDecimalExterno[idx] = horasDecimal;
            }
          });
        } catch (_e) {
          // jornadas indisponíveis para este setor/ano — continua sem elas
        }

        // -------------------------------------------------------------
        //  2.2) Busca "itens/valor" + lista de itens para filtrar por ano
        // -------------------------------------------------------------
        const [valoresRes, itensRes] = await Promise.all([
          api.get(`itens/valor/${setorInfo.id}/?ano=${selectedYear}`, { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/itens', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        // Para cada indicador deste setor, encontra o menor ano em que foi cadastrado
        const minAnoPorNome = new Map<string, number>();
        (itensRes.data as any[])
          .filter((i: any) => String(i.setor_id) === String(setorInfo.id))
          .forEach((i: any) => {
            const nome = i.nome as string;
            const ano = Number(i.ano);
            if (!minAnoPorNome.has(nome) || ano < minAnoPorNome.get(nome)!) {
              minAnoPorNome.set(nome, ano);
            }
          });

        // Indicadores que só existem em anos futuros (não devem aparecer em visões passadas)
        const nomesDoFuturo: Set<string> = new Set(
          Array.from(minAnoPorNome.entries())
            .filter(([, minAno]) => minAno > Number(selectedYear))
            .map(([nome]) => nome)
        );

        // Exibe todos os indicadores, exceto os ocultos e os criados só em anos futuros
        const indicadoresFromApi = (valoresRes.data.indicadores as any[])
          .filter((ind: any) => !nomesDoFuturo.has(ind.nome) && !ind.oculto)
          .sort((a: any, b: any) => {
            if (a.ordem == null && b.ordem == null) return 0;
            if (a.ordem == null) return 1;
            if (b.ordem == null) return -1;
            return a.ordem - b.ordem;
          });

        // -------------------------------------------------------------
        //  2.3) Monta linha para cada indicador, somando todas as instituições por mês
        // -------------------------------------------------------------
        // Calcula o acumulado de uma instituição respeitando a regra configurada.
        const calcularAcumuladoInst = (valores: any[], instId: number, regra: string): number => {
          const vals = valores.filter(
            (v: any) => v.instituicao_id === instId && parseFloat(v.valor) > 0
          );
          if (vals.length === 0) return 0;
          switch (regra ?? 'somar') {
            case 'ultimo': {
              const maxMes = Math.max(...vals.map((v: any) => v.mes));
              return vals
                .filter((v: any) => v.mes === maxMes)
                .reduce((acc: number, v: any) => acc + parseFloat(v.valor), 0);
            }
            case 'media': {
              const meses = [...new Set(vals.map((v: any) => v.mes))];
              const soma = vals.reduce((acc: number, v: any) => acc + parseFloat(v.valor), 0);
              return soma / meses.length;
            }
            default: // 'somar'
              return vals.reduce((acc: number, v: any) => acc + parseFloat(v.valor), 0);
          }
        };

        const outrasRows = indicadoresFromApi.map((indicador: any) => {
          const linhaBase: any = {
            indicadores: indicador.nome,
            descricao: indicador.detalhes || '',
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
                // Caso contrário, formata numérico "x.xxx,xx"
                linhaBase[mesKey] = somaDoMes.toLocaleString("pt-BR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                });
              }
            } else {
              linhaBase[mesKey] = "-";
            }
          });

          // 2) Acumulado por instituição — respeita estrategia_acumulado no Panorama Geral
          const regra = indicador.estrategia_acumulado ?? 'somar';
          const somaFieam  = calcularAcumuladoInst(indicador.valores, 1, regra);
          const somaSesi   = calcularAcumuladoInst(indicador.valores, 2, regra);
          const somaSenai  = calcularAcumuladoInst(indicador.valores, 3, regra);
          const somaIel    = calcularAcumuladoInst(indicador.valores, 4, regra);
          const somaTotal = somaFieam + somaSesi + somaSenai + somaIel;

          // Total Média: verifica na origem se a instituição tem registro válido
          // (número finito, incluindo 0) — não usa o valor calculado para decidir
          const temDado = (instId: number): boolean =>
            indicador.valores.some((v: any) => {
              if (v.instituicao_id !== instId) return false;
              const val = v.valor;
              if (val === null || val === undefined || val === '' || val === '-') return false;
              const n = parseFloat(val);
              return !isNaN(n) && isFinite(n);
            });

          const instComDado = [
            { temDado: temDado(1), valor: somaFieam },
            { temDado: temDado(2), valor: somaSesi },
            { temDado: temDado(3), valor: somaSenai },
            { temDado: temDado(4), valor: somaIel },
          ].filter(i => i.temDado);

          const mediaTotal = instComDado.length > 0
            ? instComDado.reduce((a, i) => a + i.valor, 0) / instComDado.length
            : 0;

          // Formata acumulados com "R$" se moeda; senão numérico
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
          linhaBase.acumulado["total geral"] = formatarAcumulado(mediaTotal);

          // Valores por mês por instituição (para exibir ao clicar no cabeçalho do mês)
          const valoresPorMesPorInst: Record<number, Record<string, string>> = {};
          for (let m = 1; m <= 12; m++) {
            const getInst = (instId: number) => {
              const soma = indicador.valores
                .filter((v: any) => v.mes === m && v.instituicao_id === instId)
                .reduce((acc: number, v: any) => acc + (parseFloat(v.valor) || 0), 0);
              return formatarAcumulado(soma);
            };
            const f = getInst(1), s = getInst(2), sn = getInst(3), il = getInst(4);
            const nums = [f, s, sn, il].map(v => {
              const n = parseFloat(v.replace(/\./g, '').replace(',', '.').replace('R$', '').trim());
              return isNaN(n) ? 0 : n;
            });
            const totalMes = nums.reduce((a, b) => a + b, 0);
            valoresPorMesPorInst[m] = {
              fieam: f, sesi: s, senai: sn, iel: il,
              'total geral': formatarAcumulado(totalMes),
            };
          }
          linhaBase.valoresPorMesPorInst = valoresPorMesPorInst;

          return {
            ...linhaBase,
            atividade: indicador.atividade,
            moeda: indicador.moeda,
          };
        });

        // -------------------------------------------------------------
        //  2.4) Soma das "atividades" (linhas com atividade = true) mês a mês
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
        const horasPorMesDecimal: number[] = horasPorMesDecimalExterno;

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
        //  2.6) Mantém ordem consistente dos indicadores ao trocar de ano
        //  (groupedIndicators: nomes salvos na primeira carga)
        // -------------------------------------------------------------
        let orderedRows = outrasRows;
        if (canonicalNames.length === 0) {
          setCanonicalNames(outrasRows.map((r: any) => r.indicadores));
        } else {
          const byName = new Map(outrasRows.map((r: any) => [r.indicadores, r]));
          // Mantém a ordem dos nomes canônicos, mas só inclui os que existem neste ano
          orderedRows = canonicalNames
            .filter((nome) => byName.has(nome))
            .map((nome) => byName.get(nome));
          // Adiciona indicadores novos que não estavam na carga inicial
          outrasRows.forEach((r: any) => {
            if (!canonicalNames.includes(r.indicadores)) orderedRows.push(r);
          });
        }

        // -------------------------------------------------------------
        //  2.6b) Para Back Office: busca Adesões e Renovações do CRM
        // -------------------------------------------------------------
        const buildLinhaCrm = (
          nome: string,
          descricao: string,
          porMes: Record<number, { fieam: number; sesi: number; senai: number; iel: number; total: number }>
        ): any => {
          const linha: any = {
            indicadores: nome,
            descricao,
            jan: "-", fev: "-", mar: "-", abr: "-", mai: "-", jun: "-",
            jul: "-", ago: "-", set: "-", out: "-", nov: "-", dez: "-",
            acumulado: { fieam: "-", sesi: "-", senai: "-", iel: "-", "total geral": "-" },
            valoresPorMesPorInst: {} as Record<number, Record<string, string>>,
          };

          const fmtN = (n: number) => n > 0 ? n.toLocaleString("pt-BR") : "-";
          let acFieam = 0, acSesi = 0, acSenai = 0, acIel = 0, acTotal = 0;

          MES_KEYS.forEach((mesKey, idx) => {
            const m = idx + 1;
            const d = porMes[m];
            if (d && d.total > 0) linha[mesKey] = d.total.toLocaleString("pt-BR");
            linha.valoresPorMesPorInst[m] = {
              fieam: fmtN(d?.fieam ?? 0),
              sesi:  fmtN(d?.sesi  ?? 0),
              senai: fmtN(d?.senai ?? 0),
              iel:   fmtN(d?.iel   ?? 0),
              "total geral": fmtN(d?.total ?? 0),
            };
            acFieam  += d?.fieam  ?? 0;
            acSesi   += d?.sesi   ?? 0;
            acSenai  += d?.senai  ?? 0;
            acIel    += d?.iel    ?? 0;
            acTotal  += d?.total  ?? 0;
          });

          linha.acumulado = {
            fieam: fmtN(acFieam), sesi: fmtN(acSesi),
            senai: fmtN(acSenai), iel: fmtN(acIel),
            "total geral": fmtN(acTotal),
          };
          return linha;
        };

        let linhaAdesoes: any   = null;
        let linhaRenovacoes: any = null;

        let linhaEquipeInterna: any = null;

        if (isBackOffice) {
          try {
            const [adesaoRes, renovacaoRes, equipeRes] = await Promise.all([
              api.get(`/propostas/adesoes?ano=${selectedYear}`),
              api.get(`/propostas/renovacoes?ano=${selectedYear}`),
              api.get(`/propostas/equipe-interna?ano=${selectedYear}`),
            ]);
            linhaAdesoes = buildLinhaCrm(
              "Número de Adesões",
              "Propostas com 'ADESÃO/ADESAO' no nome, status Ganha+Ativa, data de modificação (CRM).",
              adesaoRes.data.porMesPorInst
            );
            linhaRenovacoes = buildLinhaCrm(
              "Número de Renovações",
              "Propostas com 'RENOVAÇÃO/RENOVACAO' no nome, status Ganha+Ativa, data de modificação (CRM).",
              renovacaoRes.data.porMesPorInst
            );
            linhaEquipeInterna = buildLinhaCrm(
              "Propostas Criadas pela Equipe Interna",
              "Propostas criadas pelas Consultoras PJ Internas (Brenda, Joycilene, Keite), todos os status, data de criação (CRM).",
              equipeRes.data.porMesPorInst
            );
          } catch (_e) {
            // falha silenciosa
          }
        }

        linhaProfissionais._hidden = true;
        linhaHoras._hidden = true;
        linhaSomaAtividades._hidden = true;
        linhaMediaHoras._hidden = true;

        const todasRows: any[] = [
          linhaProfissionais,
          linhaHoras,
          linhaSomaAtividades,
          linhaMediaHoras,
          ...(linhaAdesoes       ? [linhaAdesoes]       : []),
          ...(linhaRenovacoes    ? [linhaRenovacoes]    : []),
          ...(linhaEquipeInterna ? [linhaEquipeInterna] : []),
          ...orderedRows,
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

  const fetchTotaisAno = async (setorId: number, ano: string): Promise<Record<string, { total: number; moeda: boolean; porMes: Record<number,number> }>> => {
    try {
      const res = await api.get(`itens/valor/${setorId}/?ano=${ano}`, { headers: { Authorization: `Bearer ${token}` } });
      const result: Record<string, { total: number; moeda: boolean; porMes: Record<number,number> }> = {};
      (res.data.indicadores as any[]).forEach((ind: any) => {
        if (ind.oculto) return;
        const porMes: Record<number,number> = {};
        for (let m = 1; m <= 12; m++) {
          porMes[m] = ind.valores.filter((v: any) => v.mes === m).reduce((acc: number, v: any) => acc + (parseFloat(v.valor) || 0), 0);
        }
        const total = Object.values(porMes).reduce((a, b) => a + b, 0);
        result[ind.nome] = { total, moeda: ind.moeda ?? false, porMes };
      });
      return result;
    } catch { return {}; }
  };

  const handleAbrirComparacao = async (a1 = anoComp1, a2 = anoComp2) => {
    if (!setorInfo) return;
    setLoadingComp(true);
    try {
      const [dados1, dados2] = await Promise.all([
        fetchTotaisAno(setorInfo.id, a1),
        fetchTotaisAno(setorInfo.id, a2),
      ]);
      const nomes = [...new Set([...Object.keys(dados1), ...Object.keys(dados2)])];
      const lista = nomes.map(nome => ({
        nome,
        v1: dados1[nome]?.total ?? 0,
        v2: dados2[nome]?.total ?? 0,
        moeda: dados1[nome]?.moeda || dados2[nome]?.moeda || false,
        porMes1: dados1[nome]?.porMes ?? {},
        porMes2: dados2[nome]?.porMes ?? {},
      }));
      setDadosComp(lista);
      if (!indComp && lista.length > 0) setIndComp(lista[0].nome);
    } finally {
      setLoadingComp(false);
    }
  };

  const isMobile = useMediaQuery("(max-width:768px)");

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
    return <Typography>Setor "{slug}" não encontrado.</Typography>;
  }

  return (
    <Box sx={{ p: isMobile ? 2 : 3, width: "100%", boxSizing: "border-box" }}>
      {/* Cabeçalho */}
      <Box sx={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: "flex-start", gap: isMobile ? 2 : 0, mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#1976d2", textTransform: "uppercase", letterSpacing: 1.5, mb: 0.5 }}>
            Setor
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#1a2744", fontSize: isMobile ? 22 : undefined }}>
            {setorInfo.nome}
          </Typography>
        </Box>

        <Box className="no-print" sx={{ display: "flex", gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/menu")}
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, borderColor: "#d1d5db", color: "#374151", "&:hover": { borderColor: "#9ca3af" }, minWidth: isMobile ? 40 : undefined, px: isMobile ? 1 : undefined }}
          >
            {!isMobile && "Voltar"}
          </Button>
          <Button
            variant="outlined"
            startIcon={<CompareArrowsIcon />}
            onClick={() => { setShowComp(true); handleAbrirComparacao(); }}
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, borderColor: "#1976d2", color: "#1976d2", "&:hover": { borderColor: "#1565c0", background: "#f0f7ff" }, minWidth: isMobile ? 40 : undefined, px: isMobile ? 1 : undefined }}
          >
            {!isMobile && "Comparar anos"}
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, backgroundColor: "#1976d2", "&:hover": { backgroundColor: "#1565c0" }, minWidth: isMobile ? 40 : undefined, px: isMobile ? 1 : undefined }}
          >
            {!isMobile && "Imprimir"}
          </Button>
        </Box>
      </Box>

      {/* Abas de ano */}
      <Box className="no-print" sx={{ mb: 3 }}>
        <Tabs
          value={selectedYear}
          onChange={handleTabChange}
          aria-label="Tabs de anos"
          sx={{
            minHeight: 36,
            "& .MuiTabs-indicator": { display: "none" },
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              minHeight: 36,
              px: 2.5,
              py: 0.5,
              color: "#6b7280",
              fontSize: 14,
            },
            "& .Mui-selected": {
              backgroundColor: "#1976d2",
              color: "white !important",
              borderRadius: 2,
            },
          }}
        >
          {yearTabs.map((y) => (
            <Tab key={y} value={y} label={y} />
          ))}
        </Tabs>
      </Box>

      {/* Tabela */}
      {(() => {
        const MESES_LABELS = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
        const visibleRows = rows.filter(r => !r._hidden);
        const mesesComDados = MES_KEYS.filter(key =>
          visibleRows.some(r => r[key] !== "-" && r[key] !== undefined && r[key] !== "")
        );
        const totalCols = 1 + mesesComDados.length + (!isMobile ? 5 : 0);

        return (
          <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid #e3eaf4", overflow: "hidden" }}>
            <TableContainer sx={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>
              <Table sx={{ minWidth: isMobile ? 600 : 900 }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      rowSpan={2}
                      sx={{
                        fontWeight: 700, backgroundColor: "#ffffff",
                        width: isMobile ? 130 : 220, minWidth: isMobile ? 110 : 180,
                        py: 1.5, px: isMobile ? 1 : 2,
                        fontSize: isMobile ? 13 : 15, color: "#1a2744",
                        borderBottom: "1px solid #e3eaf4",
                        position: "sticky", left: 0, zIndex: 4,
                        boxShadow: "2px 0 4px rgba(0,0,0,0.06)",
                      }}
                    >
                      Indicadores
                    </TableCell>
                    {mesesComDados.map((mesKey) => {
                      const mesNum = MES_KEYS.indexOf(mesKey) + 1;
                      const isSelected = mesSelecionado === mesNum;
                      return (
                        <TableCell
                          key={mesKey}
                          rowSpan={2}
                          align="center"
                          onClick={() => setMesSelecionado(isSelected ? null : mesNum)}
                          sx={{
                            fontWeight: isSelected ? 800 : 600,
                            backgroundColor: isSelected ? "#e3f2fd" : "#ffffff",
                            fontSize: isMobile ? 12 : 14,
                            py: 1.5, minWidth: isMobile ? 48 : 65,
                            color: isSelected ? "#1976d2" : "#6b7280",
                            borderBottom: isSelected ? "2px solid #1976d2" : "1px solid #e3eaf4",
                            cursor: "pointer",
                            userSelect: "none",
                            transition: "background 0.15s",
                            "&:hover": { backgroundColor: "#f0f7ff", color: "#1976d2" },
                          }}
                        >
                          {MESES_LABELS[MES_KEYS.indexOf(mesKey)]}
                        </TableCell>
                      );
                    })}
                    {!isMobile && (
                      <TableCell
                        colSpan={5}
                        align="center"
                        sx={{ fontWeight: 700, backgroundColor: "#1976d2", color: "white", py: 1.2, fontSize: 14, textTransform: "uppercase", letterSpacing: 1 }}
                      >
                        {mesSelecionado ? MESES_LABELS[mesSelecionado - 1] : "Acumulado"}
                      </TableCell>
                    )}
                  </TableRow>
                  <TableRow>
                    {!isMobile && ["FIEAM", "SESI", "SENAI", "IEL", "TOTAL · MÉDIA"].map((name) => (
                      <TableCell
                        key={name}
                        align="center"
                        sx={{ fontWeight: 700, backgroundColor: "#1976d2", color: "white", py: 1, fontSize: 13, minWidth: 85, borderBottom: "none" }}
                      >
                        {name}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loadingRows ? (
                    <TableRow>
                      <TableCell colSpan={totalCols} align="center" sx={{ py: 4, color: "#6b7280" }}>
                        Carregando…
                      </TableCell>
                    </TableRow>
                  ) : visibleRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={totalCols} align="center" sx={{ py: 4, color: "#6b7280" }}>
                        Nenhum dado para {selectedYear}.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleRows.map((row, rowIndex) => {
                      const rowBg = rowIndex % 2 === 0 ? "#f8fafc" : "#ffffff";
                      return (
                        <TableRow
                          key={`row-${rowIndex}`}
                          sx={{
                            backgroundColor: rowBg,
                            "&:hover": { backgroundColor: "#eef4fd" },
                            "& .MuiTableCell-root": {
                              py: isMobile ? 0.75 : 1.2,
                              px: isMobile ? 0.5 : 1.5,
                              fontSize: isMobile ? 13 : 15,
                              borderBottom: "1px solid #f0f4f8",
                            },
                          }}
                        >
                          <TableCell
                            sx={{
                              fontWeight: 600, color: "#1a2744",
                              position: "sticky", left: 0, zIndex: 1,
                              backgroundColor: rowBg,
                              boxShadow: "2px 0 4px rgba(0,0,0,0.04)",
                              lineHeight: 1.4,
                            }}
                          >
                            {row.descricao ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <span>{row.indicadores}</span>
                                <Tooltip title={row.descricao} arrow placement="right">
                                  <HelpOutlineIcon sx={{ fontSize: 15, color: '#9ca3af', cursor: 'help', flexShrink: 0, '&:hover': { color: '#1976d2' } }} />
                                </Tooltip>
                              </Box>
                            ) : row.indicadores}
                          </TableCell>

                          {mesesComDados.map((key) => {
                            const mesNum = MES_KEYS.indexOf(key) + 1;
                            const isSelected = mesSelecionado === mesNum;
                            return (
                              <TableCell
                                align="center"
                                key={key}
                                sx={{
                                  color: "#374151",
                                  backgroundColor: isSelected ? "#f0f7ff" : undefined,
                                  fontWeight: isSelected ? 600 : 400,
                                }}
                              >
                                {row[key] !== undefined ? row[key] : "-"}
                              </TableCell>
                            );
                          })}

                          {!isMobile && ["fieam", "sesi", "senai", "iel", "total geral"].map((key, i) => {
                            const valor = mesSelecionado && row.valoresPorMesPorInst
                              ? (row.valoresPorMesPorInst[mesSelecionado]?.[key] ?? "-")
                              : (row.acumulado?.[key] ?? "-");
                            return (
                              <TableCell
                                align="center"
                                key={key}
                                sx={{ fontWeight: 600, color: i === 4 ? "#1976d2" : "#374151" }}
                              >
                                {valor}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        );
      })()}

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1.5 }}>
        <Typography sx={{ fontSize: 12, color: "#9ca3af" }}>
          Atualizado até{" "}
          {hoje.getDate().toString().padStart(2, "0")}/
          {(hoje.getMonth() + 1).toString().padStart(2, "0")}/
          {hoje.getFullYear()}, {hoje.getHours()}:{hoje.getMinutes().toString().padStart(2, "0")}:{hoje.getSeconds().toString().padStart(2, "0")}
        </Typography>
      </Box>

      {/* Modal de comparação de anos */}
      <Dialog open={showComp} onClose={() => setShowComp(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#1a2744", pr: 6 }}>
          Comparativo — {setorInfo.nome}
          <IconButton onClick={() => setShowComp(false)} sx={{ position: "absolute", right: 12, top: 12, color: "#6b7280" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {/* Seletores de ano + abas */}
          <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel>Ano base</InputLabel>
              <Select value={anoComp1} label="Ano base" onChange={e => setAnoComp1(e.target.value as string)}>
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
                  <MenuItem key={y} value={String(y)}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography sx={{ color: "#6b7280", fontWeight: 600 }}>vs</Typography>
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel>Ano atual</InputLabel>
              <Select value={anoComp2} label="Ano atual" onChange={e => setAnoComp2(e.target.value as string)}>
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
                  <MenuItem key={y} value={String(y)}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained" size="small"
              onClick={() => handleAbrirComparacao(anoComp1, anoComp2)}
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, backgroundColor: "#1976d2" }}
            >
              Atualizar
            </Button>
          </Box>

          {/* Abas Acumulado / Por mês */}
          <Tabs
            value={abaComp}
            onChange={(_, v) => setAbaComp(v)}
            sx={{
              mb: 2, minHeight: 34,
              "& .MuiTabs-indicator": { display: "none" },
              "& .MuiTab-root": { textTransform: "none", fontWeight: 600, borderRadius: 2, minHeight: 34, px: 2, py: 0.5, fontSize: 13, color: "#6b7280" },
              "& .Mui-selected": { backgroundColor: "#1976d2", color: "white !important" },
            }}
          >
            <Tab value="acumulado" label="Acumulado" />
            <Tab value="pormes" label="Por mês" />
          </Tabs>

          {loadingComp ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress />
            </Box>
          ) : abaComp === "acumulado" ? (
            /* ── Tabela acumulado ── */
            <Table size="small">
              <TableHead>
                <TableRow sx={{ background: "#f0f4ff" }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13, color: "#1a2744" }}>Indicador</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: 13, color: "#1a2744" }}>{anoComp1}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: 13, color: "#1a2744" }}>{anoComp2}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: 13, color: "#1a2744" }}>Variação</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dadosComp.filter(r => r.v1 > 0 || r.v2 > 0).map((row, i) => {
                  const variacao = row.v1 > 0 ? ((row.v2 - row.v1) / row.v1) * 100 : null;
                  const corVar = variacao === null ? "#6b7280" : variacao > 0 ? "#16a34a" : variacao < 0 ? "#dc2626" : "#6b7280";
                  const textoVar = variacao === null ? "Novo" : `${variacao > 0 ? "+" : ""}${variacao.toFixed(1)}%`;
                  const fmt = (v: number) => v > 0 ? (row.moeda ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })) : "-";
                  return (
                    <TableRow key={row.nome} sx={{ background: i % 2 === 0 ? "#f8fafc" : "#fff", "&:hover": { background: "#eef4fd" } }}>
                      <TableCell sx={{ fontSize: 13, color: "#374151", fontWeight: 500, py: 1.2 }}>{row.nome}</TableCell>
                      <TableCell align="center" sx={{ fontSize: 13, color: "#374151", py: 1.2 }}>{fmt(row.v1)}</TableCell>
                      <TableCell align="center" sx={{ fontSize: 13, color: "#374151", py: 1.2 }}>{fmt(row.v2)}</TableCell>
                      <TableCell align="center" sx={{ fontSize: 13, fontWeight: 700, color: corVar, py: 1.2 }}>{textoVar}</TableCell>
                    </TableRow>
                  );
                })}
                {dadosComp.filter(r => r.v1 > 0 || r.v2 > 0).length === 0 && (
                  <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: "#9ca3af" }}>Nenhum dado encontrado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            /* ── Tabela por mês ── */
            (() => {
              const MESES_NOMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
              const indSel = dadosComp.find(d => d.nome === indComp) ?? dadosComp[0];
              return (
                <Box>
                  <FormControl size="small" fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Indicador</InputLabel>
                    <Select value={indComp || (dadosComp[0]?.nome ?? "")} label="Indicador" onChange={e => setIndComp(e.target.value as string)}>
                      {dadosComp.map(d => <MenuItem key={d.nome} value={d.nome}>{d.nome}</MenuItem>)}
                    </Select>
                  </FormControl>
                  {indSel ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ background: "#f0f4ff" }}>
                          <TableCell sx={{ fontWeight: 700, fontSize: 13, color: "#1a2744" }}>Mês</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700, fontSize: 13, color: "#1a2744" }}>{anoComp1}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700, fontSize: 13, color: "#1a2744" }}>{anoComp2}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700, fontSize: 13, color: "#1a2744" }}>Variação</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {MESES_NOMES.map((mes, idx) => {
                          const m = idx + 1;
                          const val1 = indSel.porMes1[m] ?? 0;
                          const val2 = indSel.porMes2[m] ?? 0;
                          if (val1 === 0 && val2 === 0) return null;
                          const variacao = val1 > 0 ? ((val2 - val1) / val1) * 100 : null;
                          const corVar = variacao === null ? "#6b7280" : variacao > 0 ? "#16a34a" : variacao < 0 ? "#dc2626" : "#6b7280";
                          const textoVar = variacao === null ? "Novo" : `${variacao > 0 ? "+" : ""}${variacao.toFixed(1)}%`;
                          const fmt = (v: number) => v > 0 ? (indSel.moeda ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })) : "-";
                          return (
                            <TableRow key={m} sx={{ background: idx % 2 === 0 ? "#f8fafc" : "#fff", "&:hover": { background: "#eef4fd" } }}>
                              <TableCell sx={{ fontSize: 13, fontWeight: 600, color: "#1a2744", py: 1.2 }}>{mes}</TableCell>
                              <TableCell align="center" sx={{ fontSize: 13, color: "#374151", py: 1.2 }}>{fmt(val1)}</TableCell>
                              <TableCell align="center" sx={{ fontSize: 13, color: "#374151", py: 1.2 }}>{fmt(val2)}</TableCell>
                              <TableCell align="center" sx={{ fontSize: 13, fontWeight: 700, color: corVar, py: 1.2 }}>{textoVar}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <Typography sx={{ color: "#9ca3af", textAlign: "center", py: 4 }}>Nenhum indicador disponível.</Typography>
                  )}
                </Box>
              );
            })()
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
