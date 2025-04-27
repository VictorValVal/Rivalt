// src/components/Clasificacion.js
import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { getFirestore, doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { app } from "../firebase";
import { Bracket } from 'react-brackets';
import '../components/estilos/Clasificacion.css';

const db = getFirestore(app);

const generateBracketStructure = (numParticipants) => {
  if (!numParticipants || numParticipants < 2 || !Number.isInteger(Math.log2(numParticipants))) {
    console.error("Invalid number of participants for single elimination bracket generation. Must be a power of 2 (>= 2).");
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
      const nextMatchId = (matchesInRound > 1) ? nextRoundMatchIdStart + Math.floor(j / 2) : null;

      matches.push({
        id: matchId,
        name: `Partido ${matchId}`,
        nextMatchId: nextMatchId,
        tournamentRoundText: `Ronda ${round}`,
        state: 'scheduled',
        participants: [
          { id: null, name: "Por determinar", isWinner: false },
          { id: null, name: "Por determinar", isWinner: false },
        ],
      });
    }

    currentMatchId += matchesInRound;
    matchesInRound /= 2;
    round++;
  }

  return matches;
};

const CustomSeed = ({ seed, breakpoint, roundIndex, seedIndex }) => {
  const hasTeams = seed.teams && seed.teams.length === 2;

  const scoreDisplay = hasTeams && seed.teams[0].score !== undefined && seed.teams[1].score !== undefined
    ? `${seed.teams[0].score} - ${seed.teams[1].score}`
    : '-';

  return (
    <div className={`seed ${seed.state || ''}`}>
      {hasTeams ? (
        <div className="seed-content">
          {seed.teams.map((team, teamIndex) => (
            <div
              key={teamIndex}
              className={`seed-item ${team.isWinner ? 'winner' : (team.score !== undefined && seed.state === 'completed' ? 'loser' : '')}`}
            >
              <span className="team-name">{team.name}</span>
              {team.score !== undefined && (
                <span className="score">{team.score}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="seed-content">
          <div className="seed-item">
            <span className="team-name">Por determinar</span>
            <span className="score">-</span>
          </div>
          <div className="seed-item">
            <span className="team-name">Por determinar</span>
            <span className="score">-</span>
          </div>
        </div>
      )}
    </div>
  );
};


function Clasificacion() {
  const { id: torneoId } = useParams();
  const [tipoTorneo, setTipoTorneo] = useState(null);
  const [numParticipantes, setNumParticipantes] = useState(0);
  const [rawPartidos, setRawPartidos] = useState([]);
  const [bracketData, setBracketData] = useState([]);
  const [leagueStandings, setLeagueStandings] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    setLoading(true);
    const torneoRef = doc(db, "torneos", torneoId);
    getDoc(torneoRef).then((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTipoTorneo(data.tipo);
        const num = Number(data.numEquipos) || 0;
        if (data.tipo === "torneo" && num > 0 && Number.isInteger(Math.log2(num))) {
          setNumParticipantes(num);
        } else {
          setNumParticipantes(0);
        }
      } else {
        console.error("No tournament found with ID:", torneoId);
        setTipoTorneo(null);
        setNumParticipantes(0);
      }
      setLoading(false);

    }).catch(error => {
      console.error("Error fetching tournament:", error);
      setTipoTorneo(null);
      setNumParticipantes(0);
      setLoading(false);
    });

  }, [torneoId]);


  useEffect(() => {
    if (!torneoId) return;

    const partidosRef = collection(db, `torneos/${torneoId}/calendario`);
    const unsubscribe = onSnapshot(partidosRef, (snapshot) => {
      const fetchedPartidos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRawPartidos(fetchedPartidos);
    }, error => {
      console.error("Error fetching partidos:", error);
      setRawPartidos([]);
    });

    return () => unsubscribe();
  }, [torneoId]);


  const initialBracketStructure = useMemo(() => {
    if (tipoTorneo === "torneo" && numParticipantes > 0) {
      return generateBracketStructure(numParticipantes);
    }
    return [];
  }, [numParticipantes, tipoTorneo]);


  useEffect(() => {
    if (tipoTorneo === "torneo" && initialBracketStructure.length > 0) {
      let currentBracket = JSON.parse(JSON.stringify(initialBracketStructure));

      const matchesById = currentBracket.reduce((acc, match) => {
        acc[match.id] = match;
        return acc;
      }, {});

      const rawPartidosByBracketId = rawPartidos.reduce((acc, partido) => {
        if (partido.bracketMatchId !== undefined && partido.bracketMatchId !== null && Number.isInteger(Number(partido.bracketMatchId))) {
          acc[Number(partido.bracketMatchId)] = partido;
        } else if (partido.bracketMatchId !== undefined) {
          console.warn(`Partido con ID ${partido.id} tiene bracketMatchId inválido/no-entero: ${partido.bracketMatchId}`);
        }
        return acc;
      }, {});

      currentBracket.forEach(match => {
        const partido = rawPartidosByBracketId[match.id];

        if (partido) {
          match.participants[0] = {
            id: partido.localId || null,
            name: partido.local || "Por determinar",
            score: partido.resultado ? parseInt(partido.resultado.split("-")[0], 10) : undefined,
            isWinner: false,
          };
          match.participants[1] = {
            id: partido.visitanteId || null,
            name: partido.visitante || "Por determinar",
            score: partido.resultado ? parseInt(partido.resultado.split("-")[1], 10) : undefined,
            isWinner: false,
          };
          match.startTime = partido.fecha && partido.hora ? `${partido.fecha}T${partido.hora}:00` : undefined;

          let winnerParticipant = null;
          if (partido.resultado && partido.resultado.includes('-')) {
            const scores = partido.resultado.split("-").map(Number);
            if (scores.length === 2 && !isNaN(scores[0]) && !isNaN(scores[1])) {
              const [score1, score2] = scores;
              if (score1 > score2) {
                winnerParticipant = match.participants[0];
                match.participants[0].isWinner = true;
              } else if (score2 > score1) {
                winnerParticipant = match.participants[1];
                match.participants[1].isWinner = true;
              }
              if (winnerParticipant) {
                match.state = 'completed';
              } else if (score1 === score2) {
                match.state = 'tied';
              } else {
                match.state = 'completed';
              }

            } else {
              match.state = 'error';
            }
          } else {
            match.state = 'scheduled';
          }

          if (winnerParticipant && match.nextMatchId !== null) {
            const nextMatch = matchesById[match.nextMatchId];
            if (nextMatch) {
              const predecessorMatchesForNext = initialBracketStructure
                .filter(m => m.nextMatchId === nextMatch.id)
                .sort((a, b) => a.id - b.id);

              const participantIndexInNextMatch = predecessorMatchesForNext.findIndex(p => p.id === match.id);

              if (participantIndexInNextMatch !== -1) {
                if (nextMatch.participants[participantIndexInNextMatch].id === null) {
                  nextMatch.participants[participantIndexInNextMatch] = {
                    id: winnerParticipant.id,
                    name: winnerParticipant.name.split(' (')[0],
                    isWinner: false,
                  };
                }
              } else {
                console.error(`[Bracket Population] Could not determine participant index for match ${match.id} in next match ${match.nextMatchId}.`);
              }
            }
          }
        }
      });

      const roundsForBracketLib = [];
      const matchesGroupedByRound = currentBracket.reduce((acc, match) => {
        if (!acc[match.tournamentRoundText]) {
          acc[match.tournamentRoundText] = [];
        }
        acc[match.tournamentRoundText].push(match);
        return acc;
      }, {});

      const orderedRoundTitles = Object.keys(matchesGroupedByRound).sort((a, b) => {
        const roundNumA = parseInt(a.replace('Ronda ', ''), 10);
        const roundNumB = parseInt(b.replace('Ronda ', ''), 10);
        return roundNumA - roundNumB;
      });

      orderedRoundTitles.forEach(roundTitle => {
        const seedsInRound = matchesGroupedByRound[roundTitle].sort((a, b) => a.id - b.id).map(match => ({
          id: match.id,
          teams: match.participants.map(p => ({
            id: p.id,
            name: p.name,
            score: p.score !== undefined ? p.score : undefined,
            isWinner: p.isWinner !== undefined ? p.isWinner : false,
          })),
          startTime: match.startTime,
          state: match.state,
          tournamentRoundText: match.tournamentRoundText,
        }));
        if (seedsInRound.length > 0) {
          roundsForBracketLib.push({ title: roundTitle, seeds: seedsInRound });
        }
      });

      setBracketData(roundsForBracketLib);

    } else {
      setBracketData([]);
    }
  }, [initialBracketStructure, rawPartidos, tipoTorneo, numParticipantes]);


  useEffect(() => {
    if (tipoTorneo === "liga") {
      const standingsMap = new Map();
      const getTeamStats = (teamName, teamId) => {
        if (!standingsMap.has(teamName)) {
          standingsMap.set(teamName, {
            id: teamId,
            name: teamName,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0,
          });
        }
        return standingsMap.get(teamName);
      };

      rawPartidos.forEach(partido => {
        if (partido.resultado && partido.resultado.includes('-')) {
          const [score1, score2] = partido.resultado.split("-").map(Number);
          if (!isNaN(score1) && !isNaN(score2)) {
            const localStats = getTeamStats(partido.local, partido.localId);
            const visitanteStats = getTeamStats(partido.visitante, partido.visitanteId);

            localStats.played += 1;
            visitanteStats.played += 1;

            localStats.goalsFor += score1;
            localStats.goalsAgainst += score2;
            visitanteStats.goalsFor += score2;
            visitanteStats.goalsAgainst += score1;

            if (score1 > score2) {
              localStats.wins += 1;
              localStats.points += 3;
              visitanteStats.losses += 1;
            } else if (score2 > score1) {
              visitanteStats.wins += 1;
              visitanteStats.points += 3;
              localStats.losses += 1;
            } else {
              localStats.draws += 1;
              localStats.points += 1;
              visitanteStats.draws += 1;
              visitanteStats.points += 1;
            }

            localStats.goalDifference = localStats.goalsFor - localStats.goalsAgainst;
            visitanteStats.goalDifference = visitanteStats.goalsFor - visitanteStats.goalsAgainst;
          } else {
            console.warn(`Invalid result format for partido: ${partido.local} vs ${partido.visitante}, result: ${partido.resultado}`);
          }
        }
      });

      const sortedStandings = Array.from(standingsMap.values()).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return a.name.localeCompare(b.name);
      });

      setLeagueStandings(sortedStandings);

    } else {
      setLeagueStandings([]);
    }
  }, [rawPartidos, tipoTorneo]);


  if (loading) {
    return <div>Cargando información del torneo...</div>;
  }

  if (tipoTorneo === "torneo") {
    if (numParticipantes === 0) {
      return (
        <div>
          <h2>Esquema de Eliminación</h2>
          <p>No se puede generar el esquema de eliminación. El número de participantes debe ser una potencia de 2 (ej: 2, 4, 8, 16...).</p>
        </div>
      );
    }
    return (
      <div className="clasificacion-container" style={{ overflowX: 'auto', width: '100%', padding: '20px 0' }}>
        <h2>Esquema de Eliminación</h2>
        {numParticipantes > 0 && bracketData.length > 0 ? (
          <Bracket
            rounds={bracketData}
            renderSeedComponent={CustomSeed}
          />
        ) : (
          <p>Generando esquema de eliminación o esperando datos de partidos con ID de esquema asignado.</p>
        )}
      </div>
    );

  } else if (tipoTorneo === "liga") {
    return (
      <div className="clasificacion-container">
        <h2>Tabla de Clasificación</h2>
        {leagueStandings.length > 0 ? (
          <table className="standings-table">
            <thead>
              <tr>
                <th>Pos</th>
                <th>Equipo</th>
                <th>PJ</th>
                <th>PG</th>
                <th>PE</th>
                <th>PP</th>
                <th>GF</th>
                <th>GC</th>
                <th>DG</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {leagueStandings.map((team, index) => (
                <tr key={team.name}>
                  <td>{index + 1}</td>
                  <td>{team.name}</td>
                  <td>{team.played}</td>
                  <td>{team.wins}</td>
                  <td>{team.draws}</td>
                  <td>{team.losses}</td>
                  <td>{team.goalsFor}</td>
                  <td>{team.goalsAgainst}</td>
                  <td>{team.goalDifference}</td>
                  <td><strong>{team.points}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Esperando datos de partidos para generar la tabla de clasificación. Asegúrate de que los partidos tienen resultados.</p>
        )}
        {rawPartidos.some(p => !p.resultado || !p.resultado.includes('-') || isNaN(parseInt(p.resultado.split('-')[0], 10))) && (
          <p>Nota: La tabla de clasificación solo incluye partidos con resultados registrados.</p>
        )}
      </div>
    );

  } else {
    return (
      <div>
        <h2>Clasificación</h2>
        {tipoTorneo === null ? (
          <p>Cargando información del torneo...</p>
        ) : (
          <p>Este torneo no es de tipo eliminación directa ni de liga. Visita el Calendario para ver los partidos.</p>
        )}
      </div>
    );
  }
}

export default Clasificacion;