import React, { useMemo } from "react";
import { Bracket, Seed, SeedItem, SeedTeam } from "react-brackets";
import { FaEdit, FaCheck } from "react-icons/fa";
import "../components/estilos/Llaves.css"; // Asegúrate que la ruta es correcta

// --- Helper Functions ---

const generateBracketStructure = (numParticipants) => {
  if (!numParticipants || numParticipants < 2 || !Number.isInteger(Math.log2(numParticipants))) {
    console.error("generateBracketStructure: El número de participantes debe ser una potencia de 2.");
    return [];
  }

  const matches = [];
  let currentMatchId = 1;
  let matchesInRound = numParticipants / 2;
  let round = 1;
  let globalMatchIndex = 0;

  while (matchesInRound >= 1) {
    const nextRoundMatchIdStart = currentMatchId + matchesInRound;
    for (let j = 0; j < matchesInRound; j++) {
      const matchId = currentMatchId + j;
      const nextMatchId = matchesInRound > 1 ? nextRoundMatchIdStart + Math.floor(j / 2) : null;
      matches.push({
        id: matchId,
        nextMatchId: nextMatchId,
        tournamentRoundText: `Ronda ${round}`,
        state: "scheduled",
        teams: [
          { id: null, name: "Por determinar", isWinner: false, score: undefined },
          { id: null, name: "Por determinar", isWinner: false, score: undefined },
        ],
        roundIndex: j,
        globalIndex: globalMatchIndex,
      });
      globalMatchIndex++;
    }
    currentMatchId += matchesInRound;
    matchesInRound /= 2;
    round++;
  }
  return matches;
};

// --- Components ---

const CustomSeed = React.memo(({ seed, breakpoint, onClick, onModify, onAddResult }) => {
  const homeTeam = seed.teams[0] || { name: "Por definir", score: undefined, id: null };
  const awayTeam = seed.teams[1] || { name: "Por definir", score: undefined, id: null };
  const isVisuallyClickable = homeTeam.id || awayTeam.id || seed.partidoId;
  const isReadyForActions = seed.partidoId || (homeTeam.id !== null && awayTeam.id !== null);
  const needsResult = isReadyForActions && seed.state !== 'completed';

  return (
    <Seed mobileBreakpoint={breakpoint} style={{ fontSize: 12 }}>
      <SeedItem
        style={{ cursor: isVisuallyClickable ? "pointer" : "default" }}
        onClick={() => onClick(seed)}
      >
        {/* Team Display: Añadimos la clase 'teams-display-container' */}
        <div className="teams-display-container"> {/* <--- CLASE AÑADIDA AQUÍ */}
          <SeedTeam 
            style={{ backgroundColor: homeTeam.isWinner ? "rgba(255, 109, 20, 0.15)" : undefined }} 
            className={homeTeam.isWinner ? "winner-team" : ""}
          >
            <div className="team-name">{homeTeam.name}</div>
            {homeTeam.score !== undefined && <div className="score">{homeTeam.score}</div>}
          </SeedTeam>
          <SeedTeam 
            style={{ backgroundColor: awayTeam.isWinner ? "rgba(255, 109, 20, 0.15)" : undefined }} 
            className={awayTeam.isWinner ? "winner-team" : ""}
          >
            <div className="team-name">{awayTeam.name}</div>
            {awayTeam.score !== undefined && <div className="score">{awayTeam.score}</div>}
          </SeedTeam>
        </div>

        {/* Action Buttons */}
        {isReadyForActions && (
          <div className="seed-actions">
            {seed.partidoId && (
              <button className="modify-button" onClick={(e) => { e.stopPropagation(); onModify(seed); }}>
                <FaEdit />
              </button>
            )}
            {needsResult && (
              <button className="add-result-button" onClick={(e) => { e.stopPropagation(); onAddResult(seed); }}>
                <FaCheck />
              </button>
            )}
          </div>
        )}
      </SeedItem>
    </Seed>
  );
});

