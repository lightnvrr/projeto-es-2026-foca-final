import { PrismaClient } from '../generated/client';
import { StatusSessao } from '../generated/enums';
import {
  SESSAO_DURACAO_MAXIMA_SEG,
  SESSAO_MAX_DISCIPLINAS_DIA,
  SESSAO_MAX_POR_DISCIPLINA_DIA,
} from '../config/sessao';
import {
  LimiteDisciplinasDiaError,
  LimiteSessoesDisciplinaDiaError,
  SessaoNaoEncontradaError,
  SessaoStatusInvalidoError,
} from './sessaoService.errors';
import type {
  ListarOptions,
  ListarResult,
  ResultadoConcluir,
  ResultadoPausar,
  SessaoAtualizada,
  SessaoCriada,
} from './sessaoService.types';

function getDayWindow(date: Date): { startOfDay: Date; startOfNextDay: Date } {
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const startOfNextDay = new Date(startOfDay);
  startOfNextDay.setUTCDate(startOfNextDay.getUTCDate() + 1);
  return { startOfDay, startOfNextDay };
}

export class SessaoService {
  constructor(private readonly prisma: PrismaClient) {}

  async criarSessao(alunoId: number, disciplinaId: number): Promise<SessaoCriada> {
    const { startOfDay, startOfNextDay } = getDayWindow(new Date());
    const whereHoje = { gte: startOfDay, lt: startOfNextDay };

    const sessoesDisciplinaHoje = await this.prisma.sessaoEstudo.count({
      where: { aluno_id: alunoId, disciplina_id: disciplinaId, iniciada_em: whereHoje },
    });
    if (sessoesDisciplinaHoje >= SESSAO_MAX_POR_DISCIPLINA_DIA) {
      throw new LimiteSessoesDisciplinaDiaError();
    }

    const disciplinasDistintasHoje = await this.prisma.sessaoEstudo.findMany({
      where: { aluno_id: alunoId, iniciada_em: whereHoje },
      distinct: ['disciplina_id'],
      select: { disciplina_id: true },
    });

    const disciplinaJaEstudadaHoje = disciplinasDistintasHoje.some(
      (s) => s.disciplina_id === disciplinaId,
    );
    if (
      !disciplinaJaEstudadaHoje &&
      disciplinasDistintasHoje.length >= SESSAO_MAX_DISCIPLINAS_DIA
    ) {
      throw new LimiteDisciplinasDiaError();
    }

    return this.prisma.sessaoEstudo.create({
      data: { aluno_id: alunoId, disciplina_id: disciplinaId },
    });
  }

  async iniciarSessao(sessaoId: number, alunoId: number): Promise<SessaoAtualizada> {
    const sessao = await this.prisma.sessaoEstudo.findUnique({
      where: { id: sessaoId, aluno_id: alunoId },
    });
    if (!sessao) throw new SessaoNaoEncontradaError();

    const statusValidos: StatusSessao[] = [StatusSessao.CRIADA, StatusSessao.PAUSADA];
    if (!statusValidos.includes(sessao.status)) {
      throw new SessaoStatusInvalidoError();
    }

    return this.prisma.sessaoEstudo.update({
      where: { id: sessaoId },
      data: { status: StatusSessao.EM_ANDAMENTO },
    });
  }

