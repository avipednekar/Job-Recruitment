/**
 * seed-jobs.js — Populates MongoDB with 12 sample jobs.
 *
 * Usage:  node seed-jobs.js
 *
 * It connects using the MONGO_URI from .env, clears the jobs collection,
 * then inserts sample data. Embeddings are left empty (not calling AI service).
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import Job from "./models/Job.js";

dotenv.config();

const JOBS = [
  {
    title: "Senior Frontend Engineer",
    company: "Stripe",
    logo: "S",
    logoColor: "#635BFF",
    location: "San Francisco, CA",
    salary_range: "$140k – $190k",
    salary_min: 140,
    salary_max: 190,
    employment_type: "Full-time",
    remote: true,
    experience_level: "5+ yrs",
    skills: ["React", "TypeScript", "GraphQL"],
    urgent: true,
    description:
      "Build and maintain Stripe's web dashboard experiences. Partner with design and product to ship delightful, accessible UIs at scale.",
  },
  {
    title: "Product Designer",
    company: "Linear",
    logo: "L",
    logoColor: "#5E6AD2",
    location: "Remote",
    salary_range: "$120k – $160k",
    salary_min: 120,
    salary_max: 160,
    employment_type: "Full-time",
    remote: true,
    experience_level: "3+ yrs",
    skills: ["Figma", "Design Systems", "Prototyping"],
    urgent: false,
    description:
      "Shape the future of project management tools. Own end-to-end design from research through polished, high-fidelity deliverables.",
  },
  {
    title: "Backend Engineer",
    company: "Vercel",
    logo: "V",
    logoColor: "#000000",
    location: "New York, NY",
    salary_range: "$130k – $175k",
    salary_min: 130,
    salary_max: 175,
    employment_type: "Full-time",
    remote: false,
    experience_level: "4+ yrs",
    skills: ["Node.js", "Go", "PostgreSQL"],
    urgent: true,
    description:
      "Work on the infrastructure powering millions of deployments. Design APIs, optimize cold starts, and improve developer experience at Vercel.",
  },
  {
    title: "ML Engineer",
    company: "DeepMind",
    logo: "D",
    logoColor: "#4285F4",
    location: "London, UK",
    salary_range: "$160k – $220k",
    salary_min: 160,
    salary_max: 220,
    employment_type: "Full-time",
    remote: false,
    experience_level: "4+ yrs",
    skills: ["Python", "PyTorch", "LLMs"],
    urgent: false,
    description:
      "Advance the state of the art in machine learning. Build and train models that push the boundary of AI capabilities.",
  },
  {
    title: "DevOps Engineer",
    company: "Datadog",
    logo: "DD",
    logoColor: "#632CA6",
    location: "Boston, MA",
    salary_range: "$125k – $165k",
    salary_min: 125,
    salary_max: 165,
    employment_type: "Contract",
    remote: true,
    experience_level: "3+ yrs",
    skills: ["AWS", "Kubernetes", "Terraform"],
    urgent: false,
    description:
      "Automate infrastructure, improve CI/CD pipelines, and ensure 99.99% uptime for Datadog's monitoring platform.",
  },
  {
    title: "iOS Developer",
    company: "Airbnb",
    logo: "A",
    logoColor: "#FF5A5F",
    location: "Seattle, WA",
    salary_range: "$135k – $180k",
    salary_min: 135,
    salary_max: 180,
    employment_type: "Full-time",
    remote: false,
    experience_level: "3+ yrs",
    skills: ["Swift", "SwiftUI", "Core Data"],
    urgent: true,
    description:
      "Craft delightful mobile experiences for millions of travellers. Work with cross-functional teams to ship features on iOS.",
  },
  {
    title: "Data Analyst",
    company: "Spotify",
    logo: "SP",
    logoColor: "#1DB954",
    location: "Stockholm, Sweden",
    salary_range: "$90k – $130k",
    salary_min: 90,
    salary_max: 130,
    employment_type: "Full-time",
    remote: true,
    experience_level: "1-3 yrs",
    skills: ["SQL", "Python", "Tableau"],
    urgent: false,
    description:
      "Turn millions of data points into actionable insights for Spotify's content and growth teams.",
  },
  {
    title: "Full Stack Developer",
    company: "Notion",
    logo: "N",
    logoColor: "#000000",
    location: "San Francisco, CA",
    salary_range: "$145k – $195k",
    salary_min: 145,
    salary_max: 195,
    employment_type: "Full-time",
    remote: true,
    experience_level: "5+ yrs",
    skills: ["React", "Node.js", "PostgreSQL", "TypeScript"],
    urgent: false,
    description:
      "Build features across the entire Notion stack — from the editor front-end to backend APIs and real-time sync infrastructure.",
  },
  {
    title: "QA Engineer",
    company: "Atlassian",
    logo: "AT",
    logoColor: "#0052CC",
    location: "Sydney, Australia",
    salary_range: "$95k – $130k",
    salary_min: 95,
    salary_max: 130,
    employment_type: "Full-time",
    remote: false,
    experience_level: "1-3 yrs",
    skills: ["Selenium", "Jest", "Cypress"],
    urgent: false,
    description:
      "Ensure quality across Jira and Confluence. Build automated test suites and improve CI reliability.",
  },
  {
    title: "UX Researcher",
    company: "Figma",
    logo: "F",
    logoColor: "#A259FF",
    location: "Remote",
    salary_range: "$115k – $155k",
    salary_min: 115,
    salary_max: 155,
    employment_type: "Full-time",
    remote: true,
    experience_level: "3+ yrs",
    skills: ["User Interviews", "Usability Testing", "Data Analysis"],
    urgent: false,
    description:
      "Conduct user research to inform product decisions. Work closely with design and engineering teams at Figma.",
  },
  {
    title: "Cloud Solutions Architect",
    company: "AWS",
    logo: "AWS",
    logoColor: "#FF9900",
    location: "Arlington, VA",
    salary_range: "$155k – $210k",
    salary_min: 155,
    salary_max: 210,
    employment_type: "Full-time",
    remote: false,
    experience_level: "5+ yrs",
    skills: ["AWS", "Cloud Architecture", "Networking"],
    urgent: true,
    description:
      "Design cloud solutions for enterprise customers. Guide migration strategies and optimize cloud cost structures.",
  },
  {
    title: "Marketing Intern",
    company: "HubSpot",
    logo: "H",
    logoColor: "#FF7A59",
    location: "Cambridge, MA",
    salary_range: "$25k – $40k",
    salary_min: 25,
    salary_max: 40,
    employment_type: "Internship",
    remote: true,
    experience_level: "Entry Level",
    skills: ["Content Writing", "Social Media", "Analytics"],
    urgent: false,
    description:
      "Support HubSpot's content marketing efforts. Learn inbound marketing fundamentals while contributing to real campaigns.",
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || "ai_recruitment",
    });
    console.log("✅ Connected to MongoDB");

    await Job.deleteMany({});
    console.log("🗑️  Cleared existing jobs");

    const inserted = await Job.insertMany(
      JOBS.map((j) => ({
        ...j,
        embedding: [],
        status: "active",
        source: "manual",
      })),
    );
    console.log(`🌱 Inserted ${inserted.length} sample jobs`);

    await mongoose.disconnect();
    console.log("✅ Done — disconnected");
  } catch (err) {
    console.error("❌ Seed error:", err.message);
    process.exit(1);
  }
}

seed();
