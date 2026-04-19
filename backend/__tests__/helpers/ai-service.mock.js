// Default mock responses for AI service endpoints
export const mockParseResponse = {
  data: {
    name: "Test Candidate",
    email: "candidate@test.com",
    phone: "1234567890",
    skills: { technical: ["JavaScript", "Python"], soft: ["Communication"] },
    education: [
      { degree: "B.Tech", university: "Test University", year: "2020" },
    ],
    experience: [
      { title: "Developer", company: "Test Corp", duration: "2 years" },
    ],
    projects: [],
    certifications: [],
    location: "Mumbai, India",
  },
};

export const mockEmbedResponse = {
  data: {
    embedding: new Array(384).fill(0).map((_, i) => Math.sin(i * 0.1)),
  },
};

export const mockMatchResponse = {
  data: {
    match_score: 0.75,
    details: {
      semantic_similarity: 0.8,
      skills_match: 0.7,
      experience_fit: 0.6,
    },
  },
};

export const setupAIMocks = (axiosMock) => {
  axiosMock.post.mockImplementation((url) => {
    if (url.includes("/parse")) return Promise.resolve(mockParseResponse);
    if (url.includes("/embed")) return Promise.resolve(mockEmbedResponse);
    if (url.includes("/match")) return Promise.resolve(mockMatchResponse);
    return Promise.reject(new Error(`Unmocked AI URL: ${url}`));
  });
};
