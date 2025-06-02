import React, { useMemo } from "react";
import "../components/estilos/Tabla.css";

function Tabla({ rawPartidos }) {
    const leagueStandings = useMemo(() => {
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

        return sortedStandings;
    }, [rawPartidos]);

    return (
        <div className="clasificacion-container">
            {leagueStandings.length > 0 ? (
                <table className="standings-table">
                    <thead>
                        <tr>
                            <th>Nº</th>
                            <th>Equipo</th>
                            <th>J</th>
                            <th className="hide-on-mobile">G</th>
                            <th className="hide-on-mobile">E</th>
                            <th className="hide-on-mobile">P</th>
                            <th>G/P</th>
                            <th className="hide-on-mobile">DG</th>
                            <th>Pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leagueStandings.map((team, index) => (
                            <tr key={team.name}>
                                <td>{index + 1}</td>
                                <td className="team-name">{team.name}</td>
                                <td>{team.played}</td>
                                <td className="hide-on-mobile">{team.wins}</td>
                                <td className="hide-on-mobile">{team.draws}</td>
                                <td className="hide-on-mobile">{team.losses}</td>
                                <td>{`${team.wins}/${team.losses}`}</td>
                                <td className="hide-on-mobile">{team.goalDifference}</td>
                                <td><strong>{team.points}</strong></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>Esperando datos de partidos para generar la tabla de clasificación. Asegúrate de que los partidos tienen resultados.</p>
            )}
            {rawPartidos.some(p => p.resultado && (!p.resultado.includes('-') || isNaN(parseInt(p.resultado.split('-')[0], 10)))) && (
                <p>Nota: La tabla de clasificación solo incluye partidos con resultados registrados.</p>
            )}
        </div>
    );
}

export default Tabla;