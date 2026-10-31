import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  Users,
  Eye,
  Lock,
  Volume2,
  MapPin,
  Shield,
  HelpCircle,
} from 'lucide-react';
import type { StoryGraphState, CharacterEpistemicState } from '../types.ts';

interface WorldAndCharactersViewProps {
  graphState: StoryGraphState | null;
}

export const WorldAndCharactersView: React.FC<WorldAndCharactersViewProps> = ({ graphState }) => {
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);

  if (!graphState) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500 bg-[#0f0f10] text-[#f4f4f5]">
        <Globe className="size-12 mb-3 text-white" />
        <h3 className="text-sm font-semibold text-zinc-300">No World & Cast Manifest Generated Yet</h3>
        <p className="text-xs max-w-sm mt-1 text-zinc-500">
          Launch story generation to construct the fictional universe, sensory locations, and epistemically isolated cast.
        </p>
      </div>
    );
  }

  const characters = Object.values(graphState.characters);
  const locations = Object.values(graphState.locations);
  const facts = graphState.worldFacts;
  const activeChar = selectedCharId
    ? graphState.characters[selectedCharId]
    : characters[0];
  const activeEpistemic: CharacterEpistemicState | undefined = activeChar
    ? graphState.epistemicStates[activeChar.id]
    : undefined;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full p-6 select-none bg-[#0f0f10] text-[#f4f4f5]">
      {/* World Rules & Constraints */}
      <Card className="p-5 bg-[#141416] border-[#232328] flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#232328] pb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
            <Shield className="size-4 text-white" />
            Fictional Universe Laws & Canonical Rules
          </h3>
          <Badge variant="outline" className="text-[10px] text-zinc-400 font-mono border-[#232328]">
            {facts.length} Immutable Rules
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {facts.map((fact) => (
            <div
              key={fact.id}
              className="p-2.5 rounded bg-[#18181b] border border-[#232328] text-xs flex flex-col gap-1"
            >
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-[9px] uppercase px-1.5 py-0 font-mono bg-[#141416] text-zinc-300">
                  {fact.category}
                </Badge>
                {fact.isImmutable && (
                  <span className="text-[10px] text-white font-mono">Immutable</span>
                )}
              </div>
              <p className="text-zinc-300 mt-0.5">{fact.statement}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Locations */}
      <Card className="p-5 bg-[#141416] border-[#232328] flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#232328] pb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
            <MapPin className="size-4 text-white" />
            Sensory Locations & Environments
          </h3>
          <Badge variant="outline" className="text-[10px] text-zinc-400 font-mono border-[#232328]">
            {locations.length} Locations
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="p-3 rounded-lg bg-[#18181b] border border-[#232328] text-xs flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-white">{loc.name}</h4>
                <Badge variant="outline" className="text-[10px] text-zinc-400 border-[#232328]">
                  {loc.environmentType}
                </Badge>
              </div>
              <p className="text-zinc-400">{loc.description}</p>
              <div className="pt-2 border-t border-[#232328] flex flex-col gap-1 text-[11px] text-zinc-400">
                <span>
                  <strong className="text-zinc-300">Sights:</strong> {loc.sensoryDetails.sights.join(', ')}
                </span>
                <span>
                  <strong className="text-zinc-300">Sounds:</strong> {loc.sensoryDetails.sounds.join(', ')}
                </span>
                <span>
                  <strong className="text-zinc-300">Atmosphere:</strong>{' '}
                  {loc.sensoryDetails.smellsOrAtmosphere.join(', ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Characters & Epistemic Isolation Inspector */}
      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          <Users className="size-4 text-white" />
          Cast of Characters & Epistemic Boundaries
        </h3>

        {/* Character Selector Pills */}
        <div className="flex flex-wrap gap-2">
          {characters.map((char) => {
            const isSelected = (activeChar?.id || '') === char.id;
            return (
              <button
                key={char.id}
                type="button"
                onClick={() => setSelectedCharId(char.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'border-white/40 bg-white text-black font-semibold'
                    : 'border-[#232328] bg-[#141416] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>{char.name}</span>
                <Badge variant="secondary" className={`text-[10px] uppercase font-mono px-1 py-0 ${isSelected ? 'bg-zinc-200 text-black' : 'bg-[#1c1c1f] text-zinc-400'}`}>
                  {char.role}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* Active Character Profile Details */}
        {activeChar && (
          <Card className="p-6 bg-[#141416] border-[#232328] flex flex-col gap-5">
            <div className="flex items-start justify-between border-b border-[#232328] pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-bold text-white">{activeChar.name}</h3>
                  <Badge className="bg-white/10 text-white border-white/20 text-xs">
                    {activeChar.role}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400 mt-1">{activeChar.backstorySummary}</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">
                  CosyVoice Voice ID
                </span>
                <span className="text-xs text-zinc-300 font-mono flex items-center gap-1 justify-end">
                  <Volume2 className="size-3 text-white" />
                  {activeChar.id} (CosyVoice 3)
                </span>
              </div>
            </div>

            {/* Psychological Traits Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
              <div className="bg-[#18181b] p-3 rounded border border-[#232328]">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Primary Motivation</span>
                <p className="text-zinc-200 mt-1">{activeChar.personality.primaryMotivation}</p>
              </div>
              <div className="bg-[#18181b] p-3 rounded border border-[#232328]">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase block">Core Flaw</span>
                <p className="text-zinc-200 mt-1">{activeChar.personality.coreFlaw}</p>
              </div>
              <div className="bg-[#18181b] p-3 rounded border border-[#232328]">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Cadence & Voice</span>
                <p className="text-zinc-200 mt-1">{activeChar.dialogueStyle.speechCadence}</p>
              </div>
              <div className="bg-[#18181b] p-3 rounded border border-[#232328]">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Subtext Tendency</span>
                <p className="text-zinc-200 mt-1">{activeChar.dialogueStyle.subtextTendency}</p>
              </div>
            </div>

            {/* Epistemic Isolation Inspector */}
            {activeEpistemic && (
              <div className="flex flex-col gap-3 pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <Eye className="size-3.5 text-white" />
                  Epistemic Knowledge State (Strictly Isolated)
                </h4>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* Known Facts */}
                  <div className="p-3 rounded-lg bg-[#18181b] border border-[#232328] text-xs flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Eye className="size-3 text-white" /> Verified Known Facts
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-zinc-300 text-[11.5px]">
                      {activeEpistemic.knownFacts.map((fact, i) => (
                        <li key={i}>{fact}</li>
                      ))}
                    </ul>
                  </div>

                  {/* False Beliefs */}
                  <div className="p-3 rounded-lg bg-[#18181b] border border-[#232328] text-xs flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle className="size-3 text-white" /> False Beliefs / Distortions
                    </span>
                    {activeEpistemic.falseBeliefs.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 text-zinc-300 text-[11.5px]">
                        {activeEpistemic.falseBeliefs.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-zinc-500 text-[11.5px] italic">No false beliefs held.</span>
                    )}
                  </div>

                  {/* Concealed Secrets */}
                  <div className="p-3 rounded-lg bg-[#18181b] border border-[#232328] text-xs flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="size-3 text-white" /> Actively Concealed Secrets
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-zinc-300 text-[11.5px]">
                      {activeEpistemic.hiddenSecrets.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};
