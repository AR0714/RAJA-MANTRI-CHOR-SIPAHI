import { useEffect, useState } from 'react';
import { useAudio } from '../../../hooks/useAudio';
import { useSocket } from '../../../hooks/useSocket';
import { useGameStore } from '../../../store/gameStore';
import { ROLE_META } from '../../../utils/roles';
import { Button } from '../../ui/Button';
import { RevealHero } from './RevealHero';

export function RajaRevealScreen() {
  const playerId = useGameStore((s) => s.playerId);
  const rajaId = useGameStore((s) => s.rajaId);
  const players = useGameStore((s) => s.players);
  const { rajaCallsSipahi } = useSocket();
  const { playReveal } = useAudio();
  const [hasCalled, setHasCalled] = useState(false);

  const raja = players.find((p) => p.id === rajaId);
  const isRaja = rajaId !== null && rajaId === playerId;
  const glow = ROLE_META.raja.hex;

  useEffect(() => {
    if (rajaId) playReveal();
  }, [rajaId, playReveal]);

  if (isRaja) {
    return (
      <RevealHero
        emoji="👑"
        mode="celebrate"
        glowColor={glow}
        eyebrow="Everyone now knows"
        title={
          <>
            You are the <span className="text-role-raja">Raja</span>! 👑
          </>
        }
        subtitle="+1000 points are yours this round. Now summon your Sipahi to catch the thief."
      >
        <Button
          onClick={() => {
            setHasCalled(true);
            rajaCallsSipahi();
          }}
          isLoading={hasCalled}
          className="px-8 py-4 font-cinzel text-lg sm:text-xl"
        >
          Mera Sipahi Kaun Hai?
        </Button>
      </RevealHero>
    );
  }

  if (!raja) {
    return (
      <RevealHero
        emoji="👑"
        mode="pulse"
        glowColor={glow}
        title="Raja is revealing themselves..."
        subtitle="The King is about to step forward."
      />
    );
  }

  return (
    <RevealHero
      emoji="👑"
      mode="celebrate"
      glowColor={glow}
      eyebrow="The King has spoken"
      title={
        <>
          <span className="text-role-raja">{raja.name}</span> is the Raja! 👑
        </>
      }
      subtitle={
        raja.isConnected
          ? `Waiting for ${raja.name} to ask “Mera Sipahi Kaun Hai?”`
          : `${raja.name} is offline — calling the Sipahi automatically…`
      }
    />
  );
}
