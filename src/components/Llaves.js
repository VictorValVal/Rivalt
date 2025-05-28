import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Bracket, Seed, SeedItem, SeedTeam } from "react-brackets";
import { FaEdit, FaCheck } from "react-icons/fa";
import "../components/estilos/Llaves.css"; // Confirmado que esta es la ruta correcta

// --- Helper Functions (sin cambios del original que subiste) ---
const generateBracketStructure = (numParticipantes) => {
  if (!numParticipantes || numParticipantes < 2 || !Number.isInteger(Math.log2(numParticipantes))) {
    console.error("generateBracketStructure: El número de participantes debe ser una potencia de 2.");
    return [];
  }
  const matches = [];
  let currentMatchId = 1;
  let matchesInRound = numParticipantes / 2;
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

// --- Components (CustomSeed) ---
const CustomSeed = React.memo(({ seed, breakpoint, onClick, onModify, onAddResult, isCreator }) => { // Añadida prop isCreator
  const homeTeam = seed.teams[0] || { name: "Por definir", score: undefined, id: null };
  const awayTeam = seed.teams[1] || { name: "Por determinar", score: undefined, id: null };
  const isVisuallyClickable = homeTeam.id || awayTeam.id || seed.partidoId;
  const isReadyForActions = seed.partidoId || (homeTeam.id !== null && awayTeam.id !== null);
  const needsResult = isReadyForActions && seed.state !== 'completed';

  const [isMobileSeedView, setIsMobileSeedView] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileSeedView(typeof window !== 'undefined' && window.innerWidth <= breakpoint);
    };
    if (typeof window !== 'undefined') {
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, [breakpoint]);

  const seedStyles = { fontSize: "12px" }; // Estilos para el componente Seed padre
  if (isMobileSeedView) {
    seedStyles.minWidth = "150px"; // Esto se aplica a Seed, no a SeedItem directamente
  }

  return (
    <Seed mobileBreakpoint={breakpoint} style={seedStyles}>
      <SeedItem
        className="SeedItem" // <--- Aplicamos la clase CSS para que se estile desde Llaves.css
        style={{ cursor: isVisuallyClickable ? "pointer" : "default" }} // Estilo de cursor dinámico se mantiene inline
        onClick={() => onClick(seed)}
      >
        <div className="teams-display-container">
          <SeedTeam style={{ backgroundColor: homeTeam.isWinner ? "rgba(255, 109, 20, 0.15)" : undefined }} className={homeTeam.isWinner ? "winner-team" : ""}>
            <div className="team-name">{homeTeam.name}</div>
            {homeTeam.score !== undefined && <div className="score">{homeTeam.score}</div>}
          </SeedTeam>
          <SeedTeam style={{ backgroundColor: awayTeam.isWinner ? "rgba(255, 109, 20, 0.15)" : undefined }} className={awayTeam.isWinner ? "winner-team" : ""}>
            <div className="team-name">{awayTeam.name}</div>
            {awayTeam.score !== undefined && <div className="score">{awayTeam.score}</div>}
          </SeedTeam>
        </div>
        {isCreator && isReadyForActions && ( // Condicionado por isCreator
          <div className="seed-actions">
            {seed.partidoId && (<button className="modify-button" onClick={(e) => { e.stopPropagation(); onModify(seed); }}><FaEdit /></button>)}
            {needsResult && (<button className="add-result-button" onClick={(e) => { e.stopPropagation(); onAddResult(seed); }}><FaCheck /></button>)}
          </div>
        )}
      </SeedItem>
    </Seed>
  );
});

