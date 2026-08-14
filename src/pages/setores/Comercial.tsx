// src/pages/Comercial.tsx
import React, { useState, useEffect, useMemo } from "react";
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

const MES_KEYS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez"
];

const hoje = new Date();

const decimalParaHoraMin = (decimalHoras: number): string => {
  const horasInteiras = Math.floor(decimalHoras);
  const minutos = Math.round((decimalHoras - horasInteiras) * 60);
  return `${horasInteiras}h:${minutos}min`;
};

const hhmmParaDecimal = (hhmm: string): number => {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  return isNaN(h) || isNaN(m) ? 0 : h + m / 60;
};

const decimalParaHhmm = (decimal: number): string => {
  const horas = Math.floor(decimal);
  const minutos = Math.round((decimal - horas) * 60);
  return `${horas}h:${minutos}min`;
};

const apenasHoras = (decimalHoras: number): string => {
  const horasInteiras = Math.floor(decimalHoras);
  return `${horasInteiras}h`;
};

const DESCRICOES_CRM: Record<string, string> = {
  'Total de Proposta Qtd.':          'Quantidade total de propostas criadas no período, independente do status.',
  'Propostas Geradas R$':            'Soma do valor financeiro de todas as propostas criadas no período.',
  'Total de Propostas Ganhas':       'Quantidade de propostas com status GANHA no período.',
  'Valor Total de Propostas Ganhas': 'Soma do valor financeiro das propostas com status GANHA.',
  'Total de Propostas Ativas':       'Quantidade de propostas com status ATIVA (em negociação) no período.',
  'Valor Total de Propostas Ativas': 'Soma do valor financeiro das propostas com status ATIVA.',
};

interface ComercialProps {
  setorId?: number;
}

