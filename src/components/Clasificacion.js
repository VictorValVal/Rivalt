import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getFirestore, doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { app } from "../firebase";
import { SingleEliminationBracket, Match, SVGViewer } from "@g-loot/react-tournament-brackets";

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
        participants: [
          { id: null, name: "Por determinar" },
          { id: null, name: "Por determinar" },
        ],
      });
    }

    currentMatchId += matchesInRound;
    matchesInRound /= 2;
    round++;
  }

  return matches;
};

function Clasificacion() {
  const { id: torneoId } = useParams();
  const [tipoTorneo, setTipoTorneo] = useState(null);
  const [numParticipantes, setNumParticipantes] = useState(0);
  const [rawPartidos, setRawPartidos] = useState([]);
  const [bracketData, setBracketData] = useState([]);

  useEffect(() => {
    const torneoRef = doc(db, "torneos", torneoId);
    getDoc(torneoRef).then((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTipoTorneo(data.tipo);
        const num = Number(data.numEquipos) || 0;
        if (num > 0 && Number.isInteger(Math.log2(num))) {
             setNumParticipantes(num);
        } else {
            console.warn(`Invalid or non-power-of-2 numEquipos (${num}) for single elimination bracket.`);
            setNumParticipantes(0);
            setTipoTorneo(null);
        }
      } else {
        console.error("No tournament found with ID:", torneoId);
        setTipoTorneo(null);
        setNumParticipantes(0);
      }
    }).catch(error => {
         console.error("Error fetching tournament:", error);
         setTipoTorneo(null);
         setNumParticipantes(0);
    });

    const partidosRef = collection(db, `torneos/${torneoId}/calendario`);
    const unsubscribe = onSnapshot(partidosRef, (snapshot) => {
      const fetchedPartidos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      fetchedPartidos.sort((a, b) => {
        const dateA = new Date(`${a.fecha}T${a.hora || "00:00:00"}`);
        const dateB = new Date(`${b.fecha}T${b.hora || "00:00:00"}`);
        return dateA.getTime() - dateB.getTime();
      });

      setRawPartidos(fetchedPartidos);
    }, error => {
         console.error("Error fetching partidos:", error);
         setRawPartidos([]);
    });

    return () => unsubscribe();
  }, [torneoId]);

  useEffect(() => {
    if (tipoTorneo === "torneo" && numParticipantes > 0) {
        const initialBracket = generateBracketStructure(numParticipantes);

        const populatedBracket = initialBracket.map(match => {
            if (match.tournamentRoundText === 'Ronda 1') {
                const round1MatchIndex = match.id - 1;

                if (round1MatchIndex < rawPartidos.length) {
                    const partido = rawPartidos[round1MatchIndex];
                    return {
                        ...match,
                        participants: [
                            {
                                id: partido?.localId || null,
                                name: partido?.resultado
                                    ? `${partido.local} (${partido.resultado.split("-")[0]})`
                                    : partido?.local || "Por determinar",
                            },
                            {
                                id: partido?.visitanteId || null,
                                name: partido?.resultado
                                    ? `${partido.visitante} (${partido.resultado.split("-")[1]})`
                                    : partido?.visitante || "Por determinar",
                            },
                        ],
                        startTime: partido?.fecha && partido?.hora ? `${partido.fecha}T${partido.hora}:00` : undefined,
                    };
                }
            }
            return match;
        });

        setBracketData(populatedBracket);

    } else {
        setBracketData([]);
    }
  }, [numParticipantes, rawPartidos, tipoTorneo]);


  if (tipoTorneo === null) {
      return <div>Cargando información del torneo...</div>;
  }

  if (tipoTorneo !== "torneo") {
    return (
      <div>
        <h2>Clasificación</h2>
        <p>Este torneo no es de tipo eliminación directa. Visita el Calendario para ver los partidos.</p>
      </div>
    );
  }

  return (
    <div className="clasificacion-container">
      <h2>Esquema de Eliminación</h2>
       {numParticipantes > 0 && bracketData.length > 0 ? (
            <SingleEliminationBracket
                matches={bracketData}
                matchComponent={Match}
                svgWrapper={({ children, ...props }) => (
                    <SVGViewer
                        width={Math.max(800, numParticipantes * 130)}
                        height={Math.max(600, numParticipantes * 55)}
                        pan={false}
                        zoom={false}
                        {...props}
                     >
                        {children}
                    </SVGViewer>
                )}
            />
       ) : (
           <p>Generando esquema de eliminación o esperando suficientes datos de partidos (se necesita al menos la mitad de los participantes para la primera ronda).</p>
       )}
    </div>
  );
}

export default Clasificacion;