// Main Llaves Component
function Llaves({
  numParticipantes,
  rawPartidos,
  onMatchClick,
  onModify,
  onAddResult,
  isFullScreenModeActive,
  isCreator // Añadida prop isCreator
}) {
  const [isMobileView, setIsMobileView] = useState(false);
  const bracketContentWrapperRef = useRef(null);
  const [visibleRoundInfo, setVisibleRoundInfo] = useState({ title: "", current: 0, total: 0 });
  const animationFrameId = useRef(null);


  useEffect(() => {
    const checkGlobalMobileView = () => {
      setIsMobileView(typeof window !== 'undefined' && window.innerWidth <= 768);
    };
    if (typeof window !== 'undefined') {
      checkGlobalMobileView();
      window.addEventListener('resize', checkGlobalMobileView);
      return () => window.removeEventListener('resize', checkGlobalMobileView);
    }
  }, []);

  const initialBracketStructure = useMemo(() =>
    numParticipantes > 0 ? generateBracketStructure(numParticipantes) : [],
  [numParticipantes]);

  const bracketData = useMemo(() => {
    if (!initialBracketStructure.length) return {};
    let workingBracket = JSON.parse(JSON.stringify(initialBracketStructure));
    const matchesById = workingBracket.reduce((acc, match) => { acc[match.id] = match; return acc; }, {});
    const latestPartidosData = {};
    rawPartidos.forEach(partido => { if (partido.bracketMatchId) { latestPartidosData[String(partido.bracketMatchId)] = partido; } }); // Asegurar que bracketMatchId sea string para la clave
    workingBracket.forEach(match => {
      const latestPartido = latestPartidosData[String(match.id)]; // Usar String(match.id) para la búsqueda
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
            // Si no hay resultado, el estado depende de si los equipos están definidos
            if (latestPartido.localId && latestPartido.visitanteId) {
                match.state = 'scheduled'; // Equipos definidos, partido programado
            } else {
                match.state = 'pending'; // Equipos aún no definidos
            }
        }
      }
    });
    workingBracket.forEach(match => {
      if (match.state === 'completed' && match.nextMatchId !== null) {
        const winnerTeam = match.teams.find(team => team.isWinner);
        const nextMatch = matchesById[match.nextMatchId];
        if (winnerTeam && nextMatch) {
          const targetSlot = match.roundIndex % 2;
          if (!nextMatch.teams[targetSlot].id || nextMatch.teams[targetSlot].id !== winnerTeam.id) {
             nextMatch.teams[targetSlot] = { ...winnerTeam, isWinner: false, score: undefined };
          }
          if (nextMatch.state !== 'completed' && nextMatch.state !== 'tied') {
             if (nextMatch.teams[0].id && nextMatch.teams[1].id) { nextMatch.state = 'scheduled'; }
             else { nextMatch.state = 'pending'; }
          }
        }
      }
    });
    const rounds = workingBracket.reduce((acc, match) => {
      const roundTitle = match.tournamentRoundText;
      if (!acc[roundTitle]) acc[roundTitle] = [];
      acc[roundTitle].push(match);
      return acc;
    }, {});
    return rounds;
  }, [initialBracketStructure, rawPartidos]);

  const roundsForBracket = useMemo(() => {
    if (Object.keys(bracketData).length === 0) return [];
    return Object.entries(bracketData)
        .sort(([titleA], [titleB]) => { // Asegurar orden de rondas
            const numA = parseInt(titleA.split(" ")[1], 10);
            const numB = parseInt(titleB.split(" ")[1], 10);
            return numA - numB;
        })
        .map(([title, seeds]) => ({ title, seeds }));
  }, [bracketData]);

  const totalRounds = roundsForBracket.length;

  const updateVisibleRoundInfo = useCallback(() => {
    if (!isMobileView || !bracketContentWrapperRef.current || totalRounds === 0) {
      setVisibleRoundInfo({ title: "", current: 0, total: 0 });
      return;
    }

    const scrollableElement = bracketContentWrapperRef.current;
    // Estas clases son las que usa react-brackets por defecto. Si cambian en una actualización de la lib, esto podría romperse.
    const roundsContainerElement = scrollableElement.querySelector('.RoundsContainer'); 
    
    if (roundsContainerElement) {
      const roundElements = roundsContainerElement.querySelectorAll('.RoundContainer');

      if (roundElements && roundElements.length > 0) {
        const scrollLeft = scrollableElement.scrollLeft;
        // const scrollableWidth = scrollableElement.clientWidth;
        // const viewportCenter = scrollLeft + scrollableWidth / 2;

        let mostVisibleRoundIndex = 0;
        // let minDistanceToCenter = Infinity;

        // Lógica simplificada: tomar la primera ronda visible desde la izquierda
        // o la que esté más cerca del inicio del viewport
        let bestMatch = { index: -1, visibleAmount: 0, position: Infinity };

        roundElements.forEach((roundDiv, index) => {
            const roundRect = roundDiv.getBoundingClientRect();
            const scrollableRect = scrollableElement.getBoundingClientRect();

            // Calcular cuánto del roundDiv está visible dentro del scrollableElement
            const visibleLeft = Math.max(roundRect.left, scrollableRect.left);
            const visibleRight = Math.min(roundRect.right, scrollableRect.right);
            const visibleWidth = visibleRight - visibleLeft;

            if (visibleWidth > 0) { // Si al menos una parte es visible
                if (visibleWidth > bestMatch.visibleAmount) { // Si es más visible que la anterior mejor
                    bestMatch = { index, visibleAmount: visibleWidth, position: roundRect.left };
                } else if (visibleWidth === bestMatch.visibleAmount && roundRect.left < bestMatch.position) {
                    // Si es igual de visible, pero está más a la izquierda
                    bestMatch = { index, visibleAmount: visibleWidth, position: roundRect.left };
                }
            }
        });
        
        mostVisibleRoundIndex = bestMatch.index !== -1 ? bestMatch.index : 0; // Fallback a la primera ronda

        const currentRoundData = roundsForBracket[mostVisibleRoundIndex];
        if (currentRoundData) {
            setVisibleRoundInfo({
                title: currentRoundData.title,
                current: mostVisibleRoundIndex + 1,
                total: totalRounds,
            });
        } else if (totalRounds > 0 && roundsForBracket[0]) { // Fallback si algo sale mal
             setVisibleRoundInfo({
                title: roundsForBracket[0].title,
                current: 1,
                total: totalRounds,
            });
        }
      }
    }
     animationFrameId.current = null; 
  }, [isMobileView, totalRounds, roundsForBracket]);


  useEffect(() => {
    const scrollableElement = bracketContentWrapperRef.current;
    if (isMobileView && scrollableElement && totalRounds > 0) { // Añadido totalRounds > 0
        const handleScroll = () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            animationFrameId.current = requestAnimationFrame(updateVisibleRoundInfo);
        };
        
        scrollableElement.addEventListener('scroll', handleScroll, { passive: true });
        updateVisibleRoundInfo(); 

        return () => {
            scrollableElement.removeEventListener('scroll', handleScroll);
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    } else if (!isMobileView || totalRounds === 0) { // Limpiar si no es vista móvil o no hay rondas
        setVisibleRoundInfo({ title: "", current: 0, total: 0 });
    }
  }, [isMobileView, updateVisibleRoundInfo, totalRounds]); // Añadida totalRounds a dependencias


  const renderContent = () => {
    if (numParticipantes > 0 && !initialBracketStructure.length) { return <p>Número de participantes inválido. Debe ser una potencia de 2.</p>; }
    if (!initialBracketStructure.length && numParticipantes === 0) { return <p>Esperando datos para generar el esquema.</p>; }
    if (!initialBracketStructure.length) { return <p>No se pudo generar la estructura del bracket.</p>; }
    
    if (roundsForBracket.length > 0) {
      return (
        <Bracket
          rounds={roundsForBracket} 
          renderSeedComponent={(props) => (
            <CustomSeed 
              {...props} 
              onClick={onMatchClick} 
              onModify={onModify} 
              onAddResult={onAddResult}
              isCreator={isCreator} // Pasar isCreator
            />
          )}
        />
      );
    }
    return <p>Generando esquema...</p>;
  };

  const containerClassName = `clasificacion-container llaves-container ${isFullScreenModeActive ? "llaves-en-fullscreen-activo" : ""}`;

  return (
    <div className={containerClassName}>
      <div className="bracket-content-wrapper" ref={bracketContentWrapperRef}>
        {renderContent()}
      </div>
      {isMobileView && totalRounds > 0 && (
        <div className="mobile-scroll-indicator">
          <span className="scroll-hint-text">‹ Desliza para ver rondas ›</span>
          {visibleRoundInfo.title && (
            <span className="current-round-text">
              {visibleRoundInfo.title} ({visibleRoundInfo.current}/{visibleRoundInfo.total})
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default Llaves;