import React, { useMemo } from "react";
import { Bracket, Seed, SeedItem, SeedTeam } from "react-brackets";
import { FaEdit, FaCheck } from "react-icons/fa"; // Importa los iconos
import "../components/estilos/Llaves.css";

const generateBracketStructure = (numParticipants) => {
  if (!numParticipants || numParticipants < 2 || !Number.isInteger(Math.log2(numParticipants))) {
    console.error("El número de participantes debe ser una potencia de 2 (ej: 2, 4, 8, 16...).");
    return [];
  }

  const totalMatches = numParticipants - 1;
  const matches = [];
  let currentMatchId = 1;
  let matchesInRound = numParticipants / 2;
  let round = 1;

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
      });
    }

    currentMatchId += matchesInRound;
    matchesInRound /= 2;
    round++;
  }

  return matches;
};

const CustomSeed = ({ seed, breakpoint, onClick, onModify, onAddResult }) => {
  const homeTeam = seed.teams[0] || { name: "Por determinar", score: undefined };
  const awayTeam = seed.teams[1] || { name: "Por determinar", score: undefined };

  const isScheduled = homeTeam.id && awayTeam.id; // Verifica si el partido está programado

  return (
    <Seed mobileBreakpoint={breakpoint} style={{ fontSize: 12 }}>
      <SeedItem style={{ cursor: "pointer" }} onClick={() => onClick(seed)}>
        <div>
          <SeedTeam
            style={{ backgroundColor: homeTeam.isWinner ? "#d4edda" : undefined }}
            className={homeTeam.isWinner ? "winner-team" : ""}
          >
            <div className="team-name">{homeTeam.name}</div>
            {homeTeam.score !== undefined && <div className="score">{homeTeam.score}</div>}
          </SeedTeam>

          <SeedTeam
            style={{ backgroundColor: awayTeam.isWinner ? "#d4edda" : undefined }}
            className={awayTeam.isWinner ? "winner-team" : ""}
          >
            <div className="team-name">{awayTeam.name}</div>
            {awayTeam.score !== undefined && <div className="score">{awayTeam.score}</div>}
          </SeedTeam>
        </div>

        {/* Botones para modificar o añadir resultado si el partido está programado */}
        {isScheduled && (
          <div className="seed-actions">
            <button
              className="modify-button"
              onClick={(e) => {
                e.stopPropagation(); // Evita que se dispare el evento de clic de la celda
                onModify(seed);
              }}
            >
              <FaEdit />
            </button>
            <button
              className="add-result-button"
              onClick={(e) => {
                e.stopPropagation(); // Evita que se dispare el evento de clic de la celda
                onAddResult(seed);
              }}
            >
              <FaCheck />
            </button>
          </div>
        )}
      </SeedItem>
    </Seed>
  );
};

function Llaves({ numParticipantes, rawPartidos, onMatchClick, onModify, onAddResult }) {
  const initialBracketStructure = useMemo(() => {
    if (numParticipantes > 0) {
      return generateBracketStructure(numParticipantes);
    }
    return [];
  }, [numParticipantes]);

  const bracketData = useMemo(() => {
    if (initialBracketStructure.length === 0) {
      return [];
    }

    let currentBracket = JSON.parse(JSON.stringify(initialBracketStructure));
    const matchesById = currentBracket.reduce((acc, match) => {
      acc[match.id] = match;
      return acc;
    }, {});

    const rawPartidosByBracketId = rawPartidos.reduce((acc, partido) => {
      const bracketMatchId = Number(partido.bracketMatchId);
      if (Number.isInteger(bracketMatchId) && matchesById[bracketMatchId]) {
        acc[bracketMatchId] = partido;
      }
      return acc;
    }, {});

    currentBracket.forEach((match) => {
      const partido = rawPartidosByBracketId[match.id];
      if (partido) {
        match.teams[0] = {
          id: partido.localId || null,
          name: partido.local || "Por determinar",
          score: partido.resultado ? parseInt(partido.resultado.split("-")[0], 10) : undefined,
          isWinner: false,
        };
        match.teams[1] = {
          id: partido.visitanteId || null,
          name: partido.visitante || "Por determinar",
          score: partido.resultado ? parseInt(partido.resultado.split("-")[1], 10) : undefined,
          isWinner: false,
        };

        if (partido.resultado && partido.resultado.includes("-")) {
          const [score1, score2] = partido.resultado.split("-").map(Number);
          if (score1 > score2) {
            match.teams[0].isWinner = true;
            match.state = "completed";
          } else if (score2 > score1) {
            match.teams[1].isWinner = true;
            match.state = "completed";
          } else {
            match.state = "tied";
          }
        }
      }
    });

    return currentBracket.reduce((rounds, match) => {
      const roundTitle = match.tournamentRoundText;
      if (!rounds[roundTitle]) {
        rounds[roundTitle] = [];
      }
      rounds[roundTitle].push(match);
      return rounds;
    }, {});
  }, [initialBracketStructure, rawPartidos]);

  if (numParticipantes === 0) {
    return (
      <div className="clasificacion-container">
        <h2>Esquema de Eliminación</h2>
        <p>Seleccione un número de participantes para generar el esquema.</p>
      </div>
    );
  }

  if (initialBracketStructure.length === 0 && numParticipantes > 0) {
    return (
      <div className="clasificacion-container">
        <h2>Esquema de Eliminación</h2>
        <p>Número de participantes inválido. Debe ser una potencia de 2 (ej: 2, 4, 8, 16...).</p>
      </div>
    );
  }

  return (
    <div className="clasificacion-container">
      <h2>Esquema de Eliminación</h2>
      {Object.keys(bracketData).length > 0 ? (
        <Bracket
          rounds={Object.entries(bracketData).map(([title, seeds]) => ({
            title,
            seeds,
          }))}
          renderSeedComponent={(props) => (
            <CustomSeed
              {...props}
              onClick={onMatchClick}
              onModify={onModify}
              onAddResult={onAddResult}
            />
          )}
        />
      ) : (
        <p>Generando esquema de eliminación o esperando datos de partidos con ID de esquema asignado.</p>
      )}
    </div>
  );
}

export default Llaves;