// Main Llaves Component
function Llaves({ numParticipantes, rawPartidos, onMatchClick, onModify, onAddResult }) {

  // Generate the basic structure based on participant count
  const initialBracketStructure = useMemo(() => {
    return numParticipantes > 0 ? generateBracketStructure(numParticipantes) : [];
  }, [numParticipantes]);

  // Process raw partidos data onto the bracket structure
  const bracketData = useMemo(() => {
    if (!initialBracketStructure.length) return {};

    let workingBracket = JSON.parse(JSON.stringify(initialBracketStructure));
    const matchesById = workingBracket.reduce((acc, match) => {
      acc[match.id] = match;
      return acc;
    }, {});

    // Use latest partido data for each bracket match ID to avoid overwrites
    const latestPartidosData = {};
    rawPartidos.forEach(partido => {
      if (partido.bracketMatchId) {
        latestPartidosData[partido.bracketMatchId] = partido;
      }
    });

    // Populate bracket matches
    workingBracket.forEach(match => {
      const latestPartido = latestPartidosData[String(match.id)];
      if (latestPartido) {
        match.partidoId = latestPartido.id;
        let score1, score2;
        if (latestPartido.resultado && latestPartido.resultado.includes("-")) {
          const scores = latestPartido.resultado.split("-").map(s => parseInt(s, 10));
          score1 = !isNaN(scores[0]) ? scores[0] : undefined;
          score2 = !isNaN(scores[1]) ? scores[1] : undefined;
        }

        match.teams[0] = { id: latestPartido.localId || null, name: latestPartido.local || "Por determinar", score: score1, isWinner: false };
        match.teams[1] = { id: latestPartido.visitanteId || null, name: latestPartido.visitante || "Por determinar", score: score2, isWinner: false };

        if (score1 !== undefined && score2 !== undefined) {
          match.state = 'completed';
          if (score1 > score2) match.teams[0].isWinner = true;
          else if (score2 > score1) match.teams[1].isWinner = true;
          else match.state = 'tied';
        } else {
          match.state = 'scheduled';
        }
      }
    });

    // Propagate winners
    workingBracket.forEach(match => {
      if (match.state === 'completed' && match.nextMatchId !== null) {
        const winnerTeam = match.teams.find(team => team.isWinner);
        const nextMatch = matchesById[match.nextMatchId];
        if (winnerTeam && nextMatch) {
          const targetSlot = match.roundIndex % 2;
          if (!nextMatch.teams[targetSlot].id || nextMatch.teams[targetSlot].id !== winnerTeam.id) {
            nextMatch.teams[targetSlot] = { id: winnerTeam.id, name: winnerTeam.name, isWinner: false, score: undefined };
          }
          if (nextMatch.state !== 'completed' && nextMatch.state !== 'tied') {
            nextMatch.state = 'scheduled';
          }
        }
      }
    });

    // Group by rounds
    const rounds = workingBracket.reduce((acc, match) => {
      const roundTitle = match.tournamentRoundText;
      if (!acc[roundTitle]) acc[roundTitle] = [];
      acc[roundTitle].push(match);
      return acc;
    }, {});

    // console.log(">> Llaves.js: Processed bracket data:", JSON.stringify(rounds, null, 2));
    return rounds;

  }, [initialBracketStructure, rawPartidos]);

  // --- Render Logic ---
  if (numParticipantes > 0 && !initialBracketStructure.length) {
    return <div className="clasificacion-container llaves-container"><p>Número de participantes inválido.</p></div>;
  }
  if (!initialBracketStructure.length) {
     return <div className="clasificacion-container llaves-container"><p>Esperando datos para generar el esquema.</p></div>;
  }

  return (
    <div className="clasificacion-container llaves-container">
      {Object.keys(bracketData).length > 0 ? (
        <Bracket
          rounds={Object.entries(bracketData).map(([title, seeds]) => ({ title, seeds }))}
          renderSeedComponent={(props) => (
            <CustomSeed {...props} onClick={onMatchClick} onModify={onModify} onAddResult={onAddResult} />
          )}
        />
      ) : (
        <p>Generando esquema...</p>
      )}
    </div>
  );
}

export default Llaves;