  async pausarSessao(
    sessaoId: number,
    alunoId: number,
    tempoTotalSeg: number,
  ): Promise<ResultadoPausar> {
    const sessao = await this.prisma.sessaoEstudo.findUnique({
      where: { id: sessaoId, aluno_id: alunoId },
    });
    if (!sessao) throw new SessaoNaoEncontradaError();
    if (sessao.status !== StatusSessao.EM_ANDAMENTO) throw new SessaoStatusInvalidoError();

    if (tempoTotalSeg >= SESSAO_DURACAO_MAXIMA_SEG) {
      const sessaoAtualizada = await this.prisma.sessaoEstudo.update({
        where: { id: sessaoId },
        data: {
          tempo_total_seg: SESSAO_DURACAO_MAXIMA_SEG,
          status: StatusSessao.ENCERRADA_POR_LIMITE,
          concluida_em: new Date(),
        },
      });
      return { sessao: sessaoAtualizada, encerradaPorLimite: true };
    }

    const sessaoAtualizada = await this.prisma.sessaoEstudo.update({
      where: { id: sessaoId },
      data: { tempo_total_seg: tempoTotalSeg, status: StatusSessao.PAUSADA },
    });
    return { sessao: sessaoAtualizada, encerradaPorLimite: false };
  }

  async retomarSessao(sessaoId: number, alunoId: number): Promise<SessaoAtualizada> {
    const sessao = await this.prisma.sessaoEstudo.findUnique({
      where: { id: sessaoId, aluno_id: alunoId },
    });
    if (!sessao) throw new SessaoNaoEncontradaError();
    if (sessao.status !== StatusSessao.PAUSADA) throw new SessaoStatusInvalidoError();

    return this.prisma.sessaoEstudo.update({
      where: { id: sessaoId },
      data: { status: StatusSessao.EM_ANDAMENTO },
    });
  }

  async concluirSessao(
    sessaoId: number,
    alunoId: number,
    tempoTotalSeg: number,
  ): Promise<ResultadoConcluir> {
    const sessao = await this.prisma.sessaoEstudo.findUnique({
      where: { id: sessaoId, aluno_id: alunoId },
    });
    if (!sessao) throw new SessaoNaoEncontradaError();

    const statusValidos: StatusSessao[] = [StatusSessao.EM_ANDAMENTO, StatusSessao.PAUSADA];
    if (!statusValidos.includes(sessao.status)) throw new SessaoStatusInvalidoError();

    const tempoFinal = Math.min(tempoTotalSeg, SESSAO_DURACAO_MAXIMA_SEG);
    const statusFinal =
      tempoTotalSeg >= SESSAO_DURACAO_MAXIMA_SEG
        ? StatusSessao.ENCERRADA_POR_LIMITE
        : StatusSessao.CONCLUIDA;

    const sessaoAtualizada = await this.prisma.sessaoEstudo.update({
      where: { id: sessaoId },
      data: { tempo_total_seg: tempoFinal, status: statusFinal, concluida_em: new Date() },
    });

    return { sessao: sessaoAtualizada, status: statusFinal };
  }

  async cancelarSessao(sessaoId: number, alunoId: number): Promise<void> {
    const sessao = await this.prisma.sessaoEstudo.findUnique({
      where: { id: sessaoId, aluno_id: alunoId },
    });
    if (!sessao) throw new SessaoNaoEncontradaError();

    const statusCancelaveis: StatusSessao[] = [
      StatusSessao.CRIADA,
      StatusSessao.EM_ANDAMENTO,
      StatusSessao.PAUSADA,
    ];
    if (!statusCancelaveis.includes(sessao.status)) {
      throw new SessaoStatusInvalidoError('Sessão já encerrada não pode ser cancelada');
    }

    await this.prisma.sessaoEstudo.delete({ where: { id: sessaoId } });
  }

  async listar(alunoId: number, options: ListarOptions = {}): Promise<ListarResult> {
    const { page = 1, limit = 20, status, date } = options;

    const iniciada_em = date
      ? (() => {
          const { startOfDay, startOfNextDay } = getDayWindow(date);
          return { gte: startOfDay, lt: startOfNextDay };
        })()
      : undefined;

    const where = {
      aluno_id: alunoId,
      ...(status ? { status } : {}),
      ...(iniciada_em ? { iniciada_em } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.sessaoEstudo.findMany({
        where,
        orderBy: { iniciada_em: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.sessaoEstudo.count({ where }),
    ]);

    return { data, pagination: { page, limit, total } };
  }
}
