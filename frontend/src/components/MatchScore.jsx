// TODO: MatchScore — circular/bar chart showing overall match % and breakdown bars
// Props: { score, breakdown: { semantic_score, skills_score, experience_score, location_score, salary_score } }
export default function MatchScore({ score, breakdown }) {
    return <div><strong>Match: {score}%</strong></div>;
}
