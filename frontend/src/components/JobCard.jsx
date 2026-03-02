// TODO: JobCard — display title, company, location, salary, skills tags and AI match score badge
export default function JobCard({ job }) {
    return <div><h3>{job?.title}</h3><p>{job?.company}</p></div>;
}
