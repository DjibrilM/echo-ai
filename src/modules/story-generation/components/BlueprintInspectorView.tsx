import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  GitBranch,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Compass,
} from 'lucide-react';
import type { NarrativeBlueprint, SceneContract } from '../types.ts';

interface BlueprintInspectorViewProps {
  blueprint: NarrativeBlueprint | null;
}

export const BlueprintInspectorView: React.FC<BlueprintInspectorViewProps> = ({ blueprint }) => {
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null);

  if (!blueprint) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500 bg-[#0f0f10] text-[#f4f4f5]">
        <GitBranch className="size-12 mb-3 text-white" />
        <h3 className="text-sm font-semibold text-zinc-300">No Narrative Blueprint Generated Yet</h3>
        <p className="text-xs max-w-sm mt-1 text-zinc-500">
          Launch the narrative pipeline from the Studio tab to architect the full story blueprint and pass integrity review.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full p-6 select-none bg-[#0f0f10] text-[#f4f4f5]">
      {/* Title & Review Status Card */}
      <Card className="p-6 bg-[#141416] border-[#232328] flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{blueprint.title}</h2>
              <Badge className="bg-white/10 text-white border-white/20 text-xs gap-1">
                <ShieldCheck className="size-3.5 text-white" />
                Approved by Integrity Reviewer
              </Badge>
            </div>
            <p className="text-xs text-zinc-400 mt-1 italic font-serif">"{blueprint.logline}"</p>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-mono">
              Review Cycle
            </span>
            <span className="text-xs text-zinc-300 font-mono">
              Pass {blueprint.submissionCount} of 2 (Strict Limit)
            </span>
          </div>
        </div>

        {/* Narrative Arc Summary */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 bg-[#18181b] p-3.5 rounded-lg border border-[#232328] text-xs">
          <div>
            <span className="text-zinc-500 font-semibold block text-[10px] uppercase">Inciting Incident</span>
            <p className="text-zinc-300 mt-0.5 line-clamp-2">{blueprint.arc.incitingIncident}</p>
          </div>
          <div>
            <span className="text-zinc-500 font-semibold block text-[10px] uppercase">Central Conflict</span>
            <p className="text-zinc-300 mt-0.5 line-clamp-2">{blueprint.arc.mainConflict}</p>
          </div>
          <div>
            <span className="text-zinc-500 font-semibold block text-[10px] uppercase">Climax Destination</span>
            <p className="text-zinc-300 mt-0.5 line-clamp-2">{blueprint.arc.climax}</p>
          </div>
          <div>
            <span className="text-zinc-500 font-semibold block text-[10px] uppercase">Resolution</span>
            <p className="text-zinc-300 mt-0.5 line-clamp-2">{blueprint.arc.resolution}</p>
          </div>
        </div>
      </Card>

      {/* Acts & Scene Contracts Hierarchy */}
      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <GitBranch className="size-4 text-white" />
          Hierarchical Scene Contracts
        </h3>

        {blueprint.acts.map((act) => (
          <Card key={act.actNumber} className="p-5 bg-[#141416] border-[#232328] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#232328] pb-3">
              <div className="flex items-center gap-2.5">
                <Badge variant="outline" className="text-xs font-mono border-white/20 text-white bg-white/5">
                  Act {act.actNumber}
                </Badge>
                <h4 className="text-sm font-semibold text-white">{act.title}</h4>
              </div>
              <span className="text-xs text-zinc-500">{act.dramaticFunction}</span>
            </div>

            {/* Chapters and Scenes */}
            <div className="flex flex-col gap-3">
              {act.chapters.map((chap) => (
                <div key={chap.id} className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                    <span className="text-zinc-500 font-mono">Ch. {chap.chapterNumber}:</span>
                    <span>{chap.title}</span>
                  </div>

                  {/* Scenes List */}
                  <div className="flex flex-col gap-2 pl-4 border-l border-white/10">
                    {chap.scenes.map((scene: SceneContract) => {
                      const isExpanded = expandedSceneId === scene.id;
                      return (
                        <div
                          key={scene.id}
                          className="rounded-lg border border-[#232328] bg-[#18181b] p-3 transition-colors hover:border-zinc-700"
                        >
                          <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => setExpandedSceneId(isExpanded ? null : scene.id)}
                          >
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="size-4 text-white" />
                              ) : (
                                <ChevronRight className="size-4 text-white" />
                              )}
                              <span className="text-xs font-semibold text-zinc-200">
                                Scene {scene.sceneIndex + 1}: {scene.title}
                              </span>
                              <Badge variant="outline" className="text-[10px] text-zinc-400 border-[#232328]">
                                {scene.targetWordCount} words
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                              <span className="flex items-center gap-1 text-[11px] font-mono text-zinc-300">
                                <Compass className="size-3 text-white" />
                                {scene.emotionalShift.from} <ArrowRight className="size-2.5 inline text-white" /> {scene.emotionalShift.to}
                              </span>
                            </div>
                          </div>

                          {/* Expanded Scene Contract Details */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-[#232328] flex flex-col gap-3 text-xs">
                              <div>
                                <span className="text-[10px] uppercase font-semibold text-zinc-500 block">
                                  Dramatic Objective
                                </span>
                                <p className="text-zinc-300 mt-0.5">{scene.objective}</p>
                              </div>

                              <div className="grid grid-cols-2 gap-3 bg-[#141416] p-2.5 rounded border border-[#232328]">
                                <div>
                                  <span className="text-[10px] uppercase font-semibold text-zinc-500 block">
                                    Opening Conditions
                                  </span>
                                  <p className="text-zinc-400 mt-0.5">{scene.openingConditions}</p>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-semibold text-zinc-500 block">
                                    Expected Closing Conditions
                                  </span>
                                  <p className="text-zinc-400 mt-0.5">{scene.expectedClosingConditions}</p>
                                </div>
                              </div>

                              <div>
                                <span className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">
                                  Required Plot Events
                                </span>
                                <ul className="list-disc list-inside space-y-0.5 text-zinc-300">
                                  {scene.requiredEvents.map((ev, i) => (
                                    <li key={i}>{ev}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Setup & Payoff Pair Table */}
      {blueprint.setupPayoffs && blueprint.setupPayoffs.length > 0 && (
        <Card className="p-5 bg-[#141416] border-[#232328] flex flex-col gap-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <CheckCircle className="size-3.5 text-white" />
            Causal Setup & Payoff Pairs
          </h4>

          <div className="flex flex-col gap-2">
            {blueprint.setupPayoffs.map((sp) => (
              <div
                key={sp.id}
                className="grid grid-cols-2 gap-3 p-2.5 rounded bg-[#18181b] border border-[#232328] text-xs"
              >
                <div>
                  <span className="text-[10px] text-zinc-400 font-mono uppercase block">Setup ({sp.setupSceneId})</span>
                  <p className="text-zinc-300 mt-0.5">{sp.setupDescription}</p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 font-mono uppercase block">Payoff ({sp.payoffSceneId})</span>
                  <p className="text-zinc-300 mt-0.5">{sp.payoffDescription}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
