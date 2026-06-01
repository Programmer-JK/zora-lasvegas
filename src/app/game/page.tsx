'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  GameState,
  PlayerColor,
} from '@/lib/types';
import {
  createInitialState,
  rollDice,
  chooseCasino,
  scoreRound,
  getColorClasses,
} from '@/lib/gameLogic';
import Dice from '@/components/Dice';
import CasinoCard from '@/components/CasinoCard';
import PlayerPanel from '@/components/PlayerPanel';
import DiceRollModal from '@/components/DiceRollModal';
import RoundStartModal from '@/components/RoundStartModal';

function GameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showRoundStart, setShowRoundStart] = useState(true);
  const [showRollModal, setShowRollModal] = useState(false);
  const [showScoringModal, setShowScoringModal] = useState(false);

  useEffect(() => {
    const setupParam = searchParams.get('setup');
    if (!setupParam) {
      router.replace('/');
      return;
    }
    try {
      const setup: { name: string; color: PlayerColor }[] = JSON.parse(setupParam);
      setGameState(createInitialState(setup));
    } catch {
      router.replace('/');
    }
  }, [searchParams, router]);

  const handleRoll = useCallback(() => {
    if (!gameState || gameState.phase !== 'rolling') return;
    const next = rollDice(gameState);
    setGameState(next);
    setShowRollModal(true);
  }, [gameState]);

  const handleChoose = useCallback(
    (casinoId: number) => {
      if (!gameState || gameState.phase !== 'choosing') return;
      const next = chooseCasino(gameState, casinoId);
      setGameState(next);
      if (next.phase === 'scoring') {
        setShowScoringModal(true);
      }
    },
    [gameState]
  );

  const handleScoring = useCallback(() => {
    if (!gameState) return;
    const next = scoreRound(gameState);
    setGameState(next);
    setShowScoringModal(false);
    if (next.phase !== 'gameOver') {
      setShowRoundStart(true);
    }
  }, [gameState]);

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a]">
        <div className="text-amber-400 text-xl animate-pulse">로딩 중...</div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const cc = getColorClasses(currentPlayer.color);

  // Group rolled colored dice by value
  const diceGroups = gameState.rolledDice.reduce<Record<number, number>>((acc, v) => {
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {});
  // Group rolled white dice by value
  const whiteDiceGroups = gameState.rolledWhiteDice.reduce<Record<number, number>>((acc, v) => {
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {});

  if (gameState.phase === 'gameOver') {
    const sorted = [...gameState.players].sort((a, b) => b.totalMoney - a.totalMoney);
    const winner = sorted[0];
    const wcc = getColorClasses(winner.color);
    const RANK_MEDALS = ['🥇', '🥈', '🥉'];

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#0f0f1a] via-[#1a1020] to-[#0a0a14] px-4 py-10 relative overflow-hidden">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none ${wcc.bg}`} />

        <div className="text-center mb-8 relative z-10 float">
          <div className="text-7xl mb-3">🏆</div>
          <h1 className="text-5xl font-black gold-text tracking-wider mb-1">게임 종료!</h1>
          <p className="text-white/30 text-xs tracking-widest uppercase">Final Results</p>
        </div>

        <div className="relative w-full max-w-sm mb-5 z-10">
          <div className={`absolute -inset-1 rounded-3xl blur-lg opacity-40 ${wcc.bg}`} />
          <div className={`relative rounded-3xl p-5 border-2 ${wcc.border} bg-black/60 backdrop-blur-sm`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl ${wcc.bg} flex items-center justify-center text-2xl font-black text-white shadow-lg flex-shrink-0`}>
                1위
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/40 text-xs uppercase tracking-widest mb-0.5">Winner</p>
                <p className={`text-xl font-black truncate ${wcc.text}`}>{winner.name}</p>
                <p className="text-amber-400 font-bold text-base">{(winner.totalMoney / 10000).toFixed(0)}만원</p>
              </div>
              <span className="text-4xl">🥇</span>
            </div>
          </div>
        </div>

        {sorted.length > 1 && (
          <div className="w-full max-w-sm space-y-2 z-10 mb-8">
            {sorted.slice(1).map((p, i) => {
              const pcc = getColorClasses(p.color);
              const rank = i + 2;
              return (
                <div key={p.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <span className="text-xl w-7 text-center">{RANK_MEDALS[rank - 1] ?? `${rank}`}</span>
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${pcc.bg}`} />
                  <span className="flex-1 font-bold text-white/70 truncate">{p.name}</span>
                  <span className={`font-black text-sm ${pcc.text}`}>{(p.totalMoney / 10000).toFixed(0)}만원</span>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={() => router.push('/')}
          className="z-10 px-10 py-4 rounded-2xl font-black text-base tracking-widest uppercase bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/30 pulse-glow"
        >
          다시 하기 🎲
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1a] via-[#131020] to-[#0a0a14] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button
          onClick={() => router.push('/')}
          className="text-white/40 hover:text-white text-sm transition-colors"
        >
          ← 나가기
        </button>
        <div className="text-center">
          <h1 className="gold-text font-black text-lg tracking-widest">LAS VEGAS</h1>
          <p className="text-white/40 text-xs">라운드 {gameState.round} / {gameState.totalRounds}</p>
        </div>
        <div className="w-16" />
      </header>

      {/* Player Panel */}
      <div className="px-4 py-3 border-b border-white/10">
        <PlayerPanel
          players={gameState.players}
          currentPlayerId={currentPlayer.id}
        />
      </div>

      {/* Casinos Grid */}
      <div className="flex-1 px-3 py-4">
        <div className="grid grid-cols-3 gap-5 max-w-2xl mx-auto">
          {gameState.casinos.map((casino) => (
            <CasinoCard
              key={casino.id}
              casino={casino}
              players={gameState.players}
              isSelectable={
                gameState.phase === 'choosing' &&
                !showRollModal &&
                gameState.availableChoices.includes(casino.id)
              }
              isHighlighted={
                gameState.phase === 'choosing' &&
                !showRollModal &&
                gameState.availableChoices.includes(casino.id)
              }
              onSelect={() => handleChoose(casino.id)}
            />
          ))}
        </div>
      </div>

      {/* Bottom Action Area */}
      <div className="px-4 pb-6 pt-3 border-t border-white/10 bg-black/20">
        <p className="text-center text-white/50 text-xs mb-3 h-4">
          {gameState.lastAction}
        </p>

        {/* Grouped dice buttons (choosing phase, after modal closed) */}
        {gameState.phase === 'choosing' && !showRollModal && gameState.rolledDice.length > 0 && (
          <div className="mb-4">
            <p className="text-center text-white/40 text-xs mb-2">
              굴린 주사위 — 카지노 번호를 선택하세요
            </p>
            <div className="flex justify-center gap-2 flex-wrap">
              {Object.entries(diceGroups).map(([val, count]) => {
                const whiteCount = whiteDiceGroups[Number(val)] ?? 0;
                return (
                  <button
                    key={val}
                    onClick={() => handleChoose(Number(val))}
                    className={[
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-150',
                      gameState.availableChoices.includes(Number(val))
                        ? `${cc.light} ${cc.border} border hover:scale-105 active:scale-95`
                        : 'bg-white/5 border-white/10 opacity-40',
                    ].join(' ')}
                  >
                    <Dice value={Number(val)} color={currentPlayer.color} size="sm" />
                    <span className="text-black font-bold text-sm">×{count}</span>
                    {whiteCount > 0 && (
                      <>
                        <span className="text-white/40 text-xs">+</span>
                        <Dice value={Number(val)} color="white" size="sm" />
                        <span className="text-black text-sm">×{whiteCount}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Current player info + Roll button */}
        <div className="flex items-center gap-3 max-w-sm mx-auto">
          <div className={`flex-1 rounded-xl p-3 ${cc.light} border ${cc.border}`}>
            <p className={`text-xs font-bold ${cc.text}`}>{currentPlayer.name}의 턴</p>
            <p className="text-black text-xs">남은 주사위: {currentPlayer.diceCount}개</p>
          </div>

          {gameState.phase === 'rolling' && (
            <button
              onClick={handleRoll}
              disabled={currentPlayer.diceCount === 0}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-black bg-amber-400 hover:bg-amber-300 hover:scale-105 active:scale-95 pulse-glow transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <span className="text-xl">🎲</span>
              굴리기
            </button>
          )}
        </div>
      </div>

      {/* Round Start Modal */}
      {showRoundStart && (
        <RoundStartModal
          casinos={gameState.casinos}
          round={gameState.round}
          totalRounds={gameState.totalRounds}
          onStart={() => setShowRoundStart(false)}
        />
      )}

      {/* Dice Roll Modal */}
      {showRollModal && (
        <DiceRollModal
          dice={gameState.rolledDice}
          whiteDice={gameState.rolledWhiteDice}
          playerColor={currentPlayer.color}
          playerName={currentPlayer.name}
          onClose={() => setShowRollModal(false)}
        />
      )}

      {/* Scoring Modal */}
      {showScoringModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-amber-400/30 rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
            <div className="text-5xl mb-4">🏛️</div>
            <h2 className="text-2xl font-black gold-text mb-2">라운드 종료!</h2>
            <p className="text-white/60 text-sm mb-6">
              모든 플레이어의 주사위 배치가 완료되었습니다.
            </p>
            <div className="bg-white/5 rounded-2xl p-4 mb-6 text-left">
              <p className="text-amber-300 text-xs font-bold mb-2">이번 라운드 요약</p>
              {gameState.casinos.map((casino) => {
                if (casino.placedDice.length === 0) return null;
                const sorted = [...casino.placedDice].sort((a, b) => b.count - a.count);
                return (
                  <div key={casino.id} className="flex items-center gap-2 text-xs text-white/70 mb-1">
                    <span className="font-bold text-white">카지노 {casino.id}</span>
                    <span>—</span>
                    {sorted.map((pd) => {
                      const p = gameState.players.find((pl) => pl.id === pd.playerId);
                      const pcc = p ? getColorClasses(p.color) : null;
                      return (
                        <span key={pd.playerId} className={pcc?.text}>
                          {p?.name} {pd.count}개
                        </span>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleScoring}
              className="w-full py-3 rounded-2xl font-black text-black bg-amber-400 hover:bg-amber-300 transition-all hover:scale-105"
            >
              점수 계산하기 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a]">
        <div className="text-amber-400 text-xl animate-pulse">로딩 중...</div>
      </div>
    }>
      <GameContent />
    </Suspense>
  );
}
