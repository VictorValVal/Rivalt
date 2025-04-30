import React, { useMemo } from "react";
import { Bracket, Seed, SeedItem, SeedTeam } from "react-brackets";
import { FaEdit, FaCheck } from "react-icons/fa"; // Importa los iconos
import "../components/estilos/Llaves.css";

// Add roundIndex to generated match structure
const generateBracketStructure = (numParticipants) => {
  if (!numParticipants || numParticipants < 2 || !Number.isInteger(Math.log2(numParticipants))) {
    console.error("El número de participantes debe ser una potencia de 2 (ej: 2, 4, 8, 16...).");
    return [];
  }

  const matches = [];
  let currentMatchId = 1;
  let matchesInRound = numParticipants / 2;
  let round = 1;
  let globalMatchIndex = 0; // Keep track of global index for determining feed into next round

  while (matchesInRound >= 1) {
    const nextRoundMatchIdStart = currentMatchId + matchesInRound;

    for (let j = 0; j < matchesInRound; j++) {
      const matchId = currentMatchId + j;
      const nextMatchId = matchesInRound > 1 ? nextRoundMatchIdStart + Math.floor(j / 2) : null;

      matches.push({
        id: matchId,
        nextMatchId: nextMatchId,
        tournamentRoundText: `Ronda ${round}`,
        state: "scheduled", // Default state
        teams: [
          { id: null, name: "Por determinar", isWinner: false, score: undefined },
          { id: null, name: "Por determinar", isWinner: false, score: undefined },
        ],
        roundIndex: j, // Add index within the round
        globalIndex: globalMatchIndex, // Optional: global index for reference
      });
      globalMatchIndex++;
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

  // A match is considered "scheduled" for action buttons if both teams have IDs assigned OR if it's a first-round match where teams are assigned.
  // We'll refine this: action buttons appear if the match has an ID assigned from rawPartidos, indicating it exists in the database.
  // Or, if it's a placeholder in the bracket where you can schedule a match.
  // Let's use a prop from the parent if it's a 'database match' vs 'placeholder'
  // For now, let's assume if match.state is not 'scheduled' or teams have IDs, it's a real match.
  // A simpler check: Show actions if the seed has an associated partido ID (passed implicitly via the populated seed).
  // Or, perhaps simpler: show modify/add result ONLY if the seed.id corresponds to a partido with a bracketMatchId in rawPartidos.
  // The current logic in Clasificacion passes the raw partido object to the modals when clicking a match that exists in DB.
  // Let's rely on the presence of team IDs for determining if it's a match you can potentially interact with.
  const hasTeamsAssigned = homeTeam.id !== null || awayTeam.id !== null; // Check if at least one team slot is not empty

  return (
    <Seed mobileBreakpoint={breakpoint} style={{ fontSize: 12 }}>
      {/* Pass seed.id to onClick so Clasificacion can find the raw partido */}
      <SeedItem style={{ cursor: "pointer" }} onClick={() => onClick(seed)}>
        <div>
          <SeedTeam
            style={{ backgroundColor: homeTeam.isWinner ? "#d4edda" : undefined }}
            className={homeTeam.isWinner ? "winner-team" : ""}
          >
            <div className="team-name">{homeTeam.name}</div>
            {/* Only show score if it's defined */}
            {homeTeam.score !== undefined && <div className="score">{homeTeam.score}</div>}
          </SeedTeam>

          <SeedTeam
            style={{ backgroundColor: awayTeam.isWinner ? "#d4edda" : undefined }}
            className={awayTeam.isWinner ? "winner-team" : ""}
          >
            <div className="team-name">{awayTeam.name}</div>
            {/* Only show score if it's defined */}
            {awayTeam.score !== undefined && <div className="score">{awayTeam.score}</div>}
          </SeedTeam>
        </div>

        {/* Botones para modificar o añadir resultado si la semilla representa un partido real con ID */}
        {seed.partidoId && ( // Check if this seed is linked to a partido in the DB
          <div className="seed-actions">
            <button
              className="modify-button"
              onClick={(e) => {
                e.stopPropagation(); // Prevent seed click event
                // Find the actual raw partido object to pass to onModify
                onModify(seed); // Pass the seed, Clasificacion will find the raw partido
              }}
            >
              <FaEdit />
            </button>
             {/* Only show add result if score is not already present or state is not completed/tied */}
             {(seed.state === 'scheduled' || seed.state === 'tied' || homeTeam.score === undefined || awayTeam.score === undefined) && (
               <button
               className="add-result-button"
               onClick={(e) => {
                 e.stopPropagation();
                 onAddResult(seed);
               }}
             >
               <FaCheck />
             </button>
             )}

          </div>
        )}
      </SeedItem>
    </Seed>
  );
};

function Llaves({ numParticipantes, rawPartidos, onMatchClick, onModify, onAddResult }) {

  const initialBracketStructure = useMemo(() => {
    if (numParticipantes > 0) {
      const structure = generateBracketStructure(numParticipantes);
       //console.log("Generated structure:", structure); // Debugging
      return structure;
    }
    return [];
  }, [numParticipantes]);

  const bracketData = useMemo(() => {
    if (initialBracketStructure.length === 0) {
      return {}; // Return empty object if no structure
    }

    // Create a mutable copy of the initial structure
    let workingBracket = JSON.parse(JSON.stringify(initialBracketStructure));

    // Map matches by their bracket ID for quick access
    const matchesById = workingBracket.reduce((acc, match) => {
      acc[match.id] = match;
      return acc;
    }, {});

    // Populate bracket matches with data from rawPartidos
    // Also, link the seed to the raw partido ID if it exists
    rawPartidos.forEach(partido => {
        const bracketMatchId = Number(partido.bracketMatchId);
        if (Number.isInteger(bracketMatchId) && matchesById[bracketMatchId]) {
             const match = matchesById[bracketMatchId];
             match.partidoId = partido.id; // Link seed to raw partido ID

             match.teams[0] = {
                id: partido.localId || null,
                name: partido.local || "Por determinar",
                score: partido.resultado ? parseInt(partido.resultado.split("-")[0], 10) : undefined,
                isWinner: false, // Will determine winner below
            };
            match.teams[1] = {
                id: partido.visitanteId || null,
                name: partido.visitante || "Por determinar",
                score: partido.resultado ? parseInt(partido.resultado.split("-")[1], 10) : undefined,
                isWinner: false, // Will determine winner below
            };
            match.state = partido.resultado ? (partido.resultado.includes('-') ? 'completed' : 'scheduled') : 'scheduled'; // Set state based on result

            // Determine winner if result exists
            if (match.state === 'completed' && partido.resultado && partido.resultado.includes("-")) {
                const [score1, score2] = partido.resultado.split("-").map(Number);
                if (score1 > score2) {
                    match.teams[0].isWinner = true;
                } else if (score2 > score1) {
                    match.teams[1].isWinner = true;
                } else {
                     match.state = 'tied'; // Handle ties if necessary, though elimination usually doesn't allow ties
                     // For simplicity in elimination, a tie might need a rule (e.g., first team listed wins, or re-match).
                     // Assuming no ties or ties handled externally leading to one winner for progression.
                }
            }
        }
    });

    // Propagate winners to the next round
    // Iterate through the matches in the order they appear in the generated structure
    workingBracket.forEach(match => {
        // If a match is completed and has a next match
        if (match.state === 'completed' && match.nextMatchId !== null) {
            const winnerTeam = match.teams.find(team => team.isWinner);
            const nextMatch = matchesById[match.nextMatchId];

            if (winnerTeam && nextMatch) {
                 // Determine which slot the winner goes into in the next match
                 // Based on the roundIndex (0 = first match of a pair, 1 = second match of a pair)
                 const targetSlot = match.roundIndex % 2; // 0 for even index, 1 for odd index

                 // Update the team info in the next match's slot
                 nextMatch.teams[targetSlot] = {
                    id: winnerTeam.id,
                    name: winnerTeam.name,
                    isWinner: false, // Winner status is for the previous match
                    score: undefined, // Score is for the next match
                 };

                 // If the next match was 'scheduled' with placeholders, and now has at least one real team,
                 // you might want to keep its state as 'scheduled' if the other slot is still 'Por determinar'
                 // Or set it to a state indicating it's partially filled.
                 // For react-brackets, 'scheduled' means it's ready to be played.
                 if(nextMatch.state !== 'completed' && nextMatch.state !== 'tied') {
                     nextMatch.state = 'scheduled'; // Ensure state is appropriate for upcoming match
                 }
            }
        }
    });

    // Group matches by round title for the Bracket component
    const rounds = workingBracket.reduce((acc, match) => {
      const roundTitle = match.tournamentRoundText;
      if (!acc[roundTitle]) {
        acc[roundTitle] = [];
      }
      acc[roundTitle].push(match);
      return acc;
    }, {});

    // console.log("Processed bracket data:", rounds); // Debugging
    return rounds;

  }, [initialBracketStructure, rawPartidos]); // Re-run memo if structure or raw partidos change

  if (numParticipantes === 0) {
    return (
      <div className="clasificacion-container">
        <p>Seleccione un número de participantes para generar el esquema.</p>
      </div>
    );
  }

  if (initialBracketStructure.length === 0 && numParticipantes > 0) {
    return (
      <div className="clasificacion-container">
        <p>Número de participantes inválido. Debe ser una potencia de 2 (ej: 2, 4, 8, 16...).</p>
      </div>
    );
  }

  return (
    <div className="clasificacion-container">

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