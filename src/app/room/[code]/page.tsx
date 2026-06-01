'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PLAYER_COLORS } from '@/lib/types';
import { createInitialState, getColorClasses } from '@/lib/gameLogic';
import {
  Room,
  subscribeRoom,
  startGame,
  getClientId,
} from '@/lib/roomService';

const MIN_PLAYERS = 2;

export default function RoomPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [room, setRoom] = useState<Room | null>(null);
  const [clientId, setClientId] = useState('');
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    setClientId(getClientId());
  }, []);

  useEffect(() => {
    const unsub = subscribeRoom(code, (r) => {
      if (!r) { router.replace('/'); return; }
      setRoom(r);
      if (r.status === 'playing') {
        router.replace(`/game/${code}`);
      }
    });
    return unsub;
  }, [code, router]);

  const isHost = clientId !== '' && room?.hostClientId === clientId;
  const canStart = isHost && (room?.players.length ?? 0) >= MIN_PLAYERS;

  const handleStart = useCallback(async () => {
    if (!room || !canStart) return;
    setStarting(true);
    try {
      const setup = room.players.map((p) => ({
        name: p.name,
        color: p.color,
        clientId: p.clientId,
      }));
      const gameState = createInitialState(setup);
      await startGame(code, gameState);
      // Firebase 구독이 status 변경을 감지해서 자동 리다이렉트하지만,
      // 호스트는 먼저 직접 이동 (더 빠른 UX)
      router.replace(`/game/${code}`);
    } catch {
      setStarting(false);
    }
  }, [room, canStart, code, router]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a]">
        <div className="text-amber-400 text-xl animate-pulse">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#0f0f1a] via-[#1a1020] to-[#0a0a14] px-4 py-10">
      {/* Header */}
      <div className="text-center mb-8 float">
        <div className="text-5xl mb-3">🏨</div>
        <h1 className="text-3xl font-black gold-text tracking-widest mb-1">대기실</h1>
        <p className="text-white/40 text-xs tracking-widest uppercase">Waiting Room</p>
      </div>

      {/* Room Code */}
      <div className="w-full max-w-sm mb-6">
        <p className="text-amber-300 text-xs font-bold tracking-widest uppercase text-center mb-2">
          방 코드 — 친구에게 공유하세요
        </p>
        <button
          onClick={handleCopy}
          className="w-full bg-white/5 border border-white/20 rounded-2xl py-4 text-center group hover:border-amber-400/50 transition-all"
        >
          <span className="text-3xl font-black tracking-[0.4em] text-white">{code}</span>
          <p className="text-white/30 text-xs mt-1 group-hover:text-amber-400 transition-colors">
            {copied ? '✓ 복사됨!' : '탭하여 복사'}
          </p>
        </button>
      </div>

      {/* Players list */}
      <div className="w-full max-w-sm mb-6">
        <p className="text-white/40 text-xs font-bold tracking-widest uppercase mb-3">
          참가자 ({room.players.length}/6)
        </p>
        <div className="space-y-2">
          {room.players.map((player, i) => {
            const cc = getColorClasses(player.color);
            const colorInfo = PLAYER_COLORS.find((c) => c.color === player.color);
            const isMe = player.clientId === clientId;
            const isRoomHost = player.clientId === room.hostClientId;
            return (
              <div
                key={player.clientId}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
                  isMe
                    ? `${cc.light} ${cc.border} border-2`
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${cc.bg}`} />
                <span className={`font-bold text-sm flex-1 ${isMe ? cc.text : 'text-white/70'}`}>
                  {player.name}
                  {isMe && <span className="text-white/40 font-normal"> (나)</span>}
                </span>
                <div className="flex items-center gap-1.5">
                  {isRoomHost && (
                    <span className="text-amber-400 text-xs font-bold">HOST</span>
                  )}
                  <span className="text-white/30 text-xs">{colorInfo?.label}</span>
                  <span className={`text-lg ${isMe ? cc.text : 'text-white/40'}`}>{['⚀','⚁','⚂','⚃','⚄','⚅'][i]}</span>
                </div>
              </div>
            );
          })}

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, MIN_PLAYERS - room.players.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed border-white/10 text-white/20 text-sm"
            >
              <span className="w-3 h-3 rounded-full border border-white/20" />
              <span className="italic">대기 중...</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {isHost ? (
        <button
          onClick={handleStart}
          disabled={!canStart || starting}
          className="w-full max-w-sm py-4 rounded-2xl font-black text-lg tracking-widest uppercase bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/30 pulse-glow disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {starting ? '게임 시작 중...' : canStart ? '게임 시작 🎲' : `최소 ${MIN_PLAYERS}명 필요`}
        </button>
      ) : (
        <div className="w-full max-w-sm py-4 rounded-2xl bg-white/5 border border-white/10 text-center text-white/40 text-sm">
          호스트가 게임을 시작할 때까지 대기 중...
        </div>
      )}

      <button
        onClick={() => router.push('/')}
        className="mt-4 text-white/30 hover:text-white text-sm transition-colors"
      >
        ← 나가기
      </button>
    </div>
  );
}
