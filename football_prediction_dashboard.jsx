import { useState, useEffect } from "react";

export default function Dashboard() {
  const [matches, setMatches] = useState([]);
  const [bestBets, setBestBets] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_KEY = process.env.REACT_APP_API_KEY;
  const ODDS_KEY = process.env.REACT_APP_ODDS_KEY;

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await fetch(`https://api.football-data.org/v4/matches`, {
          headers: { "X-Auth-Token": API_KEY },
        });
        const data = await res.json();

        const selected = data.matches.slice(0, 6);

        const enriched = await Promise.all(
          selected.map(async (match) => {
            const odds = await getOdds(match.homeTeam.name, match.awayTeam.name);

            const prediction = {
              home: Math.random(),
              away: Math.random(),
            };

            const value = calculateValue(prediction, odds);

            return {
              ...match,
              odds,
              prediction,
              value,
            };
          })
        );

        // 🔥 AUTO PICK BEST BETS
        const sorted = enriched
          .map((m) => ({
            ...m,
            bestSide:
              m.value.home > m.value.away ? "HOME" : "AWAY",
            bestValue: Math.max(m.value.home, m.value.away),
          }))
          .filter((m) => m.bestValue > 0.05) // only strong value
          .sort((a, b) => b.bestValue - a.bestValue)
          .slice(0, 3); // top 3 bets

        setMatches(enriched);
        setBestBets(sorted);
        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    };

    fetchMatches();
  }, []);

  const getOdds = async (home, away) => {
    try {
      const res = await fetch(
        `https://api.the-odds-api.com/v4/sports/soccer/odds/?apiKey=${ODDS_KEY}&regions=eu&markets=h2h`
      );
      const data = await res.json();

      const match = data.find(
        (m) =>
          m.home_team.toLowerCase().includes(home.toLowerCase()) &&
          m.away_team.toLowerCase().includes(away.toLowerCase())
      );

      if (!match) return { home: 2.0, away: 2.0 };

      const outcomes = match.bookmakers[0].markets[0].outcomes;

      return {
        home: outcomes[0].price,
        away: outcomes[1].price,
      };
    } catch {
      return { home: 2.0, away: 2.0 };
    }
  };

  const calculateValue = (prediction, odds) => {
    const impliedHome = 1 / odds.home;
    const impliedAway = 1 / odds.away;

    return {
      home: prediction.home - impliedHome,
      away: prediction.away - impliedAway,
    };
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">AUTO BETTING SYSTEM</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold">🔥 Best 3 Bets Today</h2>
            {bestBets.map((bet, i) => (
              <div key={i} className="border p-3 mt-2 rounded bg-green-50">
                <p>
                  {bet.homeTeam.name} vs {bet.awayTeam.name}
                </p>
                <p>Pick: {bet.bestSide}</p>
                <p>Value: {bet.bestValue.toFixed(2)}</p>
              </div>
            ))}
          </div>

          <h2 className="text-lg font-semibold">All Matches</h2>
          <div className="grid gap-3 mt-2">
            {matches.map((match, i) => (
              <div key={i} className="border p-3 rounded">
                <p>
                  {match.homeTeam.name} vs {match.awayTeam.name}
                </p>
                <p>
                  Value: {match.value.home.toFixed(2)} / {match.value.away.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