function Comercial({ setorId: propSetorId }: ComercialProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const stateSetorId = (location.state as any)?.setorId ?? null;

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [mesSelecionado, setMesSelecionado] = useState<number | null>(null);
  const [resolvedSetorId, setResolvedSetorId] = useState<number | null>(
    propSetorId ?? stateSetorId ?? null
  );
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [canonicalNames, setCanonicalNames] = useState<string[]>([]);
  const token = localStorage.getItem("token");

  const [showComp, setShowComp] = useState(false);
  const [anoComp1, setAnoComp1] = useState(String(currentYear - 1));
  const [anoComp2, setAnoComp2] = useState(String(currentYear));
  const [dadosComp, setDadosComp] = useState<{ nome: string; v1: number; v2: number; moeda: boolean; porMes1: Record<number,number>; porMes2: Record<number,number> }[]>([]);
  const [loadingComp, setLoadingComp] = useState(false);
  const [abaComp, setAbaComp] = useState<"acumulado"|"pormes">("acumulado");
  const [indComp, setIndComp] = useState("");

  useEffect(() => {
    if (resolvedSetorId) return;
    api
      .get("/setores", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const setor = (res.data as any[]).find(
          (s) => s.nome?.toLowerCase().includes("comercial") || s.slug?.toLowerCase() === "comercial"
        );
        if (setor?.id) setResolvedSetorId(setor.id);
      })
      .catch(() => {});
  }, []);

  const yearTabs = useMemo(
    () => [currentYear - 1, currentYear, currentYear + 1].map(String),
    [currentYear]
  );

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    setSelectedYear(newValue);
    setMesSelecionado(null);
  };

  useEffect(() => {
    if (!resolvedSetorId) return;

    const fetchIndicadores = async () => {
      setLoading(true);

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
      let horasPorMesDecimalExterno: number[] = Array(12).fill(0);

      try {
        const resumoRes = await api.get(
          `/jornadas/retornar-resumo/${resolvedSetorId}?ano=${selectedYear}`,
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
            const horasDec = hhmmParaDecimal(item.horasTrabalhadas);
            linhaHoras[MES_KEYS[idx]] = `${Math.floor(horasDec)}h`;
            somaHorasTotalDecimal += horasDec;
            horasPorMesDecimalExterno[idx] = horasDec;
          }
        });

        const mesesPassados = hoje.getMonth() > 0 ? hoje.getMonth() : 1;
        const mediaColaboradoresArredonda = Math.ceil(somaProfissionaisTotal / mesesPassados);
        const mediaFormatada = mediaColaboradoresArredonda.toLocaleString("pt-BR");

        linhaProfissionais.acumulado.fieam = somaProfissionaisTotal > 0 ? mediaFormatada : "-";
        linhaProfissionais.acumulado["total geral"] = somaProfissionaisTotal > 0 ? mediaFormatada : "-";

        const totalHorasApenasH = apenasHoras(somaHorasTotalDecimal);
        linhaHoras.acumulado.fieam = somaHorasTotalDecimal > 0 ? totalHorasApenasH : "-";
        linhaHoras.acumulado["total geral"] = somaHorasTotalDecimal > 0 ? totalHorasApenasH : "-";
      } catch (_e) {
        // jornadas indisponível — continua sem ela
      }

      try {
        const [valoresRes, itensRes] = await Promise.all([
          api.get(`itens/valor/${resolvedSetorId}/?ano=${selectedYear}`, { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/itens', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const minAnoPorNome = new Map<string, number>();
        (itensRes.data as any[])
          .filter((i: any) => String(i.setor_id) === String(resolvedSetorId))
          .forEach((i: any) => {
            const nome = i.nome as string;
            const ano = Number(i.ano);
            if (!minAnoPorNome.has(nome) || ano < minAnoPorNome.get(nome)!) {
              minAnoPorNome.set(nome, ano);
            }
          });

        const nomesDoFuturo: Set<string> = new Set(
          Array.from(minAnoPorNome.entries())
            .filter(([, minAno]) => minAno > Number(selectedYear))
            .map(([nome]) => nome)
        );

        const indicadoresFromApi = (valoresRes.data.indicadores as any[])
          .filter((ind: any) => !nomesDoFuturo.has(ind.nome) && !ind.oculto)
          .sort((a: any, b: any) => {
            if (a.ordem == null && b.ordem == null) return 0;
            if (a.ordem == null) return 1;
            if (b.ordem == null) return -1;
            return a.ordem - b.ordem;
          });

        const outrasRows = indicadoresFromApi.map((indicador: any) => {
          const linhaBase: any = {
            indicadores: indicador.nome,
            descricao: indicador.detalhes || '',
            jan: "-", fev: "-", mar: "-", abr: "-", mai: "-", jun: "-",
            jul: "-", ago: "-", set: "-", out: "-", nov: "-", dez: "-",
            acumulado: { fieam: "-", sesi: "-", senai: "-", iel: "-", "total geral": "-" }
          };

          MES_KEYS.forEach((mesKey, idx) => {
            const somaDoMes = indicador.valores
              .filter((v: any) => v.mes === idx + 1)
              .reduce((acc: number, cur: any) => {
                const numero = parseFloat(cur.valor);
                return acc + (isNaN(numero) ? 0 : numero);
              }, 0);

            if (somaDoMes > 0) {
              if (indicador.moeda) {
                linhaBase[mesKey] = somaDoMes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
              } else {
                linhaBase[mesKey] = somaDoMes.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
              }
            } else {
              linhaBase[mesKey] = "-";
            }
          });

          const somaPorInstituicao = (instId: number) =>
            indicador.valores
              .filter((v: any) => v.instituicao_id === instId)
              .reduce((acc: number, cur: any) => {
                const numero = parseFloat(cur.valor);
                return acc + (isNaN(numero) ? 0 : numero);
              }, 0);

          const somaFieam = somaPorInstituicao(1);
          const somaSesi  = somaPorInstituicao(2);
          const somaSenai = somaPorInstituicao(3);
          const somaIel   = somaPorInstituicao(4);
          const somaTotal = somaFieam + somaSesi + somaSenai + somaIel;

          const formatarAcumulado = (valor: number) => {
            if (valor <= 0) return "-";
            return indicador.moeda
              ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
              : valor.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
          };

          linhaBase.acumulado.fieam = formatarAcumulado(somaFieam);
          linhaBase.acumulado.sesi  = formatarAcumulado(somaSesi);
          linhaBase.acumulado.senai = formatarAcumulado(somaSenai);
          linhaBase.acumulado.iel   = formatarAcumulado(somaIel);
          linhaBase.acumulado["total geral"] = formatarAcumulado(somaTotal);

          // Valores por mês por instituição (para exibir ao clicar no mês)
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
            valoresPorMesPorInst[m] = {
              fieam: f, sesi: s, senai: sn, iel: il,
              'total geral': formatarAcumulado(nums.reduce((a, b) => a + b, 0)),
            };
          }
          linhaBase.valoresPorMesPorInst = valoresPorMesPorInst;

          return { ...linhaBase, atividade: indicador.atividade };
        });

        const somaPorMesAtividades: number[] = MES_KEYS.map((_, idx) =>
          outrasRows.reduce((acc: number, row: any) => {
            if (!row.atividade) return acc;
            const val = row[MES_KEYS[idx]];
            if (val !== "-" && val !== undefined) {
              const numero = parseFloat(val.replace(/\./g, "").replace(",", "."));
              if (!isNaN(numero)) return acc + numero;
            }
            return acc;
          }, 0)
        );

        const somaAtividadesTotal = somaPorMesAtividades.reduce((a, b) => a + b, 0);

        const linhaSomaAtividades: any = {
          indicadores: "Total de ações executadas no mês",
          acumulado: { fieam: "-", sesi: "-", senai: "-", iel: "-", "total geral": "-" }
        };
        MES_KEYS.forEach((k, i) => {
          linhaSomaAtividades[k] = somaPorMesAtividades[i] > 0 ? somaPorMesAtividades[i].toLocaleString("pt-BR") : "-";
        });
        linhaSomaAtividades.acumulado.fieam = somaAtividadesTotal > 0 ? somaAtividadesTotal.toLocaleString("pt-BR") : "-";
        linhaSomaAtividades.acumulado["total geral"] = linhaSomaAtividades.acumulado.fieam;

        const horasPorMesDecimal: number[] = horasPorMesDecimalExterno;
        const mediaPorMes: string[] = somaPorMesAtividades.map((soma, idx) => {
          const horasDec = horasPorMesDecimal[idx];
          if (horasDec <= 0 || soma <= 0) return "-";
          return decimalParaHoraMin(horasDec / soma);
        });

        const tempoMedioDecimalAcumulado = somaAtividadesTotal > 0
          ? somaHorasTotalDecimal / somaAtividadesTotal : 0;
        const tempoMedioHhmmAcumulado = tempoMedioDecimalAcumulado > 0
          ? decimalParaHhmm(tempoMedioDecimalAcumulado) : "-";

        const linhaMediaHoras: any = {
          indicadores: "Tempo médio por ação executada",
          acumulado: { fieam: tempoMedioHhmmAcumulado, sesi: "-", senai: "-", iel: "-", "total geral": tempoMedioHhmmAcumulado }
        };
        MES_KEYS.forEach((k, i) => { linhaMediaHoras[k] = mediaPorMes[i]; });

        let orderedRows = outrasRows;
        if (canonicalNames.length === 0) {
          setCanonicalNames(outrasRows.map((r: any) => r.indicadores));
        } else {
          const byName = new Map(outrasRows.map((r: any) => [r.indicadores, r]));
          orderedRows = canonicalNames.filter((nome) => byName.has(nome)).map((nome) => byName.get(nome));
          outrasRows.forEach((r: any) => { if (!canonicalNames.includes(r.indicadores)) orderedRows.push(r); });
        }

        linhaProfissionais._hidden = true;
        linhaHoras._hidden = true;
        linhaSomaAtividades._hidden = true;
        linhaMediaHoras._hidden = true;

        const baseRows: any[] = [linhaProfissionais, linhaHoras, linhaSomaAtividades, linhaMediaHoras, ...orderedRows];

        const propostasRes = await api.get(`/propostas?ano=${selectedYear}`, { headers: { Authorization: `Bearer ${token}` } });
        const propostasData = propostasRes.data;

        const montarLinhaCrm = (arrayDeMeses: { Mes: number; Total: number }[], label: string, formatarComoMoeda: boolean) => {
          const linha: any = {
            indicadores: label,
            descricao: DESCRICOES_CRM[label] || '',
            acumulado: { fieam: "-", sesi: "-", senai: "-", iel: "-", "total geral": "-" }
          };
          MES_KEYS.forEach((k) => { linha[k] = "-"; });
          arrayDeMeses.forEach(({ Mes, Total }) => {
            const idx = Mes - 1;
            if (idx >= 0 && idx < 12) {
              linha[MES_KEYS[idx]] = formatarComoMoeda
                ? Total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                : Total.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
            }
          });
          const somaAcumulado = arrayDeMeses.reduce((acc, { Total }) => acc + Total, 0);
          if (somaAcumulado > 0) {
            const fmt = formatarComoMoeda
              ? somaAcumulado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
              : somaAcumulado.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
            linha.acumulado.fieam = fmt;
            linha.acumulado["total geral"] = fmt;
          }
          return linha;
        };

        const crmRows: any[] = [];
        if (propostasData.totalPropostas)          crmRows.push(montarLinhaCrm(propostasData.totalPropostas, "Total de Proposta Qtd.", false));
        if (propostasData.totalValorPropostas)     crmRows.push(montarLinhaCrm(propostasData.totalValorPropostas, "Propostas Geradas R$", true));
        if (propostasData.totalPropostasGanhas)    crmRows.push(montarLinhaCrm(propostasData.totalPropostasGanhas, "Total de Propostas Ganhas", false));
        if (propostasData.totalValorPropostasGanhas) crmRows.push(montarLinhaCrm(propostasData.totalValorPropostasGanhas, "Valor Total de Propostas Ganhas", true));
        if (propostasData.totalPropostasAtivas)    crmRows.push(montarLinhaCrm(propostasData.totalPropostasAtivas, "Total de Propostas Ativas", false));
        if (propostasData.totalValorPropostasAtivas) crmRows.push(montarLinhaCrm(propostasData.totalValorPropostasAtivas, "Valor Total de Propostas Ativas", true));

        setRows([...baseRows, ...crmRows]);
      } catch (err) {
        console.error("Erro ao buscar indicadores ou propostas:", err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchIndicadores();
  }, [selectedYear, resolvedSetorId]);

  const handleAbrirComparacao = async (a1 = anoComp1, a2 = anoComp2) => {
    if (!resolvedSetorId) return;
    setLoadingComp(true);
    try {
      const fetchAno = async (ano: string): Promise<Record<string, { total: number; moeda: boolean; porMes: Record<number,number> }>> => {
        const result: Record<string, { total: number; moeda: boolean; porMes: Record<number,number> }> = {};
        try {
          const res = await api.get(`itens/valor/${resolvedSetorId}/?ano=${ano}`, { headers: { Authorization: `Bearer ${token}` } });
          (res.data.indicadores as any[]).forEach((ind: any) => {
            if (ind.oculto) return;
            const porMes: Record<number,number> = {};
            for (let m = 1; m <= 12; m++) {
              porMes[m] = ind.valores.filter((v: any) => v.mes === m).reduce((acc: number, v: any) => acc + (parseFloat(v.valor) || 0), 0);
            }
            result[ind.nome] = { total: Object.values(porMes).reduce((a,b) => a+b, 0), moeda: ind.moeda ?? false, porMes };
          });
        } catch { /* ignora */ }
        try {
          const res = await api.get(`/propostas?ano=${ano}`, { headers: { Authorization: `Bearer ${token}` } });
          const d = res.data;
          const toPorMes = (arr: { Mes: number; Total: number }[]): Record<number,number> => {
            const pm: Record<number,number> = {};
            for (let m = 1; m <= 12; m++) pm[m] = 0;
            (arr || []).forEach(({ Mes, Total }) => { pm[Mes] = Total; });
            return pm;
          };
          const add = (nome: string, arr: { Mes: number; Total: number }[], moeda: boolean) => {
            const porMes = toPorMes(arr);
            result[nome] = { total: Object.values(porMes).reduce((a,b) => a+b, 0), moeda, porMes };
          };
          add("Total de Proposta Qtd.",          d.totalPropostas || [],           false);
          add("Propostas Geradas R$",             d.totalValorPropostas || [],      true);
          add("Total de Propostas Ganhas",        d.totalPropostasGanhas || [],     false);
          add("Valor Total de Propostas Ganhas",  d.totalValorPropostasGanhas || [], true);
          add("Total de Propostas Ativas",        d.totalPropostasAtivas || [],     false);
          add("Valor Total de Propostas Ativas",  d.totalValorPropostasAtivas || [], true);
        } catch { /* ignora */ }
        return result;
      };
      const [d1, d2] = await Promise.all([fetchAno(a1), fetchAno(a2)]);
      const nomes = [...new Set([...Object.keys(d1), ...Object.keys(d2)])];
      const lista = nomes.map(nome => ({
        nome,
        v1: d1[nome]?.total ?? 0,
        v2: d2[nome]?.total ?? 0,
        moeda: d1[nome]?.moeda || d2[nome]?.moeda || false,
        porMes1: d1[nome]?.porMes ?? {},
        porMes2: d2[nome]?.porMes ?? {},
      }));
      setDadosComp(lista);
      if (!indComp && lista.length > 0) setIndComp(lista[0].nome);
    } finally {
      setLoadingComp(false);
    }
  };

  const isMobile = useMediaQuery("(max-width:768px)");
  const handlePrint = () => { window.print(); };

  const visibleRows = rows.filter((row) => !row._hidden);

  const mesesComDados = MES_KEYS.filter((key) =>
    visibleRows.some((row) => row[key] !== "-" && row[key] !== undefined && row[key] !== "")
  );

  const MES_LABELS: Record<string, string> = {
    jan: "JAN", fev: "FEV", mar: "MAR", abr: "ABR", mai: "MAI", jun: "JUN",
    jul: "JUL", ago: "AGO", set: "SET", out: "OUT", nov: "NOV", dez: "DEZ",
  };

  return (
    <Box sx={{ p: isMobile ? 2 : 3, width: "100%", boxSizing: "border-box" }}>
      {/* Cabeçalho */}
      <Box sx={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: "flex-start", gap: isMobile ? 2 : 0, mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#1976d2", textTransform: "uppercase", letterSpacing: 1.5, mb: 0.5 }}>
            Setor
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#1a2744", fontSize: isMobile ? 22 : undefined }}>
            Comercial
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
            "& .MuiTab-root": { textTransform: "none", fontWeight: 600, borderRadius: 2, minHeight: 36, px: 2.5, py: 0.5, color: "#6b7280", fontSize: 14 },
            "& .Mui-selected": { backgroundColor: "#1976d2", color: "white !important", borderRadius: 2 },
          }}
        >
          {yearTabs.map((y) => (
            <Tab key={y} value={y} label={y} />
          ))}
        </Tabs>
      </Box>

      {/* Tabela */}
      <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid #e3eaf4", overflow: "hidden" }}>
        <TableContainer sx={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>
          <Table sx={{ minWidth: isMobile ? 780 : 1300 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  rowSpan={2}
                  sx={{
                    fontWeight: 700, backgroundColor: "#ffffff",
                    width: isMobile ? 130 : 220, minWidth: isMobile ? 110 : 180,
                    py: 1.5, px: isMobile ? 1 : 2,
                    fontSize: isMobile ? 12 : 14, color: "#1a2744",
                    borderBottom: "1px solid #e3eaf4",
                    position: "sticky", left: 0, zIndex: 4,
                    boxShadow: "2px 0 4px rgba(0,0,0,0.06)",
                  }}
                >
                  Indicadores
                </TableCell>
                {mesesComDados.map((key) => {
                  const mesNum = MES_KEYS.indexOf(key) + 1;
                  const isSelected = mesSelecionado === mesNum;
                  return (
                    <TableCell key={key} rowSpan={2} align="center"
                      onClick={() => setMesSelecionado(isSelected ? null : mesNum)}
                      sx={{
                        fontWeight: isSelected ? 800 : 600,
                        backgroundColor: isSelected ? "#e3f2fd" : "#ffffff",
                        fontSize: isMobile ? 11 : 13, py: 1.5, minWidth: isMobile ? 44 : 58,
                        color: isSelected ? "#1976d2" : "#6b7280",
                        borderBottom: isSelected ? "2px solid #1976d2" : "1px solid #e3eaf4",
                        cursor: "pointer", userSelect: "none",
                        "&:hover": { backgroundColor: "#f0f7ff", color: "#1976d2" },
                      }}
                    >
                      {MES_LABELS[key]}
                    </TableCell>
                  );
                })}
                {!isMobile && (
                  <TableCell colSpan={5} align="center"
                    sx={{ fontWeight: 700, backgroundColor: "#1976d2", color: "white", py: 1.2, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}
                  >
                    {mesSelecionado ? MES_LABELS[MES_KEYS[mesSelecionado - 1]] : "Acumulado"}
                  </TableCell>
                )}
              </TableRow>
              <TableRow>
                {!isMobile && ["FIEAM","SESI","SENAI","IEL","TOTAL · MÉDIA"].map((name) => (
                  <TableCell key={name} align="center"
                    sx={{ fontWeight: 700, backgroundColor: "#1976d2", color: "white", py: 1, fontSize: 13, minWidth: 80, borderBottom: "none" }}
                  >
                    {name}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={1 + mesesComDados.length + (isMobile ? 0 : 5)} align="center" sx={{ py: 4, color: "#6b7280" }}>
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={1 + mesesComDados.length + (isMobile ? 0 : 5)} align="center" sx={{ py: 4, color: "#6b7280" }}>
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
                        "& .MuiTableCell-root": { py: isMobile ? 0.75 : 1, px: isMobile ? 0.5 : 1.5, fontSize: isMobile ? 12 : 14, borderBottom: "1px solid #f0f4f8" },
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600, color: "#1a2744", position: "sticky", left: 0, zIndex: 1, backgroundColor: rowBg, boxShadow: "2px 0 4px rgba(0,0,0,0.04)", fontSize: isMobile ? 11 : undefined, lineHeight: isMobile ? 1.3 : undefined }}>
                        {row.descricao ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <span>{row.indicadores}</span>
                            <Tooltip title={row.descricao} arrow placement="right">
                              <HelpOutlineIcon sx={{ fontSize: 15, color: '#9ca3af', cursor: 'help', flexShrink: 0, '&:hover': { color: '#1976d2' } }} />
                            </Tooltip>
                          </Box>
                        ) : row.indicadores}
                      </TableCell>

                      {mesesComDados.map((key) => (
                        <TableCell align="center" key={key} sx={{ color: "#374151" }}>
                          {row[key] !== undefined ? row[key] : "-"}
                        </TableCell>
                      ))}

                      {!isMobile && ["fieam","sesi","senai","iel","total geral"].map((key, i) => {
                        let cellValue: string;
                        if (mesSelecionado && row.valoresPorMesPorInst) {
                          cellValue = row.valoresPorMesPorInst[mesSelecionado]?.[key] ?? "-";
                        } else if (mesSelecionado && !row.valoresPorMesPorInst) {
                          // CRM rows: show monthly total in FIEAM/TOTAL columns, "-" for others
                          const mesKey = MES_KEYS[mesSelecionado - 1];
                          const mesVal = row[mesKey];
                          cellValue = (key === "fieam" || key === "total geral") ? (mesVal ?? "-") : "-";
                        } else {
                          cellValue = row.acumulado?.[key] ?? "-";
                        }
                        return (
                          <TableCell align="center" key={key} sx={{ fontWeight: 600, color: i === 4 ? "#1976d2" : "#374151" }}>
                            {cellValue}
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
          Comparativo — Comercial
          <IconButton onClick={() => setShowComp(false)} sx={{ position: "absolute", right: 12, top: 12, color: "#6b7280" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
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
                  {indSel && (
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

export default Comercial;
