import { useEffect, useState } from 'react';
import { useAudio } from '../../../hooks/useAudio';
import { useSocket } from '../../../hooks/useSocket';
import { useGameStore } from '../../../store/gameStore';
import { ROLE_META } from '../../../utils/roles';
import { Button } from '../../ui/Button';
import { RevealHero } from './RevealHero';

export function SipahiRevealScreen() {
  const playerId = useGameStore((s) => s.playerId);
  const myRole = useGameStore((s) => s.myRole);
  const rajaId = useGameStore((s) => s.rajaId);
  const sipahiId = useGameStore((s) => s.sipahiId);
  const players = useGameStore((s) => s.players);
  const { sipahiReveal } = useSocket();
  const { playReveal } = useAudio();
  const [hasRevealed, setHasRevealed] = useState(false);

  const rajaName = players.find((p) => p.id === rajaId)?.name ?? 'The Raja';
  const sipahi = players.find((p) => p.id === sipahiId);
  const glow = ROLE_META.sipahi.hex;

  useEffect(() => {
    if (sipahiId) playReveal();
  }, [sipahiId, playReveal]);

  // Revealed: everyone sees who the Sipahi is while the server readies the guess.
  if (sipahi) {
    const isMe = sipahi.id === playerId;
    return (
      <RevealHero
        emoji="⚔️"
        mode="celebrate"
        glowColor={glow}
        eyebrow="The Soldier steps forward"
        title={
          <>
            <span className="text-role-sipahi">{isMe ? 'You are' : `${sipahi.name} is`}</span> the Sipahi! ⚔️
          </>
        }
        subtitle={isMe ? 'Get ready to find the Chor…' : `${sipahi.name} is about to hunt for the Chor…`}
      />
    );
  }

  if (myRole === 'sipahi') {
    return (
      <RevealHero
        emoji="⚔️"
        mode="celebrate"
        glowColor={glow}
        eyebrow={`${rajaName} asks: “Mera Sipahi Kaun Hai?”`}
        title={
          <>
            You are the <span className="text-role-sipahi">Sipahi</span>! ⚔️
          </>
        }
        subtitle="Step forward, then catch the Chor to win 800 points."
      >
        <Button
          variant="green"
          onClick={() => {
            setHasRevealed(true);
            sipahiReveal();
          }}
          isLoading={hasRevealed}
          className="px-8 py-4 font-cinzel text-lg sm:text-xl"
        >
          Main Sipahi Hoon!
        </Button>
      </RevealHero>
    );
  }

  return (
    <RevealHero
      emoji="⚔️"
      mode="pulse"
      glowColor={glow}
      eyebrow={`${rajaName} asks: “Mera Sipahi Kaun Hai?”`}
      title="Sipahi is stepping forward..."
      subtitle={myRole === 'raja' ? 'Your Sipahi will answer the call.' : 'Keep a straight face…'}
    />
  );